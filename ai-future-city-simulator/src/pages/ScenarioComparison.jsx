import React, { useState } from "react";
import {
  GitCompare,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";

export const ScenarioComparison = () => {
  const { city } = useCity();

  const [selectedScenarioId, setSelectedScenarioId] = useState("green");
  const [investmentScale, setInvestmentScale] = useState(100); // 50% - 150%

  // Multi-scenario data
  const scenarios = [
    {
      id: "baseline",
      name: "Status Quo (Baseline)",
      tagline: "Unconstrained historical growth with minimal municipal policy intervention",
      badge: "Base Trajectory",
      color: "border-slate-700 bg-slate-900/60",
      accent: "text-slate-300",
      radarColor: "#94a3b8",
      metrics: {
        population: "16.5M",
        traffic: "88% Congestion",
        aqi: "192 (Poor)",
        water: "94% Stressed",
        energy: "91% Load",
        capex: "₹0 Cr Added",
        health: "64 / 100",
        trafficNum: 88,
        aqiNum: 192,
        healthNum: 64,
        resilienceNum: 52
      },
      pros: ["Zero initial municipal capital borrowing", "No transition friction for legacy industries"],
      cons: ["Severe arterial gridlock during monsoon surges", "Potable water rationing highly likely by 2033"]
    },
    {
      id: "green",
      name: "Aggressive Green Transition",
      tagline: "Electrified mobility corridors, urban bioswales, and decentralized solar microgrids",
      badge: "Example Scenario",
      color: "border-emerald-500/40 bg-emerald-950/20 shadow-xl shadow-emerald-500/10",
      accent: "text-emerald-400",
      radarColor: "#10b981",
      metrics: {
        population: "16.1M",
        traffic: `${Math.round(54 / (investmentScale / 100))}% Congestion`,
        aqi: `${Math.round(78 / (investmentScale / 100))} (Good)`,
        water: "62% Optimal",
        energy: "70% (58% Clean)",
        capex: `₹${Math.round(18500 * (investmentScale / 100)).toLocaleString()} Cr`,
        health: `${Math.min(98, Math.round(89 * (investmentScale / 100)))} / 100`,
        trafficNum: Math.round(54 / (investmentScale / 100)),
        aqiNum: Math.round(78 / (investmentScale / 100)),
        healthNum: Math.min(98, Math.round(89 * (investmentScale / 100))),
        resilienceNum: Math.min(96, Math.round(92 * (investmentScale / 100)))
      },
      pros: ["72% reduction in particulate matter emissions", "Resilient urban heat island dampening (-2.8°C)"],
      cons: ["High initial municipal capital financing required", "Land acquisition timelines for light rail corridors"]
    },
    {
      id: "hyperdense",
      name: "Hyper-Dense Urbanization",
      tagline: "High-FSI vertical clusters, autonomous transit pods, and mega-corridors",
      badge: "High Density Growth",
      color: "border-cyan-500/30 bg-cyan-950/20",
      accent: "text-cyan-400",
      radarColor: "#0ea5e9",
      metrics: {
        population: "18.4M",
        traffic: "72% (Metro Buffered)",
        aqi: "138 (Moderate)",
        water: "86% High Draw",
        energy: "96% High Peak",
        capex: `₹${Math.round(34000 * (investmentScale / 100)).toLocaleString()} Cr`,
        health: "78 / 100",
        trafficNum: 72,
        aqiNum: 138,
        healthNum: 78,
        resilienceNum: 74
      },
      pros: ["Maximum economic output & municipal tax density", "Over 78% mass transit public ridership modal share"],
      cons: ["Heavy local stress on legacy water mains", "Reduced open public green spaces per inhabitant"]
    }
  ];

  // Radar comparative data
  const radarData = [
    { metric: "Livability", baseline: 64, green: scenarios[1].metrics.healthNum, hyperdense: 78 },
    { metric: "Clean Air", baseline: 35, green: Math.min(100, Math.round(200 - scenarios[1].metrics.aqiNum)), hyperdense: 55 },
    { metric: "Mobility Speed", baseline: 30, green: Math.round(100 - scenarios[1].metrics.trafficNum), hyperdense: 50 },
    { metric: "Climate Defense", baseline: 40, green: scenarios[1].metrics.resilienceNum, hyperdense: 65 },
    { metric: "Resource Resiliency", baseline: 45, green: 88, hyperdense: 60 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SCENARIO COMPARISON MATRIX"
        subtitle="Compare illustrative policy scenarios using bundled sample values"
        icon={GitCompare}
        badge="Sample scenarios"
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        Scenario metrics, costs, benefits, and rankings below are illustrative examples, not model-validated forecasts or an AI recommendation. Selecting a card changes this comparison view only; no city system is updated.
      </div>

      {/* ── Interactive Scaling Lever Bar ── */}
      <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Investment Scaling Multiplier
            </span>
            <span className="text-[11px] text-slate-400">
              Modulate municipal fiscal allocation across all three trajectories
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range" min="50" max="150" step="5" value={investmentScale}
            onChange={(e) => setInvestmentScale(parseInt(e.target.value, 10))}
            className="w-36 sm:w-48 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {investmentScale}% Scale
          </span>
        </div>
      </div>

      {/* ── Multi-Model Radar Comparison Graph ── */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              MULTI-VECTOR RADAR EVALUATION (2035 OUTCOMES)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Baseline
            </span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Green Transition
            </span>
            <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Hyper-Dense
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(14,165,233,0.15)" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} />
              <Radar name="Status Quo" dataKey="baseline" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
              <Radar name="Green Transition" dataKey="green" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
              <Radar name="Hyper-Dense" dataKey="hyperdense" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(4,14,38,0.95)",
                  borderColor: "rgba(14,165,233,0.3)",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "#fff"
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Comparison Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scenarios.map((sc) => {
          const isSelected = selectedScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`p-6 rounded-2xl glass-panel border cursor-pointer transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${sc.color} ${
                isSelected ? "ring-2 ring-cyan-400 shadow-2xl scale-[1.01]" : "hover:border-slate-600"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${sc.accent} bg-slate-900 border border-slate-700`}>
                    {sc.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">2035 Horizon</span>
                </div>

                <h3 className="text-lg font-black text-white mt-3">
                  {sc.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {sc.tagline}
                </p>

                {/* Metrics Table */}
                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Projected Population:</span>
                    <span className="font-mono font-bold text-white">{sc.metrics.population}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Road Congestion:</span>
                    <span className="font-mono font-bold text-rose-300">{sc.metrics.traffic}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Air Quality (AQI):</span>
                    <span className="font-mono font-bold text-amber-300">{sc.metrics.aqi}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Water Reservoir Load:</span>
                    <span className="font-mono font-bold text-cyan-300">{sc.metrics.water}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">CapEx Outlay:</span>
                    <span className="font-mono font-bold text-purple-300">{sc.metrics.capex}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Predicted Health Score:</span>
                    <span className={`font-mono font-black ${sc.accent}`}>{sc.metrics.health}</span>
                  </div>
                </div>

                {/* Pros & Cons */}
                <div className="mt-5 space-y-3 pt-3 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-emerald-400 font-bold block mb-1">Key Advantages:</span>
                    <ul className="space-y-1 text-slate-300 pl-2">
                      {sc.pros.map((p, i) => (
                        <li key={i} className="list-disc">{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-rose-400 font-bold block mb-1">Vulnerabilities & Trade-Offs:</span>
                    <ul className="space-y-1 text-slate-400 pl-2">
                      {sc.cons.map((c, i) => (
                        <li key={i} className="list-disc">{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <button
                className={`mt-6 w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selected for comparison</span>
                  </>
                ) : (
                  <span>Compare this scenario</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioComparison;
