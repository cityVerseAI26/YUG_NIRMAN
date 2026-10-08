import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, CircleHelp, X } from "lucide-react";
import { FEATURE_EXPLANATIONS } from "../../data/featureExplanations";

const FLOW_STEPS = [
  { key: "problem", label: "Problem" },
  { key: "analysis", label: "AI analysis" },
  { key: "prediction", label: "Prediction" },
  { key: "simulation", label: "Simulation" },
  { key: "impact", label: "Impact" },
];

const flowContent = (feature, key) => {
  if (key === "problem") return feature.problem;
  if (key === "analysis") return feature.analysis;
  if (key === "prediction") return feature.prediction;
  if (key === "simulation") return feature.simulation;
  return feature.impactNote;
};

export default function FeatureWhy({ featureIds, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const validFeatureIds = (Array.isArray(featureIds) ? featureIds : [featureIds])
    .filter((id) => FEATURE_EXPLANATIONS[id]);
  const firstFeatureId = validFeatureIds[0];
  const validFeatureKey = validFeatureIds.join("|");
  const [activeId, setActiveId] = useState(validFeatureIds[0]);
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const activeFeature = FEATURE_EXPLANATIONS[activeId];
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!validFeatureKey.split("|").includes(activeId)) setActiveId(firstFeatureId);
  }, [activeId, firstFeatureId, validFeatureKey]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = document.querySelectorAll('[role="dialog"] button:not([disabled])');
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton?.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  if (validFeatureIds.length === 0) return null;

  const animation = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: { opacity: 0, y: 18, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 12, scale: 0.98 },
    };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          triggerRef.current = document.activeElement;
          setActiveId(validFeatureIds[0]);
          setIsOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label={`Why we added ${validFeatureIds.length === 1 ? activeFeature?.title : "these features"}`}
        className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] px-3 py-2 text-xs font-bold text-cyan-200 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white ${className}`}
      >
        <CircleHelp aria-hidden="true" className="h-4 w-4" />
        <span>Why?</span>
      </button>

      <AnimatePresence>
        {isOpen && activeFeature && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <motion.section
              {...animation}
              transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="feature-why-title"
              aria-describedby="feature-why-purpose"
              className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-cyan-400/25 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/40 sm:rounded-3xl sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">WHY THIS FEATURE?</p>
                  <h2 id="feature-why-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
                    {activeFeature.title}
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close feature explanation"
                  className="rounded-xl border border-slate-700 p-2 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              {validFeatureIds.length > 1 && (
                <div role="tablist" aria-label="Related feature explanations" className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {validFeatureIds.map((id) => {
                    const feature = FEATURE_EXPLANATIONS[id];
                    const selected = activeId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveId(id)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                          selected
                            ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                            : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                      >
                        {feature.title}
                      </button>
                    );
                  })}
                </div>
              )}

              <p id="feature-why-purpose" className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4 text-sm leading-relaxed text-slate-200">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-cyan-200">Why we added it</span>
                {activeFeature.whyAdded}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-200">The urban problem</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{activeFeature.problem}</p>
                </article>
                <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-200">Why it matters for a future city</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{activeFeature.futureImportance}</p>
                </article>
              </div>

              <div className="mt-5">
                <div role="group" aria-label="Feature decision-support flow" className="grid grid-cols-5 gap-1.5">
                  {FLOW_STEPS.map((step, index) => (
                    <div key={step.key} className="min-w-0 rounded-xl border border-cyan-400/15 bg-slate-900/60 px-1.5 py-2 text-center sm:px-3">
                      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/30 text-[9px] font-black text-cyan-200">
                        {index + 1}
                      </span>
                      <span className="mt-1 block text-[8px] font-black uppercase tracking-wide text-cyan-300 sm:text-[9px]">
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/35 px-3">
                  {FLOW_STEPS.map((step) => (
                    <div key={step.key} className="grid gap-1 py-2 sm:grid-cols-[105px_minmax(0,1fr)] sm:gap-3">
                      <h3 className="text-[10px] font-bold text-cyan-200">{step.label}</h3>
                      <p className="text-[11px] leading-relaxed text-slate-300">{flowContent(activeFeature, step.key)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <ArrowDown aria-hidden="true" className="h-3 w-3" />
                  <span>From a city problem to an evidence-informed planning decision</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-violet-200">What decision can be made?</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{activeFeature.decision}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.035] p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-rose-200">Without this feature</h3>
                  <ul className="mt-2 space-y-1.5">
                    {activeFeature.without.map((item) => (
                      <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                        <span aria-hidden="true" className="text-rose-300">−</span>{item}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-emerald-200">With YUG NIRMAN</h3>
                  <ul className="mt-2 space-y-1.5">
                    {activeFeature.with.map((item) => (
                      <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                        <span aria-hidden="true" className="text-emerald-300">+</span>{item}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">Expected planning outcomes</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeFeature.impacts.map((impact) => (
                    <span key={impact} className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
                      {impact}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{activeFeature.impactNote}</p>
              </div>

              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">What YUG NIRMAN does today</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{activeFeature.currentCapability}</p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  “AI analysis” describes the decision-support stage. Current app behavior uses connected public feeds where available, transparent rules, sample templates, and illustrative scenarios—not a trained AI model unless explicitly stated.
                </p>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
