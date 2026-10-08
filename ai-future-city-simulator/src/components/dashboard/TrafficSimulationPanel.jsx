import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Gauge } from "lucide-react";
import { useCity } from "../../context/CityContext";
import { TRAFFIC_DATA } from "../../data/trafficData";
import { buildTrafficSimulation } from "../../data/trafficSimulation";

const SimulationTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-slate-950/95 p-3 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-cyan-200">{label} · simulated</div>
      <div className="text-rose-300">Congestion: {point.congestion}%</div>
      <div className="text-emerald-300">Estimated speed: {point.speed} km/h</div>
      <div className="text-slate-300">Illustrative flow index: {point.vehicles.toLocaleString()}</div>
    </div>
  );
};

export const TrafficSimulationPanel = () => {
  const { city } = useCity();
  const profile = TRAFFIC_DATA[city.id];
  const [simulation, setSimulation] = useState(() => buildTrafficSimulation(city, profile));

  useEffect(() => {
    const update = () => setSimulation(buildTrafficSimulation(city, profile));
    update();
    const interval = window.setInterval(update, 15_000);
    return () => window.clearInterval(interval);
  }, [city, profile]);

  return (
    <section className="rounded-2xl border border-cyan-500/20 p-5 glass-panel" aria-label="Live traffic simulation">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/15 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-bold tracking-tight text-white">CITY TRAFFIC SIMULATION</h2>
            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
              LIVE SIMULATION
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Locally generated rolling estimates for {city.name}; no API key or internet feed required. Latest sample: {new Date(simulation.current.timestamp).toLocaleTimeString()}.
          </p>
        </div>
        <span className="text-[10px] text-slate-500">
          Updated {new Date(simulation.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><Activity size={13} />Simulated congestion</span>
          <strong className="mt-1 block font-mono text-lg text-rose-300">{simulation.current.congestion}%</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><Gauge size={13} />Estimated speed</span>
          <strong className="mt-1 block font-mono text-lg text-emerald-300">{simulation.current.speed} km/h</strong>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:col-span-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><Clock3 size={13} />Local refresh</span>
          <strong className="mt-1 block font-mono text-lg text-cyan-200">Every 15 sec</strong>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={simulation.points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="trafficSimulationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,.12)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<SimulationTooltip />} />
            <Area
              type="monotone"
              dataKey="congestion"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#trafficSimulationGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-200/80" role="note">
        <span className="font-bold">SIMULATION, NOT LIVE CITY DATA:</span>
        <span>
          This display generates a rolling three-minute series locally every 15 seconds using bundled sample profiles and deterministic variation. Values are not measured, provider-verified, or historical observations and are not tied to particular roads.
        </span>
      </p>
    </section>
  );
};

export default TrafficSimulationPanel;
