const safeNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const calculateImpactDelta = ({
  before,
  after,
  unit = "%",
  lowerIsBetter = false,
  label = "Metric",
  explanation = "",
}) => {
  const beforeValue = safeNumber(before);
  const afterValue = safeNumber(after);

  if (beforeValue == null || afterValue == null) {
    return {
      label,
      unit,
      before: beforeValue,
      after: afterValue,
      absoluteChange: null,
      percentageChange: null,
      direction: "unavailable",
      summary: "No sufficient measurement exists for this metric.",
      explanation,
      impactLabel: "Unavailable",
      isImprovement: null,
    };
  }

  const absoluteChange = Number((afterValue - beforeValue).toFixed(2));
  const percentageChange = beforeValue === 0
    ? null
    : Number((((afterValue - beforeValue) / Math.abs(beforeValue)) * 100).toFixed(1));

  const direction = absoluteChange === 0
    ? "no significant change"
    : lowerIsBetter
      ? afterValue < beforeValue
        ? "improved"
        : "worsened"
      : afterValue > beforeValue
        ? "improved"
        : "worsened";

  const impactLabel = direction === "improved"
    ? "Improved"
    : direction === "worsened"
      ? "Worsened"
      : direction === "no significant change"
        ? "No significant change"
        : "Unavailable";

  const summary = percentageChange == null
    ? `${label} cannot be compared with a zero baseline.`
    : `${Math.abs(percentageChange)}% ${direction === "improved" ? "improvement" : direction === "worsened" ? "decline" : "change"}`;

  return {
    label,
    unit,
    before: beforeValue,
    after: afterValue,
    absoluteChange,
    percentageChange,
    direction,
    summary,
    explanation,
    impactLabel,
    isImprovement: direction === "improved" ? true : direction === "worsened" ? false : null,
  };
};

export const formatMetricValue = (value, unit, digits = 1) => {
  if (value == null) return "Unavailable";
  if (unit === "/ 100") return `${Number(value.toFixed(0))} / 100`;
  if (typeof value === "number" && value % 1 !== 0) return `${Number(value.toFixed(digits))}${unit}`;
  return `${Number(value.toFixed(0))}${unit}`;
};

export const buildImpactMetrics = ({ beforeState = {}, afterState = {} }) => {
  const defaults = [
    {
      key: "cityHealthScore",
      label: "City Health Score",
      unit: "/ 100",
      lowerIsBetter: false,
      before: beforeState.cityHealthScore,
      after: afterState.cityHealthScore,
      explanation: "Composite urban livability and system resilience score across transport, air quality, services, and public health conditions.",
    },
    {
      key: "trafficCongestion",
      label: "Traffic Congestion",
      unit: "%",
      lowerIsBetter: true,
      before: beforeState.trafficCongestion,
      after: afterState.trafficCongestion,
      explanation: "Share of road-network delay and congestion relative to free-flow conditions. Lower values indicate smoother movement and lighter travel delay.",
    },
    {
      key: "airQuality",
      label: "Air Quality",
      unit: " AQI",
      lowerIsBetter: true,
      before: beforeState.airQuality,
      after: afterState.airQuality,
      explanation: "Pollutant burden as a citywide AQI proxy. Lower values indicate cleaner air and reduced health risk.",
    },
    {
      key: "co2Emissions",
      label: "CO₂ Emissions",
      unit: " MtCO₂",
      lowerIsBetter: true,
      before: beforeState.co2Emissions,
      after: afterState.co2Emissions,
      explanation: "Annual or modeled emissions intensity from mobility, building demand, and city operations. Lower values indicate reduced climate impact.",
    },
    {
      key: "waterDemand",
      label: "Water Demand",
      unit: "%",
      lowerIsBetter: true,
      before: beforeState.waterDemand,
      after: afterState.waterDemand,
      explanation: "Demand-to-supply pressure across household, industrial, and municipal water use. Lower values indicate improved supply resilience.",
    },
    {
      key: "energyConsumption",
      label: "Energy Consumption",
      unit: "%",
      lowerIsBetter: true,
      before: beforeState.energyConsumption,
      after: afterState.energyConsumption,
      explanation: "Consumption intensity against the baseline system load. Lower values suggest lower demand and more efficient urban energy use.",
    },
    {
      key: "infrastructureRisk",
      label: "Infrastructure Risk",
      unit: "%",
      lowerIsBetter: true,
      before: beforeState.infrastructureRisk,
      after: afterState.infrastructureRisk,
      explanation: "Built-environment vulnerability, asset stress, and maintenance risk across critical urban systems.",
    },
    {
      key: "averageTravelTime",
      label: "Average Travel Time",
      unit: " min",
      lowerIsBetter: true,
      before: beforeState.averageTravelTime,
      after: afterState.averageTravelTime,
      explanation: "Typical commute and trip duration for residents and freight movements. Lower values indicate better mobility access and lower friction.",
    },
    {
      key: "populationPressure",
      label: "Population Pressure",
      unit: "%",
      lowerIsBetter: true,
      before: beforeState.populationPressure,
      after: afterState.populationPressure,
      explanation: "Service load relative to infrastructure capacity and civic system pressure. Lower values indicate a more balanced urban support model.",
    },
    {
      key: "sustainabilityScore",
      label: "Overall Sustainability Score",
      unit: "/ 100",
      lowerIsBetter: false,
      before: beforeState.sustainabilityScore,
      after: afterState.sustainabilityScore,
      explanation: "Integrated sustainability signal that combines resilience, emissions, mobility, services, and resource efficiency outcomes.",
    },
  ];

  return defaults
    .map((metric) => calculateImpactDelta({
      before: metric.before,
      after: metric.after,
      unit: metric.unit,
      lowerIsBetter: metric.lowerIsBetter,
      label: metric.label,
      explanation: metric.explanation,
    }))
    .filter((metric) => metric.label);
};

export const getImpactSummary = (metrics = []) => {
  const improved = metrics.filter((metric) => metric.direction === "improved");
  const worsened = metrics.filter((metric) => metric.direction === "worsened");
  const unchanged = metrics.filter((metric) => metric.direction === "no significant change");
  const unavailable = metrics.filter((metric) => metric.direction === "unavailable");

  return {
    improved,
    worsened,
    unchanged,
    unavailable,
    topImprovement: improved.reduce((best, metric) => {
      if (!best || (metric.percentageChange ?? -Infinity) > (best.percentageChange ?? -Infinity)) {
        return metric;
      }
      return best;
    }, null),
  };
};
