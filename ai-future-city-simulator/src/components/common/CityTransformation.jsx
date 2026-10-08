import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Minus,
  MapPin,
  CheckCircle2,
  Car,
  Wind,
  Droplet,
  Zap,
  Trees,
  Building2,
  Clock,
  CloudRain,
  Waves,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  TrendingDown,
  TrendingUp,
  Cpu,
  FileCheck,
  Sliders,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { summarizeTransformation } from "../../utils/cityTransformation";

const ICON_MAP = {
  Car,
  Wind,
  Droplet,
  Zap,
  Trees,
  Building2,
  Clock,
  CloudRain,
  Waves,
  ShieldAlert,
  ShieldCheck,
  Users,
};

const CATEGORY_COLORS = {
  cyan: {
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    border: "border-cyan-500/20",
    text: "text-cyan-300",
  },
  emerald: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    border: "border-emerald-500/20",
    text: "text-emerald-300",
  },
  blue: {
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    border: "border-blue-500/20",
    text: "text-blue-300",
  },
  amber: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    border: "border-amber-500/20",
    text: "text-amber-300",
  },
  violet: {
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    border: "border-violet-500/20",
    text: "text-violet-300",
  },
  teal: {
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-200",
    border: "border-teal-500/20",
    text: "text-teal-300",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    border: "border-rose-500/20",
    text: "text-rose-300",
  },
};

export default function CityTransformation({
  transformation,
  title = "CITY TRANSFORMATION · BEFORE vs AFTER",
}) {
  const [activeCategory, setActiveCategory] = useState("mobility");
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [expandedRows, setExpandedRows] = useState({});

  if (!transformation) return null;

  const {
    transformationScore,
    coreMetrics = [],
    kpiSummary = [],
    interventions = [],
    impactInterpretations = [],
    benefits = [],
    tradeoffs = [],
    remainingProblems = [],
    categoryComparisons = [],
    decisionFlows = [],
    metadata = {},
  } = transformation;

  const toggleCategory = (id) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const beforeScore = transformationScore?.before ?? 61;
  const afterScore = transformationScore?.after ?? 78;
  const scoreDelta = transformationScore?.delta ?? (afterScore - beforeScore);
  const scoreDeltaPct = transformationScore?.deltaPercent ?? ((scoreDelta / beforeScore) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* ── 1. Top Transformation Header & Hero Card ── */}
      <section
        aria-labelledby="city-transformation-header"
        className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-5 shadow-2xl shadow-cyan-950/30 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-cyan-400/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-200">
                {metadata.dataStatus || "LIVE SENSORS + SIMULATION"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {metadata.baselineDate || "08 Oct 2026"} · {metadata.forecastHorizon || "2035 Horizon"}
              </span>
            </div>
            <h2 id="city-transformation-header" className="mt-1.5 text-lg font-black tracking-wide text-white sm:text-xl">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              {transformation.cityName || "City"} · <span className="text-cyan-300 font-semibold">{transformation.intervention || "Intervention Scenario"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 p-1.5 font-mono text-[11px] font-bold">
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-slate-300">BEFORE</span>
            <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
            <span className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-cyan-200">AFTER</span>
          </div>
        </div>

        {/* Hero Visual Comparison: Health Score & Net Impact */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-5 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                City Transformation Score
              </p>
              <div className="mt-4 flex items-center justify-around gap-4 text-center sm:justify-start sm:gap-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Before</p>
                  <p className="mt-1 font-mono text-3xl font-black text-slate-300 sm:text-4xl">{beforeScore}</p>
                  <p className="text-[10px] text-slate-500">Health Score / 100</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <span className="mt-1 font-mono text-xs font-black text-emerald-400">
                    +{scoreDelta} pts
                  </span>
                  <span className="text-[9px] text-emerald-300/80 font-bold">
                    +{scoreDeltaPct}% improvement
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">After</p>
                  <p className="mt-1 font-mono text-3xl font-black text-cyan-100 sm:text-4xl">{afterScore}</p>
                  <p className="text-[10px] text-cyan-300/70">Health Score / 100</p>
                </div>
              </div>
            </div>

            {/* Score Breakdown Pills */}
            {transformationScore?.breakdown?.length > 0 && (
              <div className="mt-5 border-t border-slate-800/80 pt-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Transformation Gain by System:
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {transformationScore.breakdown.map((item) => (
                    <div key={item.category} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-center">
                      <p className="text-[8px] font-bold uppercase text-slate-400 truncate">{item.category}</p>
                      <p className="mt-0.5 font-mono text-xs font-black text-cyan-300">{item.delta}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decision Philosophy Summary Box */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Urban Decision Support Logic
                </h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                A rigorous urban evaluation proves whether an intervention truly benefits the city by answering three fundamental questions:
              </p>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                <p className="text-[10px] font-black uppercase text-emerald-300">1. Why did it improve?</p>
                <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">
                  Multi-modal public transit and green canopy offset vehicular congestion & particulate emissions.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5">
                <p className="text-[10px] font-black uppercase text-amber-300">2. What got worse / trade-offs?</p>
                <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">
                  Municipal CapEx outlay increases, accompanied by short-term corridor construction diversions.
                </p>
              </div>
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-2.5">
                <p className="text-[10px] font-black uppercase text-rose-300">3. What remains unresolved?</p>
                <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">
                  Summer water stress and peripheral freight bottleneck zones require follow-up phases.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Top Visual KPI Summary Cards ── */}
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Core Indicator Shifts (Before vs After)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {kpiSummary.map((kpi) => {
              const Icon = ICON_MAP[kpi.icon] || Activity;
              return (
                <div
                  key={kpi.label}
                  className="group rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-cyan-500/40 hover:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate">{kpi.label}</span>
                    <Icon className="h-3.5 w-3.5 text-cyan-300" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-1">
                    <span className="font-mono text-xs text-slate-400">{kpi.before}</span>
                    <span className="text-[10px] text-slate-600">→</span>
                    <span className="font-mono text-sm font-black text-white">{kpi.after}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[10px] font-bold">
                    <span className={kpi.positive ? "text-emerald-400" : "text-amber-400"}>
                      {kpi.change}
                    </span>
                    <span className="text-[9px] uppercase text-slate-500">
                      {kpi.positive ? "Improved" : "Worsened"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Core Comparison Metrics Table ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white sm:text-base">
              1. Core Comparison Metrics Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Derived directly from dynamic simulation inputs and calibrated city baselines.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Improved
            <span className="inline-block h-2 w-2 rounded-full bg-slate-500 ml-2" /> Stable
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-slate-900/90 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Before</th>
                <th className="px-4 py-3">After</th>
                <th className="px-4 py-3">Change (Absolute)</th>
                <th className="px-4 py-3">Relative Shift</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {coreMetrics.map((row) => {
                const Icon = ICON_MAP[row.icon] || Activity;
                const isExpanded = expandedRows[row.id];
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleRow(row.id)}
                      className="cursor-pointer transition hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-cyan-300">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span>{row.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{row.before}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{row.after}</td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-200">{row.change}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{row.changePercent}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            row.positive
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {row.positive && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && row.interpretation && (
                      <tr className="bg-slate-900/40">
                        <td colSpan={6} className="px-4 py-2.5 text-[11px] text-slate-300 border-l-2 border-cyan-400">
                          <span className="font-bold text-cyan-300 uppercase text-[9px] mr-2">Interpretation:</span>
                          {row.interpretation}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Tip: Click any row to expand qualitative urban planning interpretation.
        </p>
      </section>

      {/* ── 4. What Changed? (Scenario Interventions) ── */}
      <section className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              2. What Changed? (Scenario Interventions)
            </h3>
            <p className="text-xs text-slate-400">
              The policy triggers and infrastructure investments driving the After outcome.
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200">
            {interventions.length} Active Interventions
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {interventions.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Impact Interpretation Deep Dive ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            3. Impact Interpretation & Data Confidence
          </h3>
          <p className="text-xs text-slate-400">
            Detailed qualitative assessment of why the numbers changed and confidence calibration.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {impactInterpretations.map((card) => {
            const Icon = ICON_MAP[card.icon] || Activity;
            return (
              <div
                key={card.category}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-cyan-500/30"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-cyan-300" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        {card.category}
                      </h4>
                    </div>
                    <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold text-cyan-200 font-mono">
                      Conf: {card.confidence}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Before:</span>
                      <p className="text-slate-300">{card.beforeText}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-cyan-300 block">After:</span>
                      <p className="text-slate-200">{card.afterText}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 block">Impact:</span>
                      <p className="text-emerald-100 font-semibold">{card.impactText}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 font-mono">
                  Data: {card.dataSource}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. Benefits + Trade-offs Grid ── */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Benefits Column */}
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
              System Benefits Proven
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-200">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-slate-950/60 p-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="leading-snug">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trade-offs Column */}
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
              Trade-offs & Implementation Costs
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {tradeoffs.map((tradeoff, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-slate-950/60 p-2.5">
                <span className="text-amber-400 font-bold">⚠</span>
                <span className="leading-snug">{tradeoff}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 7. Remaining Problems (Unresolved Challenges) ── */}
      <section className="rounded-2xl border border-rose-500/30 bg-rose-950/15 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
            Remaining Unresolved Challenges
          </h3>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          Prevents pretending that every urban intervention completely solves the city; highlights what needs phase-two attention:
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {remainingProblems.map((prob, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-slate-950/70 p-3 text-xs text-slate-200"
            >
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{prob}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Problem → Solution → Result Urban Intelligence Flow ── */}
      <section className="rounded-2xl border border-cyan-500/25 bg-slate-950/80 p-5 shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              4. Problem → Solution → Result
            </h3>
            <p className="text-xs text-slate-400">
              Connects urban distress causes directly to policy interventions and multi-system spillover impacts.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {decisionFlows.map((flow, index) => (
              <button
                key={flow.title}
                type="button"
                onClick={() => setActiveFlowIndex(index)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeFlowIndex === index
                    ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                }`}
              >
                {flow.title}
              </button>
            ))}
          </div>
        </div>

        {decisionFlows[activeFlowIndex] && (
          <div className="relative mt-2">
            <div className="grid gap-3 sm:grid-cols-5">
              {/* Step 1: Problem */}
              <div className="flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-950/15 p-3.5">
                <div>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-300 font-mono">
                    1. Problem
                  </span>
                  <p className="mt-2 text-xs font-bold text-white leading-snug">
                    {decisionFlows[activeFlowIndex].problem}
                  </p>
                </div>
                <div className="mt-3 flex justify-center text-slate-600 sm:hidden">
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>

              {/* Step 2: Root Cause */}
              <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-950/15 p-3.5">
                <div>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 font-mono">
                    2. Root Cause
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-200 leading-snug">
                    {decisionFlows[activeFlowIndex].rootCause}
                  </p>
                </div>
                <div className="mt-3 flex justify-center text-slate-600 sm:hidden">
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>

              {/* Step 3: Intervention */}
              <div className="flex flex-col justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3.5">
                <div>
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-200 font-mono">
                    3. Intervention
                  </span>
                  <p className="mt-2 text-xs font-bold text-cyan-100 leading-snug">
                    {decisionFlows[activeFlowIndex].intervention}
                  </p>
                </div>
                <div className="mt-3 flex justify-center text-slate-600 sm:hidden">
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>

              {/* Step 4: After State */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
                <div>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300 font-mono">
                    4. After State
                  </span>
                  <p className="mt-2 text-xs font-bold text-white leading-snug">
                    {decisionFlows[activeFlowIndex].after}
                  </p>
                </div>
                <div className="mt-3 flex justify-center text-slate-600 sm:hidden">
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>

              {/* Step 5: System Impact */}
              <div className="flex flex-col justify-between rounded-xl border border-violet-500/30 bg-violet-950/20 p-3.5">
                <div>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-300 font-mono">
                    5. System Impact
                  </span>
                  <p className="mt-2 text-xs font-semibold text-violet-200 leading-snug">
                    {decisionFlows[activeFlowIndex].impact}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 9. Category-by-Category Expandable Deep Dive ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            5. Category-by-Category System Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Expand any urban domain for targeted indicators, before/after measurements, and interpretations.
          </p>
        </div>

        <div className="space-y-3">
          {categoryComparisons.map((cat) => {
            const isOpened = activeCategory === cat.id;
            const Icon = ICON_MAP[cat.icon] || Layers;
            const theme = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.cyan;
            return (
              <div
                key={cat.id}
                className={`overflow-hidden rounded-xl border transition ${
                  isOpened ? `${theme.border} bg-slate-900/90` : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between p-4 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">{cat.title}</h4>
                      <p className="text-[10px] text-slate-400">{cat.metrics.length} tracked indicators</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border ${theme.badge}`}>
                      {cat.title}
                    </span>
                    {isOpened ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {isOpened && (
                  <div className="border-t border-slate-800 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {cat.metrics.map((m) => (
                        <div
                          key={m.name}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{m.name}</span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                              {m.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between border-t border-slate-800/80 pt-2 text-xs">
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase block">Before</span>
                              <span className="font-mono text-slate-400">{m.before}</span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-slate-600" />
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase block">After</span>
                              <span className="font-mono font-bold text-white">{m.after}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-cyan-400 uppercase block">Change</span>
                              <span className="font-mono font-bold text-cyan-300">{m.change}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400 leading-snug border-t border-slate-800/60 pt-2">
                            {m.interpretation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 10. Metadata, Confidence & Audit Footer ── */}
      <footer className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Data Sources</span>
            <span className="font-mono text-[11px] text-slate-300">{metadata.dataSource || "TomTom + OpenAQ + Municipal Twin"}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Baseline Timestamp</span>
            <span className="font-mono text-[11px] text-slate-300">{metadata.baselineDate || "08 Oct 2026"}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Confidence Calibration</span>
            <span className="font-mono text-[11px] text-emerald-400 font-bold">{metadata.confidence || "84%"} · {metadata.confidenceRating || "HIGH RELIABILITY"}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Spatial Map Link</span>
            <Link to="/digital-twin" className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:underline">
              Inspect on Digital Twin <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
