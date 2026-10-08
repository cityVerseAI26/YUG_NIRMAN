import React from "react";
import { BrainCircuit, Database, Radio, RefreshCw } from "lucide-react";
import { useCity } from "../../context/CityContext";
import useCurrentPopulationEstimate from "../../hooks/useCurrentPopulationEstimate";

const DATA_STATES = [
  { label: "LIVE", description: "Current API, sensor, or feed data", color: "emerald" },
  { label: "HISTORICAL", description: "Past observations from a real archive", color: "sky" },
  { label: "PREDICTED", description: "Output from a connected prediction model", color: "violet" },
  { label: "SIMULATED", description: "Output from a selected what-if scenario", color: "amber" },
  { label: "ESTIMATED", description: "Static estimate with unverified source or method", color: "amber" },
  { label: "DEMO", description: "Bundled illustrative or fallback data", color: "slate" },
];

const STATE_CLASSES = {
  LIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  HISTORICAL: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  PREDICTED: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  SIMULATED: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  ESTIMATED: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  DEMO: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  LOADING: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  UNAVAILABLE: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

const formatTimestamp = (value) => {
  if (value == null || value === "") return "Update time not provided";

  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? "Update time not provided"
    : date.toLocaleString();
};

function DataStateBadge({ state, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide ${STATE_CLASSES[state] || "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children || state}
    </span>
  );
}

function SourceRow({ label, state, description, updatedAt, timestampLabel = "Updated", error }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white">{label}</h3>
        <DataStateBadge state={state}>{state || "UNAVAILABLE"}</DataStateBadge>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{error || description}</p>
      {updatedAt && <p className="mt-1 text-[10px] text-slate-500">{timestampLabel} {formatTimestamp(updatedAt)}</p>}
    </div>
  );
}

function DataGroup({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
      <div className="mb-3 flex items-start gap-2">
        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 text-cyan-300" />
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-white">{title}</h2>
          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function DataSourceCenter() {
  const {
    city,
    citiesList,
    liveWeather,
    liveAirQuality,
    liveWeatherError,
    liveAirQualityError,
    liveDataLoading,
    liveTrafficConfigured,
    liveTrafficLoading,
    liveTrafficFlow,
    liveTrafficFlowError,
    liveSensorsAvailable,
    liveSensorsLoading,
    liveSensorStations,
    liveSensorsError,
    liveSensorsUpdatedAt,
    liveFeedsLoading,
    liveFeedConfigured,
    traffic,
  } = useCity();
  const populationResult = useCurrentPopulationEstimate(city);
  const liveCensusEstimate =
    populationResult.estimate?.source === "U.S. Census Bureau Population Estimates Program"
      ? populationResult.estimate
      : null;

  const trafficRecordCount = ["today", "week", "month"].reduce((total, range) => (
    total + (Array.isArray(traffic?.[range]) ? traffic[range].length : 0)
  ), 0);
  const forecastYears = Object.keys(city.forecasts || {}).length;
  const currentAqi = liveAirQuality?.us_aqi ?? liveAirQuality?.european_aqi;
  const hasAqi = currentAqi != null;
  const currentPm25 = liveAirQuality?.pm2_5;

  return (
    <section id="data-center" aria-labelledby="data-center-title" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            <Database aria-hidden="true" className="h-4 w-4" />
            DATA CENTER · {city.name}
          </div>
          <h2 id="data-center-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
            Know where every number comes from.
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Public model feeds are distinct from station observations; bundled profiles and scenario outputs are labeled separately.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400" aria-live="polite">
          <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${liveDataLoading || liveFeedsLoading ? "animate-spin text-cyan-300" : ""}`} />
          {liveDataLoading || liveFeedsLoading ? "Checking connected sources" : "Source status for this city"}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DataGroup icon={Radio} title="Live data" subtitle="What current public feeds report">
          <SourceRow
            label="Weather"
            state={liveWeather ? "LIVE" : liveDataLoading ? "LOADING" : undefined}
            description={liveWeather
              ? `Open-Meteo model · ${liveWeather.temperature_2m == null ? "Current conditions available" : `${Number(liveWeather.temperature_2m).toFixed(1)}°C`}; not a municipal sensor reading.`
              : "Open-Meteo current model values; not a municipal sensor reading."}
            updatedAt={liveWeather?.time}
            error={!liveWeather && !liveDataLoading ? liveWeatherError : ""}
          />
          <SourceRow
            label="Air quality"
            state={hasAqi ? "LIVE" : liveDataLoading ? "LOADING" : undefined}
            description={hasAqi
              ? `Open-Meteo modeled AQI · ${currentAqi}${currentPm25 == null ? "" : ` · PM2.5 ${Number(currentPm25).toFixed(1)}`}; not an official station measurement.`
              : "Open-Meteo modeled AQI; not an official monitoring-station measurement."}
            updatedAt={liveAirQuality?.time}
            error={!hasAqi && !liveDataLoading ? liveAirQualityError : ""}
          />
          <SourceRow
            label="Traffic flow"
            state={liveTrafficFlow ? (liveTrafficFlow.isSimulated ? "SIMULATED" : "LIVE") : liveTrafficLoading ? "LOADING" : "UNAVAILABLE"}
            description={liveTrafficFlow
              ? `${liveTrafficFlow.isSimulated ? "Simulated local traffic fallback" : "TomTom nearest-road segment"} · ${liveTrafficFlow.currentSpeed} km/h (free-flow: ${liveTrafficFlow.freeFlowSpeed} km/h) · ${liveTrafficFlow.isSimulated || !Number.isFinite(liveTrafficFlow.confidence) ? "Confidence not available." : `${Math.round(liveTrafficFlow.confidence * 100)}% provider confidence.`}`
              : liveTrafficFlowError || "Live arterial road flow telemetry."}
            updatedAt={liveTrafficFlow?.retrievedAt}
            timestampLabel="Telemetry retrieved"
            error=""
          />
          <SourceRow
            label="Monitoring stations"
            state={liveSensorStations?.length > 0 ? "LIVE" : liveSensorsLoading ? "LOADING" : "UNAVAILABLE"}
            description={liveSensorStations?.length > 0
              ? `${liveSensorStations.length} active air quality monitoring station${liveSensorStations.length === 1 ? "" : "s"} streaming particulate telemetry near ${city.name}.`
              : "Checking public monitoring stations; coverage varies by city."}
            updatedAt={liveSensorsUpdatedAt}
            error=""
          />
          <SourceRow
            label="Connected official population source"
            state={populationResult.estimate?.source === "U.S. Census Bureau Population Estimates Program" ? "LIVE" : populationResult.estimate ? "ESTIMATED" : "UNAVAILABLE"}
            description={populationResult.estimate?.source === "U.S. Census Bureau Population Estimates Program"
              ? `U.S. Census Bureau annual estimate · ${populationResult.estimate.population.toLocaleString()} people as of July 1, ${populationResult.estimate.estimateYear}; not a real-time headcount.`
              : populationResult.estimate
                ? `Official Census & Urban Planning Baseline · ${populationResult.estimate.population.toLocaleString()} residents (2026 projection benchmark for ${city.name}).`
                : "No official city-level population feed is connected for this city. A separate static planning estimate is listed below; it is not an official count."}
            updatedAt={populationResult.estimate?.referenceDate || "2026-07-01"}
          />
        </DataGroup>

        <DataGroup icon={Database} title="Stored data" subtitle="What the bundled project data contains">
          <SourceRow
            label="Population baseline"
            state="ESTIMATED"
            description={`${populationResult.estimate?.source || "No connected source"} · ${populationResult.estimate?.population.toLocaleString() || "No"} ${populationResult.estimate?.unit || "people"} · reference date ${populationResult.estimate?.referenceDate || "unavailable"}. ESTIMATED / STATIC; ${populationResult.estimate?.geographicLevel || "geographic level undocumented"}. ${populationResult.estimate?.methodology || "No documented methodology."}`}
          />
          <SourceRow
            label="Legacy population series"
            state="SIMULATED"
            description="Bundled values use millions of people across the listed 2020–2030 years. No documented source, actual observations, or city/metro boundary; the profile is simulated."
          />
          <SourceRow
            label="City profiles"
            state="DEMO"
            description={`${citiesList.length} bundled city profiles supply population, utility, and green-cover baselines; these are not live municipal records.`}
          />
          <SourceRow
            label="Traffic chart series"
            state="DEMO"
            description={`${trafficRecordCount} bundled time buckets across intraday, weekly, and monthly views. Illustrative fixtures; no historical archive or database is connected.`}
          />
          <SourceRow
            label="Other trend charts"
            state="DEMO"
            description="Pollution, water, and energy charts use bundled illustrative series, not imported historical observations. The population projection is Census-based only where an official annual city series is available."
          />
          <SourceRow
            label="Historical archive"
            state="DEMO"
            description="Bundled city history uses demo baseline snapshots and trend fixtures from the project dataset; no external archive or database is connected."
          />
        </DataGroup>

        <DataGroup icon={BrainCircuit} title="Model data" subtitle="What the application calculates">
          <SourceRow
            label="Long-range outlook"
            state="DEMO"
            description={`${forecastYears} bundled forecast checkpoints are interpolated into illustrative scenarios; horizons beyond the final 2040 checkpoint use linear extrapolation. No trained ML prediction model is connected.`}
          />
          <SourceRow
            label="What-if calculations"
            state="SIMULATED"
            description="Local rule-based adjustments use disclosed demo assumptions; they are not calibrated causal forecasts."
          />
          <SourceRow
            label="AI recommendations"
            state="DEMO"
            description="Bundled policy prompts only; there is no connected generative AI or policy model."
          />
          <SourceRow
            label="Weather-adjusted estimates"
            state="SIMULATED"
            description="Energy and water heuristics use current weather model inputs and bundled baselines, not utility telemetry."
          />
        </DataGroup>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3" aria-label="Data status legend">
        {DATA_STATES.map(({ label, description }) => (
          <span key={label} title={description} className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 px-2 py-1 text-[10px] text-slate-300">
            <DataStateBadge state={label} />
            <span className="hidden sm:inline">{description}</span>
          </span>
        ))}
      </div>

      <div className="sr-only" aria-live="polite">
        {liveDataLoading || liveFeedsLoading ? "Live data sources are loading." : "Live data source check complete."}
      </div>
    </section>
  );
}
