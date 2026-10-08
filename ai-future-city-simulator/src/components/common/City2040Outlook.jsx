import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, TrendingUp, Zap, Droplet, Car, Wind, Users, Wifi, Sparkles, HelpCircle } from "lucide-react";
import { useCity } from "../../context/CityContext";

const SECTION_LABELS = {
  "/dashboard": "City Dashboard",
  "/digital-twin": "City Digital Twin",
  "/future-predictions": "Future Predictions",
  "/what-if-simulator": "What-If Simulator",
  "/scenario-comparison": "Scenario Comparison",
  "/transportation": "Transportation",
  "/environment": "Environment",
  "/climate-risks": "Climate & Risks",
  "/ai-recommendations": "AI Recommendations",
  "/sustainability": "Sustainability",
  "/city-3d": "3D City",
  "/report-generation": "Report Generation",
  "/settings": "Settings",
  "/history": "My History",
  "/messages": "Messages",
};

const readValue = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const multiplier = normalized.endsWith("M") ? 1_000_000 : 1;
  const number = Number.parseFloat(normalized.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(number) ? number * multiplier : null;
};

const formatValue = (value, unit, decimals = 0) => {
  if (value == null) return "Unavailable";
  const formatted = Number(value.toFixed(decimals)).toLocaleString();
  return unit === "M" ? `${Number((value / 1_000_000).toFixed(1))}M` : `${formatted}${unit}`;
};

export const City2040Outlook = () => {
  const { pathname } = useLocation();
  const {
    city,
    liveAirQuality,
    liveWeather,
    liveTrafficFlow,
    liveDataLoading,
  } = useCity();

  const [selectedHorizon, setSelectedHorizon] = useState("Current");
  const [showExplanation, setShowExplanation] = useState(false);
  const isCurrentView = selectedHorizon === "Current";
  const horizonYear = isCurrentView ? 2026 : Number(selectedHorizon);
  const forecastValue = (key) => {
    const baseline = readValue(city.metrics[key]?.display) ?? readValue(city.metrics[key]?.value);
    if (baseline == null) return null;
    const points = [
      { year: 2026, value: baseline },
      ...Object.entries(city.forecasts || {})
        .map(([year, forecast]) => ({ year: Number(year), value: readValue(forecast[key]) }))
        .filter((point) => Number.isFinite(point.year) && point.value != null),
    ].sort((left, right) => left.year - right.year);
    const exact = points.find((point) => point.year === horizonYear);
    if (exact) return exact.value;
    const previous = [...points].reverse().find((point) => point.year < horizonYear);
    const next = points.find((point) => point.year > horizonYear);
    if (previous && next) {
      const progress = (horizonYear - previous.year) / (next.year - previous.year);
      return previous.value + (next.value - previous.value) * progress;
    }
    if (previous && points.length > 1) {
      const earlier = [...points].reverse().find((point) => point.year < previous.year);
      if (earlier) {
        const annualChange = (previous.value - earlier.value) / (previous.year - earlier.year);
        return previous.value + annualChange * (horizonYear - previous.year);
      }
    }
    return baseline;
  };
  const profile = isCurrentView ? null : {
    population: forecastValue("population"),
    traffic: forecastValue("traffic"),
    aqi: forecastValue("aqi"),
    waterDemand: forecastValue("waterDemand"),
    energyUsage: forecastValue("energyUsage"),
  };

  // 1. Live Air Quality Anchor
  const liveAqi = readValue(liveAirQuality?.us_aqi) ?? readValue(liveAirQuality?.european_aqi);
  const hasCurrentData = [
    readValue(liveWeather?.temperature_2m),
    readValue(liveWeather?.relative_humidity_2m),
    readValue(liveWeather?.precipitation),
    liveAqi,
    readValue(liveTrafficFlow?.currentSpeed),
  ].some((value) => value != null);
  const baselineAqi = readValue(city.metrics.aqi.value);
  const profileAqi = readValue(profile?.aqi);
  const aqiDelta = liveAqi != null && baselineAqi != null ? liveAqi - baselineAqi : 0;
  const liveInformedAqi = profileAqi != null
    ? Math.max(15, Math.round(profileAqi + aqiDelta))
    : profileAqi;

  // 2. Live Weather Anchor for Energy
  const liveTemp = readValue(liveWeather?.temperature_2m);
  const profileEnergy = readValue(profile?.energyUsage);
  let energyWeatherAdjPct = 0;
  let energySignalText = "Nominal temperature range";
  if (liveTemp != null) {
    if (liveTemp > 25) {
      energyWeatherAdjPct = Math.round((liveTemp - 25) * 1.2);
      energySignalText = `+${energyWeatherAdjPct}% cooling load (${liveTemp.toFixed(1)}°C)`;
    } else if (liveTemp < 15) {
      energyWeatherAdjPct = Math.round((15 - liveTemp) * 0.8);
      energySignalText = `+${energyWeatherAdjPct}% heating load (${liveTemp.toFixed(1)}°C)`;
    } else {
      energySignalText = `Optimal ${liveTemp.toFixed(1)}°C (stable grid)`;
    }
  }
  const liveInformedEnergy = profileEnergy != null
    ? Math.min(100, Math.round(profileEnergy * (1 + energyWeatherAdjPct / 100)))
    : profileEnergy;

  // 3. Live Weather Anchor for Water
  const livePrecip = readValue(liveWeather?.precipitation);
  const profileWater = readValue(profile?.waterDemand);
  let waterWeatherAdjPct = 0;
  let waterSignalText = "Standard reservoir demand";
  if (liveTemp != null) {
    const rain = Number.isFinite(livePrecip) ? livePrecip : 0;
    if (rain >= 10) {
      waterWeatherAdjPct = -15;
      waterSignalText = `−15% rain refill (${rain} mm)`;
    } else if (rain >= 2) {
      waterWeatherAdjPct = -8;
      waterSignalText = `−8% rainfall offset (${rain} mm)`;
    } else if (liveTemp > 30) {
      waterWeatherAdjPct = 20;
      waterSignalText = `+20% heat stress (${liveTemp.toFixed(1)}°C)`;
    } else if (liveTemp > 25) {
      waterWeatherAdjPct = 10;
      waterSignalText = `+10% warm demand (${liveTemp.toFixed(1)}°C)`;
    } else {
      waterSignalText = `Mild weather (${liveTemp.toFixed(1)}°C)`;
    }
  }
  const liveInformedWater = profileWater != null
    ? Math.min(100, Math.max(0, Math.round(profileWater * (1 + waterWeatherAdjPct / 100))))
    : profileWater;

  // 4. Live Traffic Anchor (TomTom or Weather-correlated impact)
  const profileTraffic = readValue(profile?.traffic);
  let trafficAdjPct = 0;
  let trafficSignalText = "Standard arterial flow";
  const hasTomTom = Boolean(liveTrafficFlow);
  if (hasTomTom && liveTrafficFlow.freeFlowTravelTime > 0) {
    const delay = Math.round(((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100);
    trafficAdjPct = Math.max(-20, Math.min(50, delay));
    trafficSignalText = `TomTom delay: ${trafficAdjPct >= 0 ? "+" : ""}${trafficAdjPct}%`;
  } else if (liveWeather != null) {
    const rain = livePrecip ?? 0;
    const vis = readValue(liveWeather.visibility) ?? 10000;
    const code = readValue(liveWeather.weather_code);
    const isThunderstorm = [95, 96, 99].includes(code);
    const isFog = [45, 48].includes(code) || vis < 1000;
    if (isThunderstorm) {
      trafficAdjPct = 25;
      trafficSignalText = "Thunderstorm traffic delay (+25%)";
    } else if (isFog) {
      trafficAdjPct = 15;
      trafficSignalText = "Low visibility delay (+15%)";
    } else if (rain >= 5) {
      trafficAdjPct = 18;
      trafficSignalText = `Rain slowdown (+18%, ${rain}mm)`;
    } else if (rain >= 1) {
      trafficAdjPct = 8;
      trafficSignalText = `Light rain (+8%, ${rain}mm)`;
    } else {
      trafficSignalText = "Clear roadway conditions";
    }
  }
  const liveInformedTraffic = profileTraffic != null
    ? Math.min(100, Math.round(profileTraffic * (1 + trafficAdjPct / 100)))
    : profileTraffic;

  // 5. Population (Census Projection)
  const profilePopulation = readValue(profile?.population);

  const forecastMetrics = [
    {
      key: "population",
      label: "Population",
      unit: "M",
      decimals: 1,
      icon: Users,
      color: "text-sky-400",
      accentBorder: "border-sky-500/30",
      liveValue: profilePopulation,
      storedValue: profilePopulation,
      badgeText: "Demographic Model",
      liveSignal: "Urban census progression",
      explanation: "Projected city population based on municipal demographic growth rates.",
    },
    {
      key: "traffic",
      label: "Road Traffic Delay",
      unit: "%",
      decimals: 0,
      icon: Car,
      color: "text-rose-400",
      accentBorder: "border-rose-500/30",
      liveValue: liveInformedTraffic,
      storedValue: profileTraffic,
      badgeText: hasTomTom ? "Live TomTom Feed" : "Weather-Informed",
      liveSignal: trafficSignalText,
      explanation: "Future roadway congestion anchored by current real-time weather and traffic flow conditions.",
    },
    {
      key: "aqi",
      label: "Air Quality Index",
      unit: " AQI",
      decimals: 0,
      icon: Wind,
      color: "text-amber-400",
      accentBorder: "border-amber-500/30",
      liveValue: liveInformedAqi,
      storedValue: profileAqi,
      badgeText: "Live Open-Meteo",
      liveSignal: liveAqi != null ? `Live AQI: ${Math.round(liveAqi)} (${aqiDelta >= 0 ? "+" : ""}${Math.round(aqiDelta)} pts)` : "Model sync",
      explanation: "Horizon air pollution forecast dynamically weighted by today's real-time particulate readings.",
    },
    {
      key: "waterDemand",
      label: "Water Stress Level",
      unit: "%",
      decimals: 0,
      icon: Droplet,
      color: "text-blue-400",
      accentBorder: "border-blue-500/30",
      liveValue: liveInformedWater,
      storedValue: profileWater,
      badgeText: "Weather-Informed",
      liveSignal: waterSignalText,
      explanation: "Projected reservoir depletion calculated from current temperature and precipitation signals.",
    },
    {
      key: "energyUsage",
      label: "Energy Grid Load",
      unit: "%",
      decimals: 0,
      icon: Zap,
      color: "text-purple-400",
      accentBorder: "border-purple-500/30",
      liveValue: liveInformedEnergy,
      storedValue: profileEnergy,
      badgeText: "Weather-Informed",
      liveSignal: energySignalText,
      explanation: "Anticipated electricity peak load factoring in live ambient temperature and HVAC cooling stress.",
    },
  ];
  const populationBaseline = readValue(city.metrics.population.value);
  const trafficBaseline = readValue(city.metrics.traffic.value);
  const waterBaseline = readValue(city.metrics.waterDemand.value);
  const energyBaseline = readValue(city.metrics.energyUsage.value);
  const currentTrafficDelay = hasTomTom && liveTrafficFlow.freeFlowTravelTime > 0
    ? Math.round(((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100)
    : trafficBaseline;
  const currentWaterEstimate = waterBaseline != null
    ? Math.min(100, Math.max(0, Math.round(waterBaseline * (1 + waterWeatherAdjPct / 100))))
    : null;
  const currentEnergyEstimate = energyBaseline != null
    ? Math.min(100, Math.round(energyBaseline * (1 + energyWeatherAdjPct / 100)))
    : null;
  const currentMetrics = [
    {
      key: "population",
      label: "Population",
      unit: "M",
      decimals: 1,
      icon: Users,
      color: "text-sky-400",
      accentBorder: "border-sky-500/30",
      liveValue: populationBaseline,
      storedValue: populationBaseline,
      badgeText: "Demo profile",
      liveSignal: "No live census feed",
      explanation: "Bundled city-profile population baseline; current municipal census data is not connected.",
    },
    {
      key: "traffic",
      label: "Road Traffic Delay",
      unit: "%",
      decimals: 0,
      icon: Car,
      color: "text-rose-400",
      accentBorder: "border-rose-500/30",
      liveValue: currentTrafficDelay,
      storedValue: trafficBaseline,
      badgeText: hasTomTom ? "TomTom · nearest road" : "Demo profile",
      liveSignal: hasTomTom ? "Delay vs free-flow · nearest road only" : "No live traffic feed",
      explanation: hasTomTom
        ? "Delay is calculated from TomTom current and free-flow travel times for a nearby road segment, not citywide."
        : "Bundled city-profile traffic index; current road-speed data is not connected.",
    },
    {
      key: "aqi",
      label: "Air Quality Index",
      unit: " AQI",
      decimals: 0,
      icon: Wind,
      color: "text-amber-400",
      accentBorder: "border-amber-500/30",
      liveValue: liveAqi ?? baselineAqi,
      storedValue: baselineAqi,
      badgeText: liveAqi != null ? "Open-Meteo model" : liveDataLoading ? "Loading" : "Demo profile",
      liveSignal: liveAqi != null
        ? liveAirQuality?.us_aqi != null ? "Current US AQI · model estimate" : "Current European AQI · model estimate"
        : "Current feed unavailable; showing profile",
      explanation: liveAqi != null
        ? "Current modeled air-quality index; it is not an official monitoring-station reading."
        : "Bundled city-profile AQI baseline; current modeled air quality is unavailable.",
    },
    {
      key: "waterDemand",
      label: "Water Stress Level",
      unit: "%",
      decimals: 0,
      icon: Droplet,
      color: "text-blue-400",
      accentBorder: "border-blue-500/30",
      liveValue: currentWaterEstimate,
      storedValue: waterBaseline,
      badgeText: liveTemp != null ? "Weather-adjusted estimate" : "Demo profile",
      liveSignal: liveTemp != null ? waterSignalText : "No live weather adjustment",
      explanation: liveTemp != null
        ? "Illustrative profile adjusted using current weather heuristics; no utility or reservoir telemetry is connected."
        : "Bundled city-profile water-stress baseline; no utility telemetry is connected.",
    },
    {
      key: "energyUsage",
      label: "Energy Grid Load",
      unit: "%",
      decimals: 0,
      icon: Zap,
      color: "text-purple-400",
      accentBorder: "border-purple-500/30",
      liveValue: currentEnergyEstimate,
      storedValue: energyBaseline,
      badgeText: liveTemp != null ? "Weather-adjusted estimate" : "Demo profile",
      liveSignal: liveTemp != null ? energySignalText : "No live weather adjustment",
      explanation: liveTemp != null
        ? "Illustrative profile adjusted using current temperature heuristics; no utility or grid telemetry is connected."
        : "Bundled city-profile energy baseline; no grid telemetry is connected.",
    },
  ];
  const metrics = isCurrentView ? currentMetrics : forecastMetrics;

  return (
    <section className="mb-6 rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl relative overflow-hidden" aria-labelledby="city-outlook-title">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="pb-4 border-b border-cyan-500/15">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 id="city-outlook-title" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>{city.name.toUpperCase()} · {isCurrentView ? "CURRENT CITY CONDITIONS" : "ILLUSTRATIVE CITY OUTLOOK"}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {isCurrentView ? "Current data" : `Horizon ${selectedHorizon}`}
              </span>
            </h2>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              liveDataLoading
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : hasCurrentData
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-500/10 text-slate-300 border border-slate-500/30"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveDataLoading ? "bg-amber-400 animate-pulse" : hasCurrentData ? "bg-emerald-400" : "bg-slate-400"}`} />
              <span>{liveDataLoading ? "CHECKING LIVE FEEDS" : hasCurrentData ? "CURRENT FEEDS AVAILABLE" : "LIVE FEEDS UNAVAILABLE"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Horizon Year Selector Pills */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Select Horizon:</span>
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {["Current", "2027", "2030", "2035", "2040", "2045", "2050"].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedHorizon(yr)}
              aria-pressed={selectedHorizon === yr}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedHorizon === yr
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowExplanation(!showExplanation)}
          title="How predictions are calculated"
          className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer flex items-center gap-1 text-xs"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold">{showExplanation ? "Hide Guide" : "Explain"}</span>
        </button>
      </div>

      {/* Helpful Explanation Drawer for Everyone */}
      {showExplanation && (
        <div className="my-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200 animate-in fade-in space-y-2">
          <div className="font-bold text-cyan-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>How to Read This Dashboard Prediction (Plain English Guide):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
              <strong className="text-cyan-300 block mb-1">1. Current city indicators</strong>
              The same five indicators appear in every view. Live model or traffic readings are distinguished from bundled profile values and weather-adjusted estimates.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
              <strong className="text-teal-300 block mb-1">2. Choose a horizon</strong>
              Select a year to view a bundled city-profile scenario. Weather-based adjustments are simple heuristics, not AI predictions.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/20">
              <strong className="text-purple-300 block mb-1">3. Read the data labels</strong>
              Profile values are illustrative baselines, not verified historical records or official city measurements.
            </div>
          </div>
        </div>
      )}

      {/* 5 Prediction Metric Cards */}
      <div className={`mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 ${isCurrentView ? "lg:grid-cols-3" : "lg:grid-cols-5"}`}>
        {metrics.map(({ key, label, unit, decimals, icon: Icon, color, accentBorder, liveValue, storedValue, badgeText, liveSignal, explanation }) => {
          const delta = liveValue != null && storedValue != null ? liveValue - storedValue : 0;
          const badgeTone = badgeText.toLowerCase().includes("demo")
            ? "bg-slate-500/10 text-slate-300 border-slate-500/30"
            : badgeText.toLowerCase().includes("estimate") || badgeText === "Loading" || badgeText.toLowerCase().includes("unavailable")
              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
          return (
            <article
              key={key}
              className={`rounded-2xl border ${accentBorder} bg-slate-900/80 p-4 flex flex-col justify-between hover:border-cyan-400/50 transition-all hover:shadow-lg`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span>{label}</span>
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeTone}`}>
                    {badgeText}
                  </span>
                </div>

                {/* Primary AI Live-Informed Prediction */}
                <div className="mt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{isCurrentView ? "Current value" : "Illustrative scenario"}</span>
                    {!isCurrentView && delta !== 0 && (
                      <span className={`text-[10px] font-mono font-bold ${delta > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {delta > 0 ? `+${delta.toFixed(decimals)}` : delta.toFixed(decimals)} vs base
                      </span>
                    )}
                  </div>
                  <div className={`font-mono text-2xl font-black tracking-tight ${color} mt-0.5`}>
                    {formatValue(liveValue, unit, decimals)}
                  </div>
                </div>

                {/* Live Telemetry Anchor Signal */}
                <div className="mt-2.5 px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 truncate" title={liveSignal}>
                  <Wifi className={`w-2.5 h-2.5 ${liveValue == null ? "text-slate-500" : "text-emerald-400"} shrink-0`} />
                  <span className="truncate">{liveSignal}</span>
                </div>
              </div>

              {/* Baseline & Plain English Explanation */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                {storedValue != null && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{isCurrentView ? "Profile reference:" : "Bundled profile:"}</span>
                    <span className="font-mono font-semibold text-slate-300">{formatValue(storedValue, unit, decimals)}</span>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] leading-tight text-slate-400 font-sans">
                  {explanation}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {isCurrentView
              ? "Current feed readings are shown first. Select a year above to view its illustrative city-profile scenario."
              : `Horizon ${selectedHorizon} is an illustrative scenario based on bundled city profiles and limited current-feed adjustments.`}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-300">
          <span>{liveWeather?.temperature_2m != null ? `Temp: ${Number(liveWeather.temperature_2m).toFixed(1)}°C` : ""}</span>
          <span>{liveAirQuality?.us_aqi != null ? `AQI: ${Math.round(liveAirQuality.us_aqi)}` : ""}</span>
          <span>{liveWeather?.precipitation != null ? `Rain: ${Number(liveWeather.precipitation).toFixed(1)}mm` : ""}</span>
        </div>
      </div>
    </section>
  );
};

export default City2040Outlook;
