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
  const { traffic, city, liveTrafficConfigured, liveTrafficFlow, liveTrafficFlowError, liveWeather } = useCity();
  const [range, setRange] = useState("today"); // "today" | "week" | "month"

  // Live weather impact on traffic
  const livePrecip = liveWeather?.precipitation != null ? Number(liveWeather.precipitation) : null;
  const liveVis = liveWeather?.visibility != null ? Number(liveWeather.visibility) : null;
  const liveCode = liveWeather?.weather_code != null ? Number(liveWeather.weather_code) : null;
  const hasLiveWeather = liveWeather != null;

  let weatherTrafficAdjPct = 0;
  let weatherTrafficNote = "Nominal road conditions";
  let weatherTrafficColor = "text-emerald-400";
  if (hasLiveWeather) {
    const rain = livePrecip ?? 0;
    const isThunder = [95, 96, 99].includes(liveCode);
    const isFog = [45, 48].includes(liveCode) || (liveVis != null && liveVis < 1500);
    if (isThunder) {
      weatherTrafficAdjPct = 25;
      weatherTrafficNote = "+25% congestion est. (thunderstorm conditions)";
      weatherTrafficColor = "text-rose-400";
    } else if (isFog) {
      weatherTrafficAdjPct = 15;
      weatherTrafficNote = `+15% congestion est. (reduced visibility ${liveVis ? (liveVis / 1000).toFixed(1) : "<1.5"} km)`;
      weatherTrafficColor = "text-amber-400";
    } else if (rain >= 5) {
      weatherTrafficAdjPct = 18;
      weatherTrafficNote = `+18% congestion est. (rain ${rain} mm)`;
      weatherTrafficColor = "text-rose-400";
    } else if (rain >= 1) {
      weatherTrafficAdjPct = 8;
      weatherTrafficNote = `+8% congestion est. (light rain ${rain} mm)`;
      weatherTrafficColor = "text-amber-400";
    } else {
      weatherTrafficNote = "Clear road conditions · no weather delay";
      weatherTrafficColor = "text-emerald-400";
    }
  }

  const getData = () => {
    let base = [];
    if (range === "week") base = traffic.week || [];
    else if (range === "month") base = traffic.month || [];
    else base = traffic.today || [];

    if (!liveTrafficFlow && hasLiveWeather && weatherTrafficAdjPct !== 0 && range === "today") {
      return base.map(p => ({
        ...p,
        weather_adjusted: Math.min(100, Math.round((p.congestion || 0) * (1 + weatherTrafficAdjPct / 100)))
      }));
    }
    return base;
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
  const hasLiveFlow = Boolean(liveTrafficFlow);
  const liveDelay = hasLiveFlow && liveTrafficFlow.freeFlowTravelTime > 0
    ? Math.round(
      ((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100
    )
    : null;
  const liveTravelTimeComparison = liveDelay == null
    ? "—"
    : liveDelay === 0
      ? "0% vs free flow"
      : `${Math.abs(liveDelay)}% ${liveDelay < 0 ? "faster" : "slower"}`;

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
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded border bg-amber-500/20 text-amber-200 border-amber-500/30">
                DEMO PROFILE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {`Bundled sample corridor profile for ${city.name}${city.dataMode === "illustrative" ? " (reference-city values)" : ""}. ${hasLiveFlow ? "The separate live nearest-road reading is shown below; it is not this chart." : liveTrafficConfigured ? `TomTom live traffic unavailable${liveTrafficFlowError ? `: ${liveTrafficFlowError}` : "."}` : "TomTom is not configured; no live traffic feed is connected."}`}
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
            Hourly shape
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
            Weekly pattern
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
            Monthly pattern
          </button>
        </div>
      </div>

      {/* Current source point and sample-profile summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 my-4">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Gauge className="w-3.5 h-3.5 text-rose-400" />
            <span>{hasLiveFlow ? "Nearest-road speed" : "Sample load"}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-rose-400">
            {hasLiveFlow ? `${liveTrafficFlow.currentSpeed} km/h` : summary.currentCongestion}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{hasLiveFlow ? "Free-flow speed" : "Sample peak hour"}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-amber-300">
            {hasLiveFlow ? `${liveTrafficFlow.freeFlowSpeed} km/h` : summary.peakTime}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Car className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hasLiveFlow ? "vs free-flow time" : "Sample avg speed"}</span>
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-cyan-300">
            {hasLiveFlow ? liveTravelTimeComparison : summary.averageSpeed}
          </div>
        </div>
      </div>

      {/* Weather Signal Banner when TomTom is unavailable */}
      {!hasLiveFlow && hasLiveWeather && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400 font-medium">Open-Meteo Weather Traffic Factor:</span>
            <span className={`font-mono font-bold ${weatherTrafficColor}`}>{weatherTrafficNote}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {livePrecip != null ? `Precip: ${livePrecip}mm` : "Dry"} · {liveVis != null ? `Vis: ${(liveVis/1000).toFixed(1)}km` : "Clear"}
          </span>
        </div>
      )}

      {/* TomTom error details are intentionally hidden from the frontend UI. */}
      <p className="mt-1 text-xs font-semibold text-slate-300">
        Question: How does the illustrative congestion profile vary across this time pattern?
      </p>
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
              name="Sample Baseline"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#trafficGradient)"
            />
            {weatherTrafficAdjPct !== 0 && range === "today" && (
              <Area
                type="monotone"
                dataKey="weather_adjusted"
                name="Weather-Adjusted Estimate"
                stroke="#fbbf24"
                strokeDasharray="4 4"
                strokeWidth={2}
                fill="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        {weatherTrafficAdjPct !== 0 && range === "today"
          ? "DEMO PROFILE: Solid red is bundled sample data. Gold dashed is a SIMULATED heuristic using live Open-Meteo weather, not observed traffic or a validated model."
          : "DEMO PROFILE: This is a bundled illustrative pattern, not an observed hourly, weekly, or monthly history. A current TomTom reading, when available, is shown separately above."}
      </p>
    </div>
  );
};

export default TrafficChart;
