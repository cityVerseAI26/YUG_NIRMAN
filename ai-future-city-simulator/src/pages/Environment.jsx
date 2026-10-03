import React from "react";
import { CloudRain, Leaf, Radio, Trees } from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import PollutionChart from "../components/dashboard/PollutionChart";

export const Environment = () => {
  const { city, liveWeather, liveWeatherError } = useCity();
  const canopyEstimate = city.metrics.greenCover;
  const trafficMetric = city.metrics.traffic;
  const trafficIndex = Number(trafficMetric.value);
  const acousticPressure = trafficIndex >= 70 ? "High" : trafficIndex >= 40 ? "Moderate" : "Low";

  const weatherCode = liveWeather?.weather_code;
  const condition = !liveWeather
    ? liveWeatherError ? "Unavailable" : "Loading current conditions…"
    : weatherCode === 0 ? "Clear sky"
    : [1, 2].includes(weatherCode) ? "Partly cloudy"
      : weatherCode === 3 ? "Overcast"
        : [45, 48].includes(weatherCode) ? "Fog"
          : [51, 53, 55, 56, 57].includes(weatherCode) ? "Drizzle"
            : [61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode) ? "Rain"
              : [71, 73, 75, 77, 85, 86].includes(weatherCode) ? "Snow"
                : [95, 96, 99].includes(weatherCode) ? "Thunderstorm" : "Unavailable";

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENVIRONMENTAL CONDITIONS"
        subtitle="Current public air-quality and weather model data"
        icon={Leaf}
        badge="Open-Meteo model"
      />

      {/* Main AQI Chart */}
      <PollutionChart />

      {/* Live public weather plus explicit coverage gaps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-cyan-500/15">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span>CURRENT WEATHER • {city.name.toUpperCase()}</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-amber-300">
              {liveWeather?.temperature_2m != null ? `${liveWeather.temperature_2m}°C` : liveWeatherError ? "Unavailable" : "Loading…"}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {condition}{liveWeather?.apparent_temperature != null ? ` · Feels like ${liveWeather.apparent_temperature}°C` : ""}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-sky-300 font-medium">
            {liveWeather?.time ? `Model time: ${liveWeather.time} · Precipitation ${liveWeather.precipitation ?? "—"} mm` : "Open-Meteo current conditions"}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-cyan-500/15">
            <Trees className="w-4 h-4 text-emerald-400" />
            <span>URBAN TREE CANOPY</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-emerald-300">
              {canopyEstimate.display || `${canopyEstimate.value}%`}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Saved city-profile green-cover estimate for {city.name}. It is a planning reference, not a current satellite-derived tree-canopy measurement.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-medium">
            Source: saved city profile · change {canopyEstimate.change} · OSM parks do not measure total tree canopy.
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-cyan-500/15">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>ACOUSTIC CONDITIONS</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-extrabold text-amber-200">{acousticPressure} traffic-noise pressure</div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Stored traffic congestion is {trafficMetric.display || `${trafficIndex}%`}. It is used as a relative noise-pressure proxy; no decibel value is estimated.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Source: saved traffic profile · no live acoustic sensor or monitoring feed is connected.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Environment;
