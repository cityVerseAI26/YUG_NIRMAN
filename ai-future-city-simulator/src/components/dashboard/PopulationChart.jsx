import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Users } from "lucide-react";
import { useCity } from "../../context/CityContext";
import useCurrentPopulationEstimate from "../../hooks/useCurrentPopulationEstimate";
import {
  ASSUMED_ANNUAL_POPULATION_GROWTH_RATE,
  POPULATION_PROJECTION_YEARS,
  projectPopulationEstimate,
} from "../../utils/populationProjection";

const formatPopulation = (population) => new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumSignificantDigits: 3,
}).format(population);

const buildPopulationChart = (estimate) => {
  const isCensusSeries =
    estimate?.source === "U.S. Census Bureau Population Estimates Program" &&
    Array.isArray(estimate.history) &&
    estimate.history.length >= 2;
  const baselineYear = isCensusSeries
    ? estimate.estimateYear
    : Number.parseInt(String(estimate?.datasetUpdatedAt || estimate?.estimateYear || "").slice(0, 4), 10) || 2026;
  if (!Number.isInteger(baselineYear) || !Number.isSafeInteger(estimate?.population) || estimate.population <= 0) {
    return null;
  }

  const history = isCensusSeries
    ? estimate.history
        .filter((point) => Number.isInteger(point.year) && Number.isSafeInteger(point.population) && point.population > 0)
        .map((point) => ({ ...point, isProjected: false, isReference: false }))
    : [{ year: baselineYear, population: estimate.population, isProjected: false, isReference: true }];
  const projectionYears = POPULATION_PROJECTION_YEARS
    .map(Number)
    .filter((year) => year > baselineYear);
  const projectedPoints = projectionYears
    .map((year) => projectPopulationEstimate(estimate, year))
    .filter(Boolean)
    .map((projection) => ({
      year: projection.targetYear,
      population: projection.projected,
      isProjected: true,
      isReference: false,
      method: projection.method,
    }));
  const finalProjection = projectPopulationEstimate(estimate, 2050);
  if (!finalProjection || projectedPoints.length === 0) return null;

  return {
    chartData: [...history, ...projectedPoints].sort((left, right) => left.year - right.year),
    current: estimate.population,
    currentYear: baselineYear,
    projected: finalProjection.projected,
    projectedYear: finalProjection.targetYear,
    annualGrowthRate: finalProjection.annualGrowthRate,
    firstYear: isCensusSeries ? history[0].year : baselineYear,
    method: finalProjection.method,
  };
};

const CustomPopTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const labelText = point.isReference
    ? "STATIC 2026 ESTIMATE"
    : point.isProjected
      ? point.method === "assumed-rate" ? "ASSUMED PROJECTION" : "CENSUS TREND"
      : "CENSUS ESTIMATE";
  return (
    <div className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1 mb-1">
        <span className="font-bold text-white">Year {label}</span>
        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {labelText}
        </span>
      </div>
      <div className="font-mono font-bold text-cyan-300">{formatPopulation(point.population)}</div>
      {point.isProjected && (
        <div className="mt-1 text-[10px] text-purple-300">
          {point.method === "assumed-rate"
            ? `${(ASSUMED_ANNUAL_POPULATION_GROWTH_RATE * 100).toFixed(0)}% annual assumption; not observed.`
            : "Trend extrapolation; not an official forecast."}
        </div>
      )}
    </div>
  );
};

export const PopulationChart = () => {
  const { city } = useCity();
  const populationResult = useCurrentPopulationEstimate(city);
  const estimate = populationResult.estimate;
  const projection = buildPopulationChart(estimate);
  const hasProjection = Boolean(projection);
  const isAssumption = projection?.method === "assumed-rate";

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>POPULATION PROFILE & PROJECTION</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {populationResult.status === "loading"
                  ? "LOADING POPULATION DATA"
                  : isAssumption
                    ? "STATIC ESTIMATE · ASSUMED PROJECTION"
                    : hasProjection ? "CENSUS-BASED TREND" : "PROJECTION UNAVAILABLE"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {hasProjection
                ? isAssumption
                  ? `Static rounded planning estimate for ${city.name}; source and geographic boundary are undocumented`
                  : `U.S. Census annual estimates for ${city.name} · as of July 1, ${projection.currentYear}`
                : populationResult.status === "loading"
                  ? `Loading the population estimate for ${city.name}…`
                  : `No usable population estimate is available for ${city.name}.`}
            </p>
          </div>
        </div>

        {hasProjection && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500"></span>
              <span className="text-slate-300 text-[11px]">{isAssumption ? "Static 2026 estimate" : "Census estimates"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500"></span>
              <span className="text-purple-300 text-[11px] font-semibold">
                {isAssumption ? "Assumed projection" : "Trend projection"}
              </span>
            </div>
          </div>
        )}
      </div>

      {hasProjection ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 my-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">{isAssumption ? "Static estimate · 2026" : "Latest Census estimate"}</div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-cyan-300">{formatPopulation(projection.current)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Projection · {projection.projectedYear}</div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-purple-300">{formatPopulation(projection.projected)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">{isAssumption ? "Assumed annual growth" : "Annualized historical change"}</div>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-300">
                {(projection.annualGrowthRate * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-300">
            {isAssumption
              ? `The projection starts from a rounded 2026 planning estimate and applies an assumed ${(ASSUMED_ANNUAL_POPULATION_GROWTH_RATE * 100).toFixed(0)}% annual growth rate.`
              : `Projection extends the observed ${projection.firstYear}–${projection.currentYear} Census trend.`}
          </p>

          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projection.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "rgba(56, 189, 248, 0.15)" }} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip content={<CustomPopTooltip />} />
                <Bar dataKey="population" radius={[4, 4, 0, 0]}>
                  {projection.chartData.map((point) => (
                    <Cell key={point.year} fill={point.isProjected ? "#a855f7" : "#06b6d4"} fillOpacity={point.isProjected ? 0.85 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Source: {estimate.source}.{" "}
            {isAssumption
              ? `Classification: ${estimate.classification} / ${estimate.dataType}. Reference date: July 1, ${estimate.estimateYear}. Unit: ${estimate.unit}. Geographic level: ${estimate.geographicLevel}. ${estimate.methodology} Future values are illustrative projections, not official forecasts.`
              : "Projected values are a trend extrapolation, not an official Census forecast or real-time headcount."}
          </p>
        </>
      ) : (
        <div className="my-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-300">
          {populationResult.status === "loading"
            ? "Waiting for the connected population source."
            : populationResult.error || "No 2026 population estimate is available; no projection is generated."}
        </div>
      )}
    </div>
  );
};

export default PopulationChart;
