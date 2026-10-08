import assert from "node:assert/strict";
import test from "node:test";
import { summarizeHealthDimensions } from "./cityHealthScore.js";

test("health index averages only available normalized scores", () => {
  const summary = summarizeHealthDimensions([
    { label: "Mobility", score: 72 },
    { label: "Air quality", score: 100 },
    { label: "Population pressure", score: null },
    { label: "Climate & resilience", score: null },
    { label: "Infrastructure", score: null },
  ]);

  assert.equal(summary.score, 86);
  assert.deepEqual(summary.scoredDimensions.map(({ label }) => label), ["Mobility", "Air quality"]);
});

test("missing or invalid scores do not produce an index", () => {
  const summary = summarizeHealthDimensions([
    { label: "Population", score: null },
    { label: "Climate", score: Number.NaN },
    { label: "Infrastructure", score: 101 },
  ]);

  assert.equal(summary.score, null);
  assert.deepEqual(summary.scoredDimensions, []);
});
