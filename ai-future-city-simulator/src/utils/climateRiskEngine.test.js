import test from "node:test";
import assert from "node:assert/strict";
import {
  assessCityWeatherForecast,
  assessClimateSignals,
  buildClimateScenario,
  calculateScreeningScore,
  classifyHeat,
  classifyRainfall,
  classifyUsAqi,
  classifyWind,
  getForecastSnapshot,
  getRiskTrend,
  toTimestampMs,
} from "./climateRiskEngine.js";
import { getClimateSystemIndicators } from "./climateSystemIndicators.js";

test("hazard screening applies the transparent threshold bands", () => {
  assert.equal(classifyHeat(40), "CRITICAL");
  assert.equal(classifyHeat(34), "HIGH");
  assert.equal(classifyRainfall(31), "VERY HIGH");
  assert.equal(classifyWind(60), "HIGH");
  assert.equal(classifyUsAqi(201), "CRITICAL");
});

test("missing or invalid measurements remain unavailable", () => {
  assert.equal(classifyHeat(null), null);
  assert.equal(classifyRainfall(Number.NaN), null);
  assert.equal(classifyWind(-1), null);
  assert.equal(calculateScreeningScore([null, undefined]), null);
  assert.deepEqual(
    assessClimateSignals({ temperature: null, precipitation: null, windGust: null, aqi: null }),
    { heat: null, rainfall: null, wind: null, airQuality: null },
  );
});

test("heat screening uses the higher temperature or feels-like model value", () => {
  assert.equal(
    assessClimateSignals({
      temperature: 32,
      feelsLike: 41,
      precipitation: null,
      windGust: null,
      aqi: null,
    }).heat,
    "CRITICAL",
  );
});

test("screening score uses only available signals and the highest risk tier", () => {
  assert.equal(calculateScreeningScore(["LOW", "HIGH", null]), 55);
});

test("unix and ISO timestamps are parsed consistently", () => {
  assert.equal(toTimestampMs(1_700_000_000), 1_700_000_000_000);
  assert.equal(toTimestampMs("2026-10-08T00:00:00Z"), Date.parse("2026-10-08T00:00:00Z"));
  assert.equal(toTimestampMs("not a timestamp"), null);
});

test("forecast snapshot reads weather and AQI at the nearest forecast time", () => {
  const snapshot = getForecastSnapshot({
    weatherHourly: {
      time: [1_700_000_000, 1_700_003_600],
      temperature_2m: [30, 34],
      apparent_temperature: [32, 39],
      precipitation: [0, 12],
      precipitation_probability: [10, 70],
      wind_gusts_10m: [15, 25],
      soil_moisture_0_to_7cm: [0.24, 0.17],
    },
    airQualityHourly: {
      time: [1_700_000_000, 1_700_003_600],
      us_aqi: [42, 130],
    },
    targetTimestamp: 1_700_003_700_000,
  });

  assert.equal(snapshot.temperature, 34);
  assert.equal(snapshot.feelsLike, 39);
  assert.equal(snapshot.precipitation, 12);
  assert.equal(snapshot.precipitationProbability, 70);
  assert.equal(snapshot.soilMoisture, 0.17);
  assert.equal(snapshot.aqi, 130);
});

test("forecast snapshot does not reuse readings from a distant timestamp", () => {
  const snapshot = getForecastSnapshot({
    weatherHourly: {
      time: [1_700_000_000],
      temperature_2m: [30],
    },
    airQualityHourly: {
      time: [1_700_100_000],
      us_aqi: [180],
    },
    targetTimestamp: 1_700_000_000_000,
  });

  assert.equal(snapshot.temperature, 30);
  assert.equal(snapshot.aqi, null);
});

test("forecast risk scan does not extrapolate outside the supplied hourly data", () => {
  const forecast = assessCityWeatherForecast({
    weatherHourly: {
      time: [1_700_000_000, 1_700_003_600],
      temperature_2m: [29, 41],
      precipitation: [0, 5],
      wind_gusts_10m: [10, 20],
    },
    airQualityHourly: {
      time: [1_700_000_000, 1_700_003_600],
      us_aqi: [30, 50],
    },
    startTimestamp: 1_700_000_000_000,
    hours: 2,
  });

  assert.equal(forecast.signals.heat, "CRITICAL");
  assert.equal(assessCityWeatherForecast({
    weatherHourly: { time: [], temperature_2m: [] },
    airQualityHourly: null,
    startTimestamp: 1_700_000_000_000,
    hours: 168,
  }), null);
});

test("trend is unavailable when either side has no measured inputs", () => {
  assert.equal(getRiskTrend(55, 75), "INCREASING");
  assert.equal(getRiskTrend(55, 30), "DECREASING");
  assert.equal(getRiskTrend(55, 55), "STEADY");
  assert.equal(getRiskTrend(null, 55), "UNAVAILABLE");
});

test("what-if scenario changes only the supplied weather measurements", () => {
  const result = buildClimateScenario({
    current: { temperature: 32, precipitation: 10, windGust: 20, aqi: 42 },
    changes: { temperatureCelsius: 3, rainfallPercent: 30, waterAvailabilityPercent: 20 },
  });

  assert.equal(result.temperature, 35);
  assert.equal(result.precipitation, 13);
  assert.equal(result.signals.heat, "VERY HIGH");
  assert.equal(result.signals.rainfall, "MODERATE");
  assert.equal(result.waterStress, null);
  assert.equal(result.energyDemand, null);
  assert.equal(result.trafficDisruption, null);
  assert.equal(result.infrastructureStress, null);
  assert.equal(result.populationExposure, null);
});

test("what-if changes do not create values when a baseline input is missing", () => {
  const result = buildClimateScenario({
    current: { temperature: null, feelsLike: null, precipitation: null, windGust: null, aqi: null },
    changes: { temperatureCelsius: 3, rainfallPercent: 30, waterAvailabilityPercent: 20 },
  });

  assert.equal(result.temperature, null);
  assert.equal(result.feelsLike, null);
  assert.equal(result.precipitation, null);
  assert.equal(result.score, null);
  assert.equal(result.waterStress, null);
});

test("city system indicators expose current profile baselines and retain their provenance", () => {
  const indicators = getClimateSystemIndicators({
    city: {
      id: "test-city",
      name: "Test City",
      dataMode: "demo",
      metrics: {
        population: { value: 1_000_000 },
        traffic: { value: 72 },
        energyUsage: { value: 82 },
        waterDemand: { value: 78 },
        greenCover: { value: 24 },
      },
    },
    liveTrafficFlow: {
      currentTravelTime: 150,
      freeFlowTravelTime: 100,
      currentSpeed: 30,
      freeFlowSpeed: 60,
      isSimulated: false,
      retrievedAt: "2026-10-08T09:00:00Z",
    },
    liveAirQuality: { us_aqi: 80, time: "2026-10-08T09:00:00Z" },
    soilMoisture: 0.18,
    soilMoistureTimestamp: "2026-10-08T09:00:00Z",
    climateRiskScore: 55,
    climateRiskTimestamp: "2026-10-08T09:00:00Z",
  });
  const byName = Object.fromEntries(indicators.map((indicator) => [indicator.name, indicator]));

  assert.equal(byName.Traffic.value, 50);
  assert.equal(byName.Traffic.status, "LIVE");
  assert.equal(byName["Energy demand"].value, 82);
  assert.equal(byName["Energy demand"].status, "ESTIMATED");
  assert.equal(byName["Water demand"].value, 78);
  assert.equal(byName.Population.value, 1_000_000);
  assert.equal(byName["Climate risk screening"].value, 55);
  assert.match(byName.Traffic.climateImpact, /no validated weather-to-traffic model/i);
  assert.equal(byName["Public safety"].status, "UNAVAILABLE");
  assert.equal(byName["Climate resilience proxy"].status, "ESTIMATED");
  assert.equal(byName["Modelled near-surface soil moisture"].value, 0.18);
  assert.equal(byName["Modelled near-surface soil moisture"].status, "ESTIMATED");
});

test("simulated or missing traffic uses only a labelled CityState baseline", () => {
  const city = { metrics: { traffic: { value: 72 } } };
  const simulated = getClimateSystemIndicators({
    city,
    liveTrafficFlow: { currentTravelTime: 150, freeFlowTravelTime: 100, isSimulated: true },
  });
  const missing = getClimateSystemIndicators({ city: { metrics: {} } });

  assert.equal(simulated.find(({ name }) => name === "Traffic").value, 72);
  assert.equal(simulated.find(({ name }) => name === "Traffic").status, "ESTIMATED");
  assert.equal(missing.find(({ name }) => name === "Traffic").status, "UNAVAILABLE");
  assert.equal(missing.find(({ name }) => name === "Water demand").value, null);
});
