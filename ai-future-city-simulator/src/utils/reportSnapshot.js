import {
  assessCityWeatherForecast,
  assessClimateSignals,
  calculateScreeningScore,
  classifyHeat,
  classifyRainfall,
  classifyUsAqi,
  classifyWind,
} from "./climateRiskEngine.js";

export const REPORT_UNAVAILABLE = "Not available from current data source";

const STATUS_VALUES = new Set([
  "LIVE",
  "MODELLED",
  "PREDICTED",
  "SIMULATED",
  "ESTIMATED",
  "HISTORICAL",
  "UNAVAILABLE",
]);

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const hasDataValue = (value) => {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const normalizeValue = (value) => {
  if (value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
  }
  return value;
};

export const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const getUnit = (path) => {
  const field = path.split(".").at(-1)?.replace(/\[\d+\]$/, "");
  if (path.endsWith("population.value")) return "people";
  if (path.endsWith("traffic.value")) return "% index";
  if (path.endsWith("aqi.value")) return "AQI";
  if (path.endsWith("waterDemand.value") || path.endsWith("energyUsage.value")) return "% profile index";
  if (path.endsWith("greenCover.value")) return "%";
  const units = {
    temperature_2m: "°C",
    apparent_temperature: "°C",
    relative_humidity_2m: "%",
    precipitation: "mm",
    precipitation_probability: "%",
    wind_speed_10m: "km/h",
    wind_gusts_10m: "km/h",
    uv_index: "index",
    visibility: "m",
    pressure_msl: "hPa",
    cloud_cover: "%",
    us_aqi: "US AQI",
    european_aqi: "European AQI",
    pm2_5: "µg/m³",
    pm10: "µg/m³",
    currentSpeed: "km/h",
    freeFlowSpeed: "km/h",
    currentTravelTime: "seconds",
    freeFlowTravelTime: "seconds",
    population: "people",
  };
  return units[field] || REPORT_UNAVAILABLE;
};

const flattenValues = (value, path, { source, timestamp, status }, output) => {
  if (Array.isArray(value)) {
    if (value.length === 0) output.push({ path, value: [], source, timestamp, status });
    value.forEach((item, index) => flattenValues(item, `${path}[${index}]`, { source, timestamp, status }, output));
    return;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) output.push({ path, value: {}, source, timestamp, status });
    entries.forEach(([key, item]) => {
      flattenValues(item, path ? `${path}.${key}` : key, { source, timestamp, status }, output);
    });
    return;
  }
  const available = hasDataValue(value);
  output.push({
    path,
    value: normalizeValue(value),
    unit: getUnit(path),
    source: source || REPORT_UNAVAILABLE,
    timestamp: timestamp || null,
    status: available && STATUS_VALUES.has(status) ? status : "UNAVAILABLE",
  });
};

const collectProvenance = (groups) => {
  const rows = [];
  Object.entries(groups).forEach(([name, group]) => {
    flattenValues(group.value, name, group, rows);
  });
  return rows;
};

const detectDifferences = (expected, actual, path, source, differences) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      differences.push({ field: path, source, expectedValue: expected, reportValue: actual });
      return;
    }
    if (actual.length < expected.length) {
      differences.push({ field: `${path}.length`, source, expectedValue: expected.length, reportValue: actual.length });
    }
    expected.forEach((item, index) => detectDifferences(item, actual[index], `${path}[${index}]`, source, differences));
    return;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      differences.push({ field: path, source, expectedValue: expected, reportValue: actual });
      return;
    }
    Object.entries(expected).forEach(([key, value]) => {
      if (!Object.hasOwn(actual, key)) {
        differences.push({ field: path ? `${path}.${key}` : key, source, expectedValue: value, reportValue: undefined });
      } else {
        detectDifferences(value, actual[key], path ? `${path}.${key}` : key, source, differences);
      }
    });
    return;
  }
  if (!Object.is(normalizeValue(expected), normalizeValue(actual))) {
    differences.push({ field: path, source, expectedValue: normalizeValue(expected), reportValue: normalizeValue(actual) });
  }
};

const riskRecord = ({ id, name, location, level, evidence, forecast, expectedTime, source, timestamp, status }) => ({
  id,
  riskType: name,
  location,
  severity: level || "UNAVAILABLE",
  evidence: evidence || REPORT_UNAVAILABLE,
  potentialImpact: REPORT_UNAVAILABLE,
  forecast: forecast || REPORT_UNAVAILABLE,
  expectedTime: expectedTime || REPORT_UNAVAILABLE,
  recommendedAction: ["HIGH", "VERY HIGH", "CRITICAL"].includes(level)
    ? "Check official local advisories; this screening is not an official warning."
    : "No risk-specific action is calculated from the available data.",
  source: source || REPORT_UNAVAILABLE,
  timestamp: timestamp || null,
  status: status || "UNAVAILABLE",
});

const buildRiskIntelligence = ({ city, weather, airQuality, weatherHourly, airQualityHourly, timestamp }) => {
  const current = {
    temperature: weather?.temperature_2m != null && Number.isFinite(Number(weather.temperature_2m)) ? Number(weather.temperature_2m) : null,
    feelsLike: weather?.apparent_temperature != null && Number.isFinite(Number(weather.apparent_temperature)) ? Number(weather.apparent_temperature) : null,
    precipitation: weather?.precipitation != null && Number.isFinite(Number(weather.precipitation)) ? Number(weather.precipitation) : null,
    windGust: weather?.wind_gusts_10m != null && Number.isFinite(Number(weather.wind_gusts_10m)) ? Number(weather.wind_gusts_10m) : null,
    aqi: airQuality?.us_aqi != null && Number.isFinite(Number(airQuality.us_aqi))
      ? Number(airQuality.us_aqi)
      : null,
  };
  const currentSignals = assessClimateSignals(current);
  const currentScore = calculateScreeningScore(Object.values(currentSignals));
  const forecast = assessCityWeatherForecast({
    weatherHourly,
    airQualityHourly,
    startTimestamp: Date.parse(timestamp),
    hours: 120,
  });
  const location = city?.coordinates?.length === 2
    ? `${city.name} city-coordinate reference (${city.coordinates[0]}, ${city.coordinates[1]})`
    : REPORT_UNAVAILABLE;
  const weatherSource = "Open-Meteo city-coordinate weather model";
  const airSource = "Open-Meteo city-coordinate air-quality model";
  const forecastText = (key) => forecast?.signals?.[key]
    ? `PREDICTED ${forecast.signals[key]} from available hourly model values`
    : REPORT_UNAVAILABLE;
  const forecastTime = forecast?.timestamp ? new Date(forecast.timestamp).toISOString() : null;
  const available = (level, evidence, key, source) => riskRecord({
    name: key === "heat" ? "Extreme heat"
      : key === "rainfall" ? "Heavy rainfall"
        : key === "wind" ? "Storm / high wind"
          : "Air quality risk",
    id: key,
    location,
    level: level || "UNAVAILABLE",
    evidence: evidence || "Risk not calculated from available data.",
    forecast: forecastText(key),
    expectedTime: level && ["HIGH", "VERY HIGH", "CRITICAL"].includes(level) && forecastTime
      ? forecastTime
      : REPORT_UNAVAILABLE,
    source,
    timestamp: timestamp || null,
    status: level ? "MODELLED" : "UNAVAILABLE",
  });
  const heat = classifyHeat(Math.max(
    current.temperature ?? Number.NEGATIVE_INFINITY,
    current.feelsLike ?? Number.NEGATIVE_INFINITY,
  ));
  const rainfall = classifyRainfall(current.precipitation);
  const wind = classifyWind(current.windGust);
  const air = classifyUsAqi(current.aqi);
  const currentSeverity = (Object.values(currentSignals).filter(Boolean)).sort((a, b) => (
    ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"].indexOf(a)
    - ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"].indexOf(b)
  )).at(-1) || "UNAVAILABLE";
  const risks = [
    available(heat, current.temperature == null && current.feelsLike == null
      ? "Risk not calculated from available data."
      : `Temperature ${current.temperature ?? "Unavailable"}°C; feels like ${current.feelsLike ?? "Unavailable"}°C`,
    "heat", weatherSource),
    available(rainfall, current.precipitation == null
      ? "Risk not calculated from available data."
      : `Current model precipitation ${current.precipitation} mm`,
    "rainfall", weatherSource),
    ...["Flood risk", "Drought / water stress"].map((name, index) => riskRecord({
      id: index === 0 ? "flood" : "drought",
      name,
      location,
      level: "UNAVAILABLE",
      evidence: "Risk not calculated from available data.",
      source: REPORT_UNAVAILABLE,
      timestamp: null,
      status: "UNAVAILABLE",
    })),
    available(wind, current.windGust == null
      ? "Risk not calculated from available data."
      : `Current model wind gust ${current.windGust} km/h`,
    "wind", weatherSource),
    available(air, current.aqi == null
      ? "Risk not calculated from available data."
      : `Open-Meteo US AQI model ${current.aqi}`,
    "airQuality", airSource),
    riskRecord({
      id: "extreme-weather",
      name: "Extreme weather",
      location,
      level: currentSeverity,
      evidence: currentSeverity === "UNAVAILABLE"
        ? "Risk not calculated from available data."
        : `Highest available temperature, rainfall, wind, and AQI screen: ${currentSeverity}`,
      forecast: forecast ? `PREDICTED screening score ${forecast.score}/90` : REPORT_UNAVAILABLE,
      expectedTime: forecastTime || REPORT_UNAVAILABLE,
      source: weatherSource,
      timestamp: timestamp || null,
      status: currentSeverity === "UNAVAILABLE" ? "UNAVAILABLE" : "MODELLED",
    }),
    ...["Climate vulnerability", "Infrastructure climate stress"].map((name, index) => riskRecord({
      id: index === 0 ? "vulnerability" : "infrastructure",
      name,
      location,
      severity: "UNAVAILABLE",
      evidence: "Risk not calculated from available data.",
      source: REPORT_UNAVAILABLE,
      timestamp: null,
      status: "UNAVAILABLE",
    })),
    riskRecord({
      id: "combined",
      name: "Combined / multi-hazard risk",
      location,
      severity: "UNAVAILABLE",
      evidence: "Risk not calculated from available data. A validated multi-hazard model is not connected.",
      forecast: REPORT_UNAVAILABLE,
      source: REPORT_UNAVAILABLE,
      timestamp: null,
      status: "UNAVAILABLE",
    }),
  ];
  return {
    overall: {
      score: currentScore,
      severity: currentSeverity,
      status: currentScore === null ? "UNAVAILABLE" : "MODELLED",
      source: "Rule-based threshold screening of available model inputs",
      timestamp: timestamp || null,
    },
    risks,
    basis: "Screening only; thresholds are not locally calibrated or official warnings.",
  };
};

const makeScenario = ({ cityTransformation, demoScenario }) => {
  if (cityTransformation) {
    const metrics = normalizeValue(Array.isArray(cityTransformation.metrics) ? cityTransformation.metrics : []);
    const validMetrics = metrics.filter((metric) => metric && typeof metric === "object");
    return {
      name: cityTransformation.intervention || cityTransformation.name || "City transformation simulation",
      status: "SIMULATED",
      inputChanges: normalizeValue(cityTransformation.assumptions || {}),
      baselineCityState: Object.fromEntries(validMetrics.map(({ key, before }) => [key, before])),
      scenarioCityState: Object.fromEntries(validMetrics.map(({ key, after }) => [key, after])),
      changedMetrics: metrics,
      benefits: normalizeValue(cityTransformation.explanation?.benefits || []),
      costs: normalizeValue(cityTransformation.tradeoffs || cityTransformation.explanation?.tradeoffs || []),
      tradeOffs: normalizeValue(cityTransformation.explanation?.tradeoffs || []),
      remainingProblems: normalizeValue(cityTransformation.remainingProblems || cityTransformation.explanation?.remainingProblems || []),
      methodology: "Illustrative rule-based simulation; outputs are simulated, not observed or validated.",
      confidence: "Confidence unavailable",
      accuracy: "Not validated",
    };
  }
  if (demoScenario) {
    return {
      name: demoScenario.intervention,
      status: "SIMULATED",
      inputChanges: {},
      baselineCityState: {},
      scenarioCityState: {},
      changedMetrics: [
        { metric: "Traffic index", before: demoScenario.trafficBefore, after: demoScenario.trafficAfter, unit: "index points" },
        { metric: "AQI", before: demoScenario.aqiBefore, after: demoScenario.aqiAfter, unit: "AQI" },
      ],
      benefits: [],
      costs: [],
      tradeOffs: ["Preset demo values; formula and city-state effects are not available."],
      remainingProblems: ["Not available from current data source"],
      methodology: "Illustrative preset; reported values are simulated and the scenario formula is not available.",
      confidence: "Confidence unavailable",
      accuracy: "Not validated",
    };
  }
  return null;
};

const makeBeforeAfter = (scenario) => {
  if (!scenario) return "No intervention or scenario was attached to this report.";
  const metrics = Array.isArray(scenario.changedMetrics) ? scenario.changedMetrics : [];
  return metrics.map((metric) => {
    if (!metric || typeof metric !== "object") {
      return { metric, absoluteChange: null, percentageChange: null, status: "UNAVAILABLE" };
    }
    const before = metric.before == null || metric.before === "" ? null : Number(metric.before);
    const after = metric.after == null || metric.after === "" ? null : Number(metric.after);
    const numeric = Number.isFinite(before) && Number.isFinite(after);
    const absoluteChange = numeric ? after - before : null;
    const percentageChange = numeric && before !== 0
      ? ((after - before) / before) * 100
      : null;
    return {
      ...metric,
      absoluteChange,
      percentageChange,
      status: numeric ? "SIMULATED" : "UNAVAILABLE",
    };
  });
};

const buildMetricCatalog = ({ groups, unavailableMetrics }) => {
  const metrics = collectProvenance(groups);
  unavailableMetrics.forEach((metric) => metrics.push({
    path: metric,
    value: null,
    unit: "",
    source: REPORT_UNAVAILABLE,
    timestamp: null,
    status: "UNAVAILABLE",
  }));
  return metrics;
};

const readNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const buildPredictionDetails = (input) => {
  const capturedAt = Date.parse(input.timestamp || new Date().toISOString());
  const weatherRows = Array.isArray(input.predictions?.weatherForecastData)
    ? input.predictions.weatherForecastData
    : [];
  const weatherCurrent = input.liveWeather || {};
  const weatherFields = [
    ["temperature", "temperature_2m", "°C"],
    ["apparentTemperature", "apparent_temperature", "°C"],
    ["precipitation", "precipitation", "mm"],
    ["precipitationProbability", "precipitation_probability", "%"],
    ["relativeHumidity", "relative_humidity_2m", "%"],
    ["windSpeed", "wind_speed_10m", "km/h"],
    ["windGusts", "wind_gusts_10m", "km/h"],
    ["cloudCover", "cloud_cover", "%"],
    ["uvIndex", "uv_index", "index"],
    ["pressure", "pressure_msl", "hPa"],
    ["visibility", "visibility", "m"],
  ];
  const weather = weatherRows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    return weatherFields.map(([field, sourceField, unit]) => {
      const currentValue = readNumber(weatherCurrent[sourceField]);
      const predictedValue = readNumber(row[field]);
      const timeMs = row.time ? Date.parse(row.time) : NaN;
      return {
        prediction: field,
        currentValue,
        predictedValue,
        forecastHorizonHours: Number.isFinite(timeMs) && Number.isFinite(capturedAt)
          ? Number(((timeMs - capturedAt) / 3_600_000).toFixed(2))
          : null,
        change: currentValue !== null && predictedValue !== null ? predictedValue - currentValue : null,
        unit,
        model: "Open-Meteo hourly forecast model",
        inputs: { current: currentValue, forecast: predictedValue },
        source: "Open-Meteo",
        timestamp: row.time || null,
        confidence: "Not available",
        accuracy: "Not validated",
        status: predictedValue === null ? "UNAVAILABLE" : "PREDICTED",
      };
    });
  });
  const currentAqi = readNumber(input.liveAirQuality?.us_aqi);
  const airQualityRows = Array.isArray(input.predictions?.dynamicProjectionData)
    ? input.predictions.dynamicProjectionData
    : [];
  const airQuality = airQualityRows.map((row) => {
    if (!row || typeof row !== "object") return null;
    const predictedValue = readNumber(row.aqi);
    const timeMs = readNumber(row.timestamp);
    return {
      prediction: "US AQI",
      currentValue: currentAqi,
      predictedValue,
      forecastHorizonHours: timeMs !== null && Number.isFinite(capturedAt)
        ? Number(((timeMs - capturedAt) / 3_600_000).toFixed(2))
        : null,
      change: currentAqi !== null && predictedValue !== null ? predictedValue - currentAqi : null,
      unit: "US AQI",
      model: "Open-Meteo hourly air-quality forecast model",
      inputs: { current: currentAqi, forecast: predictedValue },
      source: "Open-Meteo",
      timestamp: row.time || null,
      confidence: "Not available",
      accuracy: "Not validated",
      status: predictedValue === null ? "UNAVAILABLE" : "PREDICTED",
    };
  }).filter(Boolean);
  return {
    hourlyWeather: weather,
    hourlyAirQuality: airQuality,
    scenarioHeuristics: {
      energy: normalizeValue(input.predictions?.liveEnergyAdjustment || null),
      water: normalizeValue(input.predictions?.liveWaterAdjustment || null),
      traffic: normalizeValue(input.predictions?.liveTrafficImpact || null),
      status: "ESTIMATED",
      confidence: "Not available",
      accuracy: "Not validated",
    },
  };
};

export function buildReportSnapshot(input = {}) {
  const timestamp = input.timestamp || new Date().toISOString();
  const city = normalizeValue(input.city || {});
  const cityName = city.name || "Unavailable";
  const cityZones = Array.isArray(city.zones) ? city.zones : [];
  const alerts = Array.isArray(input.alerts) ? input.alerts : [];
  const sensorStations = Array.isArray(input.liveSensorStations) ? input.liveSensorStations : [];
  const hasSyntheticSensors = sensorStations.some((station) => station?.provider === "Municipal IoT Sensor Grid");
  const weather = normalizeValue(input.liveWeather);
  const airQuality = normalizeValue(input.liveAirQuality);
  const trafficFlow = normalizeValue(input.liveTrafficFlow);
  const isSimulatedTraffic = Boolean(input.liveTrafficFlow?.isSimulated);
  const trafficStatus = !hasDataValue(trafficFlow)
    ? "UNAVAILABLE"
    : isSimulatedTraffic ? "SIMULATED" : "LIVE";
  const livePopulation = normalizeValue(input.populationEstimate);
  const scenario = makeScenario(input);
  const health = normalizeValue(input.cityHealth || {});
  const conditionMetrics = {
    ...(city.metrics || {}),
    liveWeather: weather,
    liveAirQuality: airQuality,
    liveTrafficFlow: trafficFlow,
    livePopulationEstimate: livePopulation,
  };
  const metricsGroups = {
    cityState: { value: city.metrics || {}, source: city.dataMode === "illustrative" ? "Bundled illustrative city profile" : "Bundled city profile", timestamp: null, status: "ESTIMATED" },
    trafficProfile: { value: input.traffic || {}, source: "Bundled traffic profile", timestamp: null, status: "ESTIMATED" },
    pollutionProfile: { value: input.pollution || {}, source: "Bundled pollution profile", timestamp: null, status: "ESTIMATED" },
    populationProfile: { value: input.population || {}, source: "Bundled population profile", timestamp: null, status: "ESTIMATED" },
    populationEstimate: { value: livePopulation || {}, source: livePopulation?.source || "Population estimate", timestamp: livePopulation?.referenceDate || null, status: livePopulation?.source ? "HISTORICAL" : "UNAVAILABLE" },
    energyProfile: { value: input.energy || {}, source: "Bundled energy profile", timestamp: null, status: "ESTIMATED" },
    waterProfile: { value: input.water || {}, source: "Bundled water profile", timestamp: null, status: "ESTIMATED" },
    weather: { value: weather || {}, source: "Open-Meteo forecast API", timestamp: weather?.time || null, status: "MODELLED" },
    airQuality: { value: airQuality || {}, source: "Open-Meteo air-quality API", timestamp: airQuality?.time || null, status: "MODELLED" },
    trafficFlow: { value: trafficFlow || {}, source: trafficFlow?.source || (input.liveTrafficFlowError ? "TomTom via data worker" : REPORT_UNAVAILABLE), timestamp: trafficFlow?.retrievedAt || null, status: trafficStatus },
    liveWeatherHourly: { value: input.liveWeatherHourly || [], source: "Open-Meteo hourly forecast API", timestamp: weather?.time || null, status: "PREDICTED" },
    liveAirQualityHourly: { value: input.liveAirQualityHourly || [], source: "Open-Meteo hourly air-quality API", timestamp: airQuality?.time || null, status: "PREDICTED" },
    cityProfile: { value: city, source: "Selected CityState profile", timestamp: null, status: city.dataMode === "illustrative" ? "ESTIMATED" : "LIVE" },
    sensorStations: {
      value: input.liveSensorStations || [],
      source: sensorStations[0]?.provider || "Sensor station feed",
      timestamp: input.liveSensorsUpdatedAt || null,
      status: sensorStations.length
        ? hasSyntheticSensors ? "SIMULATED" : "LIVE"
        : "UNAVAILABLE",
    },
    alerts: { value: input.alerts || [], source: "Bundled application alert templates", timestamp, status: "SIMULATED" },
    cityHealth: { value: health, source: "City Health dashboard shared calculator", timestamp, status: health.score == null ? "UNAVAILABLE" : "ESTIMATED" },
    predictions: { value: input.predictions || {}, source: "Open-Meteo forecast and application heuristics", timestamp, status: "PREDICTED" },
    scenarios: { value: scenario || {}, source: scenario ? "Attached what-if scenario" : REPORT_UNAVAILABLE, timestamp, status: scenario ? "SIMULATED" : "UNAVAILABLE" },
    mapZones: { value: city.zones || [], source: "Bundled city profile map features", timestamp: null, status: "ESTIMATED" },
  };
  const unavailableMetrics = [
    "water.measuredAvailability",
    "infrastructure.verifiedAssetCondition",
    "traffic.incidents",
    "traffic.affectedRoadNames",
    "climate.verifiedRiskZones",
    "population.spatialExposure",
  ];
  const dataProvenance = buildMetricCatalog({ groups: metricsGroups, unavailableMetrics });
  const missingMetrics = dataProvenance
    .filter(({ status }) => status === "UNAVAILABLE")
    .map(({ path }) => path);
  const statusCounts = dataProvenance.reduce((counts, metric) => {
    const key = metric.status;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const totalMetrics = dataProvenance.length;
  const dataCoverage = {
    totalMetrics,
    availableMetrics: totalMetrics - (statusCounts.UNAVAILABLE || 0),
    missingMetrics: statusCounts.UNAVAILABLE || 0,
    percentages: Object.fromEntries(
      [...STATUS_VALUES, "UNAVAILABLE"].map((status) => [
        status,
        totalMetrics ? Number((((statusCounts[status] || 0) / totalMetrics) * 100).toFixed(2)) : 0,
      ]),
    ),
    statusCounts,
    completenessPercent: totalMetrics
      ? Number((((totalMetrics - (statusCounts.UNAVAILABLE || 0)) / totalMetrics) * 100).toFixed(2))
      : 0,
  };
  const climateRisk = buildRiskIntelligence({
    city,
    weather,
    airQuality,
    weatherHourly: input.liveWeatherHourly,
    airQualityHourly: input.liveAirQualityHourly,
    timestamp,
  });
  const warnings = alerts.filter((alert) => alert && !alert.dismissed).map((alert) => ({
    ...normalizeValue(alert),
    status: "SIMULATED",
    warningType: alert.category || "Application alert",
    expectedTime: "Not available from current data source",
    evidence: alert.description || REPORT_UNAVAILABLE,
    affectedSystem: alert.category || REPORT_UNAVAILABLE,
    recommendedAction: "Not available from current data source",
    confidence: "Confidence unavailable",
    source: "Bundled application alert template; not verified operational telemetry.",
  }));
  const climateWarnings = climateRisk.risks
    .filter((risk) => ["HIGH", "VERY HIGH", "CRITICAL"].includes(risk.severity))
    .map((risk) => ({
      warningType: risk.riskType,
      location: risk.location,
      severity: risk.severity,
      expectedTime: risk.expectedTime,
      evidence: risk.evidence,
      affectedSystem: "Not available from current data source",
      recommendedAction: "Check official local advisories; this is not an official warning.",
      confidence: "Confidence unavailable",
      source: risk.source,
      timestamp: risk.timestamp,
      status: risk.status,
    }));
  const sources = {
    weather: {
      source: "Open-Meteo Forecast API",
      status: hasDataValue(input.liveWeather) ? "MODELLED" : "UNAVAILABLE",
      reason: input.liveWeatherError || (hasDataValue(input.liveWeather) ? "" : "Weather API request failed or data is not loaded."),
    },
    airQuality: {
      source: "Open-Meteo Air Quality API",
      status: hasDataValue(input.liveAirQuality) ? "MODELLED" : "UNAVAILABLE",
      reason: input.liveAirQualityError || (hasDataValue(input.liveAirQuality) ? "" : "Air-quality API request failed or data is not loaded."),
    },
    traffic: {
      source: trafficFlow?.source || "TomTom via Cloudflare Worker",
      status: trafficStatus,
      reason: input.liveTrafficFlowError || trafficFlow?.fallbackReason || (trafficFlow ? "" : "Traffic flow is not available."),
    },
    sensors: {
      source: input.liveSensorStations?.[0]?.provider || "Sensor.Community",
      status: input.liveSensorStations?.length
        ? input.liveSensorStations.some(({ provider }) => provider === "Municipal IoT Sensor Grid") ? "SIMULATED" : "LIVE"
        : "UNAVAILABLE",
      reason: input.liveSensorsError || (sensorStations.length
        ? hasSyntheticSensors
          ? "Sensor feed failed; city sensor values are simulated fallbacks."
          : ""
        : "No valid sensor stations are connected."),
    },
    profiles: { source: "Bundled application city profiles", status: "ESTIMATED" },
    population: {
      source: livePopulation?.source || "Planning population estimate",
      status: livePopulation?.source ? "HISTORICAL" : "UNAVAILABLE",
      timestamp: livePopulation?.referenceDate || null,
    },
  };

  const snapshot = {
    metadata: {
      title: "YUG NIRMAN Urban Intelligence Report",
      reportId: `report-${city.id || "city"}-${timestamp.replace(/[^0-9TZ]/g, "")}`,
      generatedAt: timestamp,
      application: "YUG NIRMAN — AI-Powered Urban Digital Twin",
      dataMode: city.dataMode || "Not available from current data source",
    },
    city: {
      id: city.id || null,
      name: cityName,
      state: city.state || null,
      coordinates: city.coordinates || null,
      dataMode: city.dataMode || "Not available from current data source",
      profile: city,
    },
    timestamp,
    dataSources: sources,
    currentCityCondition: {
      metrics: conditionMetrics,
      data: {
        cityStateMetrics: city.metrics || {},
        traffic: normalizeValue(input.traffic || {}),
        pollution: normalizeValue(input.pollution || {}),
        population: normalizeValue(input.population || {}),
        populationEstimate: livePopulation,
        energy: normalizeValue(input.energy || {}),
        water: normalizeValue(input.water || {}),
      },
      weather: weather || null,
      airQuality: airQuality || null,
      traffic: trafficFlow || null,
    },
    liveIntelligence: {
      weatherHourly: normalizeValue(input.liveWeatherHourly),
      airQualityHourly: normalizeValue(input.liveAirQualityHourly),
      sensorStations: normalizeValue(input.liveSensorStations || []),
      alerts: normalizeValue(input.alerts || []),
      trafficFlow: trafficFlow || null,
      errors: {
        weather: input.liveWeatherError || null,
        airQuality: input.liveAirQualityError || null,
        traffic: input.liveTrafficFlowError || null,
        sensors: input.liveSensorsError || null,
      },
    },
    weather: {
      current: weather,
      hourlyForecast: normalizeValue(input.liveWeatherHourly || []),
      source: sources.weather,
    },
    airQuality: {
      current: airQuality,
      hourlyForecast: normalizeValue(input.liveAirQualityHourly || []),
      source: sources.airQuality,
      sensorStations: normalizeValue(input.liveSensorStations || []),
    },
    traffic: {
      status: trafficStatus,
      flow: trafficFlow,
      profile: normalizeValue(input.traffic || {}),
      hotspots: normalizeValue(cityZones.filter((zone) => zone?.category === "traffic")),
      incidents: trafficFlow?.incidents || "Not available from current data source",
      error: input.liveTrafficFlowError || trafficFlow?.fallbackReason || null,
    },
    water: normalizeValue(input.water || {}),
    energy: normalizeValue(input.energy || {}),
    population: {
      profile: normalizeValue(input.population || {}),
      estimate: livePopulation,
      demographics: normalizeValue(city.population || {}),
    },
    infrastructure: {
      profile: normalizeValue(city.infrastructure || {}),
      verifiedAssetCondition: "Not available from current data source",
    },
    climateRisk,
    predictions: {
      realTime: normalizeValue(input.predictions || {}),
      longRangeCityProfile: normalizeValue(city.forecasts || {}),
      forecastDetails: buildPredictionDetails(input),
      modelAccuracy: "Accuracy: Not validated",
      confidence: "Confidence: Not available",
    },
    earlyWarnings: [...warnings, ...climateWarnings],
    problems: normalizeValue(input.problems || []),
    rootCauses: {
      items: normalizeValue(input.rootCauses || []),
      status: input.rootCauses?.length ? "ESTIMATED" : "UNAVAILABLE",
      note: "Possible causes are not confirmed unless explicitly supported by observed evidence.",
    },
    scenarios: scenario ? [scenario] : [],
    beforeAfter: makeBeforeAfter(scenario),
    impactAnalysis: normalizeValue(input.impactAnalysis || {
      status: "UNAVAILABLE",
      reason: "Not available from current data source",
    }),
    optimization: normalizeValue(input.optimization || {}),
    recommendations: normalizeValue(input.recommendations || input.aiInsights || []),
    cityHealth: {
      score: isFiniteNumber(health.score) ? health.score : null,
      dimensions: normalizeValue(health.dimensions || []),
      methodology: health.methodology || REPORT_UNAVAILABLE,
      timestamp: health.timestamp || timestamp,
      missingIndicators: normalizeValue(health.dimensions || [])
        .filter(({ score }) => !isFiniteNumber(score))
        .map(({ label }) => label),
    },
    sustainability: normalizeValue(input.sustainability || {
      availableIndicators: {
        greenCover: city.metrics?.greenCover || null,
        renewableMix: input.energy?.renewableMix || null,
      },
      score: null,
      status: "Not calculated",
    }),
    resilience: {
      score: health.dimensions?.find(({ label }) => label === "Climate & resilience")?.score ?? null,
      source: "Shared City Health dashboard dimension",
      status: health.dimensions?.find(({ label }) => label === "Climate & resilience")?.score == null
        ? "Not calculated"
        : "ESTIMATED",
    },
    mapData: {
      coordinates: city.coordinates || null,
      zones: normalizeValue(cityZones),
      trafficHotspots: normalizeValue(cityZones.filter((zone) => zone?.category === "traffic")),
      incidents: "Not available from current data source",
      note: "Interactive map available in YUG NIRMAN dashboard.",
    },
    digitalTwinState: {
      cityId: city.id || null,
      coordinates: city.coordinates || null,
      zoom: city.zoom ?? null,
      dataMode: city.dataMode || "Unavailable",
      currentProfileZones: normalizeValue(cityZones),
      interactiveLayerSelection: "Not available from current data source",
    },
    dataGaps: missingMetrics,
    limitations: [
      "Bundled city profiles are illustrative estimates, not live municipal measurements.",
      "A modeled city-coordinate weather or air-quality value is not a local station observation.",
      "TomTom road-segment values are not citywide traffic measurements; simulated fallback values remain SIMULATED.",
      "Traffic incidents and hotspot geometry are not present in the current shared report state.",
      "Flood, drought, asset-condition, spatial population exposure, and validated climate impact data are unavailable.",
      "Prediction confidence and model accuracy are not available unless explicitly calculated and validated.",
      "Bundled alert text is marked SIMULATED and must not be treated as an active municipal warning.",
    ],
    dataProvenance,
    dataCoverage,
    audit: { lostFields: [] },
    aiCityAdvisor: normalizeValue(input.aiInsights || []),
    reportSections: [
      "01 Executive Summary",
      "02 Current City Intelligence",
      "03 Trends & Forecasts",
      "04 Climate & Risk",
      "05 Problems & Root Causes",
      "06 Predictions & Early Warnings",
      "07 What-If + Before → After",
      "08 Impact & Recommendations",
      "09 City Health & Resilience",
      "10 Data Sources, Gaps & Limitations",
    ],
  };
  const safeSnapshot = normalizeValue(snapshot);
  const sourceGroups = {
    cityState: city.metrics || {},
    trafficProfile: input.traffic || {},
    pollutionProfile: input.pollution || {},
    populationProfile: input.population || {},
    energyProfile: input.energy || {},
    waterProfile: input.water || {},
    weather,
    airQuality,
    trafficFlow,
    liveWeatherHourly: input.liveWeatherHourly || [],
    liveAirQualityHourly: input.liveAirQualityHourly || [],
    sensorStations: input.liveSensorStations || [],
    alerts: input.alerts || [],
    mapZones: cityZones,
    populationEstimate: livePopulation,
    cityProfile: city,
    predictions: input.predictions || {},
    scenarioMetrics: input.cityTransformation?.metrics || [],
  };
  const outputGroups = {
    cityState: safeSnapshot.currentCityCondition.data.cityStateMetrics,
    trafficProfile: safeSnapshot.currentCityCondition.data.traffic,
    pollutionProfile: safeSnapshot.currentCityCondition.data.pollution,
    populationProfile: safeSnapshot.currentCityCondition.data.population,
    energyProfile: safeSnapshot.currentCityCondition.data.energy,
    waterProfile: safeSnapshot.currentCityCondition.data.water,
    weather: safeSnapshot.weather.current,
    airQuality: safeSnapshot.airQuality.current,
    trafficFlow: safeSnapshot.traffic.flow,
    liveWeatherHourly: safeSnapshot.weather.hourlyForecast,
    liveAirQualityHourly: safeSnapshot.airQuality.hourlyForecast,
    sensorStations: safeSnapshot.airQuality.sensorStations,
    alerts: safeSnapshot.liveIntelligence.alerts,
    mapZones: safeSnapshot.mapData.zones,
    populationEstimate: safeSnapshot.currentCityCondition.data.populationEstimate,
    cityProfile: safeSnapshot.city.profile,
    predictions: safeSnapshot.predictions.realTime,
    scenarioMetrics: safeSnapshot.scenarios[0]?.changedMetrics || [],
  };
  const lostFields = [];
  Object.entries(sourceGroups).forEach(([source, expected]) => {
    detectDifferences(expected, outputGroups[source], source, source, lostFields);
  });
  if (lostFields.length) {
    console.error("REPORT_DATA_LOSS_DETECTED", lostFields);
  }
  safeSnapshot.audit.lostFields = lostFields;
  return deepFreeze(safeSnapshot);
}

export const flattenReportSnapshot = (snapshot) => {
  const rows = [];
  const visit = (value, path = "") => {
    if (Array.isArray(value)) {
      if (!value.length) rows.push({ path, value: "[]", unit: "", source: "", timestamp: "", status: "UNAVAILABLE" });
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
      return;
    }
    rows.push({ path, value: value ?? "Unavailable", unit: "", source: "", timestamp: "", status: value == null ? "UNAVAILABLE" : "" });
  };
  visit(snapshot);
  return rows;
};
