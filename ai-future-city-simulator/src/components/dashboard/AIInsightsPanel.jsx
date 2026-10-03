import React, { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, ArrowRight, Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../../context/CityContext";
import confetti from "canvas-confetti";

export const AIInsightsPanel = () => {
  const { aiInsights, city } = useCity();
  const navigate = useNavigate();
  const [appliedPolicies, setAppliedPolicies] = useState({});

  const handleApplyPolicy = (insightId) => {
    setAppliedPolicies((prev) => ({ ...prev, [insightId]: true }));
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#00f0ff", "#3b82f6", "#10b981"]
    });
  };

  const getImpactBadge = (impact) => {
    switch (impact?.toLowerCase()) {
      case "critical":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "high":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>EXAMPLE POLICY SUGGESTIONS</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Local templates
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Bundled example suggestions for {city.name}; no connected AI analysis service
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/ai-recommendations")}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline"
        >
          <span>Full Policy Suite</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
        {aiInsights.map((insight) => {
          const isApplied = appliedPolicies[insight.id];

          return (
            <div
              key={insight.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-cyan-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                    {insight.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {insight.confidence}% template score
                    </span>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider ${getImpactBadge(
                        insight.impact
                      )}`}
                    >
                      {insight.impact}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {insight.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  "{insight.insight}"
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  Horizon: {insight.timeframe}
                </span>

                <button
                  onClick={() => handleApplyPolicy(insight.id)}
                  disabled={isApplied}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isApplied
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                      : "bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/20"
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Reviewed</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      <span>Mark reviewed</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>These suggestions are static examples and are not recomputed from sensor data.</span>
        <span className="text-cyan-400 font-semibold font-mono">Local review only</span>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
