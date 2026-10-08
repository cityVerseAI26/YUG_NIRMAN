const numberOrNull = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatUpdateTime = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

const severityFor = (value, warningAt, highAt) => {
  if (value >= highAt) return "HIGH";
  if (value >= warningAt) return "MODERATE";
  return null;
};

const makeProblem = ({
  id,
  title,
  severity,
  value,
  source,
  evidenceClass,
  location,
  systems,
  evidence,
  updatedAt = null,
  cause,
  nextCheck,
  priority,
}) => ({
  id,
  title,
  severity,
  value,
  source,
  evidenceClass,
  location,
  systems,
  evidence,
  updatedAt,
  cause,
  nextCheck,
  priority,
});

const diagnosisRules = [
  ({ city, liveTrafficFlow }) => {
    const currentDelay = !liveTrafficFlow?.isSimulated && liveTrafficFlow?.freeFlowTravelTime > 0
      ? ((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100
      : null;
    const value = numberOrNull(currentDelay) ?? numberOrNull(city.metrics?.traffic?.value);
    if (value == null) return null;
    const severity = severityFor(value, 50, 70);
    if (!severity) return null;
    const live = numberOrNull(currentDelay) != null;
    return makeProblem({
      id: "traffic",
      title: "High congestion / road delay",
      severity,
      value: `${Math.round(value)}% ${live ? "delay vs free flow" : "congestion index"}`,
      source: live ? "TomTom nearest-road flow" : "Bundled city profile",
      evidenceClass: live ? "LIVE FEED" : "ILLUSTRATIVE PROFILE",
      location: live ? `Road near ${city.name} reference point` : city.name,
      systems: "Mobility · travel time",
      evidence: live
        ? "TomTom travel-time comparison on one nearby road segment; it is not a citywide average."
        : "Bundled traffic index crosses the dashboard screening threshold; no verified citywide count is connected.",
      updatedAt: live ? formatUpdateTime(liveTrafficFlow.retrievedAt) : null,
      cause: "Root cause is not established. No network-level vehicle volume, road-capacity, or incident data is connected.",
      nextCheck: "Compare additional corridors and peak/off-peak periods before prioritizing a transport intervention.",
      priority: value,
    });
  },
  ({ city, liveAirQuality }) => {
    const liveUsAqi = numberOrNull(liveAirQuality?.us_aqi);
    const liveEuropeanAqi = numberOrNull(liveAirQuality?.european_aqi);
    const profileAqi = numberOrNull(city.metrics?.aqi?.value);
    const value = liveUsAqi ?? liveEuropeanAqi ?? profileAqi;
    if (value == null) return null;
    const scale = liveUsAqi != null ? "US AQI" : liveEuropeanAqi != null ? "European AQI" : "profile AQI";
    const severity = liveEuropeanAqi != null && liveUsAqi == null
      ? severityFor(value, 41, 61)
      : severityFor(value, 101, 151);
    if (!severity) return null;
    const live = liveUsAqi != null || liveEuropeanAqi != null;
    return makeProblem({
      id: "air",
      title: "Elevated air-quality index",
      severity,
      value: `${Math.round(value)} ${scale}`,
      source: live ? "Open-Meteo coordinate model" : "Bundled city profile",
      evidenceClass: live ? "LIVE MODEL" : "ILLUSTRATIVE PROFILE",
      location: city.name,
      systems: "Environment · public health",
      evidence: live
        ? "Coordinate-level atmospheric model output; not a municipal station reading or local hotspot measurement."
        : "Bundled profile AQI crosses the dashboard screening threshold; no station archive is connected.",
      updatedAt: live ? formatUpdateTime(liveAirQuality.time) : null,
      cause: "The source of the AQI cannot be attributed here. Emissions, weather, and local monitoring evidence are unavailable.",
      nextCheck: "Compare nearby station observations and local weather/emissions context before attributing the reading or selecting controls.",
      priority: value,
    });
  },
  ({ city }) => {
    const value = numberOrNull(city.metrics?.energyUsage?.value);
    if (value == null) return null;
    const severity = severityFor(value, 70, 85);
    if (!severity) return null;
    return makeProblem({
      id: "energy",
      title: "High energy-use profile index",
      severity,
      value: `${Math.round(value)}% profile index`,
      source: "Bundled city profile",
      evidenceClass: "ILLUSTRATIVE PROFILE",
      location: city.name,
      systems: "Energy · infrastructure",
      evidence: "The bundled profile index crosses the dashboard screening threshold; no utility meter or grid-capacity data is connected.",
      cause: "Root cause is not established. Building demand, peak load, generation mix, and outage evidence are unavailable.",
      nextCheck: "Validate against utility feeder demand, peak-load, and outage records before targeting conservation or grid upgrades.",
      priority: value,
    });
  },
  ({ city }) => {
    const value = numberOrNull(city.metrics?.waterDemand?.value);
    if (value == null) return null;
    const severity = severityFor(value, 70, 85);
    if (!severity) return null;
    return makeProblem({
      id: "water",
      title: "High water-demand profile index",
      severity,
      value: `${Math.round(value)}% profile index`,
      source: "Bundled city profile",
      evidenceClass: "ILLUSTRATIVE PROFILE",
      location: city.name,
      systems: "Water · public services",
      evidence: "The bundled profile index crosses the dashboard screening threshold; no utility supply, capacity, or distribution data is connected.",
      cause: "Root cause is not established. Consumption, leakage, supply, and reservoir data are unavailable.",
      nextCheck: "Validate against utility supply, reservoir, leakage, and demand records before prioritizing conservation or repairs.",
      priority: value,
    });
  },
  ({ city }) => {
    const value = numberOrNull(city.metrics?.greenCover?.value);
    if (value == null) return null;
    const severity = value < 10 ? "HIGH" : value < 20 ? "MODERATE" : null;
    if (!severity) return null;
    return makeProblem({
      id: "green",
      title: "Low green-cover profile",
      severity,
      value: `${Math.round(value)}% profile estimate`,
      source: "Bundled city profile",
      evidenceClass: "ILLUSTRATIVE PROFILE",
      location: city.name,
      systems: "Environment · heat resilience",
      evidence: "The bundled green-cover estimate is below the dashboard screening threshold; no mapped land-cover dataset is connected.",
      cause: "The estimate cannot identify specific neighborhoods or explain land-use changes.",
      nextCheck: "Verify with current GIS or municipal land-cover data and localize priority areas before setting planting targets.",
      priority: 100 - value,
    });
  },
];

export function getCityDiagnosis(context) {
  return diagnosisRules
    .map((evaluate) => evaluate(context))
    .filter(Boolean)
    .sort((left, right) => {
      const severityOrder = { HIGH: 0, MODERATE: 1 };
      return severityOrder[left.severity] - severityOrder[right.severity] || right.priority - left.priority;
    })
    .slice(0, 5);
}
