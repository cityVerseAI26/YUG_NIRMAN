export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"];

const RISK_SCORES = {
  LOW: 10,
  MODERATE: 30,
  HIGH: 55,
  "VERY HIGH": 75,
  CRITICAL: 90,
};

export const RISK_THRESHOLDS = {
  heatCelsius: [
    { level: "CRITICAL", minimum: 40 },
    { level: "VERY HIGH", minimum: 35 },
    { level: "HIGH", minimum: 32 },
    { level: "MODERATE", minimum: 30 },
  ],
  rainfallMillimeters: [
    { level: "CRITICAL", minimum: 50 },
    { level: "VERY HIGH", minimum: 30 },
    { level: "HIGH", minimum: 20 },
    { level: "MODERATE", minimum: 7.5 },
  ],
  windKilometersPerHour: [
    { level: "CRITICAL", minimum: 100 },
    { level: "VERY HIGH", minimum: 80 },
    { level: "HIGH", minimum: 60 },
    { level: "MODERATE", minimum: 40 },
  ],
  usAqi: [
    { level: "CRITICAL", minimum: 201 },
    { level: "VERY HIGH", minimum: 151 },
    { level: "HIGH", minimum: 101 },
    { level: "MODERATE", minimum: 51 },
  ],
};

export const toTimestampMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 100_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const formatTimestamp = (value) => {
  const timestamp = toTimestampMs(value);
  if (timestamp === null) return "Timestamp unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

const classifyThreshold = (value, thresholds) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return thresholds.find(({ minimum }) => value >= minimum)?.level || "LOW";
};

export const classifyHeat = (temperature) =>
  classifyThreshold(temperature, RISK_THRESHOLDS.heatCelsius);

export const classifyRainfall = (millimetersPerHour) =>
  classifyThreshold(millimetersPerHour, RISK_THRESHOLDS.rainfallMillimeters);

export const classifyWind = (kilometersPerHour) =>
  classifyThreshold(kilometersPerHour, RISK_THRESHOLDS.windKilometersPerHour);

export const classifyUsAqi = (aqi) =>
  classifyThreshold(aqi, RISK_THRESHOLDS.usAqi);

export const calculateScreeningScore = (levels) => {
  const scores = levels
    .filter((level) => Object.hasOwn(RISK_SCORES, level))
    .map((level) => RISK_SCORES[level]);
  return scores.length ? Math.max(...scores) : null;
};

export const getRiskTrend = (currentScore, forecastScore) => {
  if (currentScore === null || forecastScore === null) return "UNAVAILABLE";
  if (forecastScore > currentScore) return "INCREASING";
  if (forecastScore < currentScore) return "DECREASING";
  return "STEADY";
};

const getClosestIndex = (times, targetTimestamp, maxDistanceMs = 90 * 60 * 1000) => {
  if (!Array.isArray(times) || !times.length || targetTimestamp === null) return -1;
  let closestIndex = -1;
  let closestDistance = Infinity;
  times.forEach((time, index) => {
    const timestamp = toTimestampMs(time);
    if (timestamp === null) return;
    const distance = Math.abs(timestamp - targetTimestamp);
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });
  return closestDistance <= maxDistanceMs ? closestIndex : -1;
};

export const getForecastSnapshot = ({ weatherHourly, airQualityHourly, targetTimestamp }) => {
  const weatherIndex = getClosestIndex(weatherHourly?.time, targetTimestamp);
  const airQualityIndex = getClosestIndex(airQualityHourly?.time, targetTimestamp);
  const getAt = (series, index, key) => {
    if (index < 0 || !Array.isArray(series?.[key])) return null;
    const rawValue = series[key][index];
    if (rawValue == null) return null;
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  };

  return {
    timestamp:
      weatherIndex >= 0
        ? weatherHourly.time[weatherIndex]
        : airQualityIndex >= 0
          ? airQualityHourly.time[airQualityIndex]
          : null,
    temperature: getAt(weatherHourly, weatherIndex, "temperature_2m"),
    feelsLike: getAt(weatherHourly, weatherIndex, "apparent_temperature"),
    precipitation: getAt(weatherHourly, weatherIndex, "precipitation"),
    precipitationProbability: getAt(weatherHourly, weatherIndex, "precipitation_probability"),
    windGust: getAt(weatherHourly, weatherIndex, "wind_gusts_10m"),
    windSpeed: getAt(weatherHourly, weatherIndex, "wind_speed_10m"),
    humidity: getAt(weatherHourly, weatherIndex, "relative_humidity_2m"),
    cloudCover: getAt(weatherHourly, weatherIndex, "cloud_cover"),
    pressure: getAt(weatherHourly, weatherIndex, "pressure_msl"),
    visibility: getAt(weatherHourly, weatherIndex, "visibility"),
    uvIndex: getAt(weatherHourly, weatherIndex, "uv_index"),
    soilMoisture: getAt(weatherHourly, weatherIndex, "soil_moisture_0_to_7cm"),
    aqi: getAt(airQualityHourly, airQualityIndex, "us_aqi"),
  };
};

export const assessClimateSignals = ({ temperature, feelsLike, precipitation, windGust, aqi }) => ({
  heat: classifyHeat(Math.max(
    Number.isFinite(temperature) ? temperature : Number.NEGATIVE_INFINITY,
    Number.isFinite(feelsLike) ? feelsLike : Number.NEGATIVE_INFINITY,
  )),
  rainfall: classifyRainfall(precipitation),
  wind: classifyWind(windGust),
  airQuality: classifyUsAqi(aqi),
});

export const assessCityWeatherForecast = ({ weatherHourly, airQualityHourly, startTimestamp, hours }) => {
  if (!Number.isFinite(startTimestamp) || !Number.isFinite(hours)) return null;
  const endTimestamp = startTimestamp + hours * 60 * 60 * 1000;
  const weatherTimes = weatherHourly?.time || [];
  const airTimes = airQualityHourly?.time || [];
  const weatherIndices = weatherTimes
    .map((time, index) => ({ time: toTimestampMs(time), index }))
    .filter(({ time }) => time !== null && time >= startTimestamp && time <= endTimestamp);
  const airIndices = airTimes
    .map((time, index) => ({ time: toTimestampMs(time), index }))
    .filter(({ time }) => time !== null && time >= startTimestamp && time <= endTimestamp);
  if (!weatherIndices.length && !airIndices.length) return null;

  const maxFromSeries = (series, indices, key) => {
    const values = indices
      .map(({ index }) => series?.[key]?.[index])
      .filter((value) => value != null)
      .map(Number)
      .filter(Number.isFinite);
    return values.length ? Math.max(...values) : null;
  };

  const signals = assessClimateSignals({
    temperature: Math.max(
      maxFromSeries(weatherHourly, weatherIndices, "temperature_2m") ?? Number.NEGATIVE_INFINITY,
      maxFromSeries(weatherHourly, weatherIndices, "apparent_temperature") ?? Number.NEGATIVE_INFINITY,
    ),
    precipitation: maxFromSeries(weatherHourly, weatherIndices, "precipitation"),
    windGust: maxFromSeries(weatherHourly, weatherIndices, "wind_gusts_10m"),
    aqi: maxFromSeries(airQualityHourly, airIndices, "us_aqi"),
  });
  const score = calculateScreeningScore(Object.values(signals));
  let peakTimestamp = null;
  let peakScore = null;
  const candidateTimes = [...new Set([
    ...weatherIndices.map(({ time }) => time),
    ...airIndices.map(({ time }) => time),
  ])].sort((left, right) => left - right);
  for (const timestamp of candidateTimes) {
    const snapshot = getForecastSnapshot({
      weatherHourly,
      airQualityHourly,
      targetTimestamp: timestamp,
    });
    const snapshotSignals = assessClimateSignals(snapshot);
    const snapshotScore = calculateScreeningScore(Object.values(snapshotSignals));
    if (snapshotScore !== null && (peakScore === null || snapshotScore > peakScore)) {
      peakTimestamp = timestamp;
      peakScore = snapshotScore;
    }
  }

  return { signals, score, timestamp: peakTimestamp };
};

export const buildClimateScenario = ({ current, changes }) => {
  const temperature = Number.isFinite(current.temperature)
    ? current.temperature + changes.temperatureCelsius
    : null;
  const feelsLike = Number.isFinite(current.feelsLike)
    ? current.feelsLike + changes.temperatureCelsius
    : null;
  const precipitation = Number.isFinite(current.precipitation)
    ? current.precipitation * (1 + changes.rainfallPercent / 100)
    : null;
  const signals = assessClimateSignals({
    temperature,
    feelsLike,
    precipitation,
    windGust: current.windGust,
    aqi: current.aqi,
  });
  const score = calculateScreeningScore(Object.values(signals));

  return {
    temperature,
    feelsLike,
    precipitation,
    waterAvailabilityDecreasePercent: changes.waterAvailabilityPercent,
    signals,
    score,
    waterStress: null,
    energyDemand: null,
    trafficDisruption: null,
    infrastructureStress: null,
    populationExposure: null,
  };
};
