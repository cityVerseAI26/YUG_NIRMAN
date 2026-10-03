import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Droplet } from "lucide-react";
import { useCity } from "../../context/CityContext";

export const WaterChart = () => {
  const { water } = useCity();

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>WATER CONSUMPTION & STORAGE</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {water.currentDemand}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Bundled sample reservoir profile • Recycling: <span className="text-cyan-300 font-semibold">{water.recycleRate}</span>
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-cyan-400 hidden sm:inline">
          {water.reservoirCapacity}
        </span>
      </div>

      {/* Reservoir Capacity Gauges */}
      <div className="my-4 space-y-2.5">
        <div className="text-xs font-semibold text-slate-300">Illustrative reservoir levels</div>
        <div className="space-y-2">
          {(water.lakes || []).map((lake, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{lake.name}</span>
                <span className="text-cyan-300 font-mono font-semibold">{lake.level}% ({lake.capacity})</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  style={{ width: `${lake.level}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Consumption Bar Chart */}
      <div className="mt-2">
        <div className="text-xs font-semibold text-slate-300 mb-1">Sample weekly drawdown (MLD)</div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={water.weeklyTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(56,189,248,0.3)", borderRadius: "0.75rem", fontSize: "11px" }}
              />
              <Bar dataKey="consumption" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WaterChart;
