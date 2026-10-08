import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import BrandMark from "../components/common/BrandMark";
import FeatureWhy from "../components/common/FeatureWhy";
import {
  Users, Car, Wind, Droplet, Zap, Trees,
  MapPin, Clock, Calendar, Sparkles, Activity,
  ShieldCheck, RefreshCw, TrendingUp, TrendingDown,
  Eye, BarChart3, AlertTriangle, Siren, FlaskConical, GitCompare, Bot,
  FastForward, Pause, X, ArrowUpRight, Flame, CloudRain, Sun, Moon,
  Thermometer, Wifi, WifiOff
} from "lucide-react";
import { useCity } from "../context/CityContext";
import useCurrentPopulationEstimate from "../hooks/useCurrentPopulationEstimate";
import FutureForecastPreview from "../components/dashboard/FutureForecastPreview";
import QuickActions from "../components/dashboard/QuickActions";

const parseMetricValue = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatModelTime = (value) => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp)
    ? `${new Date(timestamp * 1000).toISOString().slice(11, 16)} UTC`
    : "time unavailable";
};

const projectCityMetric = (city, key, baseline, targetYear) => {
  const checkpoints = Object.entries(city.forecasts || {})
    .map(([year, forecast]) => ({ year: Number(year), value: parseMetricValue(forecast[key]) }))
    .filter((point) => Number.isFinite(point.year) && point.value != null)
    .sort((left, right) => left.year - right.year);
  const points = [{ year: 2026, value: baseline }, ...checkpoints];
  const exact = points.find((point) => point.year === targetYear);
  if (exact) return exact.value;

  const previous = [...points].reverse().find((point) => point.year < targetYear);
  const next = points.find((point) => point.year > targetYear);
  if (previous && next) {
    const progress = (targetYear - previous.year) / (next.year - previous.year);
    return previous.value + (next.value - previous.value) * progress;
  }
  if (previous && points.length > 1) {
    const earlier = [...points].reverse().find((point) => point.year < previous.year);
    if (earlier) {
      const annualChange = (previous.value - earlier.value) / (previous.year - earlier.year);
      return previous.value + annualChange * (targetYear - previous.year);
    }
  }
  return baseline;
};

/* ── Mini animated sparkline ── */
function SparkLine({ data, color }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 64, h = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={pts}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Live Pulse Indicator ── */
function PulseIndicator({ color = "#2dd4bf" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

/* ── KPI Strip Card with Click-to-Inspect ── */
function KpiCard({ title, value, change, trend, status, icon: Icon, sparkline, colorScheme, onClick, onExplain, changeLabel = "vs sample baseline" }) {
  const schemes = {
    blue:    { accent: "#0ea5e9", bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)", glow: "rgba(14,165,233,0.12)" },
    rose:    { accent: "#f43f5e", bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.2)",  glow: "rgba(244,63,94,0.1)" },
    amber:   { accent: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", glow: "rgba(245,158,11,0.1)" },
    cyan:    { accent: "#22d3ee", bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.2)", glow: "rgba(34,211,238,0.1)" },
    purple:  { accent: "#a78bfa", bg: "rgba(167,139,250,0.08)",border: "rgba(167,139,250,0.2)",glow: "rgba(167,139,250,0.1)" },
    emerald: { accent: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", glow: "rgba(16,185,129,0.1)" },
    teal:    { accent: "#2dd4bf", bg: "rgba(45,212,191,0.08)", border: "rgba(45,212,191,0.2)", glow: "rgba(45,212,191,0.1)" },
  };
  const s = schemes[colorScheme] || schemes.blue;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor = trend === "up" ? "#f43f5e" : trend === "down" ? "#10b981" : "#38bdf8";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      onClick={onClick}
      aria-label={`Inspect ${title}: ${value}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="dashboard-kpi-card relative w-full rounded-2xl p-4 text-left cursor-pointer group overflow-hidden transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      style={{
        "--kpi-accent": s.accent,
        "--kpi-glow": s.glow,
        background: `linear-gradient(145deg, ${s.bg}, rgba(5, 13, 30, 0.76))`,
        border: `1px solid ${s.border}`,
      }}
    >
      <div aria-hidden="true" className="dashboard-kpi-halo" />
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <motion.div
          whileHover={{ rotate: -8, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 420, damping: 15 }}
          className="rounded-xl p-2"
          style={{ background: s.bg, border: `1px solid ${s.border}`, boxShadow: `0 0 18px ${s.glow}` }}
        >
          <Icon className="w-4 h-4" style={{ color: s.accent }} />
        </motion.div>
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold"
          style={{ color: trendColor }}>
          {TrendIcon && <TrendIcon className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      </div>

      <div className="text-xl font-black font-mono mb-0.5 leading-tight" style={{ color: s.accent }}>
        {value}
      </div>
      <div className="text-[11px] text-slate-400 font-medium mb-3 uppercase tracking-wider flex items-center justify-between">
        <span>{title}</span>
        <ArrowUpRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
          style={{ background: s.bg, color: s.accent, border: `1px solid ${s.border}` }}>
          {status}
        </span>
        <div className="flex items-center gap-2">
          {onExplain && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onExplain();
              }}
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              What is this?
            </button>
          )}
          <span className="text-[9px] text-slate-500">{changeLabel}</span>
          <SparkLine data={sparkline} color={s.accent} />
        </div>
      </div>
    </motion.div>
  );
}

function ExplainFeatureModal({ feature, onClose }) {
  const [advancedMode, setAdvancedMode] = useState(false);
  if (!feature) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        className="w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-300">Explain this</div>
            <h3 className="text-xl font-bold text-white mt-1">{feature.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 hover:text-white">Close</button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300 mb-2">Purpose</div>
            <p>{feature.purpose}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-violet-300 mb-2">Input</div>
              <p>{feature.input}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-300 mb-2">Output</div>
              <p>{feature.output}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300 mb-2">How it works</div>
            <p>{feature.how}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-rose-300 mb-2">Why it matters</div>
            <p>{feature.why}</p>
          </div>

          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Advanced mode</div>
              <button type="button" onClick={() => setAdvancedMode((value) => !value)} className="rounded-full border border-cyan-400/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 hover:border-cyan-300">
                {advancedMode ? "Hide technical detail" : "Show technical detail"}
              </button>
            </div>
            {advancedMode && (
              <p className="mt-3 text-slate-300 leading-relaxed">
                {feature.advanced}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export const Dashboard = () => {
  const {
    city, selectedCity, setSelectedCity, citiesList, currentTime, currentDate,
    liveAirQuality, liveWeather, liveWeatherError, liveAirQualityError, liveDataLoading, refreshLiveData,
    displayMode, setDisplayMode, liveTrafficConfigured, liveTrafficFlow, liveTrafficFlowError, liveTrafficLoading,
    liveFeedConfigured, liveFeedsLoading, liveSensorsAvailable, liveSensorStations, liveSensorsError
  } = useCity();

  const { metrics } = city;
  const currentPopulation = useCurrentPopulationEstimate(city);
  const populationEstimate = currentPopulation.estimate;
  const populationEstimateValue = Number.isFinite(populationEstimate?.population) ? populationEstimate.population : null;
  const isOfficialPopulationEstimate =
    populationEstimate?.source === "U.S. Census Bureau Population Estimates Program";
  const formatPopulation = (population) =>
    population >= 1_000_000
      ? `${(population / 1_000_000).toFixed(1)}M`
      : population.toLocaleString();
  const [refreshing, setRefreshing] = useState(false);
  const [livePackets, setLivePackets] = useState(28412);
  const [streamSpeed, setStreamSpeed] = useState(1); // 0 (pause), 1 (normal), 2 (fast), 5 (hyper)
  
  // Interactive Horizon Time Travel
  const [horizonYear, setHorizonYear] = useState(2026);

  // Active Emergency Scenario Injection
  const [activeScenario, setActiveScenario] = useState(null); // null, "monsoon", "heatwave", "traffic", "grid", "clean"

  // Metric Inspector Modal state
  const [inspectedMetric, setInspectedMetric] = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationStep, setPresentationStep] = useState(0);
  const [explainFeature, setExplainFeature] = useState(null);
  const [scenarioChoice, setScenarioChoice] = useState("transit-first");

  useEffect(() => {
    if (!inspectedMetric) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setInspectedMetric(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectedMetric]);

  // Streaming packet ticker responding to streamSpeed
  useEffect(() => {
    if (streamSpeed === 0) return;
    const intervalTime = Math.max(400, 2000 / streamSpeed);
    const interval = setInterval(() => {
      setLivePackets(p => p + Math.floor((Math.random() * 18 + 6) * streamSpeed));
    }, intervalTime);
    return () => clearInterval(interval);
  }, [streamSpeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshLiveData();
  };
  useEffect(() => {
    if (!liveDataLoading) setRefreshing(false);
  }, [liveDataLoading]);

  const getDynamicKpis = () => {
    const populationBaseline = populationEstimateValue
      ? populationEstimateValue / 1_000_000
      : parseMetricValue(metrics.population.display)
        ?? (parseMetricValue(metrics.population.value) ?? 0) / 1_000_000;
    let popVal = projectCityMetric(city, "population", populationBaseline, horizonYear);
    let trafficVal = projectCityMetric(city, "traffic", metrics.traffic.value, horizonYear);
    let aqiVal = projectCityMetric(city, "aqi", metrics.aqi.value, horizonYear);
    let energyVal = projectCityMetric(city, "energyUsage", metrics.energyUsage.value, horizonYear);
    let waterVal = projectCityMetric(city, "waterDemand", metrics.waterDemand.value, horizonYear);
    let greenVal = parseMetricValue(metrics.greenCover.value) ?? 0;
    const liveUsAqi = parseMetricValue(liveAirQuality?.us_aqi);
    const liveEuropeanAqi = parseMetricValue(liveAirQuality?.european_aqi);
    const liveAqiValue = liveUsAqi ?? liveEuropeanAqi;
    const useLiveAqi = horizonYear === 2026 && liveAqiValue != null;
    if (useLiveAqi) aqiVal = liveAqiValue;
    const useLiveTrafficFlow = horizonYear === 2026 && activeScenario == null && liveTrafficFlow != null;
    const liveTrafficDelay = useLiveTrafficFlow && liveTrafficFlow.freeFlowTravelTime > 0
      ? Math.round(
        ((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100
      )
      : null;

    // ── Live weather signals for energy & water (heuristic estimates) ─────────
    const liveTemp = parseMetricValue(liveWeather?.temperature_2m);
    const livePrecip = parseMetricValue(liveWeather?.precipitation);
    const hasLiveWeather = horizonYear === 2026 && activeScenario == null && liveTemp != null;

    let liveEnergyAdjPct = 0;
    let liveEnergyNote = null;
    if (hasLiveWeather) {
      if (liveTemp > 25) {
        liveEnergyAdjPct = Math.round((liveTemp - 25) * 1.2);
        liveEnergyNote = `+${liveEnergyAdjPct}% weather adj. (${liveTemp.toFixed(1)}°C cooling load)`;
      } else if (liveTemp < 15) {
        liveEnergyAdjPct = Math.round((15 - liveTemp) * 0.8);
        liveEnergyNote = `+${liveEnergyAdjPct}% weather adj. (${liveTemp.toFixed(1)}°C heating load)`;
      }
    }
    if (hasLiveWeather && liveEnergyAdjPct !== 0) {
      energyVal = Math.min(100, Math.round(energyVal * (1 + liveEnergyAdjPct / 100)));
    }

    let liveWaterAdjPct = 0;
    let liveWaterNote = null;
    if (hasLiveWeather) {
      const rain = Number.isFinite(livePrecip) ? livePrecip : 0;
      if (rain >= 10) { liveWaterAdjPct = -15; liveWaterNote = `−15% rain adj. (${rain} mm)`; }
      else if (rain >= 2) { liveWaterAdjPct = -8; liveWaterNote = `−8% rain adj. (${rain} mm)`; }
      else if (liveTemp > 30) { liveWaterAdjPct = 20; liveWaterNote = `+20% heat adj. (${liveTemp.toFixed(1)}°C)`; }
      else if (liveTemp > 25) { liveWaterAdjPct = 10; liveWaterNote = `+10% warm adj. (${liveTemp.toFixed(1)}°C)`; }
    }
    if (hasLiveWeather && liveWaterAdjPct !== 0) {
      waterVal = Math.min(100, Math.max(0, Math.round(waterVal * (1 + liveWaterAdjPct / 100))));
    }

    const applyBoundedChange = (value, change, maximum = 100) => Math.max(0, Math.min(maximum, Math.round(value + change)));

    // Apply scenario stress tests
    if (activeScenario === "monsoon") {
      trafficVal = applyBoundedChange(trafficVal, 24, 100);
      waterVal = applyBoundedChange(waterVal, 18);
      aqiVal = Math.max(35, Math.round(aqiVal - 25));
    } else if (activeScenario === "heatwave") {
      energyVal = applyBoundedChange(energyVal, 28);
      waterVal = applyBoundedChange(waterVal, 22);
      aqiVal = Math.round(aqiVal + 38);
    } else if (activeScenario === "traffic") {
      trafficVal = applyBoundedChange(trafficVal, 32, 100);
      aqiVal = Math.round(aqiVal + 24);
    } else if (activeScenario === "grid") {
      energyVal = applyBoundedChange(energyVal, 35);
    } else if (activeScenario === "clean") {
      trafficVal = Math.max(25, Math.round(trafficVal - 25));
      aqiVal = Math.max(28, Math.round(aqiVal - 45));
      greenVal = Math.min(65, Math.round(greenVal + 12));
    }

    const forecastSource = horizonYear === 2026
      ? (populationEstimateValue ? "Static 2026 population estimate" : "Bundled baseline profile")
      : `Illustrative city scenario · ${horizonYear}`;
    const metricSource = city.dataMode === "illustrative"
      ? `${forecastSource} (reference-city profile)`
      : forecastSource;
    const modelSource = `Open-Meteo ${liveUsAqi != null ? "US AQI" : "European AQI"} model`;
    const aqiSource = useLiveAqi
      ? activeScenario ? `${modelSource} + ${activeScenario} scenario` : modelSource
      : metricSource;
    const energySource = hasLiveWeather && liveEnergyAdjPct !== 0
      ? `${metricSource} + ${liveEnergyNote} (Open-Meteo)`
      : metricSource;
    const waterSource = hasLiveWeather && liveWaterAdjPct !== 0
      ? `${metricSource} + ${liveWaterNote} (Open-Meteo)`
      : metricSource;
    const changeFromBaseline = (value, baseline) => {
      if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) {
        return { change: "N/A", trend: "flat" };
      }
      const delta = ((value - baseline) / Math.abs(baseline)) * 100;
      return {
        change: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
        trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      };
    };
    const scenarioOrProjection = horizonYear !== 2026 || activeScenario != null;
    const metricChange = (value, baseline, original) => scenarioOrProjection
      ? changeFromBaseline(value, baseline)
      : { change: original.change, trend: original.trend };
    const aqiChange = useLiveAqi && !activeScenario
      ? { change: "Current", trend: "flat" }
      : metricChange(aqiVal, metrics.aqi.value, metrics.aqi);
    return {
      population: {
        ...metrics.population,
        ...metricChange(popVal, populationBaseline, metrics.population),
        display: `${popVal.toFixed(1)}M`,
        source: metricSource,
        status: scenarioOrProjection ? "SCENARIO" : "SAMPLE",
      },
      traffic: {
        ...metrics.traffic,
        ...(useLiveTrafficFlow
          ? { change: `${liveTrafficFlow.currentSpeed} km/h`, trend: "flat" }
          : metricChange(trafficVal, metrics.traffic.value, metrics.traffic)),
        display: useLiveTrafficFlow
          ? liveTrafficDelay === 0
            ? "0% vs free flow"
            : `${Math.abs(liveTrafficDelay)}% ${liveTrafficDelay < 0 ? "faster" : "slower"}`
          : `${Math.round(trafficVal)}%`,
        source: useLiveTrafficFlow
          ? "TomTom Flow Segment · nearest road to city reference point; not citywide"
          : metricSource,
        status: scenarioOrProjection ? "SCENARIO" : useLiveTrafficFlow ? "LIVE POINT" : "SAMPLE",
        sparkline: useLiveTrafficFlow ? [] : metrics.traffic.sparkline,
      },
      aqi: {
        ...metrics.aqi,
        ...aqiChange,
        display: `${Math.round(aqiVal)}${useLiveAqi ? ` ${liveUsAqi != null ? "US" : "European"} AQI` : ""}`,
        status: activeScenario || horizonYear !== 2026 ? "SCENARIO" : useLiveAqi ? "MODEL" : "SAMPLE",
        source: aqiSource,
        sparkline: useLiveAqi ? [] : metrics.aqi.sparkline,
      },
      waterDemand: {
        ...metrics.waterDemand,
        ...metricChange(waterVal, metrics.waterDemand.value, metrics.waterDemand),
        display: `${Math.round(waterVal)}%`,
        source: waterSource,
        status: scenarioOrProjection ? "SCENARIO" : (hasLiveWeather && liveWaterAdjPct !== 0 ? "LIVE EST." : "SAMPLE"),
        isLiveEstimate: hasLiveWeather && liveWaterAdjPct !== 0,
      },
      energyUsage: {
        ...metrics.energyUsage,
        ...metricChange(energyVal, metrics.energyUsage.value, metrics.energyUsage),
        display: `${Math.round(energyVal)}%`,
        source: energySource,
        status: scenarioOrProjection ? "SCENARIO" : (hasLiveWeather && liveEnergyAdjPct !== 0 ? "LIVE EST." : "SAMPLE"),
        isLiveEstimate: hasLiveWeather && liveEnergyAdjPct !== 0,
      },
      greenCover: {
        ...metrics.greenCover,
        ...metricChange(greenVal, metrics.greenCover.value, metrics.greenCover),
        display: `${Math.round(greenVal)}%`,
        source: metricSource,
        status: scenarioOrProjection ? "SCENARIO" : "SAMPLE",
      },
    };
  };

  const dynamicMetrics = getDynamicKpis();
  const hasLiveModelAqi = dynamicMetrics.aqi.source.startsWith("Open-Meteo") && !activeScenario;
  const currentUsAqi = parseMetricValue(liveAirQuality?.us_aqi);
  const currentEuropeanAqi = parseMetricValue(liveAirQuality?.european_aqi);
  const currentModelAqi = currentUsAqi ?? currentEuropeanAqi;
  const modelAqiScale = currentUsAqi != null ? "US AQI" : "European AQI";

  const storySteps = [
    { title: "City", description: "Choose a city and understand the baseline public profile, current conditions, and location context." },
    { title: "Current Health", description: "Review the health score, live conditions, and how the city is trending today." },
    { title: "3D Digital Twin", description: "Inspect roads, transport links, green zones, and pollution hotspots in the city context." },
    { title: "Problem", description: "Identify the main friction: congestion, pollution risk, or service stress that blocks growth." },
    { title: "Future Forecast", description: "Project how the city changes under business-as-usual conditions over time." },
    { title: "What-if Decision", description: "Test a decision that balances mobility, emissions, resilience, and cost." },
    { title: "Simulation", description: "Run a scenario and compare the before/after effect of an intervention." },
    { title: "Impact", description: "Measure the change in congestion, air quality, health, and resource demand." },
    { title: "Recommendation", description: "Use the AI policy summary to choose a justified next action." },
    { title: "Report", description: "Package the story into an understandable briefing for a manager, professor, or stakeholder." },
  ];

  const decisionOptions = [
    {
      id: "transit-first",
      label: "Transit-first mix",
      summary: "Shift demand to metro and express bus corridors while keeping AQI stable.",
      before: { traffic: 68, aqi: 122 },
      after: { traffic: 47, aqi: 119 },
    },
    {
      id: "green-corridor",
      label: "Green corridor",
      summary: "Add tree canopy and EV charging without overbuilding new roads.",
      before: { traffic: 68, aqi: 122 },
      after: { traffic: 52, aqi: 110 },
    },
    {
      id: "dynamic-pricing",
      label: "Dynamic pricing",
      summary: "Use pricing + transit incentives to smooth peak congestion.",
      before: { traffic: 68, aqi: 122 },
      after: { traffic: 50, aqi: 116 },
    },
  ];

  const selectedDecision = decisionOptions.find((option) => option.id === scenarioChoice) || decisionOptions[0];
  const presentationSteps = [
    { title: "City context", subtitle: "This city starts with a known baseline and a place-specific operating profile." },
    { title: "Current health", subtitle: "The dashboard reveals current conditions and the issues affecting everyday life." },
    { title: "Digital twin view", subtitle: "The 3D map connects the city’s roads, green zones, service nodes, and exposure hotspots in one place." },
    { title: "Problem diagnosis", subtitle: "The story narrows the challenge to a single issue: congestion is creating public-health and mobility risk." },
    { title: "Forecast", subtitle: "Without action, growth and demand increase the pressure on mobility and air quality." },
    { title: "Decision", subtitle: "We test a specific intervention designed to reduce delay without worsening pollution." },
    { title: "Simulation", subtitle: "The simulator contrasts the baseline with a candidate intervention and makes the trade-off measurable." },
    { title: "Impact", subtitle: "The platform translates the scenario into before/after outcomes that can be explained in plain English." },
    { title: "Recommendation", subtitle: "The AI policy layer turns the result into a practical, defensible next action." },
    { title: "Report", subtitle: "The final output is a clear decision brief for a lecturer, stakeholder, or city team." },
  ];

  const handlePresentationReset = () => {
    setPresentationStep(0);
    setScenarioChoice("transit-first");
    setActiveScenario(null);
    setHorizonYear(2026);
    setPresentationMode(true);
  };

  const featureLibrary = {
    Population: {
      title: "Population",
      purpose: "Understand how fast the city is growing and whether current infrastructure can sustain demand.",
      input: "Selected city profile, forecast assumptions, and 2026–2050 city growth curves.",
      how: "The dashboard combines baseline projections with scenario-adjusted growth assumptions and displays the resulting population trend.",
      output: "A population estimate and change signal that shows whether the city is expanding, stabilizing, or overshooting infrastructure capacity.",
      why: "Population growth helps explain future pressure on transit, housing, energy, water, and public services.",
      advanced: "This panel is a bundled forecast abstraction. It is not a live census feed and should be replaced with official municipal data if connected to a municipal GIS or planning API.",
    },
    "Traffic Congestion": {
      title: "Traffic Congestion",
      purpose: "Spot when mobility pressure is likely to perform poorly and where a single intervention can improve travel times.",
      input: "Traffic-flow benchmarks and current delay estimates from the selected scenario or the nearest available traffic feed.",
      how: "The system blends baseline reference data with live nearest-road traffic if configured and highlights whether the city is faster or slower than expected.",
      output: "A delay percentage or traffic-flow reading that shows how congested the system is today or under a scenario.",
      why: "Traffic delay is the clearest visible signal of poor trip reliability and is often the first source of emissions and quality-of-life loss.",
      advanced: "When live TomTom data is enabled, only the nearest road segment is used for context and not a citywide average. This is a decision-support approximation, not a full network-level operations model.",
    },
    "Air Quality Index": {
      title: "Air Quality Index",
      purpose: "Monitor whether emissions and congestion are degrading health and to see if interventions improve the city breathing environment.",
      input: "Air-quality model data from Open-Meteo and scenario assumptions such as EV adoption, greening, and traffic demand changes.",
      how: "The panel estimates AQI using current conditions and scenario adjustments, without claiming direct monitoring from a municipal station network.",
      output: "An AQI estimate and change label that shows whether the city is improving or worsening.",
      why: "Clean air is a direct quality-of-life and public-health outcome, especially for transport and industrial planning.",
      advanced: "Open-Meteo AQI values are model estimates. They are useful for decision support but should not be treated as official pollutant sensor readings without a local monitoring network.",
    },
    "Water Demand": {
      title: "Water Demand",
      purpose: "Estimate whether climate and demand patterns are creating stress on water resources.",
      input: "Baseline demand assumptions and live weather-derived adjustments for heat, precipitation, and seasonal demand shifts.",
      how: "The system uses the city’s reference profile and adjusts for current weather conditions such as heat or rain to estimate stress.",
      output: "A demand or stress score expressed as a percentage change relative to the baseline profile.",
      why: "Water resilience matters for livability, infrastructure reliability, and long-term urban planning.",
      advanced: "Weather-based adjustments are support estimates for decision-making, not utility telemetry. A real deployment should connect to district-level water service data and climate models.",
    },
    "Energy Usage": {
      title: "Energy Usage",
      purpose: "Understand how weather, electrification, and growth are increasing or reducing city energy pressure.",
      input: "Baseline city energy profile and current weather conditions such as temperature or cooling load.",
      how: "The system combines baseline energy demand with temperature-driven adjustments and scenario assumptions to estimate system stress.",
      output: "An energy-demand percentage that indicates likely pressure on the grid or energy resilience.",
      why: "Energy planning determines reliability, affordability, and the city’s ability to electrify mobility and buildings.",
      advanced: "These estimates are not grid telemetry. They are scenario support signals that can be replaced with utility data, district load profiles, and climate-adjusted demand models.",
    },
    "Green Cover": {
      title: "Green Cover",
      purpose: "Track how much ecological space the city has for cooling, runoff management, and public health.",
      input: "Reference land-cover assumptions and scenario changes such as new parks, street trees, or greening interventions.",
      how: "The metric compares current green coverage to the city baseline and scenario assumptions about land conversion or restoration.",
      output: "A green-cover percentage and trend for the selected year or scenario.",
      why: "Green infrastructure is one of the clearest levers for cooling, flood protection, and improving resident experience.",
      advanced: "This is an illustrative land-cover estimate. In production it should be replaced with GIS land-cover classification or municipal urban forestry data.",
    },
    "Map Layers": {
      title: "Map Layers",
      purpose: "Show how streets, green areas, transport, pollution, and vulnerable assets connect in one urban picture.",
      input: "OpenStreetMap features around the selected city, plus the city’s near-real-time and scenario overlays.",
      how: "Layer toggles combine features such as transport nodes, green spaces, industrial zones, flood risk, and mobility points into a single context map.",
      output: "A layered city map that helps decision-makers inspect relationships across infrastructure and environmental risk.",
      why: "Urban problems are connected. The map makes that connection visible before a policy is chosen.",
      advanced: "This map is a public-geodata layer presentation. It is designed for planning workshops and can be upgraded with municipal IoT, parcel data, and land-use databases.",
    },
    "AI Recommendations": {
      title: "AI Recommendations",
      purpose: "Turn the city story into a shortlist of policy actions with an explainable rationale.",
      input: "Sample policy templates derived from the city’s health, mobility, and environmental signals.",
      how: "The dashboard ranks actions by impact and confidence and presents them as templates that can be reviewed and approved in-session.",
      output: "Recommendation cards with rationale, impact level, and review state.",
      why: "A good recommendation needs to be concrete, understandable, and tied to a clear city problem.",
      advanced: "These are example recommendation templates powered by local demo data, not outputs from a connected AI model or official policy engine. They are ready for real model integration when a production backend is available.",
    },
    "What-if Simulator": {
      title: "What-if Simulator",
      purpose: "Let a presenter test a policy combination and see the likely before/after impact quickly.",
      input: "Policy levers such as metro investment, congestion pricing, EV adoption, greening, and solar mandates.",
      how: "A scenario engine adjusts the city profile based on policy intensity and compares simulated outcomes to the current baseline.",
      output: "Traffic relief, AQI improvement, carbon abatement, budget impact, and projected health score.",
      why: "Translating policy choices into comparable outputs helps stakeholders decide with evidence instead of intuition.",
      advanced: "This is a stylized scenario model that uses reference-city assumptions and rule-based relationships. It can be upgraded to a calibrated system dynamics or optimization model later.",
    },
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-w-0 space-y-5 dashboard-content sm:space-y-6" data-display-mode={displayMode}>
      {/* ══════════════════════════════════════════════════════
          1. COMMAND CENTER HEADER WITH TIME HORIZON & CONTROLS
      ══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="command-dashboard-hero relative min-w-0 rounded-3xl p-4 overflow-hidden sm:p-6"
        style={{
          background: displayMode === "day"
            ? "linear-gradient(135deg, #ffffff 0%, #eaf5ff 55%, #e8fbf7 100%)"
            : "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(4,14,38,0.95) 50%, rgba(45,212,191,0.1) 100%)",
          border: displayMode === "day" ? "1px solid rgba(14,116,144,0.25)" : "1px solid rgba(14,165,233,0.25)",
          boxShadow: displayMode === "day"
            ? "0 16px 40px rgba(15,23,42,0.08)"
            : "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(14,165,233,0.1)",
        }}
      >
        <motion.div
          aria-hidden="true"
          className="command-dashboard-orbit absolute right-0 top-0 h-80 w-80 rounded-full pointer-events-none"
          animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="command-dashboard-grid absolute inset-0 pointer-events-none rounded-3xl" aria-hidden="true" />
        <div className="absolute inset-0 scan-overlay pointer-events-none rounded-3xl" />

        <div className="relative z-10 flex min-w-0 flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Title block */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <motion.div
                whileHover={{ rotate: 8, scale: 1.06 }}
                transition={{ type: "spring", stiffness: 360, damping: 16 }}
                className="command-dashboard-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "#70e2d0", boxShadow: "0 0 25px rgba(112,226,208,0.24)" }}>
                <BrandMark className="h-9 w-9" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={`min-w-0 text-2xl sm:text-3xl font-black tracking-tight ${displayMode === "day" ? "text-slate-900" : "text-white"}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                    City Overview
                  </h1>
                  <FeatureWhy featureIds={["ai-command-center", "digital-city-twin"]} />
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono uppercase"
                    style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.4)" }}>
                    Live and example data
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  <span className="text-sky-300 font-bold">{city.name}</span>
                  <span className="mx-2 text-slate-600">•</span>
                  <span>{city.tagline}</span>
                </p>
              </div>
            </div>

            {/* Live streaming status pills & speed controls */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full"
                style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
                <PulseIndicator color="#2dd4bf" />
                <span>{livePackets.toLocaleString()} demo packets simulated</span>
              </div>
              
              {/* Telemetry streaming speed selector */}
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-900/80 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setStreamSpeed(0)}
                  aria-pressed={streamSpeed === 0}
                  title="Pause simulated stream"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                    streamSpeed === 0 ? "bg-rose-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Pause className="w-2.5 h-2.5" />
                  <span>Pause demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStreamSpeed(1)}
                  aria-pressed={streamSpeed === 1}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    streamSpeed === 1 ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => setStreamSpeed(2)}
                  aria-pressed={streamSpeed === 2}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    streamSpeed === 2 ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  2x
                </button>
                <button
                  type="button"
                  onClick={() => setStreamSpeed(5)}
                  aria-pressed={streamSpeed === 5}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                    streamSpeed === 5 ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FastForward className="w-2.5 h-2.5" />
                  <span>5x</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SAMPLE SCENARIO</span>
              </div>
            </div>
          </div>

          {/* Controls: Twin selector, refresh, clock */}
          <div className="dashboard-command-controls flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:max-w-[440px] 2xl:justify-end">
            <button
              type="button"
              onClick={() => {
                setPresentationMode(true);
                setPresentationStep(0);
              }}
              className="dashboard-control-button inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-slate-950/80 px-3 py-2 text-xs font-bold text-cyan-200 hover:text-white transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Presentation Mode
            </button>

            {/* City selector */}
            <div             className="dashboard-control-button flex min-w-0 items-center gap-2 rounded-2xl p-1.5"
              style={{ background: "rgba(4,12,38,0.9)", border: "1px solid rgba(14,165,233,0.3)" }}>
              <div className="pl-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Twin:</span>
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="min-w-0 max-w-[min(52vw,230px)] truncate rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
                style={{
                  background: "rgba(4,14,38,0.95)",
                  border: "1px solid rgba(14,165,233,0.3)",
                  color: "#38bdf8",
                }}
              >
                {citiesList.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: "#030d1a" }}>
                    {c.name} ({c.country || c.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => setDisplayMode(displayMode === "night" ? "day" : "night")}
              aria-label={`Switch to ${displayMode === "night" ? "day" : "night"} mode`}
              aria-pressed={displayMode === "day"}
              title={`Switch to ${displayMode === "night" ? "day" : "night"} mode`}
              className="dashboard-control-button inline-flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
              style={{
                background: displayMode === "day" ? "rgba(14,165,233,0.1)" : "rgba(14,165,233,0.1)",
                border: "1px solid rgba(14,165,233,0.25)",
                color: displayMode === "day" ? "#0369a1" : "#38bdf8",
              }}
            >
              {displayMode === "night" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline text-xs font-semibold">{displayMode === "night" ? "Day mode" : "Night mode"}</span>
            </button>

            {/* Refresh button */}
            <button onClick={handleRefresh}
              type="button"
              aria-label={liveDataLoading ? "Refreshing public data" : "Refresh public data"}
              title={liveDataLoading ? "Refreshing public data" : "Refresh public data"}
              className="dashboard-control-button p-2.5 rounded-xl transition-all cursor-pointer"
              style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "#38bdf8" }}>
                <RefreshCw className={`w-4 h-4 ${refreshing || liveDataLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Clock */}
            <div className="dashboard-control-button hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs"
              style={{ background: "rgba(4,12,38,0.9)", border: "1px solid rgba(14,165,233,0.2)" }}>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentDate}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-teal-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{currentTime}</span>
              </div>
            </div>

            <div className="flex w-full justify-start md:justify-end">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.16 }}
                className="dashboard-population-card flex w-fit min-w-52 max-w-full items-center gap-3 rounded-2xl border border-cyan-400/25 bg-slate-950/80 px-4 py-3"
              >
                <span className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-2 text-cyan-300">
                  <Users aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {horizonYear !== 2026
                      ? `Projected population · Year ${horizonYear}`
                      : currentPopulation.status === "loading"
                        ? "Official population estimate"
                        : populationEstimate
                          ? (isOfficialPopulationEstimate ? "Latest official estimate" : "2026 static population estimate")
                          : "Population data unavailable"}
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-black leading-none text-white">
                    {horizonYear !== 2026
                      ? dynamicMetrics.population.display
                      : currentPopulation.status === "loading"
                        ? "Loading…"
                        : populationEstimate
                          ? formatPopulation(populationEstimate.population)
                          : "Unavailable"}
                  </p>
                  {horizonYear !== 2026 ? (
                    <span className="mt-1 block text-[9px] text-cyan-300">
                      Projected from 2026 baseline for {city.name}
                    </span>
                  ) : populationEstimate ? (
                    <p className="mt-1 max-w-52 text-[9px] leading-relaxed text-cyan-300">
                      {isOfficialPopulationEstimate
                        ? `U.S. Census · as of Jul 1, ${populationEstimate.estimateYear}`
                        : `ESTIMATED · STATIC · as of Jul 1, ${populationEstimate.estimateYear}`}
                    </p>
                  ) : (
                    <p className="mt-1 max-w-52 text-[9px] leading-relaxed text-slate-500">
                      {currentPopulation.status === "loading"
                        ? "Checking the connected official source…"
                        : currentPopulation.error}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TIME HORIZON SIMULATION SCRUBBER (INTERACTIVE TIME TRAVEL)
        ══════════════════════════════════════════════════════ */}
        <div className="mt-5 pt-4 border-t border-cyan-500/20 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Time-Horizon Simulation Scrubber:</span>
            </span>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              YEAR {horizonYear}
            </span>
          </div>

          <div className="dashboard-horizon-options flex flex-wrap items-center gap-2 pb-1" role="group" aria-label="Select simulation year">
            {[2026, 2030, 2035, 2040, 2050].map((yr) => (
              <motion.button
                type="button"
                key={yr}
                onClick={() => setHorizonYear(yr)}
                aria-pressed={horizonYear === yr}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`dashboard-horizon-button px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  horizonYear === yr
                    ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/30 scale-105"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                {yr === 2026 ? "2026 Baseline" : `${yr} Scenario`}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="dashboard-decision-story relative overflow-hidden rounded-3xl border border-cyan-400/25 p-4 sm:p-6"
      >
        <div aria-hidden="true" className="dashboard-decision-glow absolute -right-16 -top-24 h-72 w-72 rounded-full" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                  <Sparkles className="h-3 w-3" /> Interactive demo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200/80">
                  <Activity className="h-3 w-3" /> Simulated outcomes
                </span>
              </div>
              <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
                A better commute. Cleaner air. <span className="bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-300 bg-clip-text text-transparent">One city decision.</span>
              </h2>
              <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                Explore a sample planning challenge, choose a policy mix, and see how the projected trade-offs change.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPresentationMode(true);
                setPresentationStep(5);
              }}
              className="dashboard-story-cta inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-slate-950"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Launch full demo
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="dashboard-story-steps mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { label: "Spot the issue", detail: "Congestion is rising", icon: AlertTriangle, tone: "rose" },
              { label: "Choose a policy", detail: "Pick a planning mix", icon: FlaskConical, tone: "violet" },
              { label: "Compare impact", detail: "Review sample outcomes", icon: GitCompare, tone: "cyan" },
              { label: "Make a decision", detail: "Turn insight into action", icon: Bot, tone: "emerald" },
            ].map((stage, index) => {
              const StageIcon = stage.icon;
              return (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  className={`dashboard-story-stage dashboard-story-stage-${stage.tone} relative flex items-center gap-2.5 rounded-xl border p-2.5`}
                >
                  <span className="dashboard-story-stage-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <StageIcon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[11px] font-bold text-slate-100">{stage.label}</span>
                    <span className="truncate text-[9px] text-slate-400">{stage.detail}</span>
                  </span>
                  {index < 3 && <span aria-hidden="true" className="dashboard-story-connector hidden md:block" />}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-[1.05fr_1fr]">
            <div className="dashboard-story-options rounded-2xl border p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Choose your intervention</div>
                  <div className="mt-1 text-xs font-bold text-white">Which plan should the city test?</div>
                </div>
                <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[9px] font-mono font-bold text-cyan-200">01 / 03</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {decisionOptions.map((option, index) => {
                  const OptionIcon = [Car, Trees, Activity][index];
                  const isSelected = scenarioChoice === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => setScenarioChoice(option.id)}
                      aria-pressed={isSelected}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`dashboard-story-option w-full rounded-xl border p-3 text-left ${isSelected ? "is-selected" : ""}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="dashboard-story-option-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                          <OptionIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate text-[11px] font-extrabold text-white">{option.label}</span>
                            <span className="text-[9px] font-mono font-bold text-emerald-300">{option.after.traffic}%</span>
                          </span>
                          <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{option.summary}</span>
                        </span>
                      </div>
                      {isSelected && (
                        <motion.span
                          layoutId="decision-choice-indicator"
                          className="dashboard-story-option-line mt-2 block h-0.5 rounded-full"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-story-results relative overflow-hidden rounded-2xl border p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/80">Projected demo impact</div>
                  <div className="mt-1 text-xs font-bold text-white">Here’s what this plan could change</div>
                </div>
                <span className="rounded-full border border-amber-200/20 bg-amber-200/5 px-2 py-1 text-[9px] font-bold text-amber-100/80">Illustrative only</span>
              </div>

              <div className="mt-4 space-y-4">
                {[
                  { label: "Traffic delay", before: selectedDecision.before.traffic, after: selectedDecision.after.traffic, max: 100, suffix: "%", color: "cyan" },
                  { label: "Air quality index", before: selectedDecision.before.aqi, after: selectedDecision.after.aqi, max: 200, suffix: " AQI", color: "violet" },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-300">{metric.label}</span>
                      <span className="font-mono text-slate-400">
                        <span className="text-slate-300">{metric.before}{metric.suffix}</span>
                        <span className="px-1.5 text-slate-600">→</span>
                        <span className="font-bold text-emerald-300">{metric.after}{metric.suffix}</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="dashboard-story-track h-1.5 overflow-hidden rounded-full">
                        <motion.div
                          key={`${scenarioChoice}-${metric.label}-before`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (metric.before / metric.max) * 100)}%` }}
                          transition={{ duration: 0.65, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400"
                        />
                      </div>
                      <div className="dashboard-story-track h-1.5 overflow-hidden rounded-full">
                        <motion.div
                          key={`${scenarioChoice}-${metric.label}-after`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (metric.after / metric.max) * 100)}%` }}
                          transition={{ duration: 0.75, delay: 0.08, ease: "easeOut" }}
                          className={`h-full rounded-full ${metric.color === "cyan" ? "bg-gradient-to-r from-cyan-400 to-teal-300" : "bg-gradient-to-r from-violet-400 to-fuchsia-300"}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <motion.div
                key={scenarioChoice}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="dashboard-story-takeaway mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5"
              >
                <span className="dashboard-story-impact-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <TrendingDown className="h-4 w-4" />
                </span>
                <span className="text-[10px] leading-relaxed text-slate-200">
                  <strong className="text-emerald-200">{selectedDecision.before.traffic - selectedDecision.after.traffic}% less traffic delay</strong>
                  {" "}in this sample scenario, while AQI moves from {selectedDecision.before.aqi} to {selectedDecision.after.aqi}.
                </span>
              </motion.div>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                Demo assumptions only—not a live forecast or a guaranteed policy outcome.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.12 }}
        className="dashboard-glass-panel flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-slate-950/50 px-4 py-3 text-xs"
        role="status"
      >
        {/* Live data status row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
          <span className="font-bold uppercase tracking-wide text-sky-300 flex items-center gap-1.5">
            {liveDataLoading
              ? <span className="animate-pulse">⟳</span>
              : currentModelAqi != null || liveWeather?.temperature_2m != null
                ? <Wifi className="w-3 h-3 text-emerald-400" />
                : <WifiOff className="w-3 h-3 text-slate-500" />}
            Live weather and air quality
          </span>
          <span className={currentModelAqi != null ? "text-emerald-300 font-semibold" : "text-slate-400"}>
            Air quality index: {currentModelAqi != null
              ? `${Math.round(currentModelAqi)} ${modelAqiScale} · ${formatModelTime(liveAirQuality?.time)}`
              : "unavailable"}
          </span>
          <span className={liveWeather?.temperature_2m != null ? "text-emerald-300 font-semibold" : "text-slate-400"}>
            Temperature: {liveWeather?.temperature_2m != null && Number.isFinite(Number(liveWeather.temperature_2m))
              ? `${Number(liveWeather.temperature_2m).toFixed(1)}°C · ${formatModelTime(liveWeather.time)}`
              : "unavailable"}
          </span>
          {liveWeather?.wind_speed_10m != null && (
            <span className="text-slate-300">
              Wind: {Number(liveWeather.wind_speed_10m).toFixed(1)} km/h
            </span>
          )}
          {liveWeather?.relative_humidity_2m != null && (
            <span className="text-slate-300">
              Humidity: {Number(liveWeather.relative_humidity_2m).toFixed(0)}%
            </span>
          )}
          {liveWeather?.precipitation != null && (
            <span className="text-blue-300">
              Rainfall: {Number(liveWeather.precipitation).toFixed(1)} mm/h
            </span>
          )}
        </div>
        {/* Error / status message */}
        {(liveDataLoading || liveWeatherError || liveAirQualityError) && (
          <span className="text-amber-200 text-[11px]">
            {liveDataLoading
              ? "Updating weather and air quality…"
              : [liveWeatherError, liveAirQualityError].filter(Boolean).join(" ")}
          </span>
        )}
        {/* Secondary data sources */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-700/60 pt-2 text-[10px] text-slate-400">
          <span>
            Nearby road traffic: {liveTrafficFlow
              ? `${liveTrafficFlow.currentSpeed} km/h (usual: ${liveTrafficFlow.freeFlowSpeed} km/h) · ${Math.round((liveTrafficFlow.confidence || 0.88) * 100)}% data quality`
              : liveTrafficLoading
                ? "checking"
                : "Active baseline"}
          </span>
          <span>
            Nearby air sensors: {liveSensorStations?.length > 0
              ? `${liveSensorStations.length} nearby (${liveSensorStations[0]?.provider || "Active"})`
              : liveFeedsLoading ? "loading" : "4 active stations"}
          </span>
          <span className="text-slate-500">Some energy, water, and traffic figures are estimates based on current weather.</span>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          2. INTERACTIVE EMERGENCY SCENARIO STRESS-TEST BAR
      ══════════════════════════════════════════════════════ */}
      <div 
        className="dashboard-glass-panel dashboard-scenario-panel p-4 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(6,18,42,0.9) 0%, rgba(3,10,24,0.95) 100%)",
          border: "1px solid rgba(14,165,233,0.22)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Try a Scenario
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Example only
            </span>
          </div>
          {activeScenario && (
            <button
              type="button"
              onClick={() => setActiveScenario(null)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Clear scenario ↺</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
          {[
            { id: "monsoon", icon: CloudRain, label: "Heavy Rain", color: "#38bdf8", desc: "Traffic and water use rise" },
            { id: "heatwave", icon: Flame, label: "Heatwave", color: "#f59e0b", desc: "Energy use rises" },
            { id: "traffic", icon: Car, label: "Traffic Jam", color: "#f43f5e", desc: "Travel slows down" },
            { id: "grid", icon: Zap, label: "Power Outage", color: "#a78bfa", desc: "Power demand is affected" },
            { id: "clean", icon: Trees, label: "Cleaner Air Plan", color: "#10b981", desc: "Air quality improves" },
            { id: null, icon: Activity, label: "No Extra Scenario", color: "#2dd4bf", desc: "Example starting point" },
          ].map((sc) => {
            const Icon = sc.icon;
            const isSelected = activeScenario === sc.id;
            return (
              <button
                type="button"
                key={sc.label}
                onClick={() => setActiveScenario(sc.id)}
                aria-pressed={isSelected}
                className={`dashboard-scenario-choice p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]"
                    : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                  <span className="text-[11px] font-bold text-white truncate">{sc.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{sc.desc}</div>
              </button>
            );
          })}
        </div>

        {activeScenario && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs text-rose-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>
                <strong>Example scenario is on:</strong> The figures below show a {activeScenario.toUpperCase()} example. Real city services are not affected.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveScenario(null)}
              className="px-2.5 py-1 rounded bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          3. KPI CARDS (6 City Metrics) with Interactive Click Inspector
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">City at a Glance</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Click a card for details. Some data is sample data.
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            Showing values for Year {horizonYear}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard 
            title="Population" 
            value={dynamicMetrics.population.display} 
            change={dynamicMetrics.population.change} 
            trend={dynamicMetrics.population.trend} 
            status={dynamicMetrics.population.status} 
            icon={Users} 
            sparkline={dynamicMetrics.population.sparkline} 
            colorScheme="blue" 
            changeLabel="Example data · no live population reading"
            onClick={() => setInspectedMetric({ title: "Total Population", metric: dynamicMetrics.population, color: "#0ea5e9" })}
            onExplain={() => setExplainFeature(featureLibrary.Population)}
          />
          <KpiCard 
            title="Traffic Flow / Delay" 
            value={dynamicMetrics.traffic.display} 
            change={dynamicMetrics.traffic.change} 
            trend={dynamicMetrics.traffic.trend} 
            status={dynamicMetrics.traffic.status} 
            icon={Car} 
            sparkline={dynamicMetrics.traffic.sparkline} 
            colorScheme="rose" 
            changeLabel={liveTrafficFlow && horizonYear === 2026 && !activeScenario
              ? "TomTom nearest road · not citywide"
              : "Example data · no live traffic reading"}
            onClick={() => setInspectedMetric({ title: "Traffic Congestion", metric: dynamicMetrics.traffic, color: "#f43f5e" })}
            onExplain={() => setExplainFeature(featureLibrary["Traffic Congestion"])}
          />
          <KpiCard 
            title="Air Quality Index" 
            value={dynamicMetrics.aqi.display} 
            change={hasLiveModelAqi ? "Current" : dynamicMetrics.aqi.change} 
            trend={dynamicMetrics.aqi.trend} 
            status={dynamicMetrics.aqi.status} 
            icon={Wind} 
            sparkline={hasLiveModelAqi ? [] : dynamicMetrics.aqi.sparkline} 
            colorScheme="amber" 
            changeLabel={hasLiveModelAqi
              ? `Open-Meteo model ${modelAqiScale} · not a sensor`
              : activeScenario || horizonYear !== 2026 ? "Example scenario" : "Example data · no live air reading"}
            onClick={() => setInspectedMetric({ title: "Air Quality Index", metric: dynamicMetrics.aqi, color: "#f59e0b" })}
            onExplain={() => setExplainFeature(featureLibrary["Air Quality Index"])}
          />
          <KpiCard 
            title="Water Demand" 
            value={dynamicMetrics.waterDemand.display} 
            change={dynamicMetrics.waterDemand.change} 
            trend={dynamicMetrics.waterDemand.trend} 
            status={dynamicMetrics.waterDemand.status} 
            icon={Droplet} 
            sparkline={dynamicMetrics.waterDemand.sparkline} 
            colorScheme="cyan" 
            changeLabel={dynamicMetrics.waterDemand.isLiveEstimate
              ? "Open-Meteo weather-adj. estimate"
              : "Example data · no live water reading"}
            onClick={() => setInspectedMetric({ title: "Water Demand", metric: dynamicMetrics.waterDemand, color: "#22d3ee" })}
            onExplain={() => setExplainFeature(featureLibrary["Water Demand"])}
          />
          <KpiCard 
            title="Energy Usage" 
            value={dynamicMetrics.energyUsage.display} 
            change={dynamicMetrics.energyUsage.change} 
            trend={dynamicMetrics.energyUsage.trend} 
            status={dynamicMetrics.energyUsage.status} 
            icon={Zap} 
            sparkline={dynamicMetrics.energyUsage.sparkline} 
            colorScheme="purple" 
            changeLabel={dynamicMetrics.energyUsage.isLiveEstimate
              ? "Open-Meteo weather-adj. estimate"
              : "Example data · no live energy reading"}
            onClick={() => setInspectedMetric({ title: "Energy Usage", metric: dynamicMetrics.energyUsage, color: "#a78bfa" })}
            onExplain={() => setExplainFeature(featureLibrary["Energy Usage"])}
          />
          <KpiCard 
            title="Green Cover" 
            value={dynamicMetrics.greenCover.display} 
            change={dynamicMetrics.greenCover.change} 
            trend={dynamicMetrics.greenCover.trend} 
            status={dynamicMetrics.greenCover.status} 
            icon={Trees} 
            sparkline={dynamicMetrics.greenCover.sparkline} 
            colorScheme="emerald" 
            changeLabel="Example data · no live green-space reading"
            onClick={() => setInspectedMetric({ title: "Green Cover", metric: dynamicMetrics.greenCover, color: "#10b981" })}
            onExplain={() => setExplainFeature(featureLibrary["Green Cover"])}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          3b. LIVE WEATHER CONDITIONS CARD
      ══════════════════════════════════════════════════════ */}
      {liveWeather && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="dashboard-glass-panel dashboard-weather-panel p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(4,14,38,0.9) 100%)",
            border: "1px solid rgba(14,165,233,0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Live Weather Conditions</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              Open-Meteo · {city.name}
            </span>
            {liveDataLoading && <span className="text-[10px] text-amber-300 animate-pulse">Refreshing…</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {[
              {
                label: "Temperature",
                value: liveWeather.temperature_2m != null ? `${Number(liveWeather.temperature_2m).toFixed(1)}°C` : "—",
                sub: liveWeather.apparent_temperature != null ? `Feels ${Number(liveWeather.apparent_temperature).toFixed(1)}°C` : "",
                icon: Thermometer,
                color: "#f59e0b",
              },
              {
                label: "Humidity",
                value: liveWeather.relative_humidity_2m != null ? `${Number(liveWeather.relative_humidity_2m).toFixed(0)}%` : "—",
                sub: "Relative",
                icon: Droplet,
                color: "#38bdf8",
              },
              {
                label: "Wind Speed",
                value: liveWeather.wind_speed_10m != null ? `${Number(liveWeather.wind_speed_10m).toFixed(1)} km/h` : "—",
                sub: liveWeather.wind_gusts_10m != null ? `Gusts ${Number(liveWeather.wind_gusts_10m).toFixed(1)} km/h` : "",
                icon: Wind,
                color: "#2dd4bf",
              },
              {
                label: "Precipitation",
                value: liveWeather.precipitation != null ? `${Number(liveWeather.precipitation).toFixed(1)} mm` : "—",
                sub: "Current hr",
                icon: CloudRain,
                color: "#60a5fa",
              },
              {
                label: "UV Index",
                value: liveWeather.uv_index != null ? String(Number(liveWeather.uv_index).toFixed(1)) : "—",
                sub: Number(liveWeather.uv_index) >= 8 ? "Very High" : Number(liveWeather.uv_index) >= 6 ? "High" : "Moderate",
                icon: Sun,
                color: "#fbbf24",
              },
              {
                label: "Visibility",
                value: liveWeather.visibility != null ? `${(Number(liveWeather.visibility) / 1000).toFixed(1)} km` : "—",
                sub: "10m level",
                icon: Eye,
                color: "#a78bfa",
              },
            ].map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.label} className="dashboard-weather-metric p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <Icon className="w-3 h-3" style={{ color: w.color }} />
                    <span>{w.label}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white">{w.value}</div>
                  {w.sub && <div className="text-[9px] text-slate-500 mt-0.5">{w.sub}</div>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Live numerical model values from Open-Meteo. Not official city sensor readings. Used to derive energy/water demand estimates above.
          </p>
        </motion.div>
      )}

      {/* Model-specific views are available from their matching sidebar sections. */}

      {/* ══════════════════════════════════════════════════════
          8. FUTURE FORECAST PREVIEW
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white tracking-wider uppercase">Future Outlook</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Example scenarios
          </span>
        </div>
        <FutureForecastPreview />
      </div>

      {/* ══════════════════════════════════════════════════════
          9. QUICK ACTIONS
      ══════════════════════════════════════════════════════ */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wider uppercase">Explore More Tools</span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">Open a tool to explore more.</span>
        </div>
        <QuickActions />
      </div>

      {/* ══════════════════════════════════════════════════════
          10. KPI INSPECTOR MODAL (INTERACTIVE DRILLDOWN)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {inspectedMetric && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setInspectedMetric(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="metric-inspector-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl p-6 bg-slate-900 border border-cyan-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: inspectedMetric.color }} />
                  <h3 id="metric-inspector-title" className="text-base font-bold text-white">{inspectedMetric.title} — Metric Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedMetric(null)}
                  aria-label="Close metric details"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black font-mono" style={{ color: inspectedMetric.color }}>
                    {inspectedMetric.metric.display}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Source: {inspectedMetric.metric.source}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-1">Status Classification</span>
                    <span className="font-bold text-white">{inspectedMetric.metric.status}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-1">Change vs baseline</span>
                    <span className="font-bold text-emerald-400">{inspectedMetric.metric.change}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-cyan-400 block mb-1">Data note:</span>
                  <p>{inspectedMetric.metric.source.startsWith("Open-Meteo")
                    ? "This is an Open-Meteo model estimate, not an official roadside monitor reading."
                    : inspectedMetric.metric.source.startsWith("TomTom")
                      ? "This reading describes the road segment nearest the selected city's reference coordinates. It is not a citywide traffic average; travel-time difference is relative to TomTom's free-flow estimate."
                      : "This value comes from the bundled illustrative city profile. Population, water, energy, and land-cover feeds are not connected."}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectedMetric(null)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-cyan-400"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {presentationMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPresentationMode(false);
            }}
          >
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-300">Presentation mode</div>
                  <h3 className="mt-1 text-2xl font-bold text-white">{presentationSteps[presentationStep].title}</h3>
                </div>
                <button type="button" onClick={() => setPresentationMode(false)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 hover:text-white">Exit</button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-base text-slate-200">{presentationSteps[presentationStep].subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {storySteps.map((step, index) => (
                    <div key={step.title} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${index === presentationStep ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200" : "border-slate-700 bg-slate-950/50 text-slate-400"}`}>
                      {index + 1}. {step.title}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm text-emerald-100">
                  Story goal: reduce traffic congestion without increasing pollution, while helping a professor or city planner understand why the chosen intervention is sensible.
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPresentationStep((value) => Math.max(0, value - 1))} disabled={presentationStep === 0} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                  <button type="button" onClick={handlePresentationReset} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300">Demo reset</button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (presentationStep === presentationSteps.length - 1) {
                      setPresentationMode(false);
                    } else {
                      setPresentationStep((value) => Math.min(value + 1, presentationSteps.length - 1));
                    }
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-black text-slate-950"
                >
                  {presentationStep === presentationSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {explainFeature && <ExplainFeatureModal feature={explainFeature} onClose={() => setExplainFeature(null)} />}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
};

export default Dashboard;
