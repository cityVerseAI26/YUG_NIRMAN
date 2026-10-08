import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildImpactMetrics, formatMetricValue } from "../../utils/impactAnalysis";

const DATA_SOURCE_STYLES = {
  LIVE: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  SIMULATED: "border-cyan-400/35 bg-cyan-500/10 text-cyan-200",
  PREDICTED: "border-violet-400/35 bg-violet-500/10 text-violet-200",
  ESTIMATED: "border-amber-400/35 bg-amber-500/10 text-amber-200",
  UNAVAILABLE: "border-slate-500/25 bg-slate-500/10 text-slate-300",
};

const CONTROL_STYLES = {
  improved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  worsened: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  "no significant change": "border-slate-500/30 bg-slate-500/10 text-slate-200",
  unavailable: "border-slate-500/25 bg-slate-500/10 text-slate-400",
};

const getTrendMeta = (direction) => {
  switch (direction) {
    case "improved":
      return { label: "Improved", Icon: TrendingUp, className: CONTROL_STYLES.improved };
    case "worsened":
      return { label: "Worsened", Icon: TrendingDown, className: CONTROL_STYLES.worsened };
    case "no significant change":
      return { label: "No significant change", Icon: Minus, className: CONTROL_STYLES["no significant change"] };
    default:
      return { label: "Unavailable", Icon: AlertTriangle, className: CONTROL_STYLES.unavailable };
  }
};

const formatSignedDelta = (value, unit) => {
  if (value == null) return "N/A";
  const numeric = Number(value.toFixed(1));
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  const positiveNumber = Math.abs(numeric);
  return `${sign}${positiveNumber}${unit}`;
};

const formatPercent = (value) => {
  if (value == null) return "N/A";
  const numeric = Number(value.toFixed(1));
  return `${numeric > 0 ? "+" : numeric < 0 ? "-" : ""}${Math.abs(numeric)}%`;
};

const DEFAULT_SCENARIO_SUMMARY = [
  "Lower travel delay and less stop-start movement across the urban grid.",
  "Improved public health conditions and cleaner air due to intervention effects.",
  "Resource demand shifts in the right direction, but maintenance and equity issues remain.",
];

export default function ImpactAnalysisComparison({
  beforeState = {},
  afterState = {},
  scenario = {},
  metrics,
  timestamp,
  dataSource = "SIMULATED",
  scenarioOptions = [],
  selectedScenarioId,
  onScenarioChange,
}) {
  const [changeMode, setChangeMode] = useState("percentage");
  const [expanded, setExpanded] = useState(true);

  const impactMetrics = useMemo(() => {
    if (Array.isArray(metrics) && metrics.length) return metrics;
    return buildImpactMetrics({ beforeState, afterState });
  }, [beforeState, afterState, metrics]);

  const chartData = useMemo(() => impactMetrics.slice(0, 6).map((metric) => ({
    name: metric.label,
    before: metric.before ?? 0,
    after: metric.after ?? 0,
  })), [impactMetrics]);

  const scenarioName = scenario?.name || "Selected scenario";
  const scenarioSummary = scenario?.tagline || scenario?.summary || DEFAULT_SCENARIO_SUMMARY[0];
  const interventionCost = scenario?.estimatedInterventionCost || scenario?.capex || "₹18,500 Cr";
  const expectedBenefit = scenario?.expectedBenefit || scenario?.benefit || "High public-health and mobility gains";
  const whatChanged = scenario?.whatChanged || "The intervention shifts mobility, emissions, and service efficiency in a direction that improves city functioning while leaving some legacy risk and public-service pressure in place.";
  const remainingProblems = scenario?.cons?.length ? scenario.cons : [
    "Legacy water and sewer constraints still bind during peak demand.",
    "Some districts remain exposed to heat and localized service stress.",
  ];
  const tradeOffs = scenario?.tradeOffs || [
    "Capital financing is front-loaded and requires sustained maintenance funding.",
    "Transit and greenspace investments can shift land use and service priorities.",
  ];
  const newRisks = impactMetrics.filter((metric) => metric.direction === "worsened").map((metric) => metric.label);
  const quickWins = impactMetrics.filter((metric) => metric.direction === "improved").slice(0, 3).map((metric) => metric.label);
  const sourceStyle = DATA_SOURCE_STYLES[dataSource] || DATA_SOURCE_STYLES.SIMULATED;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label="Before and after impact analysis"
      className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(8,47,73,0.94)_45%,rgba(2,6,23,0.98))] shadow-[0_20px_60px_rgba(14,116,144,0.12)]"
    >
      <div className="flex flex-col gap-4 border-b border-cyan-500/10 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">Urban digital twin</p>
          <h2 className="mt-1 text-base font-black tracking-tight text-white sm:text-lg">BEFORE vs AFTER IMPACT ANALYSIS</h2>
          <p className="mt-1 text-[11px] text-slate-400">{scenarioName} · {scenarioSummary}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {scenarioOptions.length > 0 && (
            <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              <span>Scenario</span>
              <select
                aria-label="Select scenario for comparison"
                value={selectedScenarioId || scenarioOptions[0]?.id || ""}
                onChange={(event) => onScenarioChange?.(event.target.value)}
                className="rounded-full border border-cyan-500/30 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white outline-none"
              >
                {scenarioOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>
          )}

          <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/80 p-1 text-[9px] font-bold uppercase tracking-wide text-slate-300">
            {[
              { key: "percentage", label: "% change" },
              { key: "absolute", label: "Absolute" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setChangeMode(option.key)}
                className={`rounded-full px-2.5 py-1.5 transition ${changeMode === option.key ? "bg-cyan-500/15 text-cyan-200 shadow-inner shadow-cyan-500/20" : "text-slate-400 hover:text-slate-200"}`}
                aria-label={`Toggle ${option.label} view`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_120px_minmax(0,1.2fr)] lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-slate-700/70 bg-slate-950/75 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.45)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Before</span>
            <span className="rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">Current city</span>
          </div>

          <div className="mt-4 space-y-3">
            {impactMetrics.slice(0, 3).map((metric) => (
              <div key={`${metric.label}-before`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{metric.label}</p>
                    <motion.p
                      key={`before-${metric.label}-${metric.before}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 font-mono text-xl font-black tracking-tight text-slate-100"
                    >
                      {formatMetricValue(metric.before, metric.unit)}
                    </motion.p>
                  </div>
                  <span className="rounded-full border border-slate-600 bg-slate-800/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300">{dataSource}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/25 via-slate-950 to-sky-500/20 shadow-[0_0_35px_rgba(34,211,238,0.22)]"
          >
            <div className="text-center">
              <div className="flex items-center justify-center text-cyan-200"><Gauge className="h-4 w-4" /></div>
              <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.22em] text-cyan-200">City</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-white">Transformation</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 shadow-[0_12px_32px_rgba(34,211,238,0.18)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">After</span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-100">Projected city</span>
          </div>

          <div className="mt-4 space-y-3">
            {impactMetrics.slice(0, 3).map((metric) => (
              <div key={`${metric.label}-after`} className="rounded-xl border border-cyan-400/20 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">{metric.label}</p>
                    <motion.p
                      key={`after-${metric.label}-${metric.after}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 font-mono text-xl font-black tracking-tight text-white"
                    >
                      {formatMetricValue(metric.after, metric.unit)}
                    </motion.p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${sourceStyle}`}>
                    {dataSource}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid gap-3 border-t border-cyan-500/10 bg-slate-950/40 px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
        {[
          ["Scenario", scenarioName],
          ["Validation", "Not model-validated"],
          ["Data time", timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Not applicable · bundled sample"],
          ["Intervention cost", interventionCost],
          ["Expected benefit", expectedBenefit],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-200">{value}</p>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Scenario comparison</p>
            <h3 className="mt-1 text-sm font-black text-white">Illustrative differences across selected metrics</h3>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-400/35 hover:text-cyan-200">
              View Full Impact Analysis
            </button>
            <button type="button" className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-400/15">
              Generate Report
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {impactMetrics.map((metric) => {
              const trendMeta = getTrendMeta(metric.direction);
              const TrendIcon = trendMeta.Icon;
              const deltaText = changeMode === "percentage"
                ? formatPercent(metric.percentageChange)
                : formatSignedDelta(metric.absoluteChange, metric.unit);
              const wideValue = Math.min(100, Math.abs((changeMode === "percentage" ? metric.percentageChange ?? 0 : metric.absoluteChange ?? 0) * 2.2));

              return (
                <motion.article
                  key={metric.label}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.4)]"
                  title={metric.explanation}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="max-w-[12rem] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">{metric.label}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${trendMeta.className}`}>
                      <TrendIcon className="h-3 w-3" />
                      {trendMeta.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2">
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">Before</p>
                      <p className="mt-1 font-mono text-base font-black text-slate-100">{formatMetricValue(metric.before, metric.unit)}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/8 p-2">
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">After</p>
                      <p className="mt-1 font-mono text-base font-black text-white">{formatMetricValue(metric.after, metric.unit)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{changeMode === "percentage" ? "% Change" : "Absolute change"}</span>
                      <span className={`font-mono text-[11px] font-black ${metric.direction === "improved" ? "text-emerald-200" : metric.direction === "worsened" ? "text-rose-200" : "text-slate-200"}`}>
                        {deltaText}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${metric.direction === "improved" ? "bg-emerald-400" : metric.direction === "worsened" ? "bg-rose-400" : "bg-slate-500"}`}
                        style={{ width: `${wideValue}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[9px] leading-relaxed text-slate-500">{metric.summary}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">What changed?</h4>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{whatChanged}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Key improvements</p>
              <ul className="mt-2 space-y-2">
                {quickWins.length ? quickWins.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </li>
                )) : <li className="text-[11px] text-slate-400">No strong improvement signals are available in this run.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Remaining problems</p>
              <ul className="mt-2 space-y-2">
                {remainingProblems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">New risks</p>
              <ul className="mt-2 space-y-2">
                {newRisks.length ? newRisks.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                    <span>{item}</span>
                  </li>
                )) : <li className="text-[11px] text-slate-400">No major new risks are identified in this scenario.</li>}
              </ul>
            </div>
          </aside>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="mt-5 overflow-hidden"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Before → After comparison</h4>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(2,6,23,0.95)",
                          border: "1px solid rgba(34,211,238,0.2)",
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: "#f8fafc",
                        }}
                      />
                      <Bar dataKey="before" fill="#64748b" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="after" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Trade-offs</p>
                  <ul className="mt-2 space-y-2 text-[11px] text-slate-300">
                    {tradeOffs.map((item) => <li key={item} className="leading-relaxed">• {item}</li>)}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Estimated intervention cost</p>
                  <p className="mt-2 text-lg font-black text-white">{interventionCost}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Expected benefit: {expectedBenefit}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            <span className={`rounded-full border px-2 py-1 font-bold ${sourceStyle}`}>{dataSource}</span>
            <span>Not model-validated</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            {expanded ? "Collapse detailed analysis" : "Expand detailed analysis"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
