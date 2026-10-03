import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Car, Clock, Gauge } from "lucide-react";
import { useCity } from "../../context/CityContext";

// Custom Cyber Tooltip for Recharts
const CustomTrafficTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs">
        <div className="text-cyan-300 font-bold mb-1 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400">Arterial Flow</span>
        </div>
        <div className="space-y-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Congestion:</span>
            <span className="font-mono font-bold text-rose-400">
              {data.congestion}%
            </span>
          </div>
          {data.speed && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Avg Speed:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {data.speed} km/h
              </span>
            </div>
          )}
          {data.vehicles && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Volume:</span>
              <span className="font-mono font-semibold text-cyan-300">
                {data.vehicles.toLocaleString()} veh/h
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TrafficChart = () => {
  const { traffic, city } = useCity();
  const [range, setRange] = useState("today"); // "today" | "week" | "month"

  const getData = () => {
    if (range === "week") return traffic.week || [];
    if (range === "month") return traffic.month || [];
    return traffic.today || [];
  };

  const getXKey = () => {
    if (range === "week") return "day";
    if (range === "month") return "week";
    return "time";
  };

  const chartData = getData();
  const summary = traffic.summary || {
    currentCongestion: "72%",
    peakTime: "7:00 PM",
    averageSpeed: "28 km/h"
  };

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Header with Time-range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>TRAFFIC ANALYTICS</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {summary.currentCongestion} Congestion
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Bundled sample corridor profile for {city.name}{city.dataMode === "illustrative" ? " (reference-city values)" : ""} • not a live traffic feed
            </p>
          </div>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setRange("today")}
            aria-pressed={range === "today"}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === "today"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Today (Hourly)
          </button>
          <button
            type="button"
            onClick={() => setRange("week")}
            aria-pressed={range === "week"}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === "week"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange("month")}
            aria-pressed={range === "month"}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === "month"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 my-4">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Gauge className="w-3.5 h-3.5 text-rose-400" />
            <span>Current Load</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-rose-400">
            {summary.currentCongestion}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Peak Hour</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-amber-300">
            {summary.peakTime}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Car className="w-3.5 h-3.5 text-cyan-400" />
            <span>Average Speed</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-cyan-300">
            {summary.averageSpeed}
          </div>
        </div>
      </div>

      {/* Area Chart */}
      <div className="h-60 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
            <XAxis
              dataKey={getXKey()}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(56, 189, 248, 0.15)" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip content={<CustomTrafficTooltip />} />
            <Area
              type="monotone"
              dataKey="congestion"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#trafficGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrafficChart;
