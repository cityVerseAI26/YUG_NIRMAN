import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "../components/common/BrandMark";
import {
  Users, Car, Wind, Droplet, Zap, Trees,
  MapPin, Clock, Calendar, Sparkles, Activity,
  ShieldCheck, RefreshCw, TrendingUp, TrendingDown,
  Eye, Globe, BarChart3, AlertTriangle, Siren,
  FastForward, Pause, X, ArrowUpRight, Flame, CloudRain
} from "lucide-react";
import { useCity } from "../context/CityContext";
import CityHealthScore from "../components/dashboard/CityHealthScore";
import LiveCityMap from "../components/dashboard/LiveCityMap";
import TrafficChart from "../components/dashboard/TrafficChart";
import PollutionChart from "../components/dashboard/PollutionChart";
import PopulationChart from "../components/dashboard/PopulationChart";
import WaterChart from "../components/dashboard/WaterChart";
import EnergyChart from "../components/dashboard/EnergyChart";
import RecentAlerts from "../components/dashboard/RecentAlerts";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import FutureForecastPreview from "../components/dashboard/FutureForecastPreview";
import QuickActions from "../components/dashboard/QuickActions";

const parseMetricValue = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
function KpiCard({ title, value, change, trend, status, icon: Icon, sparkline, colorScheme, onClick, changeLabel = "vs sample baseline" }) {
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
      transition={{ duration: 0.4 }}
      onClick={onClick}
      aria-label={`Inspect ${title}: ${value}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="relative w-full rounded-2xl p-4 text-left cursor-pointer group overflow-hidden transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 28px ${s.glow}, 0 8px 32px rgba(0,0,0,0.3)`;
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = s.accent + "80";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = s.border;
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <Icon className="w-4 h-4" style={{ color: s.accent }} />
        </div>
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

      <div className="flex items-center justify-between">
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
          style={{ background: s.bg, color: s.accent, border: `1px solid ${s.border}` }}>
          {status}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500">{changeLabel}</span>
          <SparkLine data={sparkline} color={s.accent} />
        </div>
      </div>
    </motion.div>
  );
}

export const Dashboard = () => {
  const {
    city, selectedCity, setSelectedCity, citiesList, currentTime, currentDate,
    liveAirQuality, liveWeather, liveWeatherError, liveAirQualityError, liveDataLoading, refreshLiveData
  } = useCity();

  const { metrics } = city;
  const [refreshing, setRefreshing] = useState(false);
  const [livePackets, setLivePackets] = useState(28412);
  const [streamSpeed, setStreamSpeed] = useState(1); // 0 (pause), 1 (normal), 2 (fast), 5 (hyper)
  
  // Interactive Horizon Time Travel
  const [horizonYear, setHorizonYear] = useState(2026);

  // Active Emergency Scenario Injection
  const [activeScenario, setActiveScenario] = useState(null); // null, "monsoon", "heatwave", "traffic", "grid", "clean"

  // Metric Inspector Modal state
  const [inspectedMetric, setInspectedMetric] = useState(null);

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
    const populationBaseline = parseMetricValue(metrics.population.display)
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
      ? "Bundled baseline profile"
      : `Illustrative city scenario · ${horizonYear}`;
    const metricSource = city.dataMode === "illustrative"
      ? `${forecastSource} (reference-city profile)`
      : forecastSource;
    const modelSource = `Open-Meteo ${liveUsAqi != null ? "US AQI" : "European AQI"} model`;
    const aqiSource = useLiveAqi
      ? activeScenario ? `${modelSource} + ${activeScenario} scenario` : modelSource
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
      },
      traffic: {
        ...metrics.traffic,
        ...metricChange(trafficVal, metrics.traffic.value, metrics.traffic),
        display: `${Math.round(trafficVal)}%`,
        source: metricSource,
      },
      aqi: {
        ...metrics.aqi,
        ...aqiChange,
        display: `${Math.round(aqiVal)}${useLiveAqi ? ` ${liveUsAqi != null ? "US" : "European"} AQI` : ""}`,
        status: useLiveAqi && !activeScenario ? "MODEL" : activeScenario ? "SCENARIO" : metrics.aqi.status,
        source: aqiSource,
      },
      waterDemand: {
        ...metrics.waterDemand,
        ...metricChange(waterVal, metrics.waterDemand.value, metrics.waterDemand),
        display: `${Math.round(waterVal)}%`,
        source: metricSource,
      },
      energyUsage: {
        ...metrics.energyUsage,
        ...metricChange(energyVal, metrics.energyUsage.value, metrics.energyUsage),
        display: `${Math.round(energyVal)}%`,
        source: metricSource,
      },
      greenCover: {
        ...metrics.greenCover,
        ...metricChange(greenVal, metrics.greenCover.value, metrics.greenCover),
        display: `${Math.round(greenVal)}%`,
        source: metricSource,
      },
    };
  };

  const dynamicMetrics = getDynamicKpis();
  const hasLiveModelAqi = dynamicMetrics.aqi.source.startsWith("Open-Meteo") && !activeScenario;
  const currentUsAqi = parseMetricValue(liveAirQuality?.us_aqi);
  const currentEuropeanAqi = parseMetricValue(liveAirQuality?.european_aqi);
  const currentModelAqi = currentUsAqi ?? currentEuropeanAqi;
  const modelAqiScale = currentUsAqi != null ? "US AQI" : "European AQI";

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════
          1. COMMAND CENTER HEADER WITH TIME HORIZON & CONTROLS
      ══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative p-6 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(4,14,38,0.95) 50%, rgba(45,212,191,0.1) 100%)",
          border: "1px solid rgba(14,165,233,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(14,165,233,0.1)",
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute inset-0 scan-overlay pointer-events-none rounded-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title block */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "#70e2d0", boxShadow: "0 0 25px rgba(112,226,208,0.24)" }}>
                <BrandMark className="h-9 w-9" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    YUG NIRMAN COMMAND CENTER
                  </h1>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono uppercase"
                    style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.4)" }}>
                    DEMO COMMAND CENTER
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
          <div className="flex flex-wrap items-center gap-3">
            {/* City selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl"
              style={{ background: "rgba(4,12,38,0.9)", border: "1px solid rgba(14,165,233,0.3)" }}>
              <div className="pl-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Twin:</span>
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-xl font-bold focus:outline-none cursor-pointer"
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
            <button onClick={handleRefresh}
              type="button"
              aria-label={liveDataLoading ? "Refreshing public data" : "Refresh public data"}
              title={liveDataLoading ? "Refreshing public data" : "Refresh public data"}
              className="p-2.5 rounded-xl transition-all cursor-pointer"
              style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "#38bdf8" }}>
                <RefreshCw className={`w-4 h-4 ${refreshing || liveDataLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Clock */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs"
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
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TIME HORIZON SIMULATION SCRUBBER (INTERACTIVE TIME TRAVEL)
        ══════════════════════════════════════════════════════ */}
        <div className="mt-5 pt-4 border-t border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Time-Horizon Simulation Scrubber:</span>
            </span>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              YEAR {horizonYear}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[2026, 2030, 2035, 2040, 2050].map((yr) => (
              <button
                type="button"
                key={yr}
                onClick={() => setHorizonYear(yr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  horizonYear === yr
                    ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/30 scale-105"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                {yr === 2026 ? "2026 Baseline" : `${yr} Scenario`}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-slate-950/50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between" role="status">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
          <span className="font-bold uppercase tracking-wide text-sky-300">Open-Meteo public models</span>
          <span>
            Air quality: {currentModelAqi != null ? `${Math.round(currentModelAqi)} ${modelAqiScale}` : "unavailable"}
          </span>
          <span>
            Weather: {liveWeather?.temperature_2m != null && Number.isFinite(Number(liveWeather.temperature_2m))
              ? `${Number(liveWeather.temperature_2m).toFixed(1)}°C`
              : "unavailable"}
          </span>
        </div>
        <span className={liveDataLoading || liveWeatherError || liveAirQualityError ? "text-amber-200" : "text-slate-500"}>
          {liveDataLoading
            ? "Refreshing public model data…"
            : [liveWeatherError, liveAirQualityError].filter(Boolean).join(" ") || "Provider update cadence applies; values are modelled, not city sensor readings."}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. INTERACTIVE EMERGENCY SCENARIO STRESS-TEST BAR
      ══════════════════════════════════════════════════════ */}
      <div 
        className="p-4 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(6,18,42,0.9) 0%, rgba(3,10,24,0.95) 100%)",
          border: "1px solid rgba(14,165,233,0.22)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Simulated Incidents & Policy Scenarios
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Interactive Triggers
            </span>
          </div>
          {activeScenario && (
            <button
              type="button"
              onClick={() => setActiveScenario(null)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Reset demo scenario ↺</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: "monsoon", icon: CloudRain, label: "Monsoon Flood", color: "#38bdf8", desc: "Traffic +24% · water +18%" },
            { id: "heatwave", icon: Flame, label: "Heatwave +4°C", color: "#f59e0b", desc: "Energy Load +28%" },
            { id: "traffic", icon: Car, label: "Arterial Gridlock", color: "#f43f5e", desc: "Mobility Choke" },
            { id: "grid", icon: Zap, label: "Substation Trip", color: "#a78bfa", desc: "Grid load +35%" },
            { id: "clean", icon: Trees, label: "Clean Air Protocol", color: "#10b981", desc: "AQI Recovers -45" },
            { id: null, icon: Activity, label: "Nominal Demo", color: "#2dd4bf", desc: "Sample baseline" },
          ].map((sc) => {
            const Icon = sc.icon;
            const isSelected = activeScenario === sc.id;
            return (
              <button
                type="button"
                key={sc.label}
                onClick={() => setActiveScenario(sc.id)}
                aria-pressed={isSelected}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
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
                <strong>SIMULATED SCENARIO ACTIVE:</strong> Sample KPIs below are reflecting the {activeScenario.toUpperCase()} what-if scenario; no municipal systems are affected.
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">City Metrics</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Mixed public and sample data (Click to Inspect)
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            Showing values for Year {horizonYear}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard 
            title="Total Population" 
            value={dynamicMetrics.population.display} 
            change={dynamicMetrics.population.change} 
            trend={dynamicMetrics.population.trend} 
            status={dynamicMetrics.population.status} 
            icon={Users} 
            sparkline={dynamicMetrics.population.sparkline} 
            colorScheme="blue" 
            onClick={() => setInspectedMetric({ title: "Total Population", metric: dynamicMetrics.population, color: "#0ea5e9" })}
          />
          <KpiCard 
            title="Traffic Congestion" 
            value={dynamicMetrics.traffic.display} 
            change={dynamicMetrics.traffic.change} 
            trend={dynamicMetrics.traffic.trend} 
            status={dynamicMetrics.traffic.status} 
            icon={Car} 
            sparkline={dynamicMetrics.traffic.sparkline} 
            colorScheme="rose" 
            onClick={() => setInspectedMetric({ title: "Traffic Congestion", metric: dynamicMetrics.traffic, color: "#f43f5e" })}
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
              ? `Open-Meteo ${modelAqiScale}`
              : activeScenario || horizonYear !== 2026 ? "vs 2026 baseline" : "sample profile"}
            onClick={() => setInspectedMetric({ title: "Air Quality Index", metric: dynamicMetrics.aqi, color: "#f59e0b" })}
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
            onClick={() => setInspectedMetric({ title: "Water Demand", metric: dynamicMetrics.waterDemand, color: "#22d3ee" })}
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
            onClick={() => setInspectedMetric({ title: "Energy Usage", metric: dynamicMetrics.energyUsage, color: "#a78bfa" })}
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
            onClick={() => setInspectedMetric({ title: "Green Cover", metric: dynamicMetrics.greenCover, color: "#10b981" })}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          4. HEALTH SCORE + LIVE MAP
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-bold text-white tracking-wider uppercase">City Map</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            OpenStreetMap + sample health profile
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <CityHealthScore />
          </div>
          <div className="lg:col-span-8">
            <LiveCityMap />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          5. ANALYTICS CHARTS
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-bold text-white tracking-wider uppercase">Analytics Dashboard</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
            Sample trend data
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrafficChart />
          <PollutionChart />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          6. POPULATION + RESOURCE CHARTS
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6"><PopulationChart /></div>
        <div className="lg:col-span-3"><WaterChart /></div>
        <div className="lg:col-span-3"><EnergyChart /></div>
      </div>

      {/* ══════════════════════════════════════════════════════
          7. ALERTS + AI INSIGHTS
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white tracking-wider uppercase">Intelligence Center</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Sample Alerts & Policy Templates
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5"><RecentAlerts /></div>
          <div className="lg:col-span-7"><AIInsightsPanel /></div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          8. FUTURE FORECAST PREVIEW
      ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white tracking-wider uppercase">Future Forecast Preview</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Illustrative city scenarios
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
            <span className="text-sm font-bold text-white tracking-wider uppercase">Quick Action Suite</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Interactive Engines
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">Direct routing to simulation sub-engines</span>
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
                    ? "This is a model estimate, not an official roadside monitor reading."
                    : "This value comes from the bundled illustrative city profile. Traffic, population, water, and energy feeds are not connected."}</p>
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
    </div>
  );
};

export default Dashboard;
