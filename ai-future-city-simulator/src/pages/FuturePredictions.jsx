import React, { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  Cpu,
  Users,
  Car,
  Droplet,
  Zap,
  Wind,
  Play,
  Pause,
  CheckCircle2,
  RadioTower,
  Activity,
  Wifi,
  Terminal,
  RotateCcw,
  Flame,
  CloudRain,
  Leaf,
  AlertTriangle,
  FileText
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { useRealTimePredictions } from "../hooks/useRealTimePredictions";
import YugNirmanMark from "../assets/yug-nirman-mark.svg";
import { archivePredictionReport } from "../utils/predictionReportArchive";

const readNumericValue = (value) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const SCENARIO_YEARS = ["2027", "2030", "2035", "2040"];

const projectMetric = (city, forecastKey, baseline, targetYear) => {
  const points = [
    { year: 2026, value: baseline },
    ...Object.entries(city.forecasts || {}).flatMap(([year, forecast]) => {
      const value = readNumericValue(forecast[forecastKey]);
      return value == null ? [] : [{ year: Number(year), value }];
    }),
  ].sort((left, right) => left.year - right.year);

  const previous = [...points].reverse().find((point) => point.year <= targetYear) || points[0];
  const next = points.find((point) => point.year >= targetYear) || points[points.length - 1];
  if (previous.year === next.year) return previous.value;

  const progress = (targetYear - previous.year) / (next.year - previous.year);
  return previous.value + (next.value - previous.value) * progress;
};

const getOutlookForCity = (city, targetYear) => {
  const baselinePopulation = readNumericValue(city.metrics.population.display)
    ?? city.metrics.population.value / 1_000_000;
  return {
    population: projectMetric(city, "population", baselinePopulation, targetYear),
    traffic: projectMetric(city, "traffic", city.metrics.traffic.value, targetYear),
    water: projectMetric(city, "waterDemand", city.metrics.waterDemand.value, targetYear),
    energy: projectMetric(city, "energyUsage", city.metrics.energyUsage.value, targetYear),
    aqi: projectMetric(city, "aqi", city.metrics.aqi.value, targetYear),
    baseline: {
      population: baselinePopulation,
      traffic: city.metrics.traffic.value,
      water: city.metrics.waterDemand.value,
      energy: city.metrics.energyUsage.value,
      aqi: city.metrics.aqi.value,
    },
  };
};

const createFutureSolutions = (metrics, targetYear) => {
  const metricByKey = Object.fromEntries(metrics.map((metric) => [metric.key, metric]));
  const changeSummary = (metric) => {
    if (!metric) return "has no available projection";
    if (metric.change === 0) return `holds near ${metric.projected} ${metric.unit}`;
    return `${metric.change > 0 ? "rises" : "falls"} by ${Math.abs(metric.change)} ${metric.unit} (${metric.changePercent == null ? "change percent unavailable" : `${Math.abs(metric.changePercent)}%`})`;
  };

  return [
    {
      title: "Plan for population change",
      signal: `Population ${changeSummary(metricByKey.population)} by ${targetYear}.`,
      action: "Use transit-oriented, mixed-use growth scenarios and phase housing, schools, clinics, and utility capacity together.",
    },
    {
      title: "Reduce congestion pressure",
      signal: `The road congestion index ${changeSummary(metricByKey.traffic)}.`,
      action: "Compare high-frequency transit, adaptive signal timing, safe walking and cycling links, and demand-management measures against the baseline.",
    },
    {
      title: "Protect water security",
      signal: `The water demand index ${changeSummary(metricByKey.water)}.`,
      action: "Prioritize leakage reduction, rainwater capture, drought-stage triggers, and reclaimed water for non-potable uses.",
    },
    {
      title: "Prepare the energy system",
      signal: `The grid load index ${changeSummary(metricByKey.energy)}.`,
      action: "Stress-test peak demand and evaluate building efficiency, rooftop solar, battery storage, and demand-response programs.",
    },
    {
      title: "Sustain cleaner air",
      signal: `The air quality index ${changeSummary(metricByKey.aqi)}.`,
      action: "Model cleaner public fleets, low-emission corridors, and ongoing particulate monitoring to protect or improve air quality.",
    },
  ];
};

const buildAiCityReportData = ({ city, horizonYear, modelType, activeEvent, predictions, outlook }) => {
  const metricDefinitions = [
    { key: "population", label: "Population", unit: "million people", decimals: 1 },
    { key: "traffic", label: "Traffic Index", unit: "%", decimals: 0 },
    { key: "energy", label: "Energy Load", unit: "%", decimals: 0 },
    { key: "aqi", label: "Air Quality", unit: "AQI", decimals: 0 },
    { key: "water", label: "Water Demand", unit: "%", decimals: 0 },
  ];
  const modelLabels = {
    lstm: "LSTM Scenario Model",
    arima: "ARIMA Scenario Model",
    agent: "AI Agent Simulation Model",
  };

  const metrics = metricDefinitions.map(({ key, label, unit, decimals }) => {
    const baseline = outlook.baseline[key];
    const projected = outlook[key];
    const change = projected - baseline;
    return {
      key,
      label,
      unit,
      baseline: Number(baseline.toFixed(decimals)),
      projected: Number(projected.toFixed(decimals)),
      change: Number(change.toFixed(decimals)),
      changePercent: baseline === 0 ? null : Number(((change / baseline) * 100).toFixed(1)),
    };
  });

  const classifySeverity = (value, thresholds) => {
    if (value >= thresholds.critical) return "CRITICAL";
    if (value >= thresholds.high) return "HIGH";
    if (value >= thresholds.moderate) return "MODERATE";
    return "LOW";
  };

  const currentTraffic = Number(city.metrics.traffic.value);
  const currentEnergy = Number(city.metrics.energyUsage.value);
  const currentAqi = Number(city.metrics.aqi.value);
  const currentGreen = Number(city.metrics.greenCover.value);
  const currentPopulation = Number(city.metrics.population.value / 1000000);
  const projectedTraffic = Math.round(outlook.traffic);
  const projectedEnergy = Math.round(outlook.energy);
  const projectedAqi = Math.round(outlook.aqi);
  const projectedGreen = Math.max(6, Math.round(outlook.aqi === 0 ? currentGreen : currentGreen + ((projectedAqi - currentAqi) / 30)));

  const risks = [
    {
      risk: "Traffic Congestion",
      currentLevel: `${currentTraffic}%`,
      predictedLevel: `${projectedTraffic}%`,
      severity: classifySeverity(projectedTraffic, { critical: 90, high: 82, moderate: 70 }),
      primaryCause: "Peak-hour congestion and route overlap",
      recommendedAction: "Prioritize bus-priority corridors and adaptive signal timing.",
    },
    {
      risk: "Energy Overload",
      currentLevel: `${currentEnergy}%`,
      predictedLevel: `${projectedEnergy}%`,
      severity: classifySeverity(projectedEnergy, { critical: 95, high: 88, moderate: 78 }),
      primaryCause: "Power demand concentration during peak periods",
      recommendedAction: "Expand demand-response programs and rooftop distributed generation.",
    },
    {
      risk: "Air Pollution",
      currentLevel: `${currentAqi} AQI`,
      predictedLevel: `${projectedAqi} AQI`,
      severity: classifySeverity(projectedAqi, { critical: 180, high: 150, moderate: 120 }),
      primaryCause: "Transport emissions and poor dispersion",
      recommendedAction: "Target low-emission zones and cleaner fleet transitions.",
    },
  ];
  const hotspots = [
    { zone: "Zone 04", category: "Traffic Hotspot", severity: "HIGH", currentValue: `${currentTraffic}%`, predictedValue: `${projectedTraffic}%`, primaryCause: "Vehicle density" },
    { zone: "Zone 02", category: "Energy Hotspot", severity: "MODERATE", currentValue: `${currentEnergy}%`, predictedValue: `${projectedEnergy}%`, primaryCause: "Peak evening demand" },
    { zone: "Zone 06", category: "Air Quality Hotspot", severity: "HIGH", currentValue: `${currentAqi} AQI`, predictedValue: `${projectedAqi} AQI`, primaryCause: "Mobility emissions" },
  ];
  const solutions = createFutureSolutions(metrics, horizonYear);
  const predictionDetails = metrics.map((metric) => ({
    label: metric.label,
    baseline: metric.baseline,
    projected: metric.projected,
    change: metric.change,
    changePercent: metric.changePercent,
    unit: metric.unit,
    targetYear: horizonYear,
    validityYear: horizonYear,
  }));
  const problems = [
    ...risks.map((risk) => ({
      title: risk.risk,
      severity: risk.severity,
      currentLevel: risk.currentLevel,
      predictedLevel: risk.predictedLevel,
      cause: risk.primaryCause,
      recommendation: risk.recommendedAction,
    })),
    ...hotspots.map((hotspot) => ({
      title: hotspot.category,
      severity: hotspot.severity,
      location: hotspot.zone,
      currentLevel: hotspot.currentValue,
      predictedLevel: hotspot.predictedValue,
      cause: hotspot.primaryCause,
      recommendation: "Prioritize targeted mitigation and monitoring for the affected zone.",
    })),
  ];

  const reportData = {
    city: city.name,
    region: city.state ? `${city.state} • ${city.tagline}` : "Urban Metropolis",
    generatedAt: new Date().toISOString(),
    simulation: `${modelLabels[modelType] || "Scenario Model"}`,
    view: "Daylight",
    reportStatus: "AI Simulation Completed",
    validityYear: horizonYear,
    dataClassification: city.dataMode === "illustrative" ? "Simulated / Illustrative Data" : "Simulation Data",
    executiveSummary: "AI simulation indicates elevated traffic and energy pressure across selected city zones, with environmental conditions requiring further analysis.",
    currentMetrics: {
      population: `${currentPopulation.toFixed(1)}M`,
      traffic: `${currentTraffic}%`,
      energyLoad: `${currentEnergy}%`,
      airQuality: `${currentAqi} AQI`,
      greenCover: `${currentGreen}%`,
      vehicles: 204,
      buildings: 116,
      trees: 392,
      bridges: 8,
      sensors: 39,
      metroTrains: 204,
    },
    predictions: {
      traffic: { current: currentTraffic, predicted: projectedTraffic, change: projectedTraffic - currentTraffic, direction: projectedTraffic >= currentTraffic ? "↑ increase" : "↓ decrease" },
      energy: { current: currentEnergy, predicted: projectedEnergy, change: projectedEnergy - currentEnergy, direction: projectedEnergy >= currentEnergy ? "↑ increase" : "↓ decrease" },
      airQuality: { current: currentAqi, predicted: projectedAqi, change: projectedAqi - currentAqi, direction: projectedAqi >= currentAqi ? "↑ increase" : "↓ decrease" },
      greenCover: { current: currentGreen, predicted: projectedGreen, change: projectedGreen - currentGreen, direction: projectedGreen >= currentGreen ? "↑ increase" : "↓ decrease" },
    },
    hotspots,
    risks,
    problems,
    predictionDetails,
    redundancy: [
      {
        id: "RED-01",
        category: "Transportation",
        zone: "Zone 04",
        level: "MODERATE",
        evidence: "Route overlap and duplicated high-capacity corridors during peak hours.",
        estimatedImpact: "High",
        rootCause: "Oversized route coverage without demand balancing.",
        recommendedSolution: "Reallocate fleet and streamline corridor assignments.",
      },
      {
        id: "RED-02",
        category: "Sensor Network",
        zone: "Zone 02",
        level: "LOW",
        evidence: "Adjacent sensors report correlated readings with limited marginal value.",
        estimatedImpact: "Low",
        rootCause: "Dense monitoring without optimized placement.",
        recommendedSolution: "Reduce overlap and rebalance sensor coverage.",
      },
      {
        id: "RED-03",
        category: "Energy",
        zone: "Zone 08",
        level: "MODERATE",
        evidence: "Combined substation capacity exceeds sustained need during off-peak periods.",
        estimatedImpact: "Moderate",
        rootCause: "Excess capacity without dynamic load balancing.",
        recommendedSolution: "Shift demand to storage and optimize feeder usage.",
      },
    ],
    rootCauses: [
      {
        area: "Mobility",
        description: "Peak-hour vehicle concentration in high-demand corridors drives congestion and air pollution.",
      },
      {
        area: "Infrastructure",
        description: "Utility capacity remains underutilized outside daily peaks, creating inefficiency and operational redundancy.",
      },
      {
        area: "Environment",
        description: "The current green cover and dispersion conditions provide only partial mitigation against pollution spikes.",
      },
    ],
    solutions,
    scenarios: [
      {
        name: "Transit-oriented shift",
        before: currentTraffic,
        after: Math.max(55, projectedTraffic - 10),
        impact: "Lower congestion pressure in mobility corridors.",
      },
      {
        name: "Clean energy mix",
        before: currentEnergy,
        after: Math.max(60, projectedEnergy - 8),
        impact: "Reduced peak-load stress and more stable grid performance.",
      },
    ],
    beforeAfter: {
      congestion: { before: currentTraffic, after: projectedTraffic },
      energy: { before: currentEnergy, after: projectedEnergy },
      airQuality: { before: currentAqi, after: projectedAqi },
    },
    environment: { airQuality: currentAqi, greenCover: currentGreen, pollutionRisk: "MODERATE" },
    mobility: { traffic: currentTraffic, publicTransport: 74, modeShare: "Balanced" },
    infrastructure: { utilization: currentEnergy, assetStress: "HIGH" },
    explainability: {
      available: true,
      featureContribution: [
        { label: "Traffic density", value: 31 },
        { label: "Vehicle mix", value: 25 },
        { label: "Energy demand", value: 22 },
        { label: "Land use intensity", value: 14 },
        { label: "Green cover", value: 8 },
      ],
    },
    model: {
      name: modelLabels[modelType] || "Scenario Model",
      horizon: `${horizonYear}`,
      inputFeatures: 11,
      trainingData: "Illustrative city simulation dataset",
      predictionConfidence: "Not available",
      metrics: {
        MAE: "Not available",
        RMSE: "Not available",
        R2: "Not available",
        Accuracy: "Not available",
        Precision: "Not available",
        Recall: "Not available",
        F1: "Not available",
      },
    },
    decisionLog: [
      { time: "12:17 PM", event: "Simulation initialized." },
      { time: "12:18 PM", event: "Traffic pressure detected in Zone 4." },
      { time: "12:18 PM", event: "Potential infrastructure redundancy identified." },
      { time: "12:19 PM", event: "AI solution generated." },
      { time: "12:20 PM", event: "What-if scenario simulated." },
      { time: "12:21 PM", event: "Post-intervention indicators recalculated." },
    ],
    methodology: {
      dataSource: "Internal simulation layers + bundled city profile",
      dataType: city.dataMode === "illustrative" ? "Simulated / Illustrative" : "Simulation Data",
      simulationMethod: "Scenario-based urban modeling",
      predictionModel: modelLabels[modelType] || "Scenario Model",
      features: 11,
      forecastHorizon: `${horizonYear}`,
      scoringMethod: "Scenario outcome and utilization scoring",
      redundancyDetectionMethod: "Capacity overlap and utilization comparison",
      scenarioMethod: "What-if simulation and policy comparison",
      limitations: [
        "This report uses simulated inputs and should not be interpreted as official municipal data.",
        "Prediction outputs depend on data coverage and scenario assumptions.",
      ],
    },
    limitations: [
      "This report is generated from the YUG NIRMAN city simulation system.",
      "If simulated data is used, the results are illustrative and should not be interpreted as official measurements of real-world city conditions.",
      "Predictions depend on the quality, coverage, and assumptions of the underlying data and models.",
      "Scenario results represent simulated outcomes and are not guarantees of real-world effects.",
    ],
    metrics,
    indicators: predictions.map((prediction) => ({
      title: prediction.title,
      category: prediction.category,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence ?? null,
      outcome: prediction.futureOutcome,
    })),
    disclaimer: "This report is generated from bundled illustrative scenario data and simulated inputs. It is not an official city forecast, and no live municipal sensor feed or validated prediction model is connected.",
  };

  return reportData;
};

export const FuturePredictions = ({ reportOnly = false }) => {
  const {
    city,
    liveWeather,
    liveWeatherHourly,
    liveWeatherError,
    liveAirQuality,
    liveAirQualityHourly,
    liveAirQualityError,
    liveDataLoading,
    refreshLiveData,
  } = useCity();
  const { currentUser } = useAuth();

  const [forecastHours, setForecastHours] = useState(24);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScenarioYear = searchParams.get("year");
  const scenarioYear = SCENARIO_YEARS.includes(requestedScenarioYear) ? requestedScenarioYear : "2030";
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportNotice, setReportNotice] = useState("");
  const { telemetry, dynamicProjectionData, weatherForecastData } = useRealTimePredictions(
    liveAirQuality,
    liveAirQualityHourly,
    liveWeather,
    liveWeatherHourly
  );
  const targetTimestamp = Date.now() + forecastHours * 60 * 60 * 1000;
  const forecastPoint = useMemo(() => dynamicProjectionData.reduce((closest, point) => {
    if (!closest || Math.abs(point.timestamp - targetTimestamp) < Math.abs(closest.timestamp - targetTimestamp)) {
      return point;
    }
    return closest;
  }, null), [dynamicProjectionData, targetTimestamp]);
  const weatherForecastPoint = useMemo(() => weatherForecastData.reduce((closest, point) => {
    if (!closest || Math.abs(point.timestamp - targetTimestamp) < Math.abs(closest.timestamp - targetTimestamp)) {
      return point;
    }
    return closest;
  }, null), [targetTimestamp, weatherForecastData]);
  const scenarioOutlook = city.forecasts?.[scenarioYear] ?? null;
  const scenarioMetrics = scenarioOutlook
    ? [
        { label: "Population", value: scenarioOutlook.population, icon: Users },
        { label: "Road traffic", value: scenarioOutlook.traffic, icon: Car },
        { label: "Air quality", value: `${scenarioOutlook.aqi} AQI`, icon: Wind },
        { label: "Water demand", value: scenarioOutlook.waterDemand, icon: Droplet },
        { label: "Energy load", value: scenarioOutlook.energyUsage, icon: Zap },
      ]
    : [];

  const predictions = useMemo(() => {
    const available = (step, id, category, title, icon, source) => ({
      id,
      step,
      category,
      title,
      icon,
      horizon: `${forecastHours} hours`,
      stat: "Live data unavailable",
      statDetail: source,
      riskLevel: "Data gap",
      riskColor: "amber",
      futureOutcome: `A real-time ${title.toLowerCase()} prediction is not displayed because no verified live source is connected for ${city.name}.`,
      spokenBody: "The bundled sample profile is intentionally not used as a substitute for live measurements.",
      confidence: null,
    });
    const scenarioPrediction = ({ step, id, category, title, icon, value, baseline, unit, metric }) => {
      const projectedValue = readNumericValue(value);
      const baselineValue = readNumericValue(baseline);
      if (!scenarioOutlook || projectedValue == null) {
        return available(step, id, category, title, icon, `No bundled ${scenarioYear} ${metric} scenario or verified live feed is available.`);
      }

      const delta = baselineValue == null ? null : projectedValue - baselineValue;
      const change = delta == null
        ? "2026 baseline unavailable"
        : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${unit} vs 2026 baseline`;
      return {
        id,
        step,
        category,
        title,
        icon,
        horizon: `${scenarioYear} saved-profile projection`,
        outlookLabel: `${scenarioYear} stored projection`,
        stat: value,
        statDetail: change,
        riskLevel: "Stored-data projection",
        riskColor: "amber",
        dataType: "scenario",
        futureOutcome: `Using the saved ${scenarioYear} city forecast profile, the ${metric} projection is ${value}${delta == null ? "" : `, ${change}`}. This stored-data projection is used when a verified live city feed is unavailable; it is not a live measurement.`,
        spokenBody: city.dataMode === "illustrative"
          ? `This projection uses the saved reference-city profile because a city-specific live feed is unavailable. Treat it as illustrative, not an operational forecast.`
          : `This annual projection uses the saved city forecast profile because a verified live feed is unavailable. It has not been validated against current observations.`,
        confidence: null,
      };
    };
    const population = scenarioPrediction({
      step: 1,
      id: "pred-pop",
      category: "Demographics & Density",
      title: "Population outlook",
      icon: Users,
      value: scenarioOutlook?.population,
      baseline: city.metrics.population.display ?? city.metrics.population.value / 1_000_000,
      unit: "M residents",
      metric: "population",
    });
    const traffic = scenarioPrediction({
      step: 2,
      id: "pred-traffic",
      category: "Mobility & Congestion",
      title: "Road traffic outlook",
      icon: Car,
      value: scenarioOutlook?.traffic,
      baseline: city.metrics.traffic.value,
      unit: "percentage points",
      metric: "traffic congestion index",
    });
    const water = scenarioPrediction({
      step: 3,
      id: "pred-water",
      category: "Hydrology & Water Reserves",
      title: "Water system outlook",
      icon: Droplet,
      value: scenarioOutlook?.waterDemand,
      baseline: city.metrics.waterDemand.value,
      unit: "percentage points",
      metric: "water demand index",
    });
    const energy = scenarioOutlook
      ? {
          id: "pred-energy",
          step: 4,
          category: "Energy Grid & Microgrids",
          title: "Energy grid & microgrids outlook",
          icon: Zap,
          horizon: `${scenarioYear} saved-profile projection`,
          stat: `${scenarioOutlook.energyUsage} grid-load scenario`,
          statDetail: `${scenarioOutlook.change} scenario change vs 2026`,
          outlookLabel: `${scenarioYear} stored projection`,
          riskLevel: "Stored-data projection",
          riskColor: "amber",
          dataType: "scenario",
          futureOutcome: `Using the saved ${scenarioYear} city forecast profile, grid load is projected at ${scenarioOutlook.energyUsage}, with an overall change of ${scenarioOutlook.change} versus 2026. This stored-data projection is used when a verified utility feed is unavailable; it is not a live grid reading.`,
          spokenBody: city.dataMode === "illustrative"
            ? "This projection uses the saved reference-city profile because city-specific utility data is unavailable. Treat it as illustrative, not an operational forecast."
            : "This projection uses the saved city forecast profile because a verified utility feed is unavailable. It has not been validated against current grid observations.",
          confidence: null,
        }
      : available(4, "pred-energy", "Energy Grid & Microgrids", "Energy grid & microgrids outlook", Zap, `No bundled ${scenarioYear} energy scenario or verified grid feed is available.`);
    const strategicMetrics = scenarioOutlook ? [
      {
        label: "population growth",
        value: readNumericValue(scenarioOutlook.population),
        baseline: readNumericValue(city.metrics.population.display) ?? city.metrics.population.value / 1_000_000,
        action: "phase housing, schools, clinics, and utility capacity around transit-oriented growth",
      },
      {
        label: "traffic congestion",
        value: readNumericValue(scenarioOutlook.traffic),
        baseline: city.metrics.traffic.value,
        action: "prioritize transit capacity and monitored congestion-management corridors",
      },
      {
        label: "water demand",
        value: readNumericValue(scenarioOutlook.waterDemand),
        baseline: city.metrics.waterDemand.value,
        action: "establish verified water-demand monitoring and phase leakage reduction and reuse projects",
      },
      {
        label: "energy load",
        value: readNumericValue(scenarioOutlook.energyUsage),
        baseline: city.metrics.energyUsage.value,
        action: "validate peak-load needs and assess efficiency, storage, and distributed generation",
      },
    ].filter((metric) => metric.value != null && metric.baseline > 0).map((metric) => ({
      ...metric,
      relativeChange: ((metric.value - metric.baseline) / metric.baseline) * 100,
    })) : [];
    const priorityMetric = strategicMetrics.reduce((largest, metric) => (
      !largest || metric.relativeChange > largest.relativeChange ? metric : largest
    ), null);
    const resilience = priorityMetric
      ? {
          id: "pred-milestone",
          step: 8,
          category: "Strategic AI Milestone",
          title: "Strategic planning milestone",
          icon: Sparkles,
          horizon: `${scenarioYear} saved-profile projection`,
          outlookLabel: `${scenarioYear} stored projection`,
          stat: "Scenario priority",
          statDetail: `${priorityMetric.label} · ${priorityMetric.relativeChange > 0 ? "+" : ""}${priorityMetric.relativeChange.toFixed(1)}%`,
          riskLevel: "Planning recommendation",
          riskColor: "amber",
          dataType: "milestone",
          futureOutcome: `By ${scenarioYear}, establish a verified baseline and fund a delivery plan to ${priorityMetric.action}. The priority is ranked by its relative change in the saved city forecast profile; it is a planning recommendation, not a validated AI forecast.`,
          spokenBody: "This milestone is derived from illustrative annual profile values. Validate it with municipal data and planning teams before using it as an operational target.",
          confidence: null,
        }
      : available(8, "pred-milestone", "Strategic AI Milestone", "Strategic planning milestone", Sparkles, `No bundled ${scenarioYear} scenario is available to rank a planning priority.`);
    const currentAqi = telemetry.aqi.current;
    const projectedAqi = forecastPoint?.aqi ?? null;
    const scenarioAirQuality = scenarioPrediction({
      step: 5,
      id: "pred-scenario-aqi",
      category: "Environmental Quality & Climate",
      title: "Annual air quality scenario",
      icon: Wind,
      value: scenarioOutlook?.aqi,
      baseline: city.metrics.aqi.value,
      unit: "AQI",
      metric: "annual air quality index",
    });
    const airQuality = {
      id: "pred-aqi",
      step: 6,
      category: "Environmental Quality & Climate",
      title: "Air quality forecast",
      icon: Wind,
      horizon: `${forecastHours} hours`,
      stat: projectedAqi == null ? "Live forecast unavailable" : `${Math.round(projectedAqi)} US AQI`,
      statDetail: currentAqi == null
        ? "Current reading unavailable"
        : `Current ${Math.round(currentAqi)} US AQI · PM2.5 ${telemetry.aqi.pm25 == null ? "unavailable" : `${telemetry.aqi.pm25} μg/m³`} · Open-Meteo`,
      riskLevel: currentAqi == null ? "Data gap" : currentAqi >= 151 ? "High" : "Monitored",
      riskColor: currentAqi == null ? "amber" : currentAqi >= 151 ? "rose" : "cyan",
      futureOutcome: projectedAqi == null
        ? `No Open-Meteo hourly AQI value is available for the selected ${forecastHours}-hour horizon.`
        : `Open-Meteo's hourly air-quality model forecasts ${Math.round(projectedAqi)} US AQI around ${new Date(forecastPoint.timestamp).toLocaleString()}. The current modelled value is ${currentAqi == null ? "unavailable" : `${Math.round(currentAqi)} US AQI`}.`,
      spokenBody: "This is a public atmospheric model forecast, not a municipal sensor observation or a validated citywide long-term prediction.",
      confidence: null,
    };
    const weather = {
      id: "pred-weather",
      step: 7,
      category: "Weather and Climate",
      title: "Weather and precipitation outlook",
      icon: CloudRain,
      horizon: `${forecastHours} hours`,
      stat: weatherForecastPoint
        ? `${weatherForecastPoint.condition} · ${weatherForecastPoint.temperature ?? "N/A"}°C`
        : "Live forecast unavailable",
      statDetail: weatherForecastPoint?.precipitationProbability == null
        ? "Precipitation probability unavailable"
        : `${weatherForecastPoint.precipitationProbability}% precipitation probability`,
      riskLevel: weatherForecastPoint?.precipitationProbability >= 70 ? "High precipitation chance" : weatherForecastPoint ? "Forecast" : "Data gap",
      riskColor: weatherForecastPoint?.precipitationProbability >= 70 ? "rose" : weatherForecastPoint ? "cyan" : "amber",
      futureOutcome: weatherForecastPoint
        ? `Open-Meteo forecasts ${weatherForecastPoint.condition.toLowerCase()} conditions around ${new Date(weatherForecastPoint.timestamp).toLocaleString()}: temperature ${weatherForecastPoint.temperature ?? "unavailable"}°C (feels like ${weatherForecastPoint.apparentTemperature ?? "unavailable"}°C), humidity ${weatherForecastPoint.relativeHumidity ?? "unavailable"}%, precipitation probability ${weatherForecastPoint.precipitationProbability ?? "unavailable"}%, precipitation ${weatherForecastPoint.precipitation ?? "unavailable"} mm, wind ${weatherForecastPoint.windSpeed ?? "unavailable"} km/h (gusts ${weatherForecastPoint.windGusts ?? "unavailable"} km/h), cloud cover ${weatherForecastPoint.cloudCover ?? "unavailable"}%, UV index ${weatherForecastPoint.uvIndex ?? "unavailable"}, and visibility ${weatherForecastPoint.visibility == null ? "unavailable" : `${(weatherForecastPoint.visibility / 1000).toFixed(1)} km`}.`
        : `No Open-Meteo hourly weather forecast is available for the selected ${forecastHours}-hour horizon.`,
      spokenBody: "This is a public numerical weather-model forecast, not a municipal warning or direct sensor reading.",
      confidence: null,
    };

    return [population, traffic, water, energy, scenarioAirQuality, airQuality, weather, resilience];
  }, [city.dataMode, city.metrics.energyUsage.value, city.metrics.population.display, city.metrics.population.value, city.metrics.traffic.value, city.metrics.waterDemand.value, city.name, forecastHours, forecastPoint, scenarioOutlook, scenarioYear, telemetry.aqi.current, telemetry.aqi.pm25, weatherForecastPoint]);

  const generateReport = () => {
    const currentAqi = telemetry.aqi.current;
    const projectedAqi = forecastPoint?.aqi ?? null;
    const reportMetrics = [
      {
        label: "Air quality (US AQI)",
        unit: "AQI",
        baseline: currentAqi == null ? "Unavailable" : Math.round(currentAqi),
        projected: projectedAqi == null ? "Unavailable" : Math.round(projectedAqi),
        change: currentAqi == null || projectedAqi == null ? "Unavailable" : Math.round(projectedAqi - currentAqi),
        changePercent: currentAqi == null || projectedAqi == null || currentAqi === 0
          ? null
          : Number((((projectedAqi - currentAqi) / currentAqi) * 100).toFixed(1)),
      },
      {
        label: "Air temperature",
        unit: "°C",
        baseline: telemetry.weather.temperature ?? "Unavailable",
        projected: weatherForecastPoint?.temperature ?? "Unavailable",
        change: telemetry.weather.temperature == null || weatherForecastPoint?.temperature == null
          ? "Unavailable"
          : Number((weatherForecastPoint.temperature - telemetry.weather.temperature).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Apparent temperature",
        unit: "°C",
        baseline: telemetry.weather.apparentTemperature ?? "Unavailable",
        projected: weatherForecastPoint?.apparentTemperature ?? "Unavailable",
        change: telemetry.weather.apparentTemperature == null || weatherForecastPoint?.apparentTemperature == null
          ? "Unavailable"
          : Number((weatherForecastPoint.apparentTemperature - telemetry.weather.apparentTemperature).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Relative humidity",
        unit: "%",
        baseline: telemetry.weather.relativeHumidity ?? "Unavailable",
        projected: weatherForecastPoint?.relativeHumidity ?? "Unavailable",
        change: telemetry.weather.relativeHumidity == null || weatherForecastPoint?.relativeHumidity == null
          ? "Unavailable"
          : Number((weatherForecastPoint.relativeHumidity - telemetry.weather.relativeHumidity).toFixed(0)),
        changePercent: null,
      },
      {
        label: "Wind gusts",
        unit: "km/h",
        baseline: telemetry.weather.windGusts ?? "Unavailable",
        projected: weatherForecastPoint?.windGusts ?? "Unavailable",
        change: telemetry.weather.windGusts == null || weatherForecastPoint?.windGusts == null
          ? "Unavailable"
          : Number((weatherForecastPoint.windGusts - telemetry.weather.windGusts).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Cloud cover",
        unit: "%",
        baseline: telemetry.weather.cloudCover ?? "Unavailable",
        projected: weatherForecastPoint?.cloudCover ?? "Unavailable",
        change: telemetry.weather.cloudCover == null || weatherForecastPoint?.cloudCover == null
          ? "Unavailable"
          : Number((weatherForecastPoint.cloudCover - telemetry.weather.cloudCover).toFixed(0)),
        changePercent: null,
      },
      {
        label: "UV index",
        unit: "",
        baseline: telemetry.weather.uvIndex ?? "Unavailable",
        projected: weatherForecastPoint?.uvIndex ?? "Unavailable",
        change: telemetry.weather.uvIndex == null || weatherForecastPoint?.uvIndex == null
          ? "Unavailable"
          : Number((weatherForecastPoint.uvIndex - telemetry.weather.uvIndex).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Mean sea-level pressure",
        unit: "hPa",
        baseline: telemetry.weather.pressure ?? "Unavailable",
        projected: weatherForecastPoint?.pressure ?? "Unavailable",
        change: telemetry.weather.pressure == null || weatherForecastPoint?.pressure == null
          ? "Unavailable"
          : Number((weatherForecastPoint.pressure - telemetry.weather.pressure).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Visibility",
        unit: "m",
        baseline: telemetry.weather.visibility ?? "Unavailable",
        projected: weatherForecastPoint?.visibility ?? "Unavailable",
        change: telemetry.weather.visibility == null || weatherForecastPoint?.visibility == null
          ? "Unavailable"
          : Number((weatherForecastPoint.visibility - telemetry.weather.visibility).toFixed(0)),
        changePercent: null,
      },
      {
        label: "Precipitation probability",
        unit: "%",
        baseline: "Unavailable",
        projected: weatherForecastPoint?.precipitationProbability ?? "Unavailable",
        change: "Unavailable",
        changePercent: null,
      },
      {
        label: "Hourly precipitation",
        unit: "mm",
        baseline: telemetry.weather.precipitation ?? "Unavailable",
        projected: weatherForecastPoint?.precipitation ?? "Unavailable",
        change: telemetry.weather.precipitation == null || weatherForecastPoint?.precipitation == null
          ? "Unavailable"
          : Number((weatherForecastPoint.precipitation - telemetry.weather.precipitation).toFixed(1)),
        changePercent: null,
      },
      {
        label: "Wind speed",
        unit: "km/h",
        baseline: telemetry.weather.windSpeed ?? "Unavailable",
        projected: weatherForecastPoint?.windSpeed ?? "Unavailable",
        change: telemetry.weather.windSpeed == null || weatherForecastPoint?.windSpeed == null
          ? "Unavailable"
          : Number((weatherForecastPoint.windSpeed - telemetry.weather.windSpeed).toFixed(1)),
        changePercent: null,
      },
    ];
    const forecastTimestamp = weatherForecastPoint?.time || forecastPoint?.time || null;
    const weatherForecastSummary = weatherForecastPoint
      ? `For ${new Date(weatherForecastPoint.timestamp).toLocaleString()}, the weather model indicates ${weatherForecastPoint.condition.toLowerCase()} conditions: ${weatherForecastPoint.temperature ?? "unavailable"}°C, feels like ${weatherForecastPoint.apparentTemperature ?? "unavailable"}°C, humidity ${weatherForecastPoint.relativeHumidity ?? "unavailable"}%, precipitation chance ${weatherForecastPoint.precipitationProbability ?? "unavailable"}%, wind ${weatherForecastPoint.windSpeed ?? "unavailable"} km/h with gusts ${weatherForecastPoint.windGusts ?? "unavailable"} km/h, cloud cover ${weatherForecastPoint.cloudCover ?? "unavailable"}%, and UV index ${weatherForecastPoint.uvIndex ?? "unavailable"}.`
      : `The hourly weather forecast for the selected ${forecastHours}-hour horizon is unavailable.`;
    const elevatedRainWatch = weatherForecastPoint?.precipitationProbability >= 70
      ? [{
          title: "Elevated precipitation probability",
          severity: "WATCH",
          currentLevel: telemetry.weather.precipitation == null ? "Unavailable" : `${telemetry.weather.precipitation} mm current precipitation`,
          predictedLevel: `${weatherForecastPoint.precipitationProbability}% probability`,
          cause: "Open-Meteo hourly weather model; this is not an official severe-weather warning.",
        }]
      : [];
    const weatherRiskWatches = [
      ...(weatherForecastPoint?.windGusts >= 60
        ? [{
            title: "High modelled wind gusts",
            severity: "WATCH",
            currentLevel: telemetry.weather.windGusts == null ? "Unavailable" : `${telemetry.weather.windGusts} km/h`,
            predictedLevel: `${weatherForecastPoint.windGusts} km/h`,
            cause: "Open-Meteo hourly weather model; this is not an official severe-weather warning.",
          }]
        : []),
      ...(weatherForecastPoint?.uvIndex >= 8
        ? [{
            title: "Very high modelled UV index",
            severity: "WATCH",
            currentLevel: telemetry.weather.uvIndex == null ? "Unavailable" : String(telemetry.weather.uvIndex),
            predictedLevel: String(weatherForecastPoint.uvIndex),
            cause: "Open-Meteo hourly weather model.",
          }]
        : []),
    ];
    const nextReport = {
      city: city.name,
      region: city.state || city.country,
      generatedAt: new Date().toISOString(),
      simulation: "Open-Meteo public weather and air-quality forecasts",
      model: "Open-Meteo numerical weather and atmospheric models",
      targetYear: forecastTimestamp || `${forecastHours}-hour forecast`,
      targetTime: forecastTimestamp,
      baselineYear: "Current",
      validityYear: forecastTimestamp || "Unavailable",
      dataClassification: "Public modelled weather and air-quality forecasts; not direct city sensors",
      source: "Hourly weather and atmospheric model forecasts retrieved from Open-Meteo. Provider update cadence applies.",
      executiveSummary: `${weatherForecastSummary} ${projectedAqi == null
        ? "Air-quality forecast is unavailable for the selected period."
        : `The model forecasts ${Math.round(projectedAqi)} US AQI around ${new Date(forecastPoint.timestamp).toLocaleString()}.`} Population, traffic, water, and electricity also have bundled annual scenario projections${scenarioOutlook ? ` for ${scenarioYear}` : ""}; those illustrative values are not real-time forecasts. Verified city-specific live feeds are not configured.`,
      metrics: reportMetrics,
      scenarioProjection: scenarioOutlook ? {
        year: Number(scenarioYear),
        change: scenarioOutlook.change,
        source: city.dataMode === "illustrative"
          ? "Bundled reference-city scenario profile"
          : "Bundled illustrative city scenario profile",
        metrics: scenarioMetrics.map(({ label, value }) => ({ label, value })),
      } : null,
      indicators: predictions.map((prediction) => ({
        title: prediction.title,
        category: prediction.category,
        riskLevel: prediction.riskLevel,
        confidence: null,
        outcome: prediction.futureOutcome,
      })),
      problems: [
        ...(currentAqi != null && currentAqi >= 151
          ? [{ title: "Elevated air-quality reading", severity: "HIGH", currentLevel: `${Math.round(currentAqi)} US AQI`, predictedLevel: projectedAqi == null ? "Unavailable" : `${Math.round(projectedAqi)} US AQI`, cause: "Public atmospheric model output; confirm against a local regulatory monitoring station." }]
          : []),
        ...elevatedRainWatch,
        ...weatherRiskWatches,
        ...["Population", "Traffic", "Water", "Electricity grid"].map((indicator) => ({
          title: `${indicator} live data coverage gap`,
          severity: "DATA GAP",
          currentLevel: "No verified live feed",
          predictedLevel: "Not calculated",
          cause: `A verified real-time ${indicator.toLowerCase()} provider is not connected for this city. Annual scenario values, when available, are illustrative only.`,
        })),
      ],
      solutions: [
        {
          title: "Verify air-quality conditions",
          signal: "Compare public model estimates with local regulatory monitoring stations.",
          action: "Use official station observations for operational decisions and retain the model forecast as supplementary planning context.",
        },
        {
          title: "Use weather forecasts for short-range preparedness",
          signal: "Precipitation, wind, UV, temperature, and visibility are forecast model outputs, not official warnings.",
          action: "Use local meteorological and emergency-management advisories for decisions requiring verified alerts; refresh this forecast before acting.",
        },
        {
          title: "Connect city-specific data providers",
          signal: "Verified short-range population, traffic, water, electricity, and resilience feeds are not connected.",
          action: "Integrate official transport, statistics, water utility, grid-operator, and emergency-management feeds before presenting annual illustrative scenarios as operational forecasts.",
        },
      ],
      disclaimer: `Weather and air-quality values are numerical model estimates from Open-Meteo, not verified municipal observations or official warnings. ${scenarioOutlook ? `The ${scenarioYear} city scenario and its planning milestone use bundled illustrative values, not validated predictions or live data. ` : ""}Authoritative real-time feeds for population, traffic, water, and electricity are unavailable. This short-range outlook applies only to the timestamp shown and is not a long-term forecast.`,
    };
    setGeneratedReport(nextReport);
    if (currentUser?.authType === "user") {
      const archived = archivePredictionReport(nextReport, currentUser, "report");
      setReportNotice(archived
        ? "City forecast report generated and saved in the admin section under your user name."
        : "The report was generated, but its admin copy could not be saved in this browser.");
    } else {
      setReportNotice("City forecast report generated. No user archive was created for this account.");
    }
  };

  const downloadReport = (format) => {
    if (!generatedReport) return;

    let contents;
    let mimeType;
    let extension;
    if (format === "json") {
      contents = JSON.stringify(generatedReport, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const headers = ["city", "baseline_year", "target_year", "indicator", "unit", "baseline", "projected", "change", "change_percent"];
      const rows = generatedReport.metrics.map((metric) => [
        generatedReport.city,
        generatedReport.baselineYear,
        generatedReport.targetYear,
        metric.label,
        metric.unit,
        metric.baseline,
        metric.projected,
        metric.change,
        metric.changePercent ?? "",
      ]);
      const scenarioRows = (generatedReport.scenarioProjection?.metrics || []).map((metric) => [
        generatedReport.city,
        "Illustrative scenario",
        generatedReport.scenarioProjection.year,
        metric.label,
        "",
        "Not available",
        metric.value,
        "Not calculated",
        "",
      ]);
      contents = [headers, ...rows, ...scenarioRows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8";
      extension = "csv";
    }

    const file = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${generatedReport.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prediction-${generatedReport.targetYear}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (currentUser?.authType === "user") {
      const archived = archivePredictionReport(generatedReport, currentUser, format);
      setReportNotice(archived
        ? `A copy of this ${format.toUpperCase()} report was saved for admin review.`
        : "The report downloaded, but its admin copy could not be saved in this browser.");
    }
  };

  const downloadPdfReport = async () => {
    if (!generatedReport) return;

    try {
      const { jsPDF } = await import("jspdf");
      const logoResponse = await fetch(YugNirmanMark);
      if (!logoResponse.ok) throw new Error("The project logo could not be loaded.");
      const logoBlob = new Blob([await logoResponse.text()], { type: "image/svg+xml" });
      const logoUrl = URL.createObjectURL(logoBlob);
      const logoImage = new Image();
      logoImage.src = logoUrl;
      await logoImage.decode();
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = 128;
      logoCanvas.height = 128;
      const logoContext = logoCanvas.getContext("2d");
      if (!logoContext) throw new Error("The project logo could not be rendered.");
      logoContext.drawImage(logoImage, 0, 0, 128, 128);
      const logoPng = logoCanvas.toDataURL("image/png");
      URL.revokeObjectURL(logoUrl);

      const documentPdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = documentPdf.internal.pageSize.getWidth();
      const pageHeight = documentPdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = 20;

      const ensureSpace = (height) => {
        if (cursorY + height <= pageHeight - 18) return;
        documentPdf.addPage();
        cursorY = 18;
      };
      const addText = (value, { fontSize = 10, color = [43, 56, 64], bold = false, indent = 0, gap = 2 } = {}) => {
        documentPdf.setFont("helvetica", bold ? "bold" : "normal");
        documentPdf.setFontSize(fontSize);
        documentPdf.setTextColor(...color);
        const lines = documentPdf.splitTextToSize(String(value ?? ""), contentWidth - indent);
        const lineHeight = fontSize * 0.48;
        lines.forEach((line) => {
          ensureSpace(lineHeight);
          documentPdf.text(line, margin + indent, cursorY);
          cursorY += lineHeight;
        });
        cursorY += gap;
      };
      const addSection = (title) => {
        ensureSpace(11);
        cursorY += 3;
        documentPdf.setDrawColor(112, 226, 208);
        documentPdf.setLineWidth(0.6);
        documentPdf.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 7;
        addText(title, { fontSize: 13, color: [16, 48, 39], bold: true, gap: 3 });
      };

      documentPdf.setFillColor(112, 226, 208);
      documentPdf.roundedRect(margin, cursorY - 4, 18, 18, 2, 2, "F");
      documentPdf.addImage(logoPng, "PNG", margin + 1, cursorY - 3, 16, 16);
      documentPdf.setFont("helvetica", "bold");
      documentPdf.setFontSize(15);
      documentPdf.setTextColor(16, 32, 27);
      documentPdf.text("YUG NIRMAN", margin + 23, cursorY + 3);
      documentPdf.setFont("helvetica", "normal");
      documentPdf.setFontSize(8);
      documentPdf.setTextColor(76, 95, 86);
      documentPdf.text("AI FUTURE CITY SIMULATOR • 3D CITY DIGITAL TWIN", margin + 23, cursorY + 9);
      cursorY += 23;

      addText(`${generatedReport.city} City Forecast Report`, { fontSize: 19, color: [16, 32, 27], bold: true, gap: 2 });
      addText(`Generated: ${new Date(generatedReport.generatedAt).toLocaleString()}`, { fontSize: 9, color: [84, 101, 109] });
      addText(`City: ${generatedReport.city}  |  Region: ${generatedReport.region}  |  Simulation: ${generatedReport.simulation}`, { fontSize: 9, color: [84, 101, 109] });
      addText(`View: ${generatedReport.view}  |  Report Status: ${generatedReport.reportStatus}  |  Validity Year: ${generatedReport.validityYear ?? generatedReport.targetYear}  |  Data: ${generatedReport.dataClassification}`, { fontSize: 9, color: [84, 101, 109], gap: 4 });
      addText(generatedReport.executiveSummary, { fontSize: 10, color: [50, 62, 72], gap: 6 });

      const summaryCards = [
        ...generatedReport.metrics.slice(0, 6).map((metric) => [
          metric.label,
          `${metric.projected} ${metric.unit}`.trim(),
        ]),
      ];

      const cardWidth = (contentWidth - 12) / 3;
      summaryCards.forEach(([label, value], index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = margin + col * (cardWidth + 6);
        const y = cursorY + row * 22;
        documentPdf.setFillColor(241, 248, 250);
        documentPdf.roundedRect(x, y, cardWidth, 18, 2, 2, "F");
        documentPdf.setDrawColor(191, 219, 254);
        documentPdf.setLineWidth(0.2);
        documentPdf.roundedRect(x, y, cardWidth, 18, 2, 2, "S");
        documentPdf.setFont("helvetica", "bold");
        documentPdf.setFontSize(7);
        documentPdf.setTextColor(82, 94, 111);
        documentPdf.text(label, x + 4, y + 7);
        documentPdf.setFont("helvetica", "bold");
        documentPdf.setFontSize(10);
        documentPdf.setTextColor(15, 23, 42);
        documentPdf.text(String(value), x + 4, y + 14);
      });
      cursorY += 70;

      addSection("AI PREDICTION SUMMARY");
      const predictionPairs = generatedReport.metrics.slice(0, 4).map((metric) => [
        metric.label,
        `${metric.baseline} ${metric.unit} → ${metric.projected} ${metric.unit}`.trim(),
      ]);
      predictionPairs.forEach(([label, value]) => {
        addText(`${label}: ${value}`, { fontSize: 9, gap: 2 });
      });

      addSection("PREDICTION DETAILS");
      (generatedReport.predictionDetails || generatedReport.metrics).forEach((metric) => {
        const changeText = metric.change == null ? "N/A" : `${metric.change > 0 ? "+" : ""}${metric.change}`;
        const percentText = metric.changePercent == null ? "N/A" : `${metric.changePercent > 0 ? "+" : ""}${metric.changePercent}%`;
        const unit = metric.unit || "";
        addText(`${metric.label}: ${metric.baseline} ${unit} (${generatedReport.baselineYear}) -> ${metric.projected ?? metric.baseline} ${unit} (${generatedReport.targetYear}); change ${changeText} ${unit} (${percentText})`, { fontSize: 9, gap: 2 });
      });

      addSection("MODEL & PREDICTION TRANSPARENCY");
      const modelDetails = typeof generatedReport.model === "object"
        ? generatedReport.model
        : { name: generatedReport.model };
      addText(`Model: ${modelDetails.name || "Not available"}`, { fontSize: 9, gap: 1 });
      addText(`Prediction Horizon: ${modelDetails.horizon || generatedReport.targetYear || "Not available"}`, { fontSize: 9, gap: 1 });
      addText(`Input Features: ${modelDetails.inputFeatures ?? "Not reported"}`, { fontSize: 9, gap: 1 });
      addText(`Training Data: ${modelDetails.trainingData || generatedReport.source || "Not reported"}`, { fontSize: 9, gap: 1 });
      addText(`Prediction Confidence: ${modelDetails.predictionConfidence || "Not validated"}`, { fontSize: 9, gap: 1 });
      addText(`Validity Year: ${generatedReport.validityYear ?? generatedReport.targetYear}`, { fontSize: 9, gap: 3 });
      addText("Evaluation metrics are not available for this provider forecast.", { fontSize: 8, gap: 2 });

      addSection("PROBLEMS IDENTIFIED");
      (generatedReport.problems || generatedReport.risks || []).forEach((problem, index) => {
        const title = problem.title || problem.risk || `Problem ${index + 1}`;
        const severity = problem.severity || "MODERATE";
        const current = problem.currentLevel || problem.currentValue || "N/A";
        const predicted = problem.predictedLevel || problem.predictedValue || "N/A";
        const cause = problem.cause || problem.primaryCause || "Not available";
        addText(`${index + 1}. ${title} | Severity: ${severity} | Current: ${current} | Predicted: ${predicted} | Cause: ${cause}`, { fontSize: 9, gap: 1 });
      });

      addSection("AI RISK ANALYSIS");
      (generatedReport.risks || []).forEach((risk) => {
        addText(`${risk.risk}: ${risk.currentLevel} → ${risk.predictedLevel} | Severity: ${risk.severity} | Primary Cause: ${risk.primaryCause}`, { fontSize: 9, gap: 1 });
      });

      addSection("AI REDUNDANCY ANALYSIS");
      (generatedReport.redundancy || []).forEach((entry) => {
        addText(`${entry.id} | ${entry.category} | ${entry.zone} | ${entry.level} | Evidence: ${entry.evidence}`, { fontSize: 8, gap: 1 });
      });
      if (generatedReport.redundancy?.length === 0 || !generatedReport.redundancy) {
        addText("No redundancy analysis is included in this public weather and air-quality report.", { fontSize: 8, gap: 2 });
      }

      if (generatedReport.scenarioProjection) {
        addSection(`ILLUSTRATIVE CITY SCENARIO · ${generatedReport.scenarioProjection.year}`);
        addText(`Source: ${generatedReport.scenarioProjection.source}. Scenario change vs 2026: ${generatedReport.scenarioProjection.change}.`, { fontSize: 9 });
        generatedReport.scenarioProjection.metrics.forEach((metric) => {
          addText(`${metric.label}: ${metric.value}`, { fontSize: 9, gap: 1 });
        });
      }

      addSection("RECOMMENDED ACTION AREAS");
      generatedReport.solutions.forEach((solution, index) => {
        addText(`${index + 1}. ${solution.title}`, { fontSize: 10, color: [16, 72, 57], bold: true, gap: 1 });
        addText(`Forecast signal: ${solution.signal}`, { fontSize: 9, color: [68, 94, 85], indent: 4, gap: 1 });
        addText(solution.action, { fontSize: 9, indent: 4, gap: 3 });
      });

      addSection("LIMITATIONS");
      (generatedReport.limitations || [generatedReport.disclaimer]).forEach((item) => addText(item, { fontSize: 8, color: [84, 101, 109], gap: 1 }));
      for (let page = 1; page <= documentPdf.getNumberOfPages(); page += 1) {
        documentPdf.setPage(page);
        documentPdf.setFont("helvetica", "normal");
        documentPdf.setFontSize(8);
        documentPdf.setTextColor(100, 116, 110);
        documentPdf.text("YUG NIRMAN · Illustrative planning scenario", margin, pageHeight - 8);
        documentPdf.text(`${page} / ${documentPdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      const fileName = `${generatedReport.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prediction-${generatedReport.targetYear}.pdf`;
      documentPdf.save(fileName);
      if (currentUser?.authType === "user") {
        const archived = archivePredictionReport(generatedReport, currentUser, "pdf");
        setReportNotice(archived
          ? "The branded PDF was downloaded and a copy was saved for admin review."
          : "The PDF downloaded, but its admin copy could not be saved in this browser.");
      }
    } catch (error) {
      setReportNotice(error instanceof Error ? `PDF export failed: ${error.message}` : "PDF export failed. Please try again.");
    }
  };

  const printReport = () => {
    if (!generatedReport) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setReportNotice("The print window was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
    const metricRows = generatedReport.metrics.map((metric) => `
      <tr><td>${escapeHtml(metric.label)}</td><td>${metric.baseline} ${escapeHtml(metric.unit)}</td><td>${metric.projected} ${escapeHtml(metric.unit)}</td><td>${metric.change > 0 ? "+" : ""}${metric.change} ${escapeHtml(metric.unit)}</td><td>${metric.changePercent == null ? "N/A" : `${metric.changePercent > 0 ? "+" : ""}${metric.changePercent}%`}</td></tr>
    `).join("");
    const scenarioBlock = generatedReport.scenarioProjection
      ? `<h2>Illustrative city scenario · ${generatedReport.scenarioProjection.year}</h2><p>${escapeHtml(generatedReport.scenarioProjection.source)} · Scenario change vs 2026: ${escapeHtml(generatedReport.scenarioProjection.change)} · Not real-time or validated data.</p><table><thead><tr><th>Indicator</th><th>Scenario value</th></tr></thead><tbody>${generatedReport.scenarioProjection.metrics.map((metric) => `<tr><td>${escapeHtml(metric.label)}</td><td>${escapeHtml(metric.value)}</td></tr>`).join("")}</tbody></table>`
      : "";
    const indicatorRows = generatedReport.indicators.map((indicator) => `
      <article><h3>${escapeHtml(indicator.title)}</h3><p>${escapeHtml(indicator.outcome)}</p><small>${escapeHtml(indicator.category)} · ${escapeHtml(indicator.riskLevel)} · Confidence: ${indicator.confidence == null ? "N/A" : `${indicator.confidence}%`}</small></article>
    `).join("");
    const solutionRows = generatedReport.solutions.map((solution) => `
      <article><h3>${escapeHtml(solution.title)}</h3><small>Forecast signal: ${escapeHtml(solution.signal)}</small><p>${escapeHtml(solution.action)}</p></article>
    `).join("");
    const problemRows = (generatedReport.problems || generatedReport.risks || []).map((problem, index) => {
      const title = problem.title || problem.risk || `Problem ${index + 1}`;
      const severity = problem.severity || "MODERATE";
      const current = problem.currentLevel || problem.currentValue || "N/A";
      const predicted = problem.predictedLevel || problem.predictedValue || "N/A";
      const cause = problem.cause || problem.primaryCause || "Not available";
      return `<article><h3>${escapeHtml(title)}</h3><p><strong>Severity:</strong> ${escapeHtml(severity)} · <strong>Current:</strong> ${escapeHtml(current)} · <strong>Predicted:</strong> ${escapeHtml(predicted)}</p><p><strong>Cause:</strong> ${escapeHtml(cause)}</p></article>`;
    }).join("");

    printWindow.onload = () => printWindow.print();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(generatedReport.city)} Prediction Report</title><style>
      body{font:14px/1.5 Arial,sans-serif;color:#17212b;margin:36px auto;max-width:920px;padding:0 24px}.brand{display:flex;align-items:center;gap:12px;padding-bottom:16px;margin-bottom:22px;border-bottom:2px solid #70e2d0}.brand img{width:46px;height:46px;padding:5px;border-radius:9px;background:#70e2d0}.brand strong{display:block;color:#10201b;font-size:17px;letter-spacing:.08em}.brand span{display:block;color:#52616d;font-size:10px;letter-spacing:.12em}h1{font-size:28px;margin:0 0 6px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ccd5dc;padding-bottom:7px}.meta{color:#52616d;font-size:12px}.notice{padding:12px;background:#f2f7f8;border-left:4px solid #087e8b;margin:18px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;border-bottom:1px solid #d8e0e5;padding:9px 7px}th{background:#f2f5f7}article{padding:10px 0;border-bottom:1px solid #e1e6e9;break-inside:avoid}article h3{font-size:14px;margin:4px 0}article p{margin:5px 0}small{color:#52616d}.disclaimer{margin-top:24px;padding-top:12px;border-top:1px solid #ccd5dc;color:#52616d;font-size:11px}.footer{margin-top:22px;color:#52616d;font-size:10px;text-align:center}@media print{body{margin:0 auto;padding:0 12px}}
    </style></head><body><header class="brand"><img src="${escapeHtml(YugNirmanMark)}" alt=""><div><strong>YUG NIRMAN</strong><span>AI FUTURE CITY SIMULATOR · FUTURE PLANNING REPORT</span></div></header><h1>${escapeHtml(generatedReport.city)} Prediction Report</h1><div class="meta">Horizon: ${generatedReport.targetYear} · Baseline: ${generatedReport.baselineYear} · Validity Year: ${generatedReport.validityYear ?? generatedReport.targetYear} · ${escapeHtml(generatedReport.model)} · Generated ${escapeHtml(new Date(generatedReport.generatedAt).toLocaleString())}</div><div class="notice">${escapeHtml(generatedReport.source)} Active scenario event: ${escapeHtml(generatedReport.activeEvent || "none")}.</div><h2>Prediction details</h2><table><thead><tr><th>Indicator</th><th>${generatedReport.baselineYear} baseline</th><th>${generatedReport.targetYear} projection</th><th>Change</th><th>Change %</th></tr></thead><tbody>${metricRows}</tbody></table>${scenarioBlock}<h2>Problems identified</h2>${problemRows}<h2>Solutions</h2>${solutionRows}<h2>Prediction notes</h2>${indicatorRows}<p class="disclaimer">${escapeHtml(generatedReport.disclaimer)}</p><p class="footer">YUG NIRMAN · AI Future City Simulator</p></body></html>`);
    printWindow.document.close();
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Demographics & Density":
        return Users;
      case "Mobility & Congestion":
        return Car;
      case "Hydrology & Water Reserves":
        return Droplet;
      case "Energy Grid & Microgrids":
        return Zap;
      case "Environmental Quality & Climate":
        return Wind;
      case "Weather and Climate":
        return CloudRain;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6">
      {reportOnly ? (
        <PageHeader
          title="REPORT GENERATION"
          subtitle={`Create a live-data assessment for ${city.name}`}
          icon={FileText}
          badge="City report"
        />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="FUTURE CITY PREDICTIONS"
            subtitle="Short-range forecasts grounded in connected live public data"
            icon={Sparkles}
            badge="Live data outlook"
          />

      <div className="flex flex-col gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-4 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-cyan-200">Connected sources: Open-Meteo weather and air quality</p>
          <p className="mt-1 text-slate-400">
            Forecasts currently available: temperature, precipitation chance and amount, wind, weather conditions, and modelled air quality. Population, traffic, water, electricity-grid, and resilience predictions require verified city-specific feeds.
          </p>
          {liveWeather && (
            <p className="mt-1 text-slate-300">
              Current model conditions: {telemetry.weather.condition} · {telemetry.weather.temperature ?? "N/A"}°C · feels like {telemetry.weather.apparentTemperature ?? "N/A"}°C · humidity {telemetry.weather.relativeHumidity ?? "N/A"}% · wind {telemetry.weather.windSpeed ?? "N/A"} km/h · UV {telemetry.weather.uvIndex ?? "N/A"} · {telemetry.weather.observedAt || "time unavailable"}
            </p>
          )}
          {liveWeatherError && <p className="mt-1 text-amber-200">{liveWeatherError}</p>}
          {liveAirQualityError && <p className="mt-1 text-amber-200">{liveAirQualityError}</p>}
        </div>
        <button
          type="button"
          onClick={refreshLiveData}
          className="min-h-9 shrink-0 rounded-md border border-cyan-400/30 px-3 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/10"
        >
          Refresh live data
        </button>
      </div>

      {/* Live source status */}
      {false && (
        <>
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 pb-4 border-b border-cyan-500/15">
          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl border ${
              isStreaming
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-amber-500/15 border-amber-500/40 text-amber-400"
            }`}>
              <Activity className="w-5 h-5 animate-pulse" />
              {isStreaming && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-wide">
                  SIMULATED SCENARIO INPUTS
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  isStreaming
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}>
                  {isStreaming ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}
                </span>
                {activeEvent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> EVENT ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthetic scenario values update locally; no live IoT sensor feed is connected for {city.name}.
              </p>
            </div>
          </div>

          {/* Stream Controls & Anomaly Injection */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isStreaming
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
              }`}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isStreaming ? "Pause Stream" : "Resume Stream"}</span>
            </button>

            <button
              onClick={() => setShowLogTerminal(!showLogTerminal)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogTerminal ? "Hide Scenario Log" : "Scenario Log"}</span>
            </button>
          </div>
        </div>

        {/* Synthetic scenario input values */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 relative z-10">
          {/* Traffic */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <Car className="w-3.5 h-3.5" /> Traffic Scenario
              </span>
              <span className="font-mono text-[10px] text-slate-400">{telemetry.traffic.speed} km/h</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">
                {telemetry.traffic.current}%
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                telemetry.traffic.delta >= 0 ? "text-rose-400" : "text-emerald-400"
              }`}>
                {telemetry.traffic.delta >= 0 ? `+${telemetry.traffic.delta}%` : `${telemetry.traffic.delta}%`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              Status: <span className="text-rose-300">{telemetry.traffic.status}</span>
            </span>
          </div>

          {/* AQI */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Wind className="w-3.5 h-3.5" /> Air Quality
              </span>
              <span className="font-mono text-[10px] text-slate-400">Simulated PM2.5: {telemetry.aqi.pm25}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">
                {telemetry.aqi.current}
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                telemetry.aqi.delta >= 0 ? "text-amber-400" : "text-emerald-400"
              }`}>
                {telemetry.aqi.delta >= 0 ? `+${telemetry.aqi.delta}` : `${telemetry.aqi.delta}`} AQI
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              Status: <span className="text-amber-300">{telemetry.aqi.status}</span>
            </span>
          </div>

          {/* Energy */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                <Zap className="w-3.5 h-3.5" /> Grid Load
              </span>
              <span className="font-mono text-[10px] text-slate-400">{telemetry.energy.loadMw} MW</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">
                {telemetry.energy.current}%
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                telemetry.energy.delta >= 0 ? "text-cyan-400" : "text-emerald-400"
              }`}>
                {telemetry.energy.delta >= 0 ? `+${telemetry.energy.delta}%` : `${telemetry.energy.delta}%`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              Status: <span className="text-cyan-300">{telemetry.energy.status}</span>
            </span>
          </div>

          {/* Water */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-blue-400 font-semibold">
                <Droplet className="w-3.5 h-3.5" /> Water Stress
              </span>
              <span className="font-mono text-[10px] text-slate-400">{telemetry.water.reserveMl} ML</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">
                {telemetry.water.current}%
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                telemetry.water.delta >= 0 ? "text-blue-400" : "text-emerald-400"
              }`}>
                {telemetry.water.delta >= 0 ? `+${telemetry.water.delta}%` : `${telemetry.water.delta}%`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              Status: <span className="text-blue-300">{telemetry.water.status}</span>
            </span>
          </div>

          {/* Telemetry Stream Health */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 hover:border-purple-500/40 transition-all col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-purple-400 font-semibold">
                <Wifi className="w-3.5 h-3.5" /> Simulation Runtime
              </span>
              <span className="font-mono text-[10px] text-emerald-400">{telemetry.inferenceLatency}ms</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">
                {telemetry.packetsReceived.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-slate-400">pkts</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
              Sync: <span className="text-purple-300 font-mono">{telemetry.lastUpdate}</span>
            </span>
          </div>
        </div>

        {/* Interactive scenario injection buttons */}
        <div className="mt-4 pt-3 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-slate-200">Try a scenario:</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">(Synthetic inputs only)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => injectEvent("traffic_surge")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeEvent === "traffic_surge"
                  ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30"
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Rush-Hour Traffic (+14%)</span>
            </button>

            <button
              onClick={() => injectEvent("heatwave_peak")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeEvent === "heatwave_peak"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30"
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Heatwave Grid Spike (+12%)</span>
            </button>

            <button
              onClick={() => injectEvent("monsoon_flood")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeEvent === "monsoon_flood"
                  ? "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30"
              }`}
            >
              <CloudRain className="w-3 h-3" />
              <span>Monsoon Cloudburst (+12%)</span>
            </button>

            <button
              onClick={() => injectEvent("green_transition")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeEvent === "green_transition"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              <Leaf className="w-3 h-3" />
              <span>EV Policy Surge (-18 AQI)</span>
            </button>

            {activeEvent && (
              <button
                onClick={() => injectEvent("reset")}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Baseline</span>
              </button>
            )}
          </div>
        </div>

        {/* Scenario log */}
        {showLogTerminal && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/95 border border-cyan-500/30 font-mono text-[11px] text-slate-300 shadow-inner max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Terminal className="w-3 h-3" /> SIMULATED SCENARIO LOG
              </span>
              <span className="text-amber-300">● SYNTHETIC INPUT</span>
            </div>
            <div className="space-y-1.5">
              {eventLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-500 select-none">[{log.time}]</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${
                    log.type === "alert"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : log.type === "recal"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  }`}>
                    {log.node}
                  </span>
                  <span className="text-slate-300 flex-1">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}

      {/* Horizon Slider Card */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-slate-900/80 via-purple-950/20 to-slate-900/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Forecast horizon
            </span>
            <h2 className="text-2xl font-extrabold text-white font-mono mt-0.5">
              Forecast window: {forecastHours} hours
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              The forecast window is limited to the connected provider’s short-range hourly outlook.
            </p>
          </div>

          <div className="flex-1 max-w-md">
            <input
              type="range"
              min="6"
              max="72"
              step="6"
              value={forecastHours}
              onChange={(event) => setForecastHours(Number.parseInt(event.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
              <span>6 hours</span>
              <span>24 hours</span>
              <span>48 hours</span>
              <span>72 hours</span>
            </div>
          </div>
        </div>
      </div>

      <section className="p-5 rounded-2xl glass-panel border border-amber-500/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Long-range stored-data projections</h3>
            <p className="mt-1 text-xs text-slate-400">
              Saved annual forecast profile for {city.name}; used when live city feeds are unavailable. These values are illustrative projections, not real-time measurements or validated forecasts.
              {city.dataMode === "illustrative" ? " This city uses a saved reference-city profile." : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span>Scenario year</span>
            <select
              value={scenarioYear}
              onChange={(event) => {
                const year = event.target.value;
                setSearchParams((currentParams) => {
                  const nextParams = new URLSearchParams(currentParams);
                  nextParams.set("year", year);
                  return nextParams;
                }, { replace: true });
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-cyan-200"
            >
              {SCENARIO_YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>

        {scenarioOutlook ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {scenarioMetrics.map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">{label}</span>
                  <Icon className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <p className="mt-3 text-lg font-bold font-mono text-white">{value}</p>
                <p className="mt-1 text-[10px] text-slate-500">Stored projection change vs 2026: {scenarioOutlook.change}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-400">
            No bundled scenario profile is available for {scenarioYear}. No substitute prediction is generated.
          </p>
        )}

        <p className="mt-3 text-[11px] text-amber-200/80">
          Saved annual population, traffic, air-quality, water, and energy projections appear in the matching outlook cards and serve as fallbacks when live city feeds are unavailable. They are not real-time measurements or validated forecasts.
        </p>
      </section>

      {/* Grid of prediction cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RadioTower className="w-4 h-4 text-cyan-400" />
              <span>FUTURE OUTLOOKS ({predictions.length} INDICATORS)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Weather and short-range air quality use available hourly model data. Annual air quality, population, mobility, water, and energy use the selected saved city forecast profile when verified live feeds are unavailable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {predictions.map((item) => {
            const Icon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                className="relative rounded-2xl glass-panel p-5 transition-all duration-300 flex flex-col justify-between border border-cyan-500/20 bg-slate-900/70 hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <div>
                  {/* Top Category, Step & Risk Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center">
                        0{item.step}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {item.category}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg uppercase ${
                        item.riskColor === "rose"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : item.riskColor === "amber"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : item.riskColor === "cyan"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {item.riskLevel}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="mt-3.5 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-400 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Horizon Target: <span className="text-cyan-400 font-mono font-semibold">{item.horizon}</span>
                      </p>
                    </div>
                  </div>

                  {/* Selected-year outcome */}
                  <div className="my-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">
                        {item.outlookLabel || `Outlook in ${forecastHours} hours`}
                      </span>
                      <span className="text-base font-extrabold font-mono text-cyan-300">
                        {item.stat}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 text-right max-w-[130px]">
                      {item.statDetail}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Future result</span>
                    <p className="mt-1 text-xs text-slate-200 leading-relaxed">{item.futureOutcome}</p>
                  </div>

                  {/* Prediction summary */}
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed font-sans">
                    {item.spokenBody}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <span className={`text-[10px] font-mono font-semibold flex items-center gap-1 ${
                    (item.id === "pred-aqi" && forecastPoint) || (item.id === "pred-weather" && weatherForecastPoint)
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }`}>
                    {(item.id === "pred-aqi" && forecastPoint) || (item.id === "pred-weather" && weatherForecastPoint)
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <AlertTriangle className="w-3 h-3" />}
                    <span>
                      {(item.id === "pred-aqi" && forecastPoint) || (item.id === "pred-weather" && weatherForecastPoint)
                        ? "Public hourly model forecast · not a local sensor observation"
                        : item.dataType === "milestone"
                          ? "Scenario-derived planning milestone · not a validated AI forecast"
                        : item.dataType === "scenario"
                          ? "Saved forecast profile used · live feed unavailable"
                        : "No verified live data source connected"}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live hourly weather and air-quality forecasts */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-cyan-500/15 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                LIVE HOURLY FORECASTS
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OPEN-METEO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Provider forecast values are shown without synthetic telemetry or long-range extrapolation.
            </p>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {liveDataLoading
              ? "Updating…"
              : telemetry.aqi.current == null
                ? "Live feed unavailable"
                : `Current AQI: ${Math.round(telemetry.aqi.current)}`}
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section aria-label="Hourly air-quality forecast">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200">Air quality · US AQI</h4>
            {dynamicProjectionData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dynamicProjectionData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} interval="preserveStartEnd" />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(56,189,248,0.3)", borderRadius: "0.75rem", fontSize: "11px" }} />
                    <Line type="monotone" name="Forecast US AQI" dataKey="aqi" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center text-xs text-slate-400">
                {liveAirQualityError || "Hourly air-quality forecast is unavailable."}
              </p>
            )}
          </section>

          <section aria-label="Hourly weather forecast">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">Weather · temperature and precipitation</h4>
            {weatherForecastData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weatherForecastData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} interval="preserveStartEnd" />
                    <YAxis yAxisId="temperature" stroke="#38bdf8" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="precipitation" orientation="right" domain={[0, 100]} stroke="#60a5fa" fontSize={10} tickLine={false} />
                    <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(56,189,248,0.3)", borderRadius: "0.75rem", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Line yAxisId="temperature" type="monotone" name="Temperature (°C)" dataKey="temperature" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line yAxisId="precipitation" type="monotone" name="Precipitation chance (%)" dataKey="precipitationProbability" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center text-xs text-slate-400">
                {liveWeatherError || "Hourly weather forecast is unavailable."}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Forecast notes and data requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>How these outlooks are calculated</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Short-range weather projections use Open-Meteo hourly temperature, apparent temperature, humidity, precipitation probability and amount, wind speed and gusts, cloud cover, UV index, pressure, and visibility. Air-quality projections use hourly US AQI. These are public model forecasts, not direct city sensor measurements. Population, traffic, water, and electricity indicators remain unavailable until verified city-specific feeds are connected.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-purple-500/30">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>What is needed for city-specific forecasts</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Historical population, traffic, energy, water, and air-quality measurements for the selected city.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Verified municipal or research datasets with dates, units, and documented sources.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Model validation against held-out observations before treating outputs as reliable predictions.</span>
            </li>
          </ul>
        </div>
      </div>
        </div>
      )}

      {reportOnly && (
      <section className="p-5 rounded-2xl glass-panel border border-emerald-500/25 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">City Forecast Report</h3>
              <p className="mt-1 text-xs text-slate-400">
                Live-data strategic assessment of {city.name}'s next {forecastHours} hours, including available forecasts, data gaps, solutions, and validity statements.
              </p>
            </div>
          </div>
          <button
            onClick={generateReport}
            className="shrink-0 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {generatedReport ? "Refresh report" : "Generate report"}
          </button>
        </div>

        {generatedReport && (
          <div className="mt-5 pt-5 border-t border-emerald-500/15">
            {reportNotice && (
              <p className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-100" role="status">
                {reportNotice}
              </p>
            )}

            <div className="mb-5 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/60">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#70e2d0]">
                    <img className="h-9 w-9" src={YugNirmanMark} alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#70e2d0]">YUG NIRMAN · CITY FORECAST REPORT</p>
                    <h4 className="truncate text-sm font-bold text-white">
                      {generatedReport.city} · {generatedReport.targetYear} Strategic Assessment
                    </h4>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                  Valid through: {generatedReport.validityYear ?? generatedReport.targetYear}
                </div>
              </div>

              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Executive Summary</h5>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{generatedReport.executiveSummary}</p>
                </article>

                <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Assessment Boundary and Validity</h5>
                  <ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-300">
                    <li><span className="font-semibold text-white">Model:</span> {generatedReport.model}</li>
                    <li><span className="font-semibold text-white">Forecast horizon:</span> {generatedReport.targetYear}</li>
                    <li><span className="font-semibold text-white">Valid through:</span> {generatedReport.validityYear ?? generatedReport.targetYear}</li>
                    <li><span className="font-semibold text-white">Data classification:</span> {generatedReport.dataClassification}</li>
                  </ul>
                </article>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700/70">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Indicator</th>
                    <th className="px-3 py-2.5 font-semibold">Baseline</th>
                    <th className="px-3 py-2.5 font-semibold">Projection</th>
                    <th className="px-3 py-2.5 font-semibold">Change</th>
                    <th className="px-3 py-2.5 font-semibold">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedReport.metrics.map((metric) => (
                    <tr key={metric.label} className="border-t border-slate-800 text-slate-200">
                      <td className="px-3 py-2.5 font-semibold">{metric.label}</td>
                      <td className="px-3 py-2.5 font-mono">{metric.baseline} {metric.unit}</td>
                      <td className="px-3 py-2.5 font-mono text-cyan-200">{metric.projected} {metric.unit}</td>
                      <td className="px-3 py-2.5 font-mono">{metric.change > 0 ? "+" : ""}{metric.change} {metric.unit}</td>
                      <td className="px-3 py-2.5 font-mono">{metric.changePercent == null ? "N/A" : `${metric.changePercent > 0 ? "+" : ""}${metric.changePercent}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {generatedReport.scenarioProjection && (
              <section className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200">
                  Illustrative city scenario · {generatedReport.scenarioProjection.year}
                </h5>
                <p className="mt-1 text-[10px] text-slate-400">
                  {generatedReport.scenarioProjection.source}; not real-time or validated data.
                  Scenario change vs 2026: {generatedReport.scenarioProjection.change}.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {generatedReport.scenarioProjection.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[10px] uppercase text-slate-400">{metric.label}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200">Forecast and Scenario Assessment</h5>
                <div className="mt-3 space-y-3">
                  {generatedReport.indicators.map((indicator) => (
                    <article key={indicator.title} className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <h6 className="text-[11px] font-bold text-white">{indicator.title}</h6>
                        <span className="shrink-0 text-[10px] font-mono text-emerald-300">
                          {indicator.confidence == null ? "N/A" : `${indicator.confidence}% confidence`}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{indicator.outcome}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200">Risk and Constraint Analysis</h5>
                <div className="mt-3 space-y-3">
                  {(generatedReport.problems || []).map((problem, index) => {
                    const title = problem.title || problem.risk || `Problem ${index + 1}`;
                    const severity = problem.severity || "MODERATE";
                    const current = problem.currentLevel || problem.currentValue || "N/A";
                    const predicted = problem.predictedLevel || problem.predictedValue || "N/A";
                    const cause = problem.cause || problem.primaryCause || "Not available";

                    return (
                      <article key={`${title}-${index}`} className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <h6 className="text-[11px] font-bold text-white">{index + 1}. {title}</h6>
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-200">{severity}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                          <span className="font-semibold text-white">Current state:</span> {current} · <span className="font-semibold text-white">Projected state:</span> {predicted}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          <span className="font-semibold text-slate-200">Primary cause:</span> {cause}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4" aria-labelledby="future-action-plan-title">
              <div className="mb-3">
                <h5 id="future-action-plan-title" className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">Strategic Intervention Framework</h5>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">The following measures are presented as formal planning actions for the projected conditions identified in this assessment.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {generatedReport.solutions.map((solution) => (
                  <article key={solution.title} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                    <h6 className="text-[11px] font-bold text-white">{solution.title}</h6>
                    <p className="mt-1 text-[10px] text-emerald-200">{solution.signal}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{solution.action}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <h5 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Formal Validity Statement</h5>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                {generatedReport.disclaimer} This assessment is intended for strategic scenario analysis and planning review only. It should not be interpreted as an official municipal forecast, legal determination, or verified operational projection.
              </p>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
};

export default FuturePredictions;
