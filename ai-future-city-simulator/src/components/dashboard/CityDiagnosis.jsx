import React from "react";
import { Activity, AlertTriangle, ArrowRight, CircleHelp, Droplet, Leaf, Wind, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useCity } from "../../context/CityContext";
import { getCityDiagnosis } from "../../utils/cityDiagnosis";

const SEVERITY_STYLE = {
  HIGH: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  MODERATE: "border-amber-400/30 bg-amber-400/10 text-amber-200",
};
const PROBLEM_ICONS = {
  traffic: Activity,
  air: Wind,
  energy: Zap,
  water: Droplet,
  green: Leaf,
};

const EVIDENCE_STYLE = {
  "LIVE FEED": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "LIVE MODEL": "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "ILLUSTRATIVE PROFILE": "border-slate-400/30 bg-slate-400/10 text-slate-200",
};

function ProblemCard({ problem }) {
  const Icon = PROBLEM_ICONS[problem.id] || CircleHelp;
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-cyan-300">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">{problem.title}</h3>
            <p className="mt-1 text-[11px] text-slate-400">{problem.value}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-black tracking-wide ${SEVERITY_STYLE[problem.severity]}`}>
          {problem.severity} · SCREENING
        </span>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-wide ${EVIDENCE_STYLE[problem.evidenceClass]}`}>
          {problem.evidenceClass}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-400">Location</dt>
          <dd className="mt-0.5 text-slate-300">{problem.location}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Affected systems</dt>
          <dd className="mt-0.5 text-slate-300">{problem.systems}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Evidence · {problem.source}</dt>
          <dd className="mt-0.5 leading-relaxed text-slate-300">{problem.evidence}</dd>
          {problem.updatedAt && <dd className="mt-1 text-[10px] text-slate-500">Worker retrieval time: {problem.updatedAt}</dd>}
        </div>
        <div>
          <dt className="font-bold text-slate-400">Cause / limitation</dt>
          <dd className="mt-0.5 leading-relaxed text-slate-300">{problem.cause}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-cyan-200">Recommended next check</dt>
          <dd className="mt-0.5 leading-relaxed text-slate-300">{problem.nextCheck}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function CityDiagnosis({ onExplain }) {
  const { city, liveAirQuality, liveTrafficFlow } = useCity();
  const context = { city, liveAirQuality, liveTrafficFlow };
  const problems = getCityDiagnosis(context);

  return (
    <section id="city-diagnosis" aria-labelledby="city-diagnosis-title" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            INDICATOR SCREENING · {city.name}
          </div>
          <h2 id="city-diagnosis-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
            What needs a closer look?
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            These indicators may point to issues, but they do not confirm an incident or its cause.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onExplain}
          <Link to="/transportation" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-white">
            Review mobility data <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {problems.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {problems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4 text-xs text-slate-300">
          No available metric currently crosses these screening thresholds. This is not evidence that the city has no problems.
        </div>
      )}

      <details className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
        <summary className="cursor-pointer text-[11px] font-bold text-slate-300">
          Screening thresholds and limitations
        </summary>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          Demo congestion: moderate at 50%, high at 70%. AQI: moderate above 100,
          high above 150 on the US/profile scale; for European AQI, moderate
          above 40, high above 60. Energy and water profile indices: moderate at
          70%, high at 85%. Green-cover estimate: moderate below 20%, high below
          10%. These illustrative thresholds are not official standards. No
          location-level root cause is inferred from city-level profile values.
          Evidence labels distinguish live provider feeds, coordinate-level
          model output, and bundled profile proxies. Recommended next checks are
          validation steps, not quantified intervention or impact forecasts.
        </p>
      </details>
    </section>
  );
}
