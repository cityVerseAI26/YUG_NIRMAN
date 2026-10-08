import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Car, Wind, Droplet, Zap, ArrowRight, Compass, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../../context/CityContext";
import useCurrentPopulationEstimate from "../../hooks/useCurrentPopulationEstimate";
import {
  ASSUMED_ANNUAL_POPULATION_GROWTH_RATE,
  POPULATION_PROJECTION_YEARS,
  projectPopulationEstimate,
} from "../../utils/populationProjection";

const readNumeric = (val) => {
  if (val == null || (typeof val === "string" && val.trim() === "")) return null;
  const num = Number.parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
};

const projectForecastMetric = (city, key, targetYear) => {
  const target = Number(targetYear);
  const direct = city?.forecasts?.[targetYear]?.[key];
  if (direct != null) return readNumeric(direct);

  const baseline = readNumeric(city?.metrics?.[key]?.value ?? city?.metrics?.[key]?.display);
  const checkpoints = Object.entries(city?.forecasts || {})
    .map(([year, forecast]) => ({ year: Number(year), value: readNumeric(forecast[key]) }))
    .filter((point) => Number.isFinite(point.year) && point.value != null)
    .sort((left, right) => left.year - right.year);
  const points = [{ year: 2026, value: baseline }, ...checkpoints].filter((p) => p.value != null);
  const exact = points.find((point) => point.year === target);
  if (exact) return Math.round(exact.value * 10) / 10;

  const previous = [...points].reverse().find((point) => point.year < target);
  const next = points.find((point) => point.year > target);
  if (previous && next) {
    const progress = (target - previous.year) / (next.year - previous.year);
    return Math.round((previous.value + (next.value - previous.value) * progress) * 10) / 10;
  }
  if (previous && points.length > 1) {
    const earlier = [...points].reverse().find((point) => point.year < previous.year);
    if (earlier) {
      const annualChange = (previous.value - earlier.value) / (previous.year - earlier.year);
      return Math.round((previous.value + annualChange * (target - previous.year)) * 10) / 10;
    }
  }
  return baseline != null ? Math.round(baseline * 10) / 10 : null;
};

export const FutureForecastPreview = () => {
  const { city, liveWeather, liveAirQuality, liveTrafficFlow } = useCity();
  const populationResult = useCurrentPopulationEstimate(city);
  const populationEstimate = populationResult.estimate;
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState("2030");
  const baselineForecast = city.forecasts?.[selectedYear] ?? null;

  // Current feeds are context only; they do not produce a forecast.
  const liveTemp = readNumeric(liveWeather?.temperature_2m);
  const livePrecip = readNumeric(liveWeather?.precipitation);
  const liveUsAqi = readNumeric(liveAirQuality?.us_aqi);
  const liveEuropeanAqi = readNumeric(liveAirQuality?.european_aqi);
  const liveAqi = liveUsAqi ?? liveEuropeanAqi;
  const liveAqiScale = liveUsAqi != null ? "US AQI" : "European AQI";
  const liveTrafficDelay = liveTrafficFlow?.freeFlowTravelTime > 0
    ? Math.round(((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100)
    : null;

  // Baseline numeric values
  const populationProjection = projectPopulationEstimate(populationEstimate, Number(selectedYear));
  const projectedPopVal = projectForecastMetric(city, "population", selectedYear);
  const populationValue = populationProjection
    ? `${(populationProjection.projected / 1_000_000).toFixed(1)}M`
    : projectedPopVal != null
      ? `${(projectedPopVal >= 1000 ? (projectedPopVal / 1_000_000).toFixed(1) : projectedPopVal.toFixed(1))}M`
      : baselineForecast?.population
        ? baselineForecast.population
        : populationEstimate
          ? `${(populationEstimate.population / 1_000_000).toFixed(1)}M`
          : populationResult.status === "loading"
            ? "Loading…"
            : "Unavailable";
  const baseTraffic = projectForecastMetric(city, "traffic", selectedYear);
  const baseAqi = projectForecastMetric(city, "aqi", selectedYear);
  const baseWater = projectForecastMetric(city, "waterDemand", selectedYear);
  const baseEnergy = projectForecastMetric(city, "energyUsage", selectedYear);

  const forecastMetrics = [
    {
      label: populationProjection ? "Population projection" : "Population reference",
      displayValue: populationValue,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      signal: populationProjection?.method === "census-trend"
        ? `CENSUS TREND · ${selectedYear}`
        : populationProjection
          ? `ASSUMED ${(ASSUMED_ANNUAL_POPULATION_GROWTH_RATE * 100).toFixed(0)}% · ${selectedYear}`
        : `SCENARIO OUTLOOK · ${selectedYear}`,
      explain: populationProjection?.method === "census-trend"
        ? `From annual estimates through ${populationProjection.baselineYear} · trend only`
        : populationProjection
          ? `Static estimated baseline; source/geography undocumented · ${(ASSUMED_ANNUAL_POPULATION_GROWTH_RATE * 100).toFixed(0)}%/yr projection`
        : `Bundled city forecast for ${city.name}`,
    },
    {
      label: "Roadway Congestion",
      displayValue: baseTraffic != null ? `${Math.round(baseTraffic)}%` : "Unavailable",
      icon: Car,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      signal: "DEMO SCENARIO",
      explain: "Bundled scenario · projected trend",
    },
    {
      label: "Air Quality Index",
      displayValue: baseAqi != null ? `${Math.round(baseAqi)} AQI` : "Unavailable",
      icon: Wind,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      signal: "DEMO SCENARIO",
      explain: "Bundled scenario · projected trend",
    },
    {
      label: "Water demand index",
      displayValue: baseWater != null ? `${Math.round(baseWater)}%` : "Unavailable",
      icon: Droplet,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      signal: "DEMO SCENARIO",
      explain: "Bundled scenario · projected trend",
    },
    {
      label: "Energy-use index",
      displayValue: baseEnergy != null ? `${Math.round(baseEnergy)}%` : "Unavailable",
      icon: Zap,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      signal: "DEMO SCENARIO",
      explain: "Bundled scenario · projected trend",
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-cyan-500/25 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/95 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>CITY OUTLOOK</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                OUTLOOK · {selectedYear}
                </span>
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border bg-slate-500/15 text-slate-200 border-slate-500/30">
                POPULATION PROJECTION + DEMO INDICATORS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {`Population is projected from its connected source; other indicators remain bundled illustrative scenarios for ${city.name}.`}
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Year Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {POPULATION_PROJECTION_YEARS.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedYear === yr
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current feeds are shown as context and do not adjust scenario values. */}
      <div className="my-3 px-3 py-2 rounded-xl bg-slate-950/60 border border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 text-[11px] font-semibold">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">Current feed context only · Open-Meteo weather/AQI, TomTom nearest road:</span>
            <span>Temperature: <strong className="text-white">{liveTemp != null ? `${liveTemp.toFixed(1)}°C` : "N/A"}</strong></span>
            <span className="text-slate-600">•</span>
            <span>AQI: <strong className="text-white">{liveAqi != null ? `${Math.round(liveAqi)} ${liveAqiScale} model` : "N/A"}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Precipitation: <strong className="text-white">{livePrecip != null ? `${livePrecip.toFixed(1)} mm` : "N/A"}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Nearest-road delay: <strong className="text-white">{liveTrafficDelay != null ? `${liveTrafficDelay}%` : "N/A"}</strong></span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            Context only
          </span>
        </div>

      {/* 5 Animated Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-3">
        {forecastMetrics.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl bg-slate-900/80 border ${item.border} flex flex-col justify-between hover:border-cyan-400/40 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-bold truncate">
                  {item.label}
                </span>
                <div className={`p-1.5 rounded-xl ${item.bg} ${item.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedYear}-${item.label}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight"
                  >
                    {item.displayValue}
                  </motion.div>
                </AnimatePresence>
                
                {/* Source state */}
                <div className="mt-1.5 text-[10px] font-mono text-cyan-300 truncate font-semibold">
                  {item.signal}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500 truncate">
                  {item.explain}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action & Understanding Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>
            Traffic, air quality, water, and energy use bundled demo checkpoints. Population uses the rounded 2026 planning estimate and an explicit ${(ASSUMED_ANNUAL_POPULATION_GROWTH_RATE * 100).toFixed(0)}% annual assumption, not measured change.
          </span>
        </div>

        <button
          onClick={() => navigate(`/future-predictions?year=${selectedYear}`)}
          className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto hover:shadow-lg hover:shadow-purple-500/20"
        >
          <span>Open detailed outlook</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FutureForecastPreview;
