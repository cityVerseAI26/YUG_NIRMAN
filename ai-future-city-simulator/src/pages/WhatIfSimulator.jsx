import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Car,
  Wind,
  Trees,
  Droplet,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import confetti from "canvas-confetti";

export const WhatIfSimulator = () => {
  const { city } = useCity();

  // Policy sliders
  const [evAdoption, setEvAdoption] = useState(40); // 0 - 100%
  const [metroExpansion, setMetroExpansion] = useState(30); // 0 - 80 km
  const [greenCanopy, setGreenCanopy] = useState(32); // 10 - 60%
  const [congestionTax, setCongestionTax] = useState(150); // 0 - 500 INR
  const [greywaterMandate, setGreywaterMandate] = useState(55); // 0 - 100%
  const [solarMandate, setSolarMandate] = useState(50); // 0 - 100%
  const [isSimulating, setIsSimulating] = useState(false);
  const [activePreset, setActivePreset] = useState("custom");

  // Dynamic simulation computations
  const trafficReduction = Math.round(
    (metroExpansion * 0.38) + (congestionTax * 0.045) + (evAdoption * 0.06)
  );

  const aqiImprovement = Math.round(
    (evAdoption * 0.5) + (greenCanopy * 0.65) + (congestionTax * 0.05) + (solarMandate * 0.35)
  );

  const carbonAbated = (
    (evAdoption * 0.026) + (metroExpansion * 0.035) + (greenCanopy * 0.02) + (solarMandate * 0.028)
  ).toFixed(2);

  const budgetImpact = Math.round(
    (congestionTax * 2.1) - (metroExpansion * 4.4) - (greenCanopy * 1.1) - (solarMandate * 1.5)
  );

  const projectedHealthScore = Math.min(
    99,
    Math.round((city.healthScore?.overall || 76) + (aqiImprovement * 0.14) + (trafficReduction * 0.09) + (greenCanopy * 0.1))
  );

  // Dynamic Multi-Year Projection Data based on current slider values
  const projectionTimeline = [
    { year: "2026", baselineAQI: city.metrics.aqi.value, simulatedAQI: city.metrics.aqi.value, baselineTraffic: city.metrics.traffic.value, simulatedTraffic: city.metrics.traffic.value },
    { year: "2028", baselineAQI: Math.round(city.metrics.aqi.value * 1.05), simulatedAQI: Math.max(30, Math.round(city.metrics.aqi.value - (aqiImprovement * 0.35))), baselineTraffic: Math.min(95, Math.round(city.metrics.traffic.value + 4)), simulatedTraffic: Math.max(25, Math.round(city.metrics.traffic.value - (trafficReduction * 0.4))) },
    { year: "2031", baselineAQI: Math.round(city.metrics.aqi.value * 1.12), simulatedAQI: Math.max(28, Math.round(city.metrics.aqi.value - (aqiImprovement * 0.7))), baselineTraffic: Math.min(98, Math.round(city.metrics.traffic.value + 8)), simulatedTraffic: Math.max(22, Math.round(city.metrics.traffic.value - (trafficReduction * 0.75))) },
    { year: "2035", baselineAQI: Math.round(city.metrics.aqi.value * 1.2), simulatedAQI: Math.max(24, Math.round(city.metrics.aqi.value - aqiImprovement)), baselineTraffic: 99, simulatedTraffic: Math.max(18, Math.round(city.metrics.traffic.value - trafficReduction)) },
    { year: "2040", baselineAQI: Math.round(city.metrics.aqi.value * 1.3), simulatedAQI: Math.max(20, Math.round(city.metrics.aqi.value - (aqiImprovement * 1.25))), baselineTraffic: 100, simulatedTraffic: Math.max(15, Math.round(city.metrics.traffic.value - (trafficReduction * 1.2))) },
  ];

  // Presets
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    if (presetKey === "utopia") {
      setEvAdoption(90);
      setMetroExpansion(65);
      setGreenCanopy(52);
      setCongestionTax(300);
      setGreywaterMandate(90);
      setSolarMandate(85);
    } else if (presetKey === "transit") {
      setEvAdoption(50);
      setMetroExpansion(75);
      setGreenCanopy(35);
      setCongestionTax(400);
      setGreywaterMandate(50);
      setSolarMandate(40);
    } else if (presetKey === "budget") {
      setEvAdoption(25);
      setMetroExpansion(15);
      setGreenCanopy(28);
      setCongestionTax(250);
      setGreywaterMandate(35);
      setSolarMandate(30);
    } else if (presetKey === "defaults") {
      setEvAdoption(40);
      setMetroExpansion(30);
      setGreenCanopy(32);
      setCongestionTax(150);
      setGreywaterMandate(55);
      setSolarMandate(50);
      setActivePreset("custom");
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.65 },
        colors: ["#00f0ff", "#10b981", "#a855f7", "#38bdf8"]
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WHAT-IF URBAN POLICY SIMULATOR"
        subtitle="Local what-if scenario sandbox • generated outcomes, not live municipal data"
        icon={FlaskConical}
        badge="Scenario simulator"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyPreset("defaults")}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? "Synthesizing..." : "Execute Simulation"}</span>
            </button>
          </div>
        }
      />

      {/* ── Preset Scenarios Bar ── */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Quick Policy Presets:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "utopia", label: "🌿 Eco-Utopia 2040", desc: "Max Greening & 90% Clean Grid" },
            { key: "transit", label: "🚆 Transit-First Mesh", desc: "Mass Metro + Peak Congestion Toll" },
            { key: "budget", label: "💰 Fiscal Prudence", desc: "CapEx Constrained Optimization" },
          ].map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreset === preset.key
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105"
                  : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Simulated Outcomes KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Traffic Relief */}
        <div className="p-4 rounded-2xl glass-panel border border-rose-500/30 bg-rose-950/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Congestion Relief</span>
            <Car className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            -{trafficReduction}%
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Rush-hour velocity +{Math.round(trafficReduction * 0.45)} km/h
          </p>
        </div>

        {/* 2. AQI Improvement */}
        <div className="p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-950/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AQI Points Abated</span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            -{aqiImprovement} AQI
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Forecast AQI: {Math.max(25, (city.metrics.aqi.value - aqiImprovement))}
          </p>
        </div>

        {/* 3. Carbon Saved */}
        <div className="p-4 rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CO₂ Abatement</span>
            <Trees className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-cyan-300">
            {carbonAbated} MT/yr
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Greenhouse gas emissions neutralized
          </p>
        </div>

        {/* 4. Municipal Fiscal Impact */}
        <div className="p-4 rounded-2xl glass-panel border border-blue-500/30 bg-blue-950/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Fiscal Balance</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              budgetImpact >= 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {budgetImpact >= 0 ? `+₹${budgetImpact} Cr` : `-₹${Math.abs(budgetImpact)} Cr`}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Tolls collected vs Infrastructure CapEx
          </p>
        </div>

        {/* 5. Projected Health Score */}
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/40 bg-cyan-950/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected Health</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-cyan-300">
            {projectedHealthScore} / 100
          </div>
          <p className="text-[10px] text-cyan-400 mt-1 font-semibold">
            +{projectedHealthScore - (city.healthScore?.overall || 76)} pts trajectory gain
          </p>
        </div>
      </div>

      {/* ── Interactive Comparative Projection Chart ── */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                POLICY PROJECTION MATRIX: Baseline vs What-If Simulated Trajectory (2026–2040)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-variable divergence computed dynamically from slider inputs
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-1 bg-rose-500 inline-block rounded" /> Baseline AQI
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-1 bg-emerald-400 inline-block rounded" /> Policy Simulated AQI
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="simulatedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(4,14,38,0.95)",
                  borderColor: "rgba(14,165,233,0.3)",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "#fff"
                }}
              />
              <Area type="monotone" dataKey="baselineAQI" name="Status Quo (No Policy)" stroke="#f43f5e" strokeWidth={2} fill="url(#baselineGrad)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="simulatedAQI" name="Simulated Policy Target" stroke="#2dd4bf" strokeWidth={3} fill="url(#simulatedGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Interactive Sliders Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Mobility & Energy Levers */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-cyan-500/15">
            <Car className="w-4 h-4 text-cyan-400" />
            <span>Mobility & Rapid Transit Levers</span>
          </h3>

          {/* Slider 1: EV Adoption */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                1. Electric Vehicle (EV) Fleet Mandate
              </span>
              <span className="font-mono font-bold text-cyan-400">{evAdoption}% of Vehicles</span>
            </div>
            <input
              type="range" min="0" max="100" step="5" value={evAdoption}
              onChange={(e) => { setEvAdoption(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Current Base)</span>
              <span>50%</span>
              <span>100% (Zero Emission Fleet)</span>
            </div>
          </div>

          {/* Slider 2: Metro Rail Extension */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                2. Metro Rail & Arterial BRT Expansion
              </span>
              <span className="font-mono font-bold text-blue-400">+{metroExpansion} km Added</span>
            </div>
            <input
              type="range" min="0" max="80" step="5" value={metroExpansion}
              onChange={(e) => { setMetroExpansion(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>+0 km</span>
              <span>+40 km</span>
              <span>+80 km Rapid Network</span>
            </div>
          </div>

          {/* Slider 3: Peak Congestion Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                3. Inner Ring Congestion Pricing Toll
              </span>
              <span className="font-mono font-bold text-rose-400">₹{congestionTax} / Entry</span>
            </div>
            <input
              type="range" min="0" max="500" step="25" value={congestionTax}
              onChange={(e) => { setCongestionTax(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-rose-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹0 (Free Access)</span>
              <span>₹250</span>
              <span>₹500 (Strict Demand Control)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Ecology & Resources Levers */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-cyan-500/15">
            <Trees className="w-4 h-4 text-emerald-400" />
            <span>Ecological & Clean Energy Levers</span>
          </h3>

          {/* Slider 4: Green Canopy Target */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                4. Urban Forest & Rooftop Canopy Target
              </span>
              <span className="font-mono font-bold text-emerald-400">{greenCanopy}% Green Cover</span>
            </div>
            <input
              type="range" min="15" max="60" step="1" value={greenCanopy}
              onChange={(e) => { setGreenCanopy(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15% (Deficit)</span>
              <span>35% (Optimal)</span>
              <span>60% (Biosphere Metropolis)</span>
            </div>
          </div>

          {/* Slider 5: Greywater Recycling Mandate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                5. Decentralized Greywater Recycling Mandate
              </span>
              <span className="font-mono font-bold text-cyan-400">{greywaterMandate}% of Buildings</span>
            </div>
            <input
              type="range" min="0" max="100" step="5" value={greywaterMandate}
              onChange={(e) => { setGreywaterMandate(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Untreated)</span>
              <span>50%</span>
              <span>100% (Closed Loop Water)</span>
            </div>
          </div>

          {/* Slider 6: Solar Microgrid Mandate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                6. Clean Energy & Solar Microgrid Share
              </span>
              <span className="font-mono font-bold text-amber-400">{solarMandate}% Grid</span>
            </div>
            <input
              type="range" min="10" max="100" step="5" value={solarMandate}
              onChange={(e) => { setSolarMandate(parseInt(e.target.value, 10)); setActivePreset("custom"); }}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10% (Fossil Grid)</span>
              <span>50%</span>
              <span>100% (100% Clean Decentralized)</span>
            </div>
          </div>

          {/* AI Simulation Insight Callout */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>AI Multi-Variable Sensitivity Verdict:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Pairing a ₹{congestionTax} congestion toll with +{metroExpansion} km of metro rail and {evAdoption}% EV adoption shifts modal share by {trafficReduction}%, achieving an optimal municipal health rating of {projectedHealthScore}/100.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIfSimulator;
