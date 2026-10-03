import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Users } from "lucide-react";
import { useCity } from "../../context/CityContext";

const CustomPopTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPrediction = parseInt(label, 10) > 2026;
    return (
      <div className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1 mb-1">
          <span className="font-bold text-white">Year {label}</span>
          <span
            className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
              isPrediction
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            }`}
          >
            {isPrediction ? "Sample Scenario" : "Bundled Baseline"}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total Population:</span>
            <span className="font-mono font-bold text-cyan-300">{data.population}M</span>
          </div>
          {isPrediction && (
            <div className="text-[10px] text-purple-300 italic">
              Illustrative value; no validated confidence interval.
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const PopulationChart = () => {
  const { population, city } = useCity();

  const data = population.historyAndForecast || [];

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>POPULATION GROWTH & FORECAST</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {population.growthRate} by 2030
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Bundled sample baseline and illustrative forecast values • not census or validated AI results
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500"></span>
            <span className="text-slate-300 text-[11px]">Bundled baseline (2020-2026)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-indigo-500"></span>
            <span className="text-purple-300 text-[11px] font-semibold">Illustrative scenario</span>
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 my-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Current Population</div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-cyan-300">
            {population.current}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Predicted 2030</div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-purple-300">
            {population.projected2030}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Urban Density</div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-300">
            {population.density}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-60 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
            <XAxis
              dataKey="year"
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
              domain={['auto', 'auto']}
              unit="M"
            />
            <Tooltip content={<CustomPopTooltip />} />
            <Bar dataKey="population" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const isPrediction = parseInt(entry.year, 10) > 2026;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isPrediction ? "#a855f7" : "#06b6d4"}
                    fillOpacity={isPrediction ? 0.85 : 0.9}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PopulationChart;
