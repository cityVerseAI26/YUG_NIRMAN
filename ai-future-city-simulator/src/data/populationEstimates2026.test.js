import assert from "node:assert/strict";
import { test } from "node:test";
import { CITIES } from "./cityData.js";
import { POPULATION_DATA } from "./populationData.js";
import { POPULATION_ESTIMATES_2026 } from "./populationEstimates2026.js";

test("every selectable city has a positive 2026 population estimate", () => {
  const missingCityIds = Object.keys(CITIES).filter((cityId) => !POPULATION_ESTIMATES_2026[cityId]);
  assert.deepEqual(missingCityIds, []);
  assert.deepEqual(
    Object.keys(POPULATION_ESTIMATES_2026).sort(),
    Object.keys(CITIES).sort()
  );

  for (const [cityId, estimate] of Object.entries(POPULATION_ESTIMATES_2026)) {
    assert.ok(Number.isSafeInteger(estimate.population) && estimate.population > 0, `${cityId} has an invalid population`);
    assert.equal(estimate.estimateYear, 2026, `${cityId} is not dated 2026`);
    assert.equal(estimate.referenceDate, "2026-07-01", `${cityId} has an unexpected reference date`);
    assert.equal(estimate.classification, "ESTIMATED", `${cityId} is not identified as an estimate`);
    assert.equal(estimate.dataType, "STATIC", `${cityId} is not identified as static data`);
    assert.equal(estimate.unit, "people", `${cityId} has an invalid population unit`);
    assert.ok(estimate.geographicLevel, `${cityId} has no geographic-level disclosure`);
    assert.ok(estimate.methodology, `${cityId} has no methodology disclosure`);
    assert.equal(CITIES[cityId].metrics.population.value, estimate.population, `${cityId} metric is stale`);
  }
});

test("legacy population history is labeled simulated and contains no asserted actual observations", () => {
  for (const [cityId, profile] of Object.entries(POPULATION_DATA)) {
    assert.equal(profile.classification, "SIMULATED", `${cityId} is not labeled simulated`);
    assert.equal(profile.dataType, "STATIC", `${cityId} is not labeled static`);
    assert.equal(profile.unit, "millions of people", `${cityId} has an invalid population unit`);
    assert.deepEqual(profile.coverageYears, ["2020", "2030"], `${cityId} has unexpected year coverage`);
    assert.ok(profile.source, `${cityId} has no source description`);
    assert.ok(profile.geographicLevel, `${cityId} has no geographic-level disclosure`);
    assert.ok(profile.methodology, `${cityId} has no methodology disclosure`);
    assert.ok(
      profile.historyAndForecast.every((point) => point.actual === null),
      `${cityId} marks illustrative values as actual observations`
    );
  }
});
