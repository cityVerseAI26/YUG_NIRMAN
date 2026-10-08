import { calculateCityHealth } from "./cityHealthScore.js";

const finiteNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const profileIndicator = ({ name, value, unit, source, timestamp = null }) => ({
  name,
  value: finiteNumber(value),
  unit,
  source,
  timestamp,
  status: finiteNumber(value) === null ? "UNAVAILABLE" : "ESTIMATED",
  climateImpact: "UNAVAILABLE — no validated climate-impact linkage",
});

export function getClimateSystemIndicators({
  city,
  liveTrafficFlow,
  liveAirQuality,
  soilMoisture,
  soilMoistureTimestamp,
  populationEstimate,
  climateRiskScore,
  climateRiskTimestamp,
}) {
  const metrics = city?.metrics || {};
  const trafficCurrent = finiteNumber(liveTrafficFlow?.currentTravelTime);
  const trafficFreeFlow = finiteNumber(liveTrafficFlow?.freeFlowTravelTime);
  const trafficIsLive = !liveTrafficFlow?.isSimulated
    && trafficCurrent !== null
    && trafficFreeFlow !== null
    && trafficFreeFlow > 0;
  const profileTraffic = finiteNumber(metrics.traffic?.value);
  const trafficValue = trafficIsLive
    ? Number((((trafficCurrent / trafficFreeFlow) - 1) * 100).toFixed(1))
    : profileTraffic;
  const profileSource = city?.dataMode === "illustrative"
    ? "Illustrative Mumbai-derived reference profile"
    : "Bundled CityState profile";
  const populationValue = finiteNumber(populationEstimate?.population)
    ?? finiteNumber(metrics.population?.value);
  const health = calculateCityHealth({ city, liveAirQuality, liveTrafficFlow });
  const resilience = health.dimensions.find(({ label }) => label === "Climate & resilience");
  const infrastructure = health.dimensions.find(({ label }) => label === "Infrastructure");

  return [
    {
      name: "Climate risk screening",
      value: finiteNumber(climateRiskScore),
      unit: "/ 90 screening points",
      source: "Rule-based screen of available city-coordinate weather and US AQI model values",
      timestamp: climateRiskTimestamp || null,
      status: finiteNumber(climateRiskScore) === null ? "UNAVAILABLE" : "INFERRED",
      climateImpact: "Screening result only; downstream impacts are not calculated.",
    },
    {
      name: "Traffic",
      value: trafficValue,
      unit: trafficIsLive ? "% delay vs nearest-road free-flow time" : "% profile index",
      source: trafficIsLive ? "TomTom nearest-road flow segment" : `${profileSource}: traffic index`,
      timestamp: trafficIsLive ? liveTrafficFlow.retrievedAt || null : null,
      status: trafficValue === null ? "UNAVAILABLE" : trafficIsLive ? "LIVE" : "ESTIMATED",
      climateImpact: "UNAVAILABLE — no validated weather-to-traffic model",
    },
    profileIndicator({
      name: "Energy demand",
      value: metrics.energyUsage?.value,
      unit: "% profile index",
      source: `${profileSource}: energy index; not utility telemetry`,
    }),
    profileIndicator({
      name: "Water demand",
      value: metrics.waterDemand?.value,
      unit: "% profile index",
      source: `${profileSource}: water-demand index; not measured availability`,
    }),
    {
      name: "Infrastructure readiness proxy",
      value: finiteNumber(infrastructure?.score),
      unit: "/ 100 proxy points",
      source: infrastructure?.detail || "Shared City Health calculation",
      timestamp: health.timestamp || null,
      status: finiteNumber(infrastructure?.score) === null ? "UNAVAILABLE" : "ESTIMATED",
      climateImpact: "UNAVAILABLE — no verified asset-condition or weather-stress model",
    },
    {
      name: "Population",
      value: populationValue,
      unit: "people",
      source: populationEstimate?.source || "CityState population estimate",
      timestamp: populationEstimate?.referenceDate || null,
      status: populationValue === null ? "UNAVAILABLE" : "ESTIMATED",
      climateImpact: "UNAVAILABLE — no spatial population-exposure model",
    },
    {
      name: "Modelled near-surface soil moisture",
      value: finiteNumber(soilMoisture),
      unit: "m³/m³ (0–7 cm)",
      source: "Open-Meteo soil-moisture model; not a municipal water-availability measurement",
      timestamp: soilMoistureTimestamp || null,
      status: finiteNumber(soilMoisture) === null ? "UNAVAILABLE" : "ESTIMATED",
      climateImpact: "Soil-moisture context only; no locally calibrated drought or water-stress classification.",
    },
    {
      name: "Public safety",
      value: null,
      unit: "",
      source: "No connected dispatch, shelter-capacity, or verified hazard-zone data",
      timestamp: null,
      status: "UNAVAILABLE",
      climateImpact: "UNAVAILABLE — no validated climate-to-safety linkage",
    },
    {
      name: "Climate resilience proxy",
      value: finiteNumber(resilience?.score),
      unit: "/ 100 proxy points",
      source: "Shared City Health climate-resilience component",
      timestamp: health.timestamp || null,
      status: finiteNumber(resilience?.score) === null ? "UNAVAILABLE" : "ESTIMATED",
      climateImpact: "Proxy only; not a measured citywide resilience score.",
    },
  ];
}
