const humanize = (value) => String(value)
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ")
  .replace(/\bapi\b/gi, "API")
  .replace(/\baqi\b/gi, "AQI")
  .replace(/\b\w/g, (character) => character.toUpperCase());

const GROUP_LABELS = {
  airQuality: "Air quality",
  alerts: "Warnings",
  cityHealth: "City health",
  cityProfile: "City profile",
  cityState: "City indicators",
  energyProfile: "Energy",
  liveAirQualityHourly: "Air-quality forecast",
  liveWeatherHourly: "Weather forecast",
  pollutionProfile: "Air quality profile",
  populationEstimate: "Population estimate",
  populationProfile: "Population",
  predictions: "Predictions",
  scenarios: "Scenario",
  sensorStations: "Air-quality sensors",
  trafficFlow: "Traffic",
  trafficProfile: "Traffic profile",
  waterProfile: "Water",
  weather: "Weather",
};

const METRIC_LABELS = {
  apparent_temperature: "Feels-like temperature",
  cloud_cover: "Cloud cover",
  currentSpeed: "Current traffic speed",
  precipitation: "Rainfall",
  pressure_msl: "Air pressure",
  relative_humidity_2m: "Relative humidity",
  temperature_2m: "Temperature",
  us_aqi: "Air quality index",
  visibility: "Visibility",
  wind_gusts_10m: "Wind gust",
  wind_speed_10m: "Wind speed",
};

export const summarizeReportDataGaps = (
  dataGaps,
  populationProfile = {},
  limit = Number.POSITIVE_INFINITY,
) => {
  const paths = Array.isArray(dataGaps) ? dataGaps : [];
  const history = Array.isArray(populationProfile?.historyAndForecast)
    ? populationProfile.historyAndForecast
    : [];
  const referenceYear = Number(populationProfile?.referenceYear);
  const summaries = new Set();
  let missingHistoricalPopulation = false;
  const missingForecastYears = new Set();

  paths.forEach((path) => {
    const populationSeriesMatch = String(path).match(
      /^populationProfile\.historyAndForecast\[(\d+)\]\.(actual|predicted)$/,
    );
    if (populationSeriesMatch) {
      const [, rawIndex, field] = populationSeriesMatch;
      const point = history[Number(rawIndex)];
      const year = Number(point?.year);
      if (field === "actual" && (!Number.isFinite(referenceYear) || year <= referenceYear)) {
        missingHistoricalPopulation = true;
      } else if (
        field === "predicted"
        && Number.isFinite(referenceYear)
        && Number.isFinite(year)
        && year > referenceYear
      ) {
        missingForecastYears.add(year);
      }
      return;
    }

    const parts = String(path).replace(/\[\d+\]/g, "").split(".").filter(Boolean);
    const group = GROUP_LABELS[parts[0]] || humanize(parts[0] || "City indicator");
    const metric = parts.at(-1);
    summaries.add(metric && metric !== parts[0]
      ? `${group} — ${METRIC_LABELS[metric] || humanize(metric)} unavailable`
      : `${group} unavailable`);
  });

  if (missingHistoricalPopulation) {
    summaries.add("Population history — verified data unavailable");
  }
  if (missingForecastYears.size) {
    const years = [...missingForecastYears].sort((left, right) => left - right).join(", ");
    summaries.add(`Population forecast — values unavailable for ${years}`);
  }

  return [...summaries].slice(0, Math.max(0, limit));
};
