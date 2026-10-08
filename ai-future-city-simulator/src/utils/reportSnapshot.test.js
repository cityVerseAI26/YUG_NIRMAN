import test from "node:test";
import assert from "node:assert/strict";
import { calculateCityHealth } from "./cityHealthScore.js";
import { summarizeReportDataGaps } from "./reportDataGaps.js";
import { formatMetricPath, getUnrepresentedMetrics } from "./reportMetricRegister.js";
import { buildReportSnapshot, flattenReportSnapshot } from "./reportSnapshot.js";

const completeInput = (overrides = {}) => {
  const city = {
    id: "test-city",
    name: "Test City",
    state: "Test State",
    dataMode: "illustrative",
    coordinates: [19, 72],
    zoom: 11,
    metrics: {
      population: { value: 1_000_000, display: "1M" },
      traffic: { value: 45, display: "45%" },
      aqi: { value: 80, display: "80 AQI" },
      waterDemand: { value: 60, display: "60%" },
      energyUsage: { value: 70, display: "70%" },
      greenCover: { value: 25, display: "25%" },
    },
    healthScore: { overall: 91 },
    forecasts: { 2030: { population: "1.1M" } },
    zones: [{ id: "road-1", category: "traffic", name: "Central Road", coords: [19, 72] }],
  };
  const liveAirQuality = { time: 1_800_000_000, us_aqi: 80, pm2_5: 12 };
  const liveWeather = {
    time: 1_800_000_000,
    temperature_2m: 31,
    apparent_temperature: 33,
    relative_humidity_2m: 50,
    precipitation: 2,
    wind_speed_10m: 12,
    wind_gusts_10m: 20,
    uv_index: 4,
    visibility: 10_000,
    pressure_msl: 1000,
    cloud_cover: 20,
  };
  const liveTrafficFlow = {
    currentSpeed: 25,
    freeFlowSpeed: 50,
    currentTravelTime: 200,
    freeFlowTravelTime: 100,
    retrievedAt: "2026-10-08T08:00:00Z",
    source: "TomTom",
    isSimulated: false,
    incidents: [],
  };
  const prediction = {
    telemetry: { weather: { temperature: 31, observedAt: "2026-10-08T08:00:00Z" } },
    weatherForecastData: [{
      time: "2026-10-08T09:00:00Z",
      temperature: 32,
      apparentTemperature: 34,
      precipitation: 5,
      precipitationProbability: 60,
      relativeHumidity: 55,
      windSpeed: 14,
      windGusts: 24,
      cloudCover: 30,
      uvIndex: 5,
      pressure: 999,
      visibility: 9000,
    }],
    dynamicProjectionData: [{ time: "2026-10-08T09:00:00Z", timestamp: 1_800_003_600_000, aqi: 90 }],
    liveEnergyAdjustment: { adjustmentPct: 7, source: "temperature heuristic" },
  };
  return {
    city,
    liveWeather,
    liveWeatherHourly: {
      time: [1_800_000_000, 1_800_003_600],
      temperature_2m: [31, 32],
      apparent_temperature: [33, 34],
      precipitation: [2, 5],
      wind_gusts_10m: [20, 24],
    },
    liveAirQuality,
    liveAirQualityHourly: { time: [1_800_000_000], us_aqi: [80] },
    liveWeatherError: "",
    liveAirQualityError: "",
    liveTrafficFlow,
    liveTrafficFlowError: "",
    liveSensorStations: [{ id: "station-1", provider: "Sensor.Community", measurements: [] }],
    liveSensorsUpdatedAt: "2026-10-08T08:00:00Z",
    liveSensorsError: "",
    traffic: { today: [{ time: "08:00", congestion: 45, speed: 35, vehicles: 1000 }] },
    pollution: { current: { aqi: 80, source: "profile" } },
    population: { total: "1M", wards: [] },
    populationEstimate: { population: 1_000_000, source: "Census", referenceDate: "2026-07-01" },
    energy: { totalConsumption: "100 MW", hourlyGridLoad: [] },
    water: { currentDemand: "50 MLD", lakes: [] },
    alerts: [],
    aiInsights: [{ title: "Review transit", status: "ESTIMATED" }],
    cityHealth: calculateCityHealth({ city, liveAirQuality, liveTrafficFlow }),
    predictions: prediction,
    timestamp: "2026-10-08T08:00:00.000Z",
    ...overrides,
  };
};

test("complete CityState snapshot retains detailed live and profile data with provenance", () => {
  const snapshot = buildReportSnapshot(completeInput());

  assert.equal(snapshot.city.name, "Test City");
  assert.equal(snapshot.currentCityCondition.metrics.liveWeather.temperature_2m, 31);
  assert.equal(snapshot.traffic.flow.currentSpeed, 25);
  assert.equal(snapshot.traffic.profile.today[0].vehicles, 1000);
  assert.equal(snapshot.airQuality.sensorStations[0].id, "station-1");
  assert.equal(snapshot.mapData.trafficHotspots[0].name, "Central Road");
  assert.ok(snapshot.dataProvenance.some(({ path }) => path === "weather.temperature_2m"));
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.traffic.flow));
});

test("partial CityState records unavailable sources without synthetic replacements", () => {
  const snapshot = buildReportSnapshot(completeInput({
    liveWeather: null,
    liveWeatherHourly: null,
    liveAirQuality: null,
    liveAirQualityHourly: null,
    liveTrafficFlow: null,
    liveSensorStations: [],
    water: null,
    energy: null,
    population: null,
    city: { id: "partial", name: "Partial City", metrics: {}, coordinates: [0, 0], zones: [] },
    cityHealth: {},
    predictions: {},
  }));

  assert.equal(snapshot.weather.current, null);
  assert.deepEqual(snapshot.weather.hourlyForecast, []);
  assert.equal(snapshot.airQuality.current, null);
  assert.equal(snapshot.traffic.flow, null);
  assert.equal(snapshot.dataSources.traffic.status, "UNAVAILABLE");
  assert.equal(snapshot.water, null);
  assert.equal(snapshot.energy, null);
  assert.equal(snapshot.population.estimate, null);
  assert.equal(snapshot.climateRisk.risks.find(({ id }) => id === "flood").severity, "UNAVAILABLE");
  assert.equal(snapshot.predictions.forecastDetails.hourlyWeather.length, 0);
});

test("missing TomTom, weather, and AQI errors retain source and reason", () => {
  const snapshot = buildReportSnapshot(completeInput({
    liveTrafficFlow: null,
    liveTrafficFlowError: "TomTom request failed (503).",
    liveWeather: null,
    liveWeatherError: "Current weather is unavailable.",
    liveAirQuality: null,
    liveAirQualityError: "Current air-quality data is unavailable.",
  }));

  assert.match(snapshot.dataSources.traffic.reason, /TomTom/);
  assert.match(snapshot.dataSources.weather.reason, /unavailable/);
  assert.match(snapshot.dataSources.airQuality.reason, /unavailable/);
  assert.equal(snapshot.dataSources.traffic.status, "UNAVAILABLE");
});

test("simulated traffic and synthetic sensor fallback are never labelled live", () => {
  const input = completeInput({
    liveTrafficFlow: { currentSpeed: 25, isSimulated: true, fallbackReason: "TomTom is not configured." },
    liveTrafficFlowError: "TomTom is not configured.",
    liveSensorStations: [{ id: "fallback", provider: "Municipal IoT Sensor Grid", measurements: [] }],
  });
  const snapshot = buildReportSnapshot(input);

  assert.equal(snapshot.traffic.status, "SIMULATED");
  assert.equal(snapshot.dataSources.traffic.status, "SIMULATED");
  assert.equal(snapshot.dataSources.traffic.reason, "TomTom is not configured.");
  assert.equal(snapshot.dataSources.sensors.status, "SIMULATED");
  assert.equal(snapshot.traffic.flow.confidence, undefined);
});

test("empty arrays, null, NaN, and Infinity are preserved or marked unavailable explicitly", () => {
  const snapshot = buildReportSnapshot(completeInput({
    liveWeather: {
      temperature_2m: null,
      relative_humidity_2m: Number.NaN,
      pressure_msl: Number.POSITIVE_INFINITY,
    },
    liveWeatherHourly: { time: [], temperature_2m: [] },
    traffic: { incidents: [] },
  }));

  assert.equal(snapshot.weather.current.temperature_2m, null);
  assert.equal(snapshot.weather.current.relative_humidity_2m, null);
  assert.equal(snapshot.weather.current.pressure_msl, null);
  assert.deepEqual(snapshot.weather.hourlyForecast.time, []);
  assert.ok(snapshot.dataCoverage.missingMetrics > 0);
});

test("null records in map, alert, sensor, and prediction arrays do not break the snapshot", () => {
  const input = completeInput({
    city: {
      ...completeInput().city,
      zones: [null, { id: "road-1", category: "traffic", name: "Central Road", coords: [19, 72] }],
    },
    alerts: [null, { category: "weather", description: "Template alert" }],
    liveSensorStations: [null, { id: "station-1", provider: "Sensor.Community", measurements: [] }],
    predictions: {
      weatherForecastData: [null],
      dynamicProjectionData: [null],
    },
  });
  const snapshot = buildReportSnapshot(input);

  assert.equal(snapshot.mapData.trafficHotspots.length, 1);
  assert.equal(snapshot.earlyWarnings.length, 1);
  assert.equal(snapshot.dataSources.sensors.status, "LIVE");
  assert.deepEqual(snapshot.predictions.realTime.dynamicProjectionData, [null]);
});

test("climate risk entries explicitly show unavailable flood, water, and infrastructure assessments", () => {
  const snapshot = buildReportSnapshot(completeInput({
    liveWeather: null,
    liveAirQuality: null,
  }));
  for (const id of ["flood", "drought", "vulnerability", "infrastructure"]) {
    const risk = snapshot.climateRisk.risks.find((entry) => entry.id === id);
    assert.equal(risk.severity, "UNAVAILABLE");
    assert.match(risk.evidence, /not calculated/i);
  }
});

test("no scenario is described accurately; an attached scenario produces exact before-after changes", () => {
  const empty = buildReportSnapshot(completeInput());
  assert.equal(empty.beforeAfter, "No intervention or scenario was attached to this report.");

  const scenario = {
    cityId: "test-city",
    intervention: "Test intervention",
    assumptions: { transit: 10 },
    metrics: [
      { key: "traffic", before: 79, after: 63, unit: "%" },
      { key: "zeroBaseline", before: 0, after: 2, unit: "index" },
    ],
    explanation: { benefits: ["Simulated benefit"], tradeoffs: ["Simulated trade-off"] },
    remainingProblems: ["Unmodeled exposure"],
  };
  const result = buildReportSnapshot(completeInput({ cityTransformation: scenario }));

  assert.equal(result.scenarios[0].status, "SIMULATED");
  assert.equal(result.scenarios[0].inputChanges.transit, 10);
  assert.equal(result.beforeAfter[0].absoluteChange, -16);
  assert.equal(result.beforeAfter[0].percentageChange, ((63 - 79) / 79) * 100);
  assert.equal(result.beforeAfter[1].absoluteChange, 2);
  assert.equal(result.beforeAfter[1].percentageChange, null);

  const invalidScenario = buildReportSnapshot(completeInput({
    cityTransformation: {
      intervention: "Incomplete intervention",
      metrics: [{ key: "traffic", before: null, after: 60 }],
    },
  }));
  assert.equal(invalidScenario.beforeAfter[0].absoluteChange, null);
  assert.equal(invalidScenario.beforeAfter[0].percentageChange, null);
  assert.equal(invalidScenario.beforeAfter[0].status, "UNAVAILABLE");
});

test("the report uses the shared City Health and prediction outputs without recalculating them", () => {
  const input = completeInput();
  const health = calculateCityHealth({
    city: input.city,
    liveAirQuality: input.liveAirQuality,
    liveTrafficFlow: input.liveTrafficFlow,
  });
  const snapshot = buildReportSnapshot({ ...input, cityHealth: health });

  assert.equal(snapshot.cityHealth.score, health.score);
  assert.deepEqual(snapshot.predictions.realTime, input.predictions);
  assert.equal(snapshot.predictions.forecastDetails.hourlyWeather[0].predictedValue, 32);
  assert.equal(snapshot.predictions.forecastDetails.hourlyWeather[0].confidence, "Not available");
  assert.equal(snapshot.predictions.modelAccuracy, "Accuracy: Not validated");
});

test("data coverage is calculated from actual provenance metrics and export flattening covers snapshot paths", () => {
  const snapshot = buildReportSnapshot(completeInput());
  const total = Object.values(snapshot.dataCoverage.statusCounts).reduce((sum, count) => sum + count, 0);

  assert.equal(total, snapshot.dataCoverage.totalMetrics);
  assert.equal(
    snapshot.dataCoverage.completenessPercent,
    Number(((snapshot.dataCoverage.availableMetrics / snapshot.dataCoverage.totalMetrics) * 100).toFixed(2)),
  );
  assert.equal(snapshot.dataCoverage.statusCounts.UNAVAILABLE, snapshot.dataCoverage.missingMetrics);
  assert.ok(flattenReportSnapshot(snapshot).some(({ path }) => path === "traffic.flow.currentSpeed"));
  assert.deepEqual(snapshot.reportSections, [
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
  ]);
});

test("report data gaps group repeated population fields and ignore non-applicable historical forecasts", () => {
  const gaps = summarizeReportDataGaps([
    "populationProfile.historyAndForecast[0].actual",
    "populationProfile.historyAndForecast[0].predicted",
    "populationProfile.historyAndForecast[1].actual",
    "populationProfile.historyAndForecast[2].predicted",
    "populationProfile.historyAndForecast[3].predicted",
    "weather.relative_humidity_2m",
  ], {
    referenceYear: 2026,
    historyAndForecast: [
      { year: "2020", actual: null, predicted: null },
      { year: "2021", actual: null, predicted: null },
      { year: "2026", actual: null, predicted: null },
      { year: "2027", actual: null, predicted: null },
    ],
  });

  assert.deepEqual(gaps, [
    "Population history — verified data unavailable",
    "Population forecast — values unavailable for 2027",
    "Weather — Relative humidity unavailable",
  ]);
  assert.equal(summarizeReportDataGaps([
    "weather.temperature_2m",
    "weather.apparent_temperature",
    "weather.precipitation",
    "weather.wind_speed_10m",
    "weather.wind_gusts_10m",
    "weather.pressure_msl",
  ]).length, 6);
});

test("metric register removes summary duplicates and groups repeated profile aliases", () => {
  const dataProvenance = [
    { path: "cityState.traffic.value", value: 45, unit: "%", timestamp: null, status: "ESTIMATED", source: "CityState" },
    { path: "cityProfile.metrics.traffic.value", value: 45, unit: "%", timestamp: null, status: "ESTIMATED", source: "City profile" },
    { path: "cityState.aqi.value", value: 80, unit: "AQI", timestamp: null, status: "ESTIMATED", source: "CityState" },
    { path: "cityState.aqi.value", value: 81, unit: "AQI", timestamp: null, status: "ESTIMATED", source: "CityState" },
  ];
  const rows = getUnrepresentedMetrics(dataProvenance, []);

  assert.equal(rows.length, 3);
  assert.equal(rows[0].alsoRecordedAs[0].path, "cityProfile.metrics.traffic.value");
  const withoutSummaryTraffic = getUnrepresentedMetrics(dataProvenance, [{ path: "cityState.traffic.value" }]);
  assert.deepEqual(withoutSummaryTraffic.map(({ value }) => value), [80, 81]);
  assert.equal(
    formatMetricPath("liveWeatherHourly.temperature_2m[0]"),
    "Weather forecast · Temperature · item 0",
  );
});

test("report data-loss audit detects no dropped source arrays or fields for complete and partial states", () => {
  const messages = [];
  const originalError = console.error;
  console.error = (...args) => messages.push(args);
  try {
    const complete = buildReportSnapshot(completeInput());
    const partial = buildReportSnapshot(completeInput({
      liveWeather: null,
      liveWeatherHourly: [],
      liveAirQuality: null,
      liveAirQualityHourly: [],
      liveTrafficFlow: null,
      liveSensorStations: [],
      alerts: [],
    }));
    assert.deepEqual(complete.audit.lostFields, []);
    assert.deepEqual(partial.audit.lostFields, []);
    assert.deepEqual(messages, []);
  } finally {
    console.error = originalError;
  }
});
