import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatIfTransformation,
  compareTransformationMetric,
  normalizeCityTransformation,
  summarizeTransformation,
} from "./cityTransformation.js";

const city = {
  id: "demo-city",
  name: "Demo City",
  metrics: {
    traffic: { value: 80 },
    aqi: { value: 160 },
    energyUsage: { value: 75 },
    waterDemand: { value: 60 },
    population: { value: 1000000 },
  },
};

test("scenario comparison derives absolute and relative changes from actual supplied outputs", () => {
  const metric = compareTransformationMetric({
    key: "traffic",
    label: "Traffic",
    unit: "% index",
    before: 82,
    after: 61,
    lowerIsBetter: true,
  });
  assert.equal(metric.change, -21);
  assert.equal(metric.changePercent, -25.6);
  assert.equal(metric.trend, "better");

  const summary = summarizeTransformation([metric]);
  assert.equal(summary.improved.length, 1);
});

test("rule-based scenario snapshot uses slider calculations and leaves unsupported after-states unavailable", () => {
  const transformation = buildWhatIfTransformation({
    city,
    trafficReduction: 15,
    aqiImprovement: 20,
    projectedHealthScore: 78,
    baselineHealthScore: 64,
    carbonAbated: "0.50",
    budgetImpact: -12,
    inputs: {
      evAdoption: 50,
      metroExpansion: 30,
      greenCanopy: 32,
      congestionTax: 150,
      solarMandate: 50,
    },
    generatedAt: "2026-10-08T00:00:00.000Z",
  });

  const byKey = Object.fromEntries(transformation.metrics.map((metric) => [metric.key, metric]));
  assert.equal(byKey.traffic.before, 80);
  assert.equal(byKey.traffic.after, 65);
  assert.equal(byKey.traffic.change, -15);
  assert.equal(byKey.aqi.before, 160);
  assert.equal(byKey.aqi.after, 140);
  assert.equal(byKey.health.before, 64);
  assert.equal(byKey.health.after, 78);
  assert.equal(byKey.travelTime.after, null);
  assert.equal(byKey.waste.after, null);
  assert.equal(byKey.energy.after, null);
  assert.equal(transformation.classification, "ILLUSTRATIVE RULE-BASED SIMULATION");
  assert.ok(transformation.explanation.benefits.length > 0);
  assert.match(transformation.explanation.tradeoffs[0], /not a currency/);
  assert.equal(transformation.map.available, false);
});

test("missing baselines are not converted into zero-valued after results", () => {
  const transformation = buildWhatIfTransformation({
    city: { id: "empty", name: "Empty", metrics: { traffic: {}, aqi: {} } },
    trafficReduction: 10,
    aqiImprovement: 10,
    projectedHealthScore: null,
    baselineHealthScore: null,
    carbonAbated: "0",
    budgetImpact: 0,
    inputs: {},
  });
  const byKey = Object.fromEntries(transformation.metrics.map((metric) => [metric.key, metric]));
  assert.equal(byKey.traffic.after, null);
  assert.equal(byKey.aqi.after, null);
  assert.equal(byKey.health.trend, "unavailable");
});

test("zero baselines avoid invalid percentage changes and are still directionally assessed", () => {
  const metric = compareTransformationMetric({
    key: "test",
    label: "Test",
    unit: "points",
    before: 0,
    after: 2,
    lowerIsBetter: true,
  });
  assert.equal(metric.change, 2);
  assert.equal(metric.changePercent, null);
  assert.equal(metric.trend, "worse");
});

test("report normalization rejects another city and recomputes derived changes", () => {
  const transformation = buildWhatIfTransformation({
    city,
    trafficReduction: 5,
    aqiImprovement: 5,
    projectedHealthScore: 70,
    baselineHealthScore: 64,
    carbonAbated: "0.2",
    budgetImpact: 4,
    inputs: {},
  });
  assert.equal(normalizeCityTransformation(transformation, "different-city"), null);

  const received = structuredClone(transformation);
  received.metrics.find(({ key }) => key === "traffic").change = 999;
  const normalized = normalizeCityTransformation(received, city.id);
  const traffic = normalized.metrics.find(({ key }) => key === "traffic");
  assert.equal(traffic.change, -5);
  assert.equal(traffic.source, "DEMO DATA");
});
