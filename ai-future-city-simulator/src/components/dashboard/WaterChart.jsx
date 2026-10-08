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
import { Droplet, CloudRain, Thermometer } from "lucide-react";
import { useCity } from "../../context/CityContext";

export const WaterChart = () => {
  const { water, liveWeather } = useCity();

  // Live weather-based water demand estimation
  const liveTemp = liveWeather?.temperature_2m != null ? Number(liveWeather.temperature_2m) : null;
  const livePrecip = liveWeather?.precipitation != null ? Number(liveWeather.precipitation) : null;
  const hasLiveWeather = liveTemp != null && Number.isFinite(liveTemp);

  let waterNote = "";
  let waterAdjColor = "text-emerald-400";

  if (hasLiveWeather) {
    const rain = Number.isFinite(livePrecip) ? livePrecip : null;
    if (rain != null && rain >= 10) {
      waterNote = `−15% est. demand (heavy rain ${rain} mm)`;
      waterAdjColor = "text-blue-400";
    } else if (rain != null && rain >= 2) {
      waterNote = `−8% est. demand (rain ${rain} mm)`;
      waterAdjColor = "text-cyan-400";
    } else if (liveTemp > 30) {
      waterNote = `+20% heuristic demand adjustment (${liveTemp.toFixed(1)}°C)`;
      waterAdjColor = "text-rose-400";
    } else if (liveTemp > 25) {
      waterNote = `+10% heuristic demand adjustment (${liveTemp.toFixed(1)}°C)`;
      waterAdjColor = "text-amber-400";
    } else {
      waterNote = `Normal conditions (${liveTemp.toFixed(1)}°C)`;
      waterAdjColor = "text-emerald-400";
    }
  }

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
              <span>WATER CONSUMPTION &amp; STORAGE</span>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded border bg-amber-500/10 text-amber-300 border-amber-500/20">
                DEMO PROFILE
              </span>
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

      <p className="mt-3 text-xs font-semibold text-slate-300">
        Question: How does the illustrative weekly water profile compare with current weather conditions?
      </p>

      {/* Live Weather Water Signal */}
      {hasLiveWeather && (
        <div className="mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-blue-500/20">
          {Number.isFinite(livePrecip) && livePrecip >= 2
            ? <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            : <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live weather input → simulated demand estimate</span>
            <p className={`text-xs font-mono font-bold mt-0.5 ${waterAdjColor}`}>{waterNote}</p>
          </div>
          <span className="ml-auto text-[9px] text-slate-500 shrink-0">Open-Meteo heuristic</span>
        </div>
      )}

      {/* Reservoir Capacity Gauges */}
      <div className="my-4 space-y-2.5">
        <div className="text-xs font-semibold text-slate-300">Illustrative reservoir levels · DEMO DATA</div>
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
        <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-2">
          <span>Bundled weekly profile (MLD) · DEMO DATA</span>
          {hasLiveWeather && (
            <span className="text-[9px] font-mono text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              SIMULATED WEATHER SIGNAL
            </span>
          )}
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={water.weeklyTrend || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(56,189,248,0.3)", borderRadius: "0.75rem", fontSize: "11px" }}
              />
              <Bar dataKey="consumption" name="Profile (MLD)" fill="#38bdf8" radius={[3, 3, 0, 0]} fillOpacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-1 text-[10px] text-slate-500">
        {hasLiveWeather
          ? "The chart is a bundled weekly profile and is not adjusted by current weather. The separate SIMULATED weather signal is a simple heuristic, not a utility demand estimate or meter reading."
          : "The chart is bundled illustrative profile data, not a verified historical series or live water utility feed."}
      </p>
    </div>
  );
};

export default WaterChart;
