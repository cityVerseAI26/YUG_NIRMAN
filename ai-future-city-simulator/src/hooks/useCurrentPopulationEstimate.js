import { getPopulationEstimate2026 } from "../data/populationEstimates2026";

export default function useCurrentPopulationEstimate(city) {
  const cityKey = `${city.id}:${city.name}:${city.state || ""}:${city.country || ""}`;
  const estimate = getPopulationEstimate2026(city);

  return estimate
    ? { key: cityKey, status: "available", estimate, error: "" }
    : {
      key: cityKey,
      status: "unavailable",
      estimate: null,
      error: `No 2026 population estimate is catalogued for ${city.name}.`,
    };
}
