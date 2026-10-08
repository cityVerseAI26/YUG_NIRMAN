const CENSUS_CITY_ESTIMATES_URL =
  "https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html";

export const OFFICIAL_POPULATION_ESTIMATES = {
  boston: {
    city: "Boston",
    state: "Massachusetts",
    population: 672_973,
    estimateYear: 2025,
    referenceDate: "2025-07-01",
    source: "U.S. Census Bureau Population Estimates Program",
    sourceUrl: CENSUS_CITY_ESTIMATES_URL,
  },
};
