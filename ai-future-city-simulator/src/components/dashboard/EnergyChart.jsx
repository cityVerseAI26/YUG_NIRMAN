import React, { useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Zap } from "lucide-react";
import { useCity } from "../../context/CityContext";
import { ENERGY_DATA } from "../../data/energyData";

const CustomEnergyTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs">
        <div className="font-bold text-white mb-0.5">{data.name || data.dataKey}</div>
        <div className="text-cyan-300 font-mono font-semibold">
          {data.value} {data.dataKey === "actual" || data.dataKey === "solar" || data.dataKey === "wind" ? "MW" : "%"}
        </div>
      </div>
    );
  }
  return null;
};

export const EnergyChart = () => {
  const { energy, city, selectedCity } = useCity();
  const [view, setView] = useState("demand");
  const usesReferenceProfile = !Object.prototype.hasOwnProperty.call(ENERGY_DATA, selectedCity);
  const sectorBreakdown = energy.breakdown || [];
  const hourlyGridLoad = energy.hourlyGridLoad || [];
  const supplySources = energy.sources || [];

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>ENERGY USAGE & GRID LOAD</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {energy.totalConsumption}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Illustrative grid profile for {city.name}{usesReferenceProfile ? " (Mumbai reference profile)" : ""} • Renewable mix: <span className="text-emerald-400 font-semibold">{energy.renewableMix}</span> • Status: <span className="text-amber-300">{energy.gridStatus}</span>
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold text-slate-400 hidden sm:inline">
          Peak: {energy.peakDemand}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1" role="group" aria-label="Energy grid views">
        {[
          ["demand", "Hourly grid load"],
          ["sectors", "Load by sector"],
          ["sources", "Grid & microgrids"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === key ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "demand" && (
        hourlyGridLoad.length > 0 ? (
          <div className="mt-3 h-52 w-full" aria-label="Illustrative hourly energy demand in megawatts">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyGridLoad} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit=" MW" />
                <Tooltip content={<CustomEnergyTooltip />} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Line type="monotone" dataKey="actual" name="Grid demand" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="solar" name="Solar generation" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wind" name="Wind generation" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
            Hourly demand profile is not available for this city.
          </p>
        )
      )}

      {view === "sectors" && (
        sectorBreakdown.length > 0 ? (
          <div className="my-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
            <div className="relative flex h-44 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorBreakdown} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                    {sectorBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomEnergyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">SECTOR LOAD</span>
                <span className="font-mono text-sm font-bold text-white">100%</span>
              </div>
            </div>
            <div className="space-y-2">
              {sectorBreakdown.map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
            Sector load breakdown is not available for this city.
          </p>
        )
      )}

      {view === "sources" && (
        supplySources.length > 0 ? (
          <div className="my-3 space-y-2">
            {supplySources.map((source) => (
              <div key={source.type} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-200">{source.type}</span>
                  <span className="shrink-0 font-mono font-bold text-cyan-200">{source.capacity}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, Number(source.percentage) || 0))}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-[10px] text-emerald-300">{source.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
            Grid supply sources are not available for this city.
          </p>
        )
      )}

      <p className="mt-1 text-[10px] text-slate-500">
        These are bundled illustrative profile values, not a live utility or microgrid telemetry feed.
      </p>
    </div>
  );
};

export default EnergyChart;
