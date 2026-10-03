import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

export const MetricCard = ({
  title,
  value,
  displayValue,
  change,
  trend = "up",
  status,
  statusType = "normal", // 'good' | 'warning' | 'danger' | 'info'
  icon: Icon,
  sparkline = [],
  colorScheme = "cyan" // 'cyan' | 'amber' | 'rose' | 'blue' | 'purple' | 'emerald'
}) => {
  const isPositive = trend === "up";

  const colorStyles = {
    cyan: {
      border: "border-cyan-500/20 hover:border-cyan-400/50",
      glow: "hover:shadow-cyan-500/10",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      stroke: "#06b6d4",
      gradient: "from-cyan-500/20 to-transparent"
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-400/50",
      glow: "hover:shadow-amber-500/10",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      stroke: "#f59e0b",
      gradient: "from-amber-500/20 to-transparent"
    },
    rose: {
      border: "border-rose-500/20 hover:border-rose-400/50",
      glow: "hover:shadow-rose-500/10",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      stroke: "#f43f5e",
      gradient: "from-rose-500/20 to-transparent"
    },
    blue: {
      border: "border-blue-500/20 hover:border-blue-400/50",
      glow: "hover:shadow-blue-500/10",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      stroke: "#3b82f6",
      gradient: "from-blue-500/20 to-transparent"
    },
    purple: {
      border: "border-purple-500/20 hover:border-purple-400/50",
      glow: "hover:shadow-purple-500/10",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      stroke: "#a855f7",
      gradient: "from-purple-500/20 to-transparent"
    },
    emerald: {
      border: "border-emerald-500/20 hover:border-emerald-400/50",
      glow: "hover:shadow-emerald-500/10",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      stroke: "#10b981",
      gradient: "from-emerald-500/20 to-transparent"
    }
  };

  const style = colorStyles[colorScheme] || colorStyles.cyan;

  // Simple SVG sparkline path generator
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    const points = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg className="w-20 h-7 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={style.stroke} stopOpacity="0.4" />
            <stop offset="100%" stopColor={style.stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={style.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const getStatusBadgeClass = () => {
    switch (status?.toUpperCase()) {
      case "GOOD":
      case "OPTIMAL":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "MODERATE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "HIGH":
      case "POOR":
      case "CRITICAL":
      case "DANGEROUS":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      default:
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative p-5 rounded-2xl glass-panel border transition-all duration-300 ${style.border} ${style.glow} hover:shadow-2xl overflow-hidden group`}
    >
      {/* Background radial accent */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${style.gradient} blur-xl opacity-40 group-hover:opacity-80 transition-opacity`}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={`p-2.5 rounded-xl border ${style.iconBg} shadow-md transition-transform group-hover:scale-110 duration-200`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white tracking-tight font-mono">
                {displayValue || value}
              </span>
            </div>
          </div>
        </div>

        {status && (
          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${getStatusBadgeClass()}`}
          >
            {status}
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center text-xs font-semibold ${
              trend === "up" && (status === "GOOD" || status === "OPTIMAL")
                ? "text-emerald-400"
                : trend === "up" && (status === "HIGH" || status === "CRITICAL" || status === "POOR")
                ? "text-rose-400"
                : trend === "down" && (status === "POOR" || status === "HIGH")
                ? "text-emerald-400"
                : "text-cyan-400"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {change}
          </span>
          <span className="text-[11px] text-slate-500">vs last cycle</span>
        </div>

        {/* Sparkline */}
        <div className="opacity-80 group-hover:opacity-100 transition-opacity">
          {renderSparkline()}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;
