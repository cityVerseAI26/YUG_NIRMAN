export const POPULATION_PROJECTION_YEARS = ["2027", "2030", "2035", "2040", "2045", "2050"];
export const ASSUMED_ANNUAL_POPULATION_GROWTH_RATE = 0.02;

const CENSUS_POPULATION_SOURCE = "U.S. Census Bureau Population Estimates Program";

export const projectPopulationEstimate = (estimate, targetYear) => {
  if (!Number.isSafeInteger(estimate?.population) || estimate.population <= 0) return null;

  if (
    estimate.source === CENSUS_POPULATION_SOURCE &&
    Array.isArray(estimate.history) &&
    estimate.history.length >= 2
  ) {
    const history = estimate.history
      .filter((point) =>
        Number.isInteger(point.year) &&
        Number.isSafeInteger(point.population) &&
        point.population > 0
      )
      .sort((left, right) => left.year - right.year);
    if (history.length < 2) return null;

    const first = history[0];
    const latest = history[history.length - 1];
    const elapsedYears = latest.year - first.year;
    if (
      elapsedYears <= 0 ||
      latest.year !== estimate.estimateYear ||
      !Number.isInteger(targetYear) ||
      targetYear <= latest.year
    ) return null;

    const annualGrowthRate = (latest.population / first.population) ** (1 / elapsedYears) - 1;
    if (!Number.isFinite(annualGrowthRate)) return null;
    return {
      baseline: latest.population,
      baselineYear: latest.year,
      firstYear: first.year,
      projected: Math.round(latest.population * (1 + annualGrowthRate) ** (targetYear - latest.year)),
      targetYear,
      annualGrowthRate,
      method: "census-trend",
    };
  }

  if (!Number.isInteger(targetYear)) return null;
  const rawYear = Number.parseInt(String(estimate.datasetUpdatedAt || estimate.estimateYear || "").slice(0, 4), 10);
  const baselineYear = Number.isInteger(rawYear) ? rawYear : 2026;
  if (targetYear <= baselineYear) return null;

  return {
    baseline: estimate.population,
    baselineYear,
    firstYear: baselineYear,
    projected: Math.round(
      estimate.population *
      (1 + ASSUMED_ANNUAL_POPULATION_GROWTH_RATE) ** (targetYear - baselineYear)
    ),
    targetYear,
    annualGrowthRate: ASSUMED_ANNUAL_POPULATION_GROWTH_RATE,
    method: "assumed-rate",
  };
};
