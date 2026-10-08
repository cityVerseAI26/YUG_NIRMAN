import test from "node:test";
import assert from "node:assert/strict";
import { getCityDiagnosis } from "./cityDiagnosis.js";

const city = {
  name: "Test City",
  metrics: {
    traffic: { value: 49 },
    aqi: { value: 100 },
    energyUsage: { value: 69 },
    waterDemand: { value: 69 },
    greenCover: { value: 20 },
  },
};

const diagnosis = (overrides = {}) => getCityDiagnosis({
  city,
  liveAirQuality: null,
  liveTrafficFlow: null,
  ...overrides,
});

test("traffic thresholds are inclusive and absent signals stay absent", () => {
  const atModerate = diagnosis({
    city: { ...city, metrics: { ...city.metrics, traffic: { value: 50 } } },
  });
  assert.equal(atModerate[0].severity, "MODERATE");
  assert.equal(atModerate[0].evidenceClass, "ILLUSTRATIVE PROFILE");

  const atHigh = diagnosis({
    city: { ...city, metrics: { ...city.metrics, traffic: { value: 70 } } },
  });
  assert.equal(atHigh[0].severity, "HIGH");
  assert.equal(diagnosis().some(({ id }) => id === "traffic"), false);
});

test("live traffic replaces the profile proxy and is bounded to its source segment", () => {
  const [problem] = diagnosis({
    liveTrafficFlow: {
      currentTravelTime: 170,
      freeFlowTravelTime: 100,
      retrievedAt: "2026-01-01T00:00:00Z",
    },
  });
  assert.equal(problem.id, "traffic");
  assert.equal(problem.value, "70% delay vs free flow");
  assert.equal(problem.evidenceClass, "LIVE FEED");
  assert.match(problem.evidence, /one nearby road segment/);
  assert.ok(problem.updatedAt);
  assert.ok(problem.nextCheck);
});

test("simulated traffic fallback is not represented as a live TomTom diagnosis", () => {
  const [problem] = diagnosis({
    city: { ...city, metrics: { ...city.metrics, traffic: { value: 70 } } },
    liveTrafficFlow: {
      currentTravelTime: 170,
      freeFlowTravelTime: 100,
      isSimulated: true,
    },
  });

  assert.equal(problem.id, "traffic");
  assert.equal(problem.value, "70% congestion index");
  assert.equal(problem.source, "Bundled city profile");
  assert.equal(problem.evidenceClass, "ILLUSTRATIVE PROFILE");
});

test("AQI uses scale-appropriate thresholds and labels modeled versus profile data", () => {
  const [usProblem] = diagnosis({
    liveAirQuality: { us_aqi: 101 },
  });
  assert.equal(usProblem.id, "air");
  assert.equal(usProblem.severity, "MODERATE");
  assert.equal(usProblem.evidenceClass, "LIVE MODEL");

  const [europeanProblem] = diagnosis({
    liveAirQuality: { european_aqi: 61 },
  });
  assert.equal(europeanProblem.severity, "HIGH");
  assert.match(europeanProblem.value, /European AQI/);

  const profileProblem = diagnosis({
    city: { ...city, metrics: { ...city.metrics, aqi: { value: 151 } } },
  }).find(({ id }) => id === "air");
  assert.equal(profileProblem.evidenceClass, "ILLUSTRATIVE PROFILE");
});

test("profile signals include a verification step and never present quantified impacts", () => {
  const problems = diagnosis({
    city: {
      ...city,
      metrics: {
        ...city.metrics,
        energyUsage: { value: 85 },
        waterDemand: { value: 70 },
        greenCover: { value: 9 },
      },
    },
  });
  for (const problem of problems) {
    assert.equal(problem.evidenceClass, "ILLUSTRATIVE PROFILE");
    assert.ok(problem.nextCheck);
    assert.doesNotMatch(problem.nextCheck, /\d+%|\d+ (?:MLD|years?)/i);
  }
});

test("diagnosis ignores invalid metrics and returns no placeholder problems", () => {
  const result = diagnosis({
    city: {
      name: "Empty City",
      metrics: {
        traffic: { value: "not available" },
        aqi: { value: Number.NaN },
        energyUsage: { value: Infinity },
        waterDemand: { value: "" },
        greenCover: { value: null },
      },
    },
  });
  assert.deepEqual(result, []);
});

test("problems sort by severity before metric priority and cap at five", () => {
  const problems = diagnosis({
    city: {
      ...city,
      metrics: {
        traffic: { value: 70 },
        aqi: { value: 151 },
        energyUsage: { value: 85 },
        waterDemand: { value: 85 },
        greenCover: { value: 9 },
      },
    },
  });
  assert.equal(problems.length, 5);
  assert.deepEqual(
    problems.map(({ id }) => id),
    ["air", "green", "energy", "water", "traffic"],
  );
});
