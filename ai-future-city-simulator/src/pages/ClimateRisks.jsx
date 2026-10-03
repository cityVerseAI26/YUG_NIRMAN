import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waves,
  AlertTriangle,
  ShieldCheck,
  Umbrella,
  Flame,
  Bell,
  Siren,
  Sliders,
  CloudRain,
  Activity,
  ArrowRight,
  Droplet,
  Compass,
  Play,
  CheckCircle2,
  Wind
} from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";

export const ClimateRisks = () => {
  const { city, liveWeather, liveWeatherError } = useCity();

  // Interactive controls
  const [drillActive, setDrillActive] = useState(false);
  const [surgeHeight, setSurgeHeight] = useState(1.4); // 0.0m - 5.0m
  const [rainRate, setRainRate] = useState(65); // 10 - 200 mm/hr
  const [forecastHorizon, setForecastHorizon] = useState("24h"); // "24h" | "48h" | "72h"

  // Interactive Pump Stations Toggle State
  const [pumpStates, setPumpStates] = useState({
    estuary: true,
    underpass: true,
    coastalBuffer: true,
    creekDiversion: true,
  });

  const togglePump = (key) => {
    setPumpStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic calculations based on rain & surge sliders
  const runoffVolume = Math.round(rainRate * 42.5 + surgeHeight * 120);
  const waterLevelEstuary = (0.2 + surgeHeight * 0.72 + (rainRate / 140)).toFixed(2);
  const affectedCitizens = Math.round(surgeHeight * 85000 + rainRate * 950);
  const drainageCapacity = Math.max(
    20,
    Math.round(
      100 -
        (surgeHeight * 12 +
          (rainRate > 100 ? (rainRate - 100) * 0.4 : 0) -
          (pumpStates.estuary ? 15 : 0) -
          (pumpStates.coastalBuffer ? 12 : 0))
    )
  );

  const floodZones = [
    {
      id: "estuary",
      zone: "Low-Lying Estuary Basin & Port Channel",
      baseRisk: "HIGH",
      level: `Water level +${waterLevelEstuary}m`,
      pumpsOnline: pumpStates.estuary ? "Enabled in demo" : "Disabled in demo",
      pumpKey: "estuary",
      inundationRisk: surgeHeight > 2.0 || rainRate > 100 ? "CRITICAL FLOODING" : "MODERATE RISKS",
      color: surgeHeight > 2.0 ? "text-rose-400 border-rose-500/40 bg-rose-950/20" : "text-amber-400 border-amber-500/30 bg-amber-950/20",
    },
    {
      id: "underpass",
      zone: "Central Arterial Underpass & Subway Lines",
      baseRisk: "MODERATE",
      level: `Sub-surface sensor +${(0.1 + (rainRate / 220)).toFixed(2)}m`,
      pumpsOnline: pumpStates.underpass ? "Enabled in demo" : "Disabled in demo",
      pumpKey: "underpass",
      inundationRisk: rainRate > 80 ? "HIGH RUNOFF CHOKE" : "NORMAL TRANSIT FLOW",
      color: rainRate > 80 ? "text-rose-400 border-rose-500/40 bg-rose-950/20" : "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
    },
    {
      id: "coastalBuffer",
      zone: "Tidal Reclamation Ring & Coastal Embankment",
      baseRisk: "DEFENDED",
      level: `Tidal buffer: ${(4.5 - surgeHeight).toFixed(2)}m clearance`,
      pumpsOnline: pumpStates.coastalBuffer ? "Enabled in demo" : "Disabled in demo",
      pumpKey: "coastalBuffer",
      inundationRisk: surgeHeight > 3.2 ? "TIDAL BREACH THREAT" : "SEA WALL EFFECTIVE",
      color: surgeHeight > 3.2 ? "text-rose-400 border-rose-500/40 bg-rose-950/20" : "text-cyan-300 border-cyan-500/30 bg-cyan-950/20",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CLIMATE RISK SCENARIO SIMULATOR"
        subtitle="Current public weather context with interactive rainfall and surge scenarios"
        icon={Waves}
        badge="Weather + simulation"
        actions={
          <button
            onClick={() => setDrillActive(!drillActive)}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              drillActive
                ? "bg-rose-500 text-white shadow-xl shadow-rose-500/40 animate-pulse"
                : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            <Siren className="w-4 h-4" />
            <span>{drillActive ? "EMERGENCY DRILL RUNNING" : "Trigger Emergency Simulation Drill"}</span>
          </button>
        }
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        {liveWeather
          ? `Open-Meteo reports a modelled current precipitation value of ${liveWeather.precipitation} mm for ${city.name} at ${liveWeather.time}. This is not a river gauge or flood warning. The sliders below are what-if scenarios, not live flood measurements.`
          : liveWeatherError
            ? `Current public weather data is unavailable. The sliders below remain a what-if simulation, not live flood measurements.`
            : "Loading public weather conditions. The sliders below are what-if scenarios, not live flood measurements."}
      </div>

      {/* Drill Active Notification Bar */}
      <AnimatePresence>
        {drillActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce flex-shrink-0" />
              <div>
                <span className="font-black text-sm uppercase tracking-wide">
                  DEMO SCENARIO: Rainfall input {rainRate} mm/hr & surge input {surgeHeight}m
                </span>
                <p className="text-[11px] text-rose-300 mt-0.5">
                  These slider calculations do not activate real gates or send public emergency alerts.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDrillActive(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs cursor-pointer self-start sm:self-auto"
            >
              End Emergency Drill
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interactive Climate Horizon & Hazard Sliders ── */}
      <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-cyan-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cyan-500/20 mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Interactive Hazard Parameter Simulator
            </h3>
          </div>
          {/* Forecast Horizon Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
            <span className="text-slate-400 px-2">Foresight Window:</span>
            {["24h", "48h", "72h"].map((h) => (
              <button
                key={h}
                onClick={() => setForecastHorizon(h)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  forecastHorizon === h
                    ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Storm Surge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-400" /> Storm Surge / Sea Level Rise Height
              </span>
              <span className="font-mono font-bold text-cyan-400">+{surgeHeight.toFixed(1)} Meters</span>
            </div>
            <input
              type="range" min="0" max="5.0" step="0.1" value={surgeHeight}
              onChange={(e) => setSurgeHeight(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0m (Nominal Tide)</span>
              <span>2.5m (10-Year Surge)</span>
              <span>5.0m (Centennial Catastrophe)</span>
            </div>
          </div>

          {/* Slider 2: Rain Intensity */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-400" /> Hourly Rainfall Rate
              </span>
              <span className="font-mono font-bold text-blue-400">{rainRate} mm / Hour</span>
            </div>
            <input
              type="range" min="10" max="200" step="5" value={rainRate}
              onChange={(e) => setRainRate(parseInt(e.target.value, 10))}
              className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10 mm/h (Drizzle)</span>
              <span>80 mm/h (Monsoon Downpour)</span>
              <span>200 mm/h (Flash Cloudburst)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dynamic Impact KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 block mb-1">Total Runoff Volume</span>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {runoffVolume.toLocaleString()} ML
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Catchment basin inflow</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 block mb-1">Estimated Inundation Risk</span>
          <div className={`text-2xl font-black font-mono ${surgeHeight > 2 ? "text-rose-400" : "text-amber-400"}`}>
            {(affectedCitizens).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Citizens in flood buffer</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 block mb-1">Effective Drainage Safety</span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {drainageCapacity}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Storm pipe headroom</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 block mb-1">Demo controls enabled</span>
          <div className="text-2xl font-black font-mono text-teal-400">
            {Object.values(pumpStates).filter(Boolean).length} / 4
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Local UI toggles only</span>
        </div>
      </div>

      {/* ── Catchment Zones & Interactive Pump Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Umbrella className="w-4 h-4 text-cyan-400" />
              <span>SIMULATED CATCHMENT ZONES & DEMO CONTROLS</span>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Forecast Horizon: {forecastHorizon} Window
            </span>
          </div>

          <div className="space-y-3.5 my-4">
            {floodZones.map((z) => (
              <div
                key={z.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2 mb-1">
                    <span>{z.zone}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${z.color}`}>
                      {z.inundationRisk}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Scenario estimate: <span className="text-cyan-300 font-mono font-semibold">{z.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
                    <span className="text-slate-500 text-[10px] block">Demo toggle state</span>
                    <span className="font-mono font-bold text-cyan-300 text-xs">{z.pumpsOnline}</span>
                  </div>
                  <button
                    onClick={() => togglePump(z.pumpKey)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      pumpStates[z.pumpKey]
                        ? "bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400"
                        : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    }`}
                  >
                    {pumpStates[z.pumpKey] ? "Enabled" : "Enable demo"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span>No municipal rain gauges, tide gauges, pump controls, or alerts are connected.</span>
            <span className="text-cyan-400 font-semibold font-mono">Scenario buffer: +{(4.5 - surgeHeight).toFixed(2)}m</span>
          </div>
        </div>

        {/* Live data coverage */}
        <div className="lg:col-span-4 p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-cyan-500/15">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>LIVE DATA COVERAGE</span>
            </div>
            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              The city map and Open-Meteo weather model provide public context. This app has no official flood warning, water-level, shelter-capacity, or emergency-dispatch integration.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
            Slider outputs are illustrative what-if calculations, not warnings or operational instructions.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClimateRisks;
