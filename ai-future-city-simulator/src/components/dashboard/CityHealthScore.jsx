import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Activity } from "lucide-react";
import { useCity } from "../../context/CityContext";

export const CityHealthScore = () => {
  const { city } = useCity();
  const { healthScore } = city;
  const score = healthScore?.overall || 76;
  const status = healthScore?.status || "GOOD";
  const grade = healthScore?.grade || "A-";
  const breakdown = healthScore?.breakdown || [];

  // SVG circle calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return { stroke: "#10b981", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
    if (score >= 70) return { stroke: "#06b6d4", text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" };
    if (score >= 60) return { stroke: "#f59e0b", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    return { stroke: "#ef4444", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
  };

  const currentTheme = getScoreColor();

  return (
    <div className="h-full p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              CITY HEALTH SCORE
            </h3>
            <p className="text-[11px] text-slate-400">
              Bundled sample urban vitality index
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}
        >
          {status} ({grade})
        </span>
      </div>

      {/* Circular Gauge Center */}
      <div className="py-5 flex flex-col items-center justify-center relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-800/80"
              fill="transparent"
            />
            {/* Glow blur ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={currentTheme.stroke}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="opacity-30 blur-sm transition-all duration-1000 ease-out"
            />
            {/* Foreground animated ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={currentTheme.stroke}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Central readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span
              key={score}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-4xl font-extrabold text-white font-mono tracking-tight"
            >
              {score}
            </motion.span>
            <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
              out of 100
            </span>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-300">
              <Sparkles className="w-3 h-3" />
              <span>Sample weighted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Score Breakdown Bars */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        {breakdown.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{item.label}</span>
              <span className="text-white font-mono font-semibold">{item.score}%</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                className={`h-full rounded-full ${item.bg}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CityHealthScore;
