import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Car, Wind, Droplet, Zap, ArrowRight, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../../context/CityContext";

export const FutureForecastPreview = () => {
  const { city } = useCity();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState("2030");

  const currentForecast = city.forecasts?.[selectedYear] ?? null;

  const forecastMetrics = [
    {
      label: "Projected Population",
      value: currentForecast?.population ?? "Unavailable",
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30"
    },
    {
      label: "Roadway Congestion",
      value: currentForecast?.traffic ?? "Unavailable",
      icon: Car,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30"
    },
    {
      label: "Air Quality Index",
      value: currentForecast?.aqi == null ? "Unavailable" : `${currentForecast.aqi} AQI`,
      icon: Wind,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30"
    },
    {
      label: "Water Stress Level",
      value: currentForecast?.waterDemand ?? "Unavailable",
      icon: Droplet,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30"
    },
    {
      label: "Energy Grid Load",
      value: currentForecast?.energyUsage ?? "Unavailable",
      icon: Zap,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30"
    }
  ];

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>FUTURE CITY FORECAST & SIMULATION</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Horizon {selectedYear}
              </span>
              <span className="px-2 py-0.2 text-[10px] font-mono font-bold rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30 hidden sm:inline-flex items-center gap-1">
                Stored profile
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Saved forecast checkpoints for {city.name}; {city.dataMode === "illustrative" ? "reference-city profile used when local data is unavailable" : "stored projections used when live city data is unavailable"}
            </p>
          </div>
        </div>

        {/* Year Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {["2027", "2030", "2035", "2040"].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedYear === yr
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Animated Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-4">
        {forecastMetrics.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl bg-slate-900/60 border ${item.border} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.label}
                </span>
                <div className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedYear}-${item.label}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight"
                  >
                    {item.value}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Trajectory vs 2026: <span className="text-cyan-400 font-semibold">{currentForecast?.change ?? "Unavailable"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Values use the saved forecast profile when verified live city data is unavailable; they are not real-time measurements.</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate(`/future-predictions?year=${selectedYear}`)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Deep Forecast Engine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FutureForecastPreview;
