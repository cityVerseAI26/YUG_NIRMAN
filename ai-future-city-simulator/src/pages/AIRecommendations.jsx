import React, { useState } from "react";
import {
  Bot,
  Sparkles,
  Check,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldAlert,
  Filter,
  CheckSquare,
  Activity,
  Layers
} from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import confetti from "canvas-confetti";

export const AIRecommendations = () => {
  const { aiInsights, city } = useCity();
  const [approvedItems, setApprovedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");

  const handleApprove = (id) => {
    setApprovedItems((prev) => ({ ...prev, [id]: true }));
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#00f0ff", "#10b981", "#8b5cf6", "#38bdf8"]
    });
  };

  const categories = ["all", ...new Set(aiInsights.map((r) => r.category))];

  const filteredInsights = activeCategory === "all"
    ? aiInsights
    : aiInsights.filter((r) => r.category === activeCategory);

  const approvedCount = Object.keys(approvedItems).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="RECOMMENDATION EXAMPLES"
        subtitle="Sample strategic-policy ideas for review"
        icon={Bot}
        badge="Sample templates"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{approvedCount} of {aiInsights.length} Reviewed</span>
            </span>
          </div>
        }
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        These are example recommendation templates from local sample data—not outputs from a connected AI service or a municipal authorization workflow. Approvals are stored only in this page session.
      </div>

      {/* ── Interactive Category Filters ── */}
      <div className="p-3.5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Filter Policy Recommendations:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {cat === "all" ? "All Recommendations" : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredInsights.map((rec) => {
          const isDone = approvedItems[rec.id];

          return (
            <div
              key={rec.id}
              className={`p-6 rounded-2xl glass-panel border transition-all duration-300 ${
                isDone
                  ? "border-emerald-500/50 bg-emerald-950/20 shadow-xl shadow-emerald-500/10"
                  : "border-cyan-500/25 bg-slate-900/60 hover:border-cyan-400/60 hover:shadow-lg"
              } flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                    {rec.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {rec.confidence}% Template score
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        rec.impact === "Critical"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {rec.impact}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mt-3">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  "{rec.insight}"
                </p>

                <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Implementation Horizon:</span>
                    <span className="text-white font-medium">{rec.timeframe}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Digital Twin:</span>
                    <span className="text-cyan-300 font-semibold">{city.name}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {isDone ? "Reviewed in this browser session" : "Not reviewed"}
                </span>

                <button
                  onClick={() => handleApprove(rec.id)}
                  disabled={isDone}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDone
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 font-black hover:scale-105"
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reviewed</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Mark as Reviewed</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIRecommendations;
