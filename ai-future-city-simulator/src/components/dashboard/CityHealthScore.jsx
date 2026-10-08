import React, { useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CircleHelp, RefreshCw, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCity } from "../../context/CityContext";
import { calculateCityHealth } from "../../utils/cityHealthScore";

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const scoreAqi = (value) => {
  if (value == null || value < 0) return null;
  if (value <= 50) return 100;
  if (value <= 100) return 80;
  if (value <= 150) return 60;
  if (value <= 200) return 40;
  if (value <= 300) return 20;
  return 0;
};

const scoreEuropeanAqi = (value) => {
  if (value == null || value < 0) return null;
  if (value <= 20) return 100;
  if (value <= 40) return 80;
  if (value <= 60) return 60;
  if (value <= 80) return 40;
  if (value <= 100) return 20;
  return 0;
};

const formatScore = (value) => value == null ? "N/A" : `${Math.round(value)}`;

const estimatePopulationPressureScore = ({ population, trafficIndex, energyLoad, waterLoad, greenCoverValue }) => {
  if (population == null) return null;
  const populationIndex = clamp((population / 20_000_000) * 100);
  const trafficIndexValue = toFiniteNumber(trafficIndex) ?? 0;
  const energyLoadValue = toFiniteNumber(energyLoad) ?? 0;
  const waterLoadValue = toFiniteNumber(waterLoad) ?? 0;
  const greenCoverValueNumber = toFiniteNumber(greenCoverValue) ?? 0;
  const pressureValue = (
    (populationIndex * 0.18)
    + (trafficIndexValue * 0.26)
    + (energyLoadValue * 0.22)
    + (waterLoadValue * 0.18)
    + ((100 - greenCoverValueNumber) * 0.16)
  );
  return clamp(pressureValue * 0.76);
};

const estimateClimateResilienceScore = ({ aqiScore, greenCoverScore, waterScore }) => {
  if (aqiScore == null && greenCoverScore == null && waterScore == null) return null;
  const safeAqi = toFiniteNumber(aqiScore) ?? 0;
  const safeGreenCover = toFiniteNumber(greenCoverScore) ?? 0;
  const safeWater = toFiniteNumber(waterScore) ?? 0;
  return clamp((safeAqi * 0.30) + (safeGreenCover * 0.42) + (safeWater * 0.28));
};

const estimateHousingScore = ({ populationPressureScore, greenCoverScore, mobilityScore }) => {
  if (populationPressureScore == null && greenCoverScore == null && mobilityScore == null) return null;
  const safePressure = toFiniteNumber(populationPressureScore) ?? 0;
  const safeGreenCover = toFiniteNumber(greenCoverScore) ?? 0;
  const safeMobility = toFiniteNumber(mobilityScore) ?? 0;
  return clamp((safePressure * 0.38) + (safeGreenCover * 0.38) + (safeMobility * 0.24));
};

const estimateInfrastructureScore = ({ energyScore, waterScore, mobilityScore }) => {
  if (energyScore == null && waterScore == null && mobilityScore == null) return null;
  const safeEnergy = toFiniteNumber(energyScore) ?? 0;
  const safeWater = toFiniteNumber(waterScore) ?? 0;
  const safeMobility = toFiniteNumber(mobilityScore) ?? 0;
  return clamp((safeEnergy * 0.36) + (safeWater * 0.34) + (safeMobility * 0.30));
};

const SOURCE_CLASSES = {
  LIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  DEMO: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  ESTIMATE: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  "MIXED DEMO": "border-amber-400/30 bg-amber-400/10 text-amber-200",
};

function DimensionRow({ label, score, source, detail, contextValue }) {
  const unavailable = score == null;
  const color = unavailable ? "bg-slate-700" : score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="flex items-center gap-2">
          <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${SOURCE_CLASSES[source] || "border-slate-700 text-slate-400"}`}>
            {source}
          </span>
          <span className="min-w-10 text-right font-mono font-semibold text-white">
            {unavailable ? "N/A" : `${formatScore(score)} / 100`}
          </span>
        </span>
      </div>
      {unavailable
        ? (
          <>
            {contextValue && <p className="text-[10px] text-slate-300">Context: {contextValue}</p>}
            <p className="text-[10px] text-slate-500">{detail}</p>
          </>
        )
        : (
          <>
            <div
              role="progressbar"
              aria-label={`${label} score`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(score)}
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${clamp(score)}%` }}
                transition={{ duration: 0.6 }}
                className={`h-full rounded-full ${color}`}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">{detail}</p>
          </>
        )}
    </div>
  );
}

export const CityHealthScore = () => {
  const {
    city,
    liveAirQuality,
    liveTrafficFlow,
    liveDataLoading,
    liveAirQualityError,
    liveTrafficFlowError,
    refreshLiveData,
  } = useCity();
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const metrics = city.metrics || {};

  const liveUsAqi = toFiniteNumber(liveAirQuality?.us_aqi);
  const liveEuropeanAqi = toFiniteNumber(liveAirQuality?.european_aqi);
  const demoAqi = toFiniteNumber(metrics.aqi?.value);
  const aqi = liveUsAqi ?? liveEuropeanAqi ?? demoAqi;
  const aqiScore = liveUsAqi != null
    ? scoreAqi(liveUsAqi)
    : liveEuropeanAqi != null
      ? scoreEuropeanAqi(liveEuropeanAqi)
      : scoreAqi(demoAqi);
  const aqiScale = liveUsAqi != null ? "US AQI" : liveEuropeanAqi != null ? "European AQI" : "profile AQI";
  const hasLiveAqi = liveUsAqi != null || liveEuropeanAqi != null;

  const profileTraffic = toFiniteNumber(metrics.traffic?.value);
  const liveTrafficDelay = liveTrafficFlow?.freeFlowTravelTime > 0
    ? ((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100
    : null;
  const hasLiveTraffic = Number.isFinite(liveTrafficDelay);
  const congestion = hasLiveTraffic ? clamp(liveTrafficDelay) : profileTraffic;
  const mobilityScore = congestion == null ? null : 100 - clamp(congestion);

  const greenCover = toFiniteNumber(metrics.greenCover?.value);
  const greenCoverScore = greenCover == null ? null : clamp(greenCover);

  const energyLoad = toFiniteNumber(metrics.energyUsage?.value);
  const energyScore = energyLoad == null ? null : 100 - clamp(energyLoad);
  const waterLoad = toFiniteNumber(metrics.waterDemand?.value);
  const waterScore = waterLoad == null ? null : 100 - clamp(waterLoad);
  const population = toFiniteNumber(metrics.population?.value);
  const populationContext = metrics.population?.display
    || (population == null ? null : `${(population / 1_000_000).toFixed(1)}M people`);
  const populationPressureScore = estimatePopulationPressureScore({
    population,
    trafficIndex: profileTraffic,
    energyLoad,
    waterLoad,
    greenCoverValue: greenCover,
  });
  const climateResilienceScore = estimateClimateResilienceScore({
    aqiScore,
    greenCoverScore,
    waterScore,
  });
  const housingScore = estimateHousingScore({
    populationPressureScore,
    greenCoverScore,
    mobilityScore,
  });
  const infrastructureScore = estimateInfrastructureScore({
    energyScore,
    waterScore,
    mobilityScore,
  });

  const legacyDimensions = [
    {
      label: "Mobility",
      score: mobilityScore,
      source: hasLiveTraffic ? "LIVE" : "DEMO",
      category: hasLiveTraffic ? "live" : "demo",
      detail: hasLiveTraffic
        ? `100 − nearest-road delay (${Math.round(congestion)}%); one TomTom segment, not a citywide measure.`
        : profileTraffic == null
          ? "No traffic measure is available."
          : `100 − bundled congestion index (${Math.round(profileTraffic)}%); illustrative, not an observed citywide average.`,
    },
    {
      label: "Air quality",
      score: aqiScore,
      source: hasLiveAqi ? "LIVE" : "DEMO",
      category: hasLiveAqi ? "live" : "demo",
      detail: aqiScore == null
        ? "No AQI reading is available."
        : `${aqiScale} ${Math.round(aqi)} mapped to ${Math.round(aqiScore)} using the AQI bands below; modeled/coordinate-level data is not a local station reading.`,
    },
    {
      label: "Green cover",
      score: greenCoverScore,
      source: "DEMO",
      category: "demo",
      detail: greenCover == null
        ? "No green-cover estimate is available."
        : `Bundled green-cover estimate (${Math.round(greenCover)}%); GIS or municipal land-cover data is not connected.`,
    },
    {
      label: "Energy",
      score: energyScore,
      source: "DEMO",
      category: "demo",
      detail: energyLoad == null
        ? "No energy load index is available."
        : `100 − bundled energy-use index (${Math.round(energyLoad)}%); a profile proxy, not grid telemetry.`,
    },
    {
      label: "Water",
      score: waterScore,
      source: "DEMO",
      category: "demo",
      detail: waterLoad == null
        ? "No water-demand index is available."
        : `100 − bundled water-demand index (${Math.round(waterLoad)}%); a profile proxy, not utility telemetry.`,
    },
    {
      label: "Population pressure",
      score: populationPressureScore,
      source: populationPressureScore != null ? "ESTIMATE" : "N/A",
      category: populationPressureScore != null ? "estimate" : "context",
      contextValue: populationContext,
      detail: populationPressureScore == null
        ? populationContext
          ? "2026 planning estimate gives population scale only; a proxy pressure score cannot be calculated without the service-demand profile."
          : "No population estimate is available. Population size alone would not establish service pressure."
        : `Estimated from population scale, congestion, energy demand, and water demand; current proxy is ${Math.round(populationPressureScore)} / 100.`,
    },
    {
      label: "Climate & resilience",
      score: climateResilienceScore,
      source: climateResilienceScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: climateResilienceScore == null
        ? "No validated citywide climate-resilience score is connected. Short-range weather forecasts and illustrative hazard scenarios are not long-term climate-risk measures."
        : `Proxy resilience estimate reflects AQI, green cover, and water stress; current score is ${Math.round(climateResilienceScore)} / 100.`,
    },
    {
      label: "Housing",
      score: housingScore,
      source: housingScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: housingScore == null
        ? "No housing supply/demand dataset is connected."
        : `Proxy housing readiness is estimated from pressure, mobility, and green-cover context; current score is ${Math.round(housingScore)} / 100.`,
    },
    {
      label: "Infrastructure",
      score: infrastructureScore,
      source: infrastructureScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: infrastructureScore == null
        ? "No verified asset-condition or service-capacity dataset is connected. Bundled legacy infrastructure ratings are not used in this calculated index."
        : `Proxy infrastructure readiness combines energy, water, and mobility demand; current score is ${Math.round(infrastructureScore)} / 100.`,
    },
  ];

  const { score, dimensions, scoredDimensions, hasLiveInput } = calculateCityHealth({
    city,
    liveAirQuality,
    liveTrafficFlow,
  });
  void legacyDimensions;
  const availableScores = scoredDimensions.map(({ score: value }) => value);
  const sourceLabel = score == null ? "UNAVAILABLE" : hasLiveInput ? "MIXED DEMO" : "DEMO";
  const sortedDimensions = [...scoredDimensions].sort((left, right) => left.score - right.score);
  const priorityDimension = sortedDimensions[0] || null;
  const strongestDimension = sortedDimensions[sortedDimensions.length - 1] || null;
  const liveCount = scoredDimensions.filter(({ category }) => category === "live").length;
  const demoCount = scoredDimensions.filter(({ category }) => category === "demo").length;
  const estimateCount = scoredDimensions.filter(({ category }) => category === "estimate").length;
  const unscoredCount = dimensions.length - scoredDimensions.length;

  const coverageBreakdown = [
    liveCount > 0 ? `${liveCount} live` : null,
    demoCount > 0 ? `${demoCount} illustrative` : null,
    estimateCount > 0 ? `${estimateCount} proxy ${estimateCount === 1 ? "estimate" : "estimates"}` : null,
    unscoredCount > 0 ? `${unscoredCount} context / unscored` : null,
  ].filter(Boolean).join(" · ");

  const chartDimensions = scoredDimensions.map((dimension) => ({
    ...dimension,
    shortLabel: dimension.label,
    difference: score == null ? 0 : dimension.score - score,
  }));
  const scoreStatus = score == null
    ? "Not enough data"
    : score >= 80
      ? "Strong"
      : score >= 65
        ? "Fair"
        : score >= 45
          ? "Needs attention"
          : "At risk";
  const visibleDimensions = dimensions.filter((dimension) => (
    dimensionFilter === "all"
      || (dimensionFilter === "scored" && dimension.score != null)
    || (dimensionFilter === "unscored" && dimension.score == null)
  ));
  const liveErrors = [liveAirQualityError, liveTrafficFlowError].filter(Boolean);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = score == null ? circumference : circumference - (score / 100) * circumference;
  const stroke = score == null ? "#64748b" : score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <section aria-labelledby="city-health-title" className="h-full rounded-2xl border border-cyan-500/20 bg-slate-950/50 p-5">
      <div className="flex items-start justify-between gap-3 border-b border-cyan-500/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400">
            <Activity aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 id="city-health-title" className="text-sm font-bold tracking-tight text-white">CITY HEALTH SCORE</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{city.name} · explainable screening index</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${SOURCE_CLASSES[sourceLabel] || "border-slate-700 text-slate-300"}`}>
            {sourceLabel}
          </span>
          <button
            type="button"
            onClick={refreshLiveData}
            disabled={liveDataLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2 py-1 text-[9px] font-semibold text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={`h-3 w-3 ${liveDataLoading ? "animate-spin" : ""}`} />
            {liveDataLoading ? "Updating" : "Refresh live data"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center">
          <div className="relative h-40 w-40">
            <svg role="img" aria-label={score == null ? "City health score unavailable" : `City health score ${Math.round(score)} out of 100`} className="h-full w-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" className="text-slate-800" fill="transparent" />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={stroke}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-4xl font-extrabold text-white">{formatScore(score)}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {score == null ? "No score" : "out of 100"}
              </span>
              {score != null && <span className="mt-1 text-[9px] text-slate-500">{availableScores.length} of {dimensions.length} indicators scored</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Current assessment</p>
            <p className="mt-1 text-sm font-bold text-white">{scoreStatus}</p>
            <p className="mt-1 text-[10px] text-slate-400">{score == null ? "No indicators are available to score." : `${Math.round(score)} / 100 · equal-weight mean`}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Data coverage</p>
            <p className="mt-1 text-sm font-bold text-white">{scoredDimensions.length} scored · {unscoredCount} unscored</p>
            <p className="mt-1 text-[10px] text-slate-400">{coverageBreakdown || "No indicators currently scored"}</p>
          </div>
        </div>
      </div>

      {(priorityDimension || strongestDimension) && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {priorityDimension && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <Target aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <p className="text-[10px] leading-relaxed text-slate-300">
                <span className="font-bold text-amber-200">Priority to investigate: {priorityDimension.label}</span>
                {" "}({Math.round(priorityDimension.score)}/100). Review the source detail below; a low score is a screening signal, not proof of a cause.
              </p>
            </div>
          )}
          {strongestDimension && strongestDimension !== priorityDimension && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <TrendingUp aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <p className="text-[10px] leading-relaxed text-slate-300">
                <span className="font-bold text-emerald-200">Strongest available indicator: {strongestDimension.label}</span>
                {" "}({Math.round(strongestDimension.score)}/100).
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-cyan-950/20 p-4 shadow-lg shadow-cyan-950/10">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-white">Difference from overall score</h3>
              <p className="mt-1 text-[10px] text-slate-400">
                Indicator points above or below the {score == null ? "overall" : `${Math.round(score)}-point`} average
              </p>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[9px] font-semibold text-cyan-200">
              {chartDimensions.length} compared
            </span>
          </div>
          {chartDimensions.length ? (
            <div role="img" aria-label={`Difference chart from the overall score of ${Math.round(score)}: ${chartDimensions.map(({ label, difference }) => `${label} ${difference >= 0 ? "plus" : "minus"} ${Math.abs(Math.round(difference))} points`).join(", ")}`} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDimensions}
                  layout="vertical"
                  margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="rgba(148,163,184,0.16)"
                  />
                  <XAxis
                    type="number"
                    domain={[-100, 100]}
                    ticks={[-100, -50, 0, 50, 100]}
                    tickFormatter={(value) => value > 0 ? `+${value}` : value}
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={84}
                    tick={{ fill: "#cbd5e1", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine x={0} stroke="#cbd5e1" strokeOpacity={0.55} />
                  <Tooltip
                    formatter={(_value, _name, item) => {
                      const { score: dimensionScore, difference, source } = item.payload;
                      const signedDifference = difference >= 0
                        ? `+${Math.round(difference)}`
                        : `${Math.round(difference)}`;
                      return [
                        `${signedDifference} pts · score ${Math.round(dimensionScore)}/100 · ${source}`,
                        "Difference",
                      ];
                    }}
                    contentStyle={{
                      background: "rgba(2, 6, 23, 0.96)",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  />
                  <Bar dataKey="difference" name="Difference" radius={[0, 7, 7, 0]} maxBarSize={22}>
                    {chartDimensions.map((dimension) => (
                      <Cell
                        key={dimension.label}
                        fill={dimension.difference >= 0 ? "#34d399" : "#fb7185"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">
              No scored indicators are available to chart.
            </div>
          )}
          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
            Green is above average; rose is below. Missing indicators are not plotted.
          </p>
        </article>

        <article className="min-w-0 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-violet-950/20 p-4 shadow-lg shadow-violet-950/10">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-white">Indicator scorecard</h3>
              <p className="mt-1 text-[10px] text-slate-400">Compare the scored dimensions side by side</p>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Live</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Illustrative</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" />Proxy estimate</span>
            </div>
          </div>
          {chartDimensions.length ? (
            <div role="img" aria-label={`Bar chart comparing ${chartDimensions.map(({ label, score }) => `${label} ${Math.round(score)} out of 100`).join(", ")}`} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDimensions}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="rgba(148,163,184,0.16)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={84}
                    tick={{ fill: "#cbd5e1", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${Math.round(Number(value))} / 100 · ${item.payload.source}`,
                      "Score",
                    ]}
                    contentStyle={{
                      background: "rgba(2, 6, 23, 0.96)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  />
                  <Bar dataKey="score" name="Score" radius={[0, 8, 8, 0]} maxBarSize={22}>
                    {chartDimensions.map((dimension) => (
                      <Cell
                        key={dimension.label}
                        fill={
                          dimension.category === "live"
                            ? "#34d399"
                            : dimension.category === "estimate"
                              ? "#22d3ee"
                              : "#a78bfa"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">
              No scored indicators are available to chart.
            </div>
          )}
          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
            Bar color identifies data source; hover over a bar for its score and source.
          </p>
        </article>
      </div>

      {liveErrors.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/25 bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent p-3 shadow-sm shadow-amber-950/20 sm:p-4"
        >
          <span className="mt-0.5 shrink-0 rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-amber-200">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold leading-snug text-amber-100">
              Live data feed needs attention
            </p>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-amber-100/80">
              {liveErrors.join(" ")}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              The score continues with clearly labeled profile data where available; traffic is not counted as live.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-800/80 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Indicator breakdown</p>
          <div className="flex gap-1" aria-label="Filter indicators">
            {[
              ["all", "All"],
              ["scored", "Scored"],
              ["unscored", "Unscored / context"],
            ].map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                aria-pressed={dimensionFilter === filter}
                onClick={() => setDimensionFilter(filter)}
                className={`rounded-full border px-2 py-1 text-[9px] font-semibold transition-colors ${
                  dimensionFilter === filter
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {visibleDimensions.map((dimension) => <DimensionRow key={dimension.label} {...dimension} />)}
        {visibleDimensions.length === 0 && (
          <p className="text-[10px] text-slate-500">No indicators in this filter.</p>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-cyan-500/15 bg-slate-900/60 p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-cyan-200">
          <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" />
          WHY THIS SCORE?
        </summary>
        <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-slate-400">
          <p>
            The index is the equal-weight mean of the available Mobility, Air quality, Green cover, Energy, Water, and proxy-estimate dimensions. Population is shown as a 2026 planning estimate and used as context for a pressure proxy, while climate resilience, housing, and infrastructure are approximated from the profile data that is already connected. Missing indicators are kept transparent instead of being silently inferred.
          </p>
          <p>
            Mobility = 100 − congestion/delay index; Air quality = AQI band score; Green cover = bundled percentage; Energy and Water = 100 − their bundled use/demand index. Population pressure, climate resilience, housing, and infrastructure use conservative proxy formulas so the dashboard stays usable even when a city lacks a validated benchmark dataset. US/profile AQI bands are 0–50: 100, 51–100: 80, 101–150: 60, 151–200: 40, 201–300: 20, above 300: 0; European AQI bands are 0–20: 100, 21–40: 80, 41–60: 60, 61–80: 40, 81–100: 20, above 100: 0.
          </p>
          <p>
            This remains a transparent demonstration index, not a standardized city-health rating. Profile values are clearly labeled as demo or estimate inputs, and current Open-Meteo AQI or nearest-road TomTom readings remain separate from the full score so the user can distinguish a measured signal from a proxy estimate.
          </p>
        </div>
      </details>
    </section>
  );
};

export default CityHealthScore;
