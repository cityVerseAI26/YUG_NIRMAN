import React from "react";
import { CloudRain, Leaf, Radio, Trees } from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import PollutionChart from "../components/dashboard/PollutionChart";

const formatLatestObservation = (measurements) => {
  const timestamps = measurements
    .map((measurement) => Date.parse(measurement.observedAt))
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toLocaleString() : null;
};

export const Environment = () => {
  const {
    city,
    liveWeather,
    liveWeatherError,
    liveSensorStations,
    liveSensorsAvailable,
    liveSensorsLoading,
    liveSensorsError,
  } = useCity();
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
        title="Air & Weather"
        subtitle="View current public air-quality and weather information."
        icon={Leaf}
        badge="Open-Meteo model"
        whyFeatureIds={["environment-climate", "pollution-detection"]}
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

      <section className="rounded-2xl glass-panel border border-cyan-500/20 p-5" aria-labelledby="community-readings-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/15 pb-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Radio className="h-4 w-4 text-cyan-400" />
              <h2 id="community-readings-title">NEARBY COMMUNITY PARTICULATE SENSORS</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Sensor.Community observations returned within 25 km of {city.name}; station coverage varies and these are not official municipal monitors.
            </p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            liveSensorsAvailable
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}>
            {liveSensorsLoading ? "CHECKING FEED" : liveSensorsAvailable ? "PUBLIC FEED CHECKED" : "OBSERVATIONS UNAVAILABLE"}
          </span>
        </div>

        {liveSensorsError && !liveSensorsLoading && (
          <p className="mt-3 text-xs text-rose-200" role="status">{liveSensorsError}</p>
        )}
        {!liveSensorsLoading && liveSensorsAvailable && liveSensorStations.length === 0 && (
          <p className="mt-3 text-xs text-slate-400" role="status">
            No community sensor stations were returned near this city. The Open-Meteo air-quality model above is a separate source.
          </p>
        )}
        {liveSensorStations.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {liveSensorStations.slice(0, 6).map((station) => (
              <article key={station.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                <h3 className="text-xs font-bold text-white">{station.name}</h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  {station.coordinates[0].toFixed(4)}, {station.coordinates[1].toFixed(4)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {station.measurements.map((measurement) => (
                    <span key={measurement.parameter} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[10px] text-cyan-100">
                      {measurement.parameter}: <strong>{measurement.value} {measurement.unit}</strong>
                    </span>
                  ))}
                  {station.measurements.length === 0 && (
                    <span className="text-[10px] text-slate-500">No particulate values in the latest station record.</span>
                  )}
                </div>
                {formatLatestObservation(station.measurements) && (
                  <p className="mt-2 text-[10px] text-slate-500">
                    Latest observation: {formatLatestObservation(station.measurements)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Environment;
