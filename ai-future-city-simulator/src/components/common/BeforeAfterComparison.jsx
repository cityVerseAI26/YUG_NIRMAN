import React from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Minus } from "lucide-react";

const TREND_STYLES = {
  better: {
    label: "Improved",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    valueClass: "text-emerald-200",
    icon: CheckCircle2,
  },
  worse: {
    label: "Declined",
    className: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    valueClass: "text-rose-200",
    icon: AlertTriangle,
  },
  neutral: {
    label: "Changed",
    className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    valueClass: "text-cyan-200",
    icon: Minus,
  },
  unchanged: {
    label: "No change",
    className: "border-slate-500/25 bg-slate-500/10 text-slate-300",
    valueClass: "text-slate-300",
    icon: Minus,
  },
};

export default function BeforeAfterComparison({
  title = "Before vs after",
  description,
  beforeLabel = "Before",
  afterLabel = "After",
  items,
  disclaimer,
}) {
  if (!items?.length) return null;

  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-slate-900/95 to-cyan-950/30 shadow-xl shadow-cyan-950/10"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-400/10 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Results at a glance</p>
          <h3 className="mt-1 text-sm font-black text-white">{title}</h3>
          {description && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{description}</p>}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide">
          <span className="rounded-full border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-slate-300">{beforeLabel}</span>
          <ArrowRight aria-hidden="true" className="h-3 w-3 text-cyan-300" />
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">{afterLabel}</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
        {items.map((item) => {
          const trend = TREND_STYLES[item.trend] || TREND_STYLES.neutral;
          const TrendIcon = trend.icon;

          return (
            <article key={item.label} className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/70 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[11px] font-bold leading-snug text-slate-200">{item.label}</h4>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${trend.className}`}>
                  <TrendIcon aria-hidden="true" className="h-3 w-3" />
                  {item.trendLabel || trend.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{beforeLabel}</p>
                  <p className="mt-1 truncate font-mono text-lg font-black text-slate-300" title={String(item.before)}>
                    {item.before}
                  </p>
                </div>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-cyan-300" />
                <div className="min-w-0 text-right">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-cyan-300/70">{afterLabel}</p>
                  <p className="mt-1 truncate font-mono text-lg font-black text-white" title={String(item.after)}>
                    {item.after}
                  </p>
                </div>
              </div>

              <div className={`mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[10px] ${trend.valueClass}`}>
                <span className="font-semibold">{item.change}</span>
                {item.note && <span className="truncate text-right text-slate-500" title={item.note}>{item.note}</span>}
              </div>
            </article>
          );
        })}
      </div>

      {disclaimer && (
        <p className="border-t border-cyan-400/10 px-4 py-3 text-[10px] leading-relaxed text-slate-400 sm:px-5">
          {disclaimer}
        </p>
      )}
    </section>
  );
}
