import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Wind } from "lucide-react";
import { useCity } from "../../context/CityContext";
import { AQI_LEVELS } from "../../data/pollutionData";

const toTimestamp = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  return null;
};

const formatHourlyTime = (value) => {
  if (typeof value === "string") return value.split("T")[1]?.slice(0, 5) || "";
  const timestamp = toTimestamp(value);
  return timestamp == null
    ? ""
    : new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const readFiniteNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const CustomPollutionTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl text-xs">
        <div className="text-amber-300 font-bold mb-1 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>Time: {label}</span>
          <span className="text-[10px] text-slate-400">Hourly AQI values</span>
        </div>
        <div className="space-y-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Composite AQI:</span>
            <span className="font-mono font-bold text-amber-400">{data.aqi}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">PM 2.5:</span>
            <span className="font-mono font-semibold text-rose-400">{data.pm25} µg/m³</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">PM 10:</span>
            <span className="font-mono font-semibold text-cyan-300">{data.pm10} µg/m³</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const PollutionChart = () => {
  const { pollution, city, liveAirQuality, liveAirQualityHourly, liveAirQualityUnits } = useCity();
  const usAqi = readFiniteNumber(liveAirQuality?.us_aqi);
  const europeanAqi = readFiniteNumber(liveAirQuality?.european_aqi);
  const liveAqiKey = usAqi != null ? "us_aqi" : "european_aqi";
  const liveAqi = usAqi ?? europeanAqi;
  const isUsingLiveModel = liveAqi != null;
  const aqiScale = liveAqiKey === "us_aqi" ? "US AQI" : "European AQI";
  const currentAqi = isUsingLiveModel ? Math.round(liveAqi) : pollution.currentAQI;

  const pollutantValues = isUsingLiveModel
    ? [
        { name: "PM 2.5", key: "pm2_5", standard: "", fallbackUnit: "µg/m³" },
        { name: "PM 10", key: "pm10", standard: "", fallbackUnit: "µg/m³" },
        { name: "NO₂", key: "nitrogen_dioxide", standard: "", fallbackUnit: "µg/m³" },
        { name: "O₃", key: "ozone", standard: "", fallbackUnit: "µg/m³" },
      ]
        .filter(({ key }) => readFiniteNumber(liveAirQuality[key]) != null)
        .map(({ name, key, standard, fallbackUnit }) => ({
          name,
          value: liveAirQuality[key],
          standard,
          unit: liveAirQualityUnits?.[key] || fallbackUnit,
        }))
    : (pollution.pollutants || []).slice(0, 4);

  const hourlyTimes = liveAirQualityHourly?.time || [];
  const currentTimestamp = toTimestamp(liveAirQuality?.time);
  const currentHourlyIndex = currentTimestamp == null
    ? -1
    : hourlyTimes.findIndex((time) => toTimestamp(time) === currentTimestamp);
  const currentTimeIndex = currentHourlyIndex >= 0
    ? currentHourlyIndex
    : hourlyTimes.reduce((lastIndex, time, index) => {
        const timestamp = toTimestamp(time);
        return currentTimestamp != null && timestamp != null && timestamp <= currentTimestamp
          ? index
          : lastIndex;
      }, -1);
  const timelineEnd = currentTimeIndex >= 0 ? currentTimeIndex + 1 : hourlyTimes.length;
  const liveTimeline = liveAirQuality && liveAirQualityHourly && timelineEnd > 0
    ? Array.from({ length: Math.max(0, Math.min(25, timelineEnd)) }, (_, index) => {
        const pointIndex = Math.max(0, timelineEnd - 25) + index;
        return {
          time: formatHourlyTime(hourlyTimes[pointIndex]),
          aqi: liveAirQualityHourly[liveAqiKey]?.[pointIndex],
          pm25: liveAirQualityHourly.pm2_5?.[pointIndex],
          pm10: liveAirQualityHourly.pm10?.[pointIndex],
        };
      }).filter((point) => point.aqi != null && Number.isFinite(Number(point.aqi)))
    : [];
  const chartData = liveTimeline.length > 1 ? liveTimeline : pollution.timeline;

  const getStatusColor = (status) => {
    switch (status) {
      case "GOOD":
        return { text: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" };
      case "MODERATE":
        return { text: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" };
      case "POOR":
      case "UNHEALTHY":
        return { text: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" };
      case "DANGEROUS":
      case "SEVERE":
        return { text: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30" };
      default:
        return { text: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" };
    }
  };
  const statusStyle = getStatusColor(isUsingLiveModel ? "MODEL" : pollution.status);

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>AIR QUALITY CONDITIONS</span>
              <span className={`px-2 py-0.2 text-[10px] font-bold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                {currentAqi} {isUsingLiveModel ? aqiScale : "AQI"} • {isUsingLiveModel ? "OPEN-METEO MODEL" : "SAMPLE PROFILE"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {isUsingLiveModel
                ? `Open-Meteo/CAMS ${aqiScale} model for ${city.name} • Not a municipal sensor-station reading`
                : `Bundled sample air-quality profile${city.dataMode === "illustrative" ? " (reference-city values)" : ""} • Live model data is not available`}
            </p>
          </div>
        </div>

        {/* Categories Legend */}
        <div className="flex items-center gap-1.5 shrink-0">
          {AQI_LEVELS.map((level, idx) => (
            <span
              key={idx}
              title={`AQI ${level.range}`}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border whitespace-nowrap cursor-default ${level.bg} ${level.color} ${level.border}`}
            >
              {level.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-300">
        Question: How does the hourly air-quality profile change through the day?
      </p>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
        {pollutantValues.map((p, idx) => (
          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{p.name}</span>
              {p.standard && <span className="text-[9px] text-slate-500">Std: {p.standard}</span>}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold font-mono text-white">{p.value}</span>
              <span className="text-[10px] text-slate-400">{p.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      <div className="h-56 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
            <XAxis
              dataKey="time"
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
            />
            <Tooltip content={<CustomPollutionTooltip />} />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#111827" }}
              activeDot={{ r: 6, fill: "#00f0ff", stroke: "#111827", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        {liveTimeline.length > 1
          ? `LIVE MODEL FEED: Recent hourly Open-Meteo/CAMS ${aqiScale} output, not historical municipal sensor observations.`
          : "DEMO DATA: Bundled sample timeline; hourly public model output is unavailable. This is not observed historical air quality."}
      </p>
    </div>
  );
};

export default PollutionChart;
