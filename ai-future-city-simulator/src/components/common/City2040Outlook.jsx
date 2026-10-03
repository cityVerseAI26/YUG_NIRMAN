import React from "react";
import { useLocation } from "react-router-dom";
import { Activity, TrendingUp } from "lucide-react";
import { useCity } from "../../context/CityContext";

const SECTION_LABELS = {
  "/dashboard": "Dashboard",
  "/digital-twin": "City Digital Twin",
  "/future-predictions": "Future Predictions",
  "/what-if-simulator": "What-If Simulator",
  "/scenario-comparison": "Scenario Comparison",
  "/transportation": "Transportation",
  "/environment": "Environment",
  "/climate-risks": "Climate & Risks",
  "/ai-recommendations": "AI Recommendations",
  "/sustainability": "Sustainability",
  "/city-3d": "3D City",
  "/report-generation": "Report Generation",
  "/settings": "Settings",
  "/history": "My History",
  "/messages": "Messages",
};

const readValue = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const multiplier = normalized.endsWith("M") ? 1_000_000 : 1;
  const number = Number.parseFloat(normalized.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(number) ? number * multiplier : null;
};

const formatValue = (value, unit, decimals = 0) => {
  if (value == null) return "Unavailable";
  const formatted = Number(value.toFixed(decimals)).toLocaleString();
  return unit === "M" ? `${Number((value / 1_000_000).toFixed(1))}M` : `${formatted}${unit}`;
};

const City2040Outlook = () => {
  const { pathname } = useLocation();
  const { city, liveAirQuality } = useCity();
  const profile = city.forecasts?.["2040"];
  const liveAqi = readValue(liveAirQuality?.us_aqi);
  const baselineAqi = readValue(city.metrics.aqi.value);
  const profileAqi = readValue(profile?.aqi);
  const liveInformedAqi = liveAqi != null && baselineAqi != null && profileAqi != null
    ? Math.max(0, profileAqi + liveAqi - baselineAqi)
    : profileAqi;

  const metrics = [
    { key: "population", label: "Population", unit: "M", decimals: 1 },
    { key: "traffic", label: "Traffic", unit: "%", decimals: 0 },
    { key: "aqi", label: "Air quality", unit: " AQI", decimals: 0 },
    { key: "waterDemand", label: "Water demand", unit: "%", decimals: 0 },
    { key: "energyUsage", label: "Energy load", unit: "%", decimals: 0 },
  ];

  return (
    <section className="mb-5 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4 sm:p-5" aria-labelledby="city-2040-outlook-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="city-2040-outlook-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
            <TrendingUp className="h-4 w-4 text-cyan-300" />
            {city.name} · 2040 outlook · {SECTION_LABELS[pathname] || "City section"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Compare the saved 2040 profile with a live-informed scenario where a current matching feed is available.
            {city.dataMode === "illustrative" ? " This city uses an illustrative reference-city profile." : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
          <Activity className="h-3 w-3" />
          Scenario estimates · not validated forecasts
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(({ key, label, unit, decimals }) => {
          const storedValue = readValue(profile?.[key]);
          const hasLiveAnchor = key === "aqi" && liveInformedAqi != null && liveAqi != null;
          const liveValue = key === "aqi" ? liveInformedAqi : storedValue;
          return (
            <article key={key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-[9px] uppercase text-slate-500">Live-informed</dt>
                  <dd className="font-mono text-sm font-bold text-cyan-200">{formatValue(liveValue, unit, decimals)}</dd>
                  <dd className="text-[9px] text-slate-500">{hasLiveAnchor ? "Adjusted using current live AQI" : "No matching live feed · stored profile"}</dd>
                </div>
                <div className="border-t border-slate-800 pt-2">
                  <dt className="text-[9px] uppercase text-slate-500">Stored-only</dt>
                  <dd className="font-mono text-sm font-bold text-white">{formatValue(storedValue, unit, decimals)}</dd>
                  <dd className="text-[9px] text-slate-500">Saved 2040 city profile</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        The live-informed AQI applies the current model reading’s difference from the saved baseline to the 2040 profile; it is a scenario adjustment, not a 2040 live forecast. Other indicators use stored profiles because matching live city feeds are not connected. Live weather data covers only the short range and is not extrapolated to 2040.
      </p>
    </section>
  );
};

export default City2040Outlook;
