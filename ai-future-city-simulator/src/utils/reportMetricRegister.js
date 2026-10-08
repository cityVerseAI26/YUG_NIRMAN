const canonicalPath = (path) => String(path)
  .replace(/^cityProfile\.metrics\./, "")
  .replace(/^cityState\./, "");

const metricValueKey = (metric) => JSON.stringify([
  metric.value,
  metric.unit,
  metric.timestamp,
  metric.status,
]);

const GROUP_LABELS = {
  airQuality: "Air quality",
  cityHealth: "City health",
  cityProfile: "City profile",
  cityState: "City indicators",
  energyProfile: "Energy profile",
  liveAirQualityHourly: "Air-quality forecast",
  liveWeatherHourly: "Weather forecast",
  pollutionProfile: "Air quality profile",
  populationEstimate: "Population estimate",
  populationProfile: "Population profile",
  predictions: "Predictions",
  scenarios: "Scenario",
  sensorStations: "Air-quality sensors",
  trafficFlow: "Traffic flow",
  trafficProfile: "Traffic profile",
  waterProfile: "Water profile",
  weather: "Weather",
};

const FIELD_LABELS = {
  apparent_temperature: "Feels-like temperature",
  cloud_cover: "Cloud cover",
  currentSpeed: "Current speed",
  currentTravelTime: "Current travel time",
  freeFlowSpeed: "Free-flow speed",
  freeFlowTravelTime: "Free-flow travel time",
  precipitation: "Rainfall",
  precipitation_probability: "Rain probability",
  pressure_msl: "Air pressure",
  relative_humidity_2m: "Humidity",
  temperature_2m: "Temperature",
  us_aqi: "US AQI",
  visibility: "Visibility",
  wind_gusts_10m: "Wind gust",
  wind_speed_10m: "Wind speed",
};

const humanize = (segment) => segment
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ")
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatMetricPath = (path) => String(path)
  .split(".")
  .map((segment, index) => {
    const indexedSegment = segment.match(/^(.*)\[(\d+)\]$/);
    const name = indexedSegment ? indexedSegment[1] : segment;
    const label = index === 0
      ? GROUP_LABELS[name] || humanize(name)
      : FIELD_LABELS[name] || humanize(name);
    return indexedSegment ? `${label} · item ${indexedSegment[2]}` : label;
  })
  .join(" · ");

export const getUnrepresentedMetrics = (dataProvenance, summaryMetrics) => {
  const representedPaths = new Set(
    summaryMetrics
      .map((metric) => metric.path)
      .filter((path) => typeof path === "string" && path.length > 0)
      .map(canonicalPath),
  );
  const unique = new Map();

  (Array.isArray(dataProvenance) ? dataProvenance : []).forEach((metric) => {
    const keyPath = canonicalPath(metric.path);
    if (representedPaths.has(keyPath)) return;
    const key = `${keyPath}:${metricValueKey(metric)}`;
    const existing = unique.get(key);
    if (existing) {
      existing.alsoRecordedAs.push({ path: metric.path, source: metric.source });
      return;
    }
    unique.set(key, { ...metric, alsoRecordedAs: [] });
  });

  return [...unique.values()];
};
