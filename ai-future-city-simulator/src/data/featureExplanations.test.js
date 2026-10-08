import test from "node:test";
import assert from "node:assert/strict";
import { FEATURE_EXPLANATIONS, FEATURE_EXPLANATION_IDS } from "./featureExplanations.js";

const REQUESTED_FEATURES = [
  "digital-city-twin",
  "future-forecasts",
  "what-if-scenarios",
  "traffic-intelligence",
  "environment-climate",
  "city-resources",
  "population-growth",
  "energy-intelligence",
  "water-intelligence",
  "waste-management",
  "infrastructure-risk",
  "emergency-simulation",
  "ai-urban-planner",
  "city-optimization",
  "flood-risk",
  "pollution-detection",
  "scenario-comparison",
  "ai-command-center",
  "city-time-machine",
  "ai-city-report",
];

test("every requested major feature has a dedicated explanation", () => {
  assert.deepEqual(FEATURE_EXPLANATION_IDS, REQUESTED_FEATURES);
});

test("every explanation includes the full decision-support story", () => {
  for (const [id, explanation] of Object.entries(FEATURE_EXPLANATIONS)) {
    assert.ok(explanation.title, `${id} needs a title`);
    assert.ok(explanation.whyAdded, `${id} needs a reason for inclusion`);
    assert.ok(explanation.problem, `${id} needs a real-world problem`);
    assert.ok(explanation.futureImportance, `${id} needs future-city relevance`);
    assert.ok(explanation.analysis, `${id} needs an analysis description`);
    assert.ok(explanation.prediction, `${id} needs a prediction boundary`);
    assert.ok(explanation.simulation, `${id} needs a simulation description`);
    assert.ok(explanation.decision, `${id} needs a decision use`);
    assert.ok(explanation.currentCapability, `${id} needs an implementation disclosure`);
    assert.ok(explanation.impactNote, `${id} needs an impact caveat`);
    assert.ok(explanation.impacts.length >= 3, `${id} needs directional outcomes`);
    assert.ok(explanation.without.length >= 3, `${id} needs a without comparison`);
    assert.ok(explanation.with.length >= 3, `${id} needs a with YUG NIRMAN comparison`);
  }
});

test("explanations do not claim a trained AI system or guaranteed measured impact", () => {
  for (const [id, explanation] of Object.entries(FEATURE_EXPLANATIONS)) {
    const disclosure = `${explanation.currentCapability} ${explanation.impactNote}`.toLowerCase();
    assert.match(disclosure, /not|no |only|illustrative|does not|directional|not measured|not connected/iu, `${id} needs an honest limitation`);
  }
});
