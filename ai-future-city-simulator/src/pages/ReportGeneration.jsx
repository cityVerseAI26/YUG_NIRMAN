import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileJson2, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BrandMark from "../components/common/BrandMark";
import PageHeader from "../components/common/PageHeader";
import { useCity } from "../context/CityContext";
import useCurrentPopulationEstimate from "../hooks/useCurrentPopulationEstimate";
import { useRealTimePredictions } from "../hooks/useRealTimePredictions";
import { calculateCityHealth } from "../utils/cityHealthScore";
import { normalizeCityTransformation } from "../utils/cityTransformation";
import { getCityDiagnosis } from "../utils/cityDiagnosis";
import { summarizeReportDataGaps } from "../utils/reportDataGaps";
import { formatMetricPath, getUnrepresentedMetrics } from "../utils/reportMetricRegister";
import { buildReportSnapshot, flattenReportSnapshot } from "../utils/reportSnapshot";
import { archiveCityIntelligencePdf } from "../utils/predictionReportArchive";

const NO_SCENARIO = "No intervention or scenario was attached to this report.";

const displayValue = (value) => {
  if (value === null || value === undefined) return "Unavailable";
  if (typeof value === "number" && !Number.isFinite(value)) return "Unavailable";
  if (typeof value === "string" && !value.trim()) return "Unavailable";
  return String(value);
};

const humanizeLabel = (value) => String(value)
  .replace(/\[(\d+)\]/g, " item $1")
  .replace(/\./g, " · ")
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ")
  .replace(/\bapi\b/gi, "API")
  .replace(/\baqi\b/gi, "AQI")
  .replace(/\bid\b/gi, "ID")
  .replace(/\burl\b/gi, "URL")
  .replace(/\b\w/g, (character) => character.toUpperCase());

const ValueView = ({ value, label, initialOpen = false, expandAll = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [visibleCount, setVisibleCount] = useState(25);

  if (value === null || value === undefined) {
    return (
      <p className="text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">{humanizeLabel(label)}:</span> Unavailable
      </p>
    );
  }
  if (Array.isArray(value)) {
    return (
      <details
        className="rounded-lg border border-slate-200 bg-white p-3"
        open={expandAll || undefined}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          {humanizeLabel(label)} · {value.length} entr{value.length === 1 ? "y" : "ies"}
        </summary>
        {(isOpen || expandAll) && (
          value.length === 0
            ? <p className="mt-2 text-sm text-slate-600">No records are available in this report.</p>
            : (
              <>
                <div className="mt-3 space-y-2">
                  {value.slice(0, expandAll ? value.length : visibleCount).map((item, index) => (
                    <ValueView key={`${label}-${index}`} value={item} label={`[${index}]`} expandAll={expandAll} />
                  ))}
                </div>
                {!expandAll && value.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 25)}
                    className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-teal-800 hover:border-teal-500"
                  >
                    Show next {Math.min(25, value.length - visibleCount)} of {value.length - visibleCount} remaining
                  </button>
                )}
              </>
            )
        )}
      </details>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return <p className="text-xs text-slate-400">{label}: Unavailable</p>;
    return (
      <details
        className="rounded-lg border border-slate-200 bg-white p-3"
        open={isOpen || expandAll}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer break-words text-sm font-bold text-teal-900">
          {humanizeLabel(label)} · {entries.length} detail{entries.length === 1 ? "" : "s"}
        </summary>
        {(isOpen || expandAll) && (
          <dl className="mt-3 space-y-2">
            {entries.map(([key, entry]) => (
              <div key={key} className="grid gap-1 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(160px,0.35fr)_1fr]">
                <dt className="break-words text-sm font-semibold text-slate-600">{humanizeLabel(key)}</dt>
                <dd className="min-w-0 break-words text-sm leading-relaxed text-slate-900">
                  <ValueView value={entry} label={key} expandAll={expandAll} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </details>
    );
  }
  return <span className="break-words text-sm leading-relaxed text-slate-900">{displayValue(value)}</span>;
};

const REPORT_SECTIONS = [
  ["01 Executive Summary", (snapshot) => ({
    summary: getExecutiveSummary(snapshot),
    headlineMetrics: [
      getCurrentCityMetrics(snapshot).find(({ label }) => label === "City Health"),
      getCurrentCityMetrics(snapshot).find(({ label }) => label === "Traffic"),
      getCurrentCityMetrics(snapshot).find(({ label }) => label === "AQI"),
      {
        label: "Climate risk",
        value: snapshot.climateRisk.overall.severity || "Unavailable",
        unit: "risk level",
        source: snapshot.climateRisk.overall.source || "Not available from current data source",
        timestamp: chartTimestamp(snapshot.climateRisk.overall.timestamp),
        status: snapshot.climateRisk.overall.status || "UNAVAILABLE",
      },
    ].filter(Boolean),
    topProblems: getTopProblems(snapshot).slice(0, 3),
    recommendations: getRecommendations(snapshot).slice(0, 3),
  }), null, "executive"],
  ["02 Current City Intelligence", (snapshot) => getCurrentCityMetrics(snapshot), null, "current"],
  ["03 Trends & Forecasts", (snapshot) => getForecastSummary(snapshot), ["trends", "predictions", "profiles"], "trends"],
  ["04 Climate & Risk", (snapshot) => ({
    ...getClimateReportData(snapshot),
    risks: getTopRisks(snapshot).slice(0, 5),
  }), "risks", "risks"],
  ["05 Problems & Root Causes", (snapshot) => getTopProblems(snapshot).slice(0, 5), "problems", "problems"],
  ["06 Predictions & Early Warnings", (snapshot) => ({
    predictions: snapshot.predictions,
    warnings: snapshot.earlyWarnings,
  }), null, "warnings"],
  ["07 What-If + Before → After", (snapshot) => getScenarioSummary(snapshot), "scenario", "scenario"],
  ["08 Impact & Recommendations", (snapshot) => ({
    impactAnalysis: snapshot.impactAnalysis,
    recommendations: getRecommendations(snapshot),
    optimization: snapshot.optimization,
  }), null, "impact"],
  ["09 City Health & Resilience", (snapshot) => ({
    cityHealth: snapshot.cityHealth,
    sustainability: snapshot.sustainability,
    resilience: snapshot.resilience,
  }), "health", "health"],
  ["10 Data Sources, Gaps & Limitations", (snapshot) => ({
    coverage: snapshot.dataCoverage,
    sources: snapshot.dataSources,
    provenance: snapshot.dataProvenance,
    dataGaps: snapshot.dataGaps,
    limitations: snapshot.limitations,
    unavailableSources: snapshot.unavailableSources,
  }), "coverage", "provenance"],
];

const REPORT_STATUS_COLORS = ["#0f766e", "#0891b2", "#4f46e5", "#d97706", "#be123c", "#64748b", "#475569"];

const finiteNumber = (value) => {
  const number = typeof value === "number" ? value : Number(value);
  return value !== null && value !== "" && Number.isFinite(number) ? number : null;
};

const unavailableMetric = (label, unit = "Not available from current data source", path = null) => ({
  path,
  label,
  value: "Unavailable",
  unit: unit === "Not available from current data source" ? "—" : unit,
  source: "Not available from current data source",
  timestamp: "Not available",
  status: "UNAVAILABLE",
});

const metricFromProvenance = (snapshot, label, paths) => {
  for (const path of paths) {
    const row = snapshot.dataProvenance.find((metric) => metric.path === path);
    if (row && row.status !== "UNAVAILABLE" && row.value !== null && row.value !== undefined) {
      return {
        path: row.path,
        label,
        value: displayValue(row.value),
        unit: row.unit || "Unit unavailable",
        source: row.source || "Source unavailable",
        timestamp: chartTimestamp(row.timestamp),
        status: row.status,
      };
    }
  }
  return unavailableMetric(label, "Not available from current data source", paths[0]);
};

const getCurrentCityMetrics = (snapshot) => {
  const health = finiteNumber(snapshot.cityHealth.score);
  const infrastructureIndex = snapshot.cityHealth.dimensions?.findIndex(({ label }) => /infrastructure/i.test(label)) ?? -1;
  const infrastructure = infrastructureIndex >= 0 ? snapshot.cityHealth.dimensions[infrastructureIndex] : null;
  const infrastructurePath = infrastructureIndex >= 0
    ? `cityHealth.dimensions[${infrastructureIndex}].score`
    : null;
  const infrastructureScore = finiteNumber(infrastructure?.score);
  const infrastructureMetric = infrastructureScore === null
    ? unavailableMetric("Infrastructure health", "Not available from current data source", infrastructurePath)
    : {
      path: `cityHealth.dimensions[${snapshot.cityHealth.dimensions.indexOf(infrastructure)}].score`,
      label: "Infrastructure health",
      value: infrastructureScore,
      unit: "/ 100",
      source: snapshot.cityHealth.methodology || "Shared City Health dashboard calculation",
      timestamp: chartTimestamp(snapshot.cityHealth.timestamp),
      status: "ESTIMATED",
    };
  const healthMetric = health === null
    ? unavailableMetric("City Health", "Not available from current data source", "cityHealth.score")
    : {
      path: "cityHealth.score",
      label: "City Health",
      value: health,
      unit: "/ 100",
      source: snapshot.cityHealth.methodology || "Shared City Health dashboard calculation",
      timestamp: chartTimestamp(snapshot.cityHealth.timestamp),
      status: "ESTIMATED",
    };
  return [
    healthMetric,
    metricFromProvenance(snapshot, "Traffic", ["trafficFlow.currentSpeed", "cityState.traffic.value"]),
    metricFromProvenance(snapshot, "AQI", ["airQuality.us_aqi", "cityState.aqi.value"]),
    metricFromProvenance(snapshot, "Temperature", ["weather.temperature_2m"]),
    metricFromProvenance(snapshot, "Water demand", ["cityState.waterDemand.value"]),
    metricFromProvenance(snapshot, "Energy use", ["cityState.energyUsage.value"]),
    infrastructureMetric,
  ];
};

const getTopProblems = (snapshot) => {
  const problems = Array.isArray(snapshot.problems) ? snapshot.problems : [];
  const rootCauses = Array.isArray(snapshot.rootCauses?.items) ? snapshot.rootCauses.items : [];
  return problems.map((problem) => {
    const rootCause = rootCauses.find((item) => item.problem === problem.title);
    return {
      problem: problem.title || "Problem not named",
      severity: problem.severity || "Unavailable",
      evidence: problem.evidence || "Unavailable",
      evidenceType: problem.evidenceClass || "Not classified",
      possibleCause: rootCause?.possibleCause || problem.cause || "Not available from current data source",
      causeStatus: rootCause?.causeStatus || "INFERRED / UNCONFIRMED",
      action: rootCause?.recommendedAction || problem.nextCheck || "Not available from current data source",
      source: problem.source || "Not available from current data source",
      timestamp: chartTimestamp(problem.updatedAt),
    };
  });
};

const recommendationText = (recommendation) => {
  if (typeof recommendation === "string") return recommendation;
  return recommendation?.title || recommendation?.recommendation || recommendation?.action || recommendation?.description || "Recommendation details unavailable";
};

const getRecommendations = (snapshot) => {
  const recommendations = Array.isArray(snapshot.recommendations) ? snapshot.recommendations : [];
  return recommendations.map((recommendation) => ({
    action: recommendationText(recommendation),
    status: recommendation?.status || "ESTIMATED",
    source: recommendation?.source || "YUG NIRMAN recommendation",
  }));
};

const getTopRisks = (snapshot) => {
  const order = ["CRITICAL", "VERY HIGH", "HIGH", "MODERATE", "LOW", "UNAVAILABLE"];
  return (Array.isArray(snapshot.climateRisk.risks) ? snapshot.climateRisk.risks : [])
    .slice()
    .sort((left, right) => {
      const leftRank = order.indexOf(left.severity);
      const rightRank = order.indexOf(right.severity);
      return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank);
    })
    .map((risk) => ({
      risk: risk.riskType,
      level: risk.severity,
      location: risk.location,
      evidence: risk.evidence,
      expectedImpact: risk.potentialImpact,
      expectedTime: risk.expectedTime,
      action: risk.recommendedAction,
      source: risk.source,
      timestamp: chartTimestamp(risk.timestamp),
      status: risk.status,
    }));
};

const getClimateReportData = (snapshot) => ({
  risks: getTopRisks(snapshot),
});

const getScenarioSummary = (snapshot) => {
  const scenario = snapshot.scenarios?.[0];
  if (!scenario) return null;
  const changedMetrics = Array.isArray(scenario.changedMetrics) ? scenario.changedMetrics : [];
  const benefits = Array.isArray(scenario.benefits) ? scenario.benefits : [];
  const tradeOffs = Array.isArray(scenario.tradeOffs) ? scenario.tradeOffs : [];
  const costs = Array.isArray(scenario.costs) ? scenario.costs : [];
  const remainingProblems = Array.isArray(scenario.remainingProblems) ? scenario.remainingProblems : [];
  return {
    name: scenario.name || "Executed scenario",
    status: scenario.status || "SIMULATED",
    intervention: scenario.inputChanges || "Not recorded",
    methodology: scenario.methodology || "Not available from current data source",
    beforeAfter: changedMetrics.filter((metric) => metric && typeof metric === "object").map((metric) => ({
      metric: metric.label || metric.metric || metric.name || metric.key || "Metric",
      before: metric.before ?? "Unavailable",
      after: metric.after ?? "Unavailable",
      change: metric.absoluteChange ?? metric.change ?? "Not calculated",
      unit: metric.unit || "Unit unavailable",
      status: metric.status || "SIMULATED",
    })),
    benefits,
    tradeOffs: tradeOffs.length ? tradeOffs : costs,
    remainingProblems,
  };
};

const getForecastSummary = (snapshot) => ({
  source: "Forecast values are shown only when timestamped predictions are available.",
  accuracy: snapshot.predictions.modelAccuracy || "Not validated",
  confidence: snapshot.predictions.confidence || "Not available",
  currentDataGaps: [
    ...(!getForecastChartRows(snapshot, "weather").length
      ? ["Weather forecast unavailable"] : []),
    ...(!getForecastChartRows(snapshot, "air").length
      ? ["Air-quality forecast unavailable"] : []),
  ],
});

const getExecutiveSummary = (snapshot) => {
  const risks = Array.isArray(snapshot.climateRisk.risks) ? snapshot.climateRisk.risks : [];
  return {
    assessedRisks: risks.filter((risk) => risk.status !== "UNAVAILABLE").length,
    unassessedRisks: risks.filter((risk) => risk.status === "UNAVAILABLE").length,
    problemCount: Array.isArray(snapshot.problems) ? snapshot.problems.length : 0,
    activeApplicationAlerts: Array.isArray(snapshot.earlyWarnings)
      ? snapshot.earlyWarnings.filter((warning) => warning.status === "SIMULATED"
        && String(warning.source).includes("Bundled application alert template")).length
      : 0,
  };
};

const getDecisionSummary = (snapshot) => ({
  priorityActions: getRecommendations(snapshot),
  expectedImpact: snapshot.impactAnalysis,
  unavailableSources: Object.entries(snapshot.dataSources || {})
    .filter(([, source]) => source.status === "UNAVAILABLE" || Boolean(source.reason))
    .map(([name, source]) => ({
      name: humanizeLabel(name),
      status: source.status,
      source: source.source,
      reason: source.reason || "No failure reason was supplied.",
    })),
  optimization: snapshot.optimization,
  sustainability: snapshot.sustainability,
  mapNote: snapshot.mapData.note,
  mapIncidentAvailability: snapshot.mapData.incidents,
  digitalTwin: {
    zoom: snapshot.digitalTwinState.zoom,
    interactiveLayerSelection: snapshot.digitalTwinState.interactiveLayerSelection,
  },
  hasScenario: Boolean(snapshot.scenarios?.[0]),
  remainingProblems: Array.isArray(snapshot.scenarios?.[0]?.remainingProblems)
    ? snapshot.scenarios[0].remainingProblems
    : [],
  importantDataGaps: summarizeReportDataGaps(snapshot.dataGaps, snapshot.population?.profile),
  limitations: Array.isArray(snapshot.limitations) ? snapshot.limitations : [],
});

const chartTimestamp = (value) => {
  if (!value) return "Not available from current data source";
  const parsed = typeof value === "number"
    ? new Date(value < 10_000_000_000 ? value * 1000 : value)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

const getForecastChartRows = (snapshot, category) => {
  const forecastRows = category === "air"
    ? snapshot.predictions.forecastDetails.hourlyAirQuality
    : snapshot.predictions.forecastDetails.hourlyWeather.filter(({ prediction }) => prediction === "temperature");
  return forecastRows.flatMap((row) => {
    const timestamp = row.timestamp ? Date.parse(row.timestamp) : NaN;
    const value = finiteNumber(row.predictedValue);
    if (!Number.isFinite(timestamp) || value === null || row.status === "UNAVAILABLE") return [];
    return [{
      label: new Date(timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      value,
      unit: row.unit,
      source: row.source,
      timestamp: new Date(timestamp).toISOString(),
      status: row.status,
    }];
  });
};

const getNumericMetricRows = (snapshot, prefixes) => {
  const selected = snapshot.dataProvenance
    .filter(({ path, value, status }) => prefixes.some((prefix) => path.startsWith(prefix))
      && finiteNumber(value) !== null && status !== "UNAVAILABLE")
    .map((row) => ({
      name: humanizeLabel(row.path.split(".").slice(-2).join(" ")),
      value: finiteNumber(row.value),
      unit: row.unit || "Unit unavailable",
      source: row.source || "Source unavailable",
      timestamp: chartTimestamp(row.timestamp),
      status: row.status,
    }));
  return selected;
};

const getProblemCounts = (snapshot, type) => {
  const candidates = type === "hotspots" ? snapshot.mapData.trafficHotspots : snapshot.problems;
  const counts = new Map();
  (Array.isArray(candidates) ? candidates : []).filter(Boolean).forEach((entry) => {
    const label = type === "problems"
      ? entry.severity || entry.title || entry.category || entry.type || "Unlabelled record"
      : entry.name || entry.category || entry.type || "Unlabelled record";
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border border-slate-300 bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-slate-900">{label || row.name}</p>
      <p className="mt-1 text-slate-800">{payload.map(({ name, value }) => `${name}: ${value}`).join(" · ")}</p>
      {row.unit && <p className="mt-1 text-slate-600">Unit: {row.unit}</p>}
      {row.source && <p className="text-slate-600">Source: {row.source}</p>}
      {row.timestamp && <p className="text-slate-600">Timestamp: {row.timestamp}</p>}
      {row.status && <p className="font-semibold text-slate-700">Status: {row.status}</p>}
    </div>
  );
};

const ChartFrame = ({ title, data, source, timestamp, unit, status, children, note }) => {
  if (!data.length) return null;
  return (
    <figure className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <figcaption>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Source: {source || "Not available"} · Timestamp: {timestamp || "Not available"} · Unit: {unit || "See chart details"} · Status: {status || "Not available"}
        </p>
        {note && <p className="mt-1 text-xs leading-relaxed text-slate-600">{note}</p>}
      </figcaption>
      <div className="mt-3 h-56 w-full" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
};

const ReportCharts = ({ kind, snapshot }) => {
  let charts = [];
  if (kind === "trends") {
    const temperature = getForecastChartRows(snapshot, "weather");
    const aqi = getForecastChartRows(snapshot, "air");
    if (temperature.length >= 2) {
      charts.push(
        <ChartFrame
          key="temperature"
          title="Temperature forecast"
          data={temperature}
          source={temperature[0].source}
          timestamp={`${temperature[0].timestamp} onward`}
          unit={temperature[0].unit}
          status={temperature[0].status}
        >
          <LineChart data={temperature}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 10 }} />
            <YAxis width={45} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="value" name={temperature[0].unit || "Forecast"} stroke="#0f766e" dot={false} />
          </LineChart>
        </ChartFrame>,
      );
    }
    if (aqi.length >= 2) {
      charts.push(
        <ChartFrame
          key="aqi"
          title="Air-quality forecast"
          data={aqi}
          source={aqi[0].source}
          timestamp={`${aqi[0].timestamp} onward`}
          unit={aqi[0].unit}
          status={aqi[0].status}
        >
          <LineChart data={aqi}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 10 }} />
            <YAxis width={45} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="value" name={aqi[0].unit || "Forecast"} stroke="#4f46e5" dot={false} />
          </LineChart>
        </ChartFrame>,
      );
    }
    const trafficProfile = (Array.isArray(snapshot.traffic.profile.today) ? snapshot.traffic.profile.today : [])
      .flatMap((point) => {
        const value = finiteNumber(point.congestion);
        if (value === null || !point.time) return [];
        return [{
          label: point.time,
          value,
          unit: "congestion index (%)",
          source: "Bundled traffic profile",
          timestamp: "Not available from current data source",
          status: "ESTIMATED",
        }];
      });
    if (trafficProfile.length >= 2) charts.push(
      <ChartFrame
        key="traffic-profile"
        title="Traffic profile trend"
        data={trafficProfile}
        source="Bundled traffic profile"
        timestamp="Not available from current data source"
        unit="Congestion index (%)"
        status="ESTIMATED"
        note="Illustrative profile values, not a live or measured traffic trend."
      >
        <LineChart data={trafficProfile}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 10 }} />
          <YAxis width={45} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="value" name="Congestion index (%)" stroke="#64748b" dot={false} />
        </LineChart>
      </ChartFrame>,
    );
  } else if (kind === "profiles") {
    const profiles = [
      {
        key: "water",
        title: "Water demand profile",
        rows: (Array.isArray(snapshot.water.weeklyTrend) ? snapshot.water.weeklyTrend : [])
          .map((point) => ({ label: point.day || "Period", consumption: finiteNumber(point.consumption), target: finiteNumber(point.target) }))
          .filter(({ consumption, target }) => consumption !== null || target !== null),
        series: [
          ["consumption", "Consumption", "#0891b2"],
          ["target", "Target", "#64748b"],
        ],
        unit: "MLD",
        source: "Bundled water profile",
      },
      {
        key: "energy",
        title: "Energy load profile",
        rows: (Array.isArray(snapshot.energy.hourlyGridLoad) ? snapshot.energy.hourlyGridLoad : [])
          .map((point) => ({ label: point.time || "Period", actual: finiteNumber(point.actual), solar: finiteNumber(point.solar), wind: finiteNumber(point.wind) }))
          .filter(({ actual, solar, wind }) => actual !== null || solar !== null || wind !== null),
        series: [
          ["actual", "Load", "#0891b2"],
          ["solar", "Solar", "#d97706"],
          ["wind", "Wind", "#0f766e"],
        ],
        unit: "MW",
        source: "Bundled energy profile",
      },
      {
        key: "population",
        title: "Population profile",
        rows: (Array.isArray(snapshot.population.profile?.historyAndForecast)
          ? snapshot.population.profile.historyAndForecast
          : [])
          .map((point) => ({ label: String(point.year || "Year unavailable"), value: finiteNumber(point.population) }))
          .filter(({ value }) => value !== null),
        series: [["value", "Population", "#4f46e5"]],
        unit: "million people",
        source: "Bundled population profile",
      },
    ];
    profiles.forEach(({ key, title, rows, series, unit, source }) => {
      if (rows.length < 2) return;
      const availableSeries = series.filter(([dataKey]) =>
        rows.filter((row) => finiteNumber(row[dataKey]) !== null).length >= 2);
      if (!availableSeries.length) return;
      const data = rows.map((row) => ({
        ...row,
        unit,
        source,
        timestamp: "Not available from current data source",
        status: "ESTIMATED",
      }));
      charts.push(
        <ChartFrame
          key={key}
          title={title}
          data={data}
          source={source}
          timestamp="Not available from current data source"
          unit={unit}
          status="ESTIMATED"
          note="Bundled profile values, not live measurements or validated forecasts."
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={20} tick={{ fontSize: 10 }} />
            <YAxis width={48} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            {availableSeries.map(([dataKey, name, color]) => (
              <Line key={dataKey} type="monotone" dataKey={dataKey} name={name} stroke={color} dot={false} connectNulls={false} />
            ))}
          </LineChart>
        </ChartFrame>,
      );
    });
  } else if (kind === "predictions") {
    const data = [
      ...snapshot.predictions.forecastDetails.hourlyWeather,
      ...snapshot.predictions.forecastDetails.hourlyAirQuality,
    ]
      .filter((row) => row.status !== "UNAVAILABLE" && finiteNumber(row.change) !== null)
      .slice(0, 12)
      .map((row) => ({
        name: `${humanizeLabel(row.prediction)} · ${row.forecastHorizonHours ?? "?"} h`,
        value: finiteNumber(row.change),
        unit: row.unit,
        source: row.source,
        timestamp: chartTimestamp(row.timestamp),
        status: row.status,
      }));
    if (data.length) charts.push(
      <ChartFrame
        key="prediction-changes"
        title="Forecast change from current value"
        data={data}
        source="See each forecast point"
        timestamp={`Report captured at ${chartTimestamp(snapshot.timestamp)}`}
        unit="Units shown per forecast"
        status="PREDICTED"
        note="Bars show predicted minus current values from the forecast details; no confidence or accuracy is implied."
      >
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={165} tick={{ fontSize: 9 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Change" fill="#4f46e5" />
        </BarChart>
      </ChartFrame>,
    );
  } else if (kind === "risks") {
    const severityOrder = ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"];
    const data = snapshot.climateRisk.risks
      .filter((risk) => severityOrder.includes(risk.severity))
      .map((risk) => ({
        name: risk.riskType,
        value: severityOrder.indexOf(risk.severity) + 1,
        severity: risk.severity,
        unit: "ordered severity level (1–5), not probability",
        source: risk.source,
        timestamp: chartTimestamp(risk.timestamp),
        status: risk.status,
      }));
    if (data.length) charts.push(
      <ChartFrame
        key="risks"
        title="Available risk screens"
        data={data}
        source="Per-risk sources are shown in chart details"
        timestamp={`Report captured at ${chartTimestamp(snapshot.timestamp)}`}
        unit="Ordered severity level (1–5)"
        status="Mixed; per-risk status in chart details"
        note="Severity is displayed in its stated order; bars are not probabilities or calibrated impact scores."
      >
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Severity level" fill="#d97706" />
        </BarChart>
      </ChartFrame>,
    );
  } else if (kind === "city-metrics" || kind === "water-energy" || kind === "infrastructure-population" || kind === "health") {
    const prefixes = kind === "city-metrics"
      ? ["weather.", "airQuality.", "trafficFlow.", "cityState."]
      : kind === "water-energy"
        ? ["waterProfile.", "energyProfile."]
        : kind === "infrastructure-population"
          ? ["populationProfile.", "populationEstimate.", "cityState."]
          : ["cityHealth.", "cityState."];
    const rows = getNumericMetricRows(snapshot, prefixes);
    const byUnit = new Map();
    rows.forEach((row) => byUnit.set(row.unit, [...(byUnit.get(row.unit) || []), row]));
    [...byUnit.entries()].slice(0, kind === "health" ? 1 : 2).forEach(([unit, data]) => {
      charts.push(
        <ChartFrame
          key={unit}
          title={`Available indicators · ${unit}`}
          data={data}
          source="See individual indicator details"
          timestamp={`Report captured at ${chartTimestamp(snapshot.timestamp)}`}
          unit={unit}
          status="Mixed; see each indicator"
        >
          <BarChart data={data} margin={{ left: 8, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 9 }} />
            <YAxis width={45} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name={unit} fill="#0891b2" />
          </BarChart>
        </ChartFrame>,
      );
    });
    if (!charts.length) return <p className="text-sm text-slate-600">No finite numeric indicators are available to graph in this section.</p>;
  } else if (kind === "traffic") {
    const traffic = snapshot.traffic.flow;
    const trafficRows = [
      ["Current speed", traffic?.currentSpeed, "km/h"],
      ["Free-flow speed", traffic?.freeFlowSpeed, "km/h"],
      ["Current travel time", traffic?.currentTravelTime, "seconds"],
      ["Free-flow travel time", traffic?.freeFlowTravelTime, "seconds"],
    ].map(([name, rawValue, unit]) => ({
      name,
      value: finiteNumber(rawValue),
      unit,
      source: traffic?.source || snapshot.dataSources.traffic.source,
      timestamp: chartTimestamp(traffic?.retrievedAt),
      status: snapshot.traffic.status,
    })).filter(({ value }) => value !== null);
    const trafficByUnit = new Map();
    trafficRows.forEach((row) => trafficByUnit.set(row.unit, [...(trafficByUnit.get(row.unit) || []), row]));
    [...trafficByUnit.entries()].forEach(([unit, data]) => charts.push(
      <ChartFrame
        key={`traffic-${unit}`}
        title={`Traffic measurements · ${unit}`}
        data={data}
        source={traffic?.source || snapshot.dataSources.traffic.source}
        timestamp={chartTimestamp(traffic?.retrievedAt)}
        unit={unit}
        status={snapshot.traffic.status}
        note="Only returned traffic measurements are plotted; a road-segment reading does not represent citywide traffic."
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={65} tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name={unit} fill="#0f766e" />
        </BarChart>
      </ChartFrame>,
    ));
    const profileRows = (Array.isArray(snapshot.traffic.profile.today) ? snapshot.traffic.profile.today : [])
      .map((point) => ({
        name: point.time || point.day || "Profile point",
        value: finiteNumber(point.congestion),
        unit: "congestion index (%)",
        source: "Bundled traffic profile",
        timestamp: "Not available from current data source",
        status: "ESTIMATED",
      }))
      .filter(({ value }) => value !== null);
    if (profileRows.length) charts.push(
      <ChartFrame
        key="traffic-profile"
        title="Traffic profile over the day"
        data={profileRows}
        source="Bundled traffic profile"
        timestamp="Not available from current data source"
        unit="congestion index (%)"
        status="ESTIMATED"
        note="This is the selected city profile, not a live traffic observation."
      >
        <BarChart data={profileRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval="preserveStartEnd" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Congestion index (%)" fill="#64748b" />
        </BarChart>
      </ChartFrame>,
    );
    const problemRows = getProblemCounts(snapshot, "hotspots");
    if (problemRows.length) charts.push(
      <ChartFrame
        key="hotspots"
        title="Mapped traffic hotspots"
        data={problemRows}
        source="Selected CityState map zones"
        timestamp={`Feature timestamp: Not available · report captured at ${chartTimestamp(snapshot.timestamp)}`}
        unit="mapped zone records"
        status="ESTIMATED"
        note="Counts represent mapped records in the snapshot, not live incident counts."
      >
        <BarChart data={problemRows} layout="vertical" margin={{ left: 8, right: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Mapped records" fill="#d97706" />
        </BarChart>
      </ChartFrame>,
    );
  } else if (kind === "problems") {
    const data = getProblemCounts(snapshot, "problems");
    if (data.length) charts.push(
      <ChartFrame
        key="problems"
        title="Problem records by severity"
        data={data}
        source="City diagnosis records in reportSnapshot"
        timestamp={`Diagnosis generated at ${chartTimestamp(snapshot.timestamp)}`}
        unit="record count"
        status="INFERRED"
        note="Counts group the problem records by their stated severity. This is not a probability or a measured impact score."
      >
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Problem records" fill="#be123c" />
        </BarChart>
      </ChartFrame>,
    );
  } else if (kind === "scenario") {
    const data = snapshot.scenarios.flatMap((scenario) => scenario.changedMetrics || [])
      .map((metric) => ({
        name: metric.label || metric.name || metric.key || "Metric",
        before: finiteNumber(metric.before),
        after: finiteNumber(metric.after),
        unit: metric.unit || "Unit unavailable",
        source: scenarioSource(snapshot),
        timestamp: chartTimestamp(snapshot.timestamp),
        status: "SIMULATED",
      }))
      .filter(({ before, after }) => before !== null && after !== null);
    const commonUnit = data.length && data.every(({ unit }) => unit === data[0].unit) ? data[0].unit : null;
    if (commonUnit && data.length) charts.push(
      <ChartFrame
        key="scenario"
        title={`Scenario: before and after · ${commonUnit}`}
        data={data}
        source={scenarioSource(snapshot)}
        timestamp={`Report captured at ${chartTimestamp(snapshot.timestamp)}`}
        unit={commonUnit}
        status="SIMULATED"
        note="Only metrics with both finite before and after values are included. Simulated values are not observed outcomes."
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={65} tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="before" name="Before" fill="#64748b" />
          <Bar dataKey="after" name="Scenario after" fill="#0891b2" />
        </BarChart>
      </ChartFrame>,
    );
  } else if (kind === "coverage") {
    const data = Object.entries(snapshot.dataCoverage.statusCounts)
      .filter(([, count]) => finiteNumber(count) !== null && count > 0)
      .map(([name, value]) => ({
        name,
        value,
        unit: "metrics",
        source: "Report snapshot provenance catalog",
        timestamp: chartTimestamp(snapshot.timestamp),
        status: "CALCULATED FROM SNAPSHOT",
      }));
    if (data.length) charts.push(
      <ChartFrame
        key="coverage"
        title="Data status composition"
        data={data}
        source="Report snapshot provenance catalog"
        timestamp={`Coverage calculated at ${chartTimestamp(snapshot.timestamp)}`}
        unit="Metric count"
        status="CALCULATED FROM SNAPSHOT"
        note="Slice sizes are counts of provenance records. Percentages are shown in the data coverage details."
      >
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={75} label>
            {data.map((entry, index) => <Cell key={entry.name} fill={REPORT_STATUS_COLORS[index % REPORT_STATUS_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend />
        </PieChart>
      </ChartFrame>,
    );
  }

  if (!charts.length) return null;
  return <div className="mt-4 grid gap-4 lg:grid-cols-2">{charts}</div>;
};

const scenarioSource = (snapshot) => `Attached scenario: ${snapshot.scenarios[0]?.name || "Not named"}`;

const StatusBadge = ({ status }) => (
  <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700">
    {status || "UNAVAILABLE"}
  </span>
);

const MetricCards = ({ metrics }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {metrics.map((metric) => (
      <article key={metric.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">{metric.label}</h3>
          <StatusBadge status={metric.status} />
        </div>
        <p className="mt-2 break-words text-2xl font-bold text-slate-950">
          {displayValue(metric.value)} <span className="text-sm font-medium text-slate-600">{metric.unit}</span>
        </p>
        <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">{metric.source}</p>
        <p className="mt-1 break-words text-[11px] text-slate-500">{metric.timestamp}</p>
      </article>
    ))}
  </div>
);

const MetricRegister = ({ snapshot, summaryMetrics }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const metrics = getUnrepresentedMetrics(snapshot.dataProvenance, summaryMetrics);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMetrics = normalizedQuery
    ? metrics.filter((metric) => [
      metric.path,
      formatMetricPath(metric.path),
      metric.value,
      metric.unit,
      metric.source,
      metric.timestamp,
      metric.status,
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery)))
    : metrics;
  const visibleMetrics = filteredMetrics.slice(0, visibleCount);

  return (
    <details
      className="mt-4 rounded-xl border border-slate-200 bg-white"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-inside px-4 py-3 text-sm font-bold text-teal-900">
        Complete metric register · {metrics.length} additional fields
      </summary>
      {isOpen && (
        <div className="border-t border-slate-200 p-4">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="report-metric-search">
            Find a metric
          </label>
          <input
            id="report-metric-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(30);
            }}
            placeholder="Search name, value, source, or status"
            className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
          <p className="mt-2 text-xs text-slate-600">
            {filteredMetrics.length} of {metrics.length} fields · each field appears here once, except summary KPIs above.
          </p>
          {filteredMetrics.length ? (
            <div className="mt-3 space-y-2">
              {visibleMetrics.map((metric) => (
                <article key={metric.path} className="min-w-0 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="min-w-0 break-words text-sm font-semibold text-slate-900">{formatMetricPath(metric.path)}</h4>
                    <StatusBadge status={metric.status} />
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-slate-500">Technical field path</summary>
                    <code className="mt-1 block break-all text-xs text-slate-600">{metric.path}</code>
                  </details>
                  <p className="mt-2 break-words text-sm text-slate-800">
                    <strong>Value:</strong>{" "}
                    {metric.value && typeof metric.value === "object"
                      ? <code className="break-all text-xs">{JSON.stringify(metric.value)}</code>
                      : displayValue(metric.value)}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-600">
                    Source: {displayValue(metric.source)} · Timestamp: {displayValue(metric.timestamp)}
                  </p>
                  {metric.alsoRecordedAs.length > 0 && (
                    <p className="mt-1 break-words text-xs text-slate-500">
                      Same value also recorded as: {metric.alsoRecordedAs.map(({ path, source }) =>
                        `${formatMetricPath(path)} (${displayValue(source)})`).join("; ")}
                    </p>
                  )}
                </article>
              ))}
              {visibleCount < filteredMetrics.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 30)}
                  className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-teal-900 hover:border-teal-600"
                >
                  Show next {Math.min(30, filteredMetrics.length - visibleCount)} fields
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {metrics.length ? "No fields match this search." : "All available metric fields are shown in the KPI cards above."}
            </p>
          )}
        </div>
      )}
    </details>
  );
};

const CurrentIntelligence = ({ snapshot, metrics }) => (
  <>
    <MetricCards metrics={metrics.filter(({ label }) => !["City Health", "Traffic", "AQI"].includes(label))} />
    <MetricRegister snapshot={snapshot} summaryMetrics={metrics} />
  </>
);

const ExecutiveSummary = ({ value }) => (
  <div>
    <p className="text-sm leading-6 text-slate-700">
      This report records the selected city’s available intelligence at one point in time. Values and limitations are documented in their dedicated sections below.
    </p>
    <MetricCards metrics={value.headlineMetrics} />
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Risks assessed", value.summary.assessedRisks],
        ["Risks not assessed", value.summary.unassessedRisks],
        ["Problems detected", value.summary.problemCount],
        ["Simulated alert templates", value.summary.activeApplicationAlerts],
      ].map(([label, count]) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs font-semibold text-slate-600">{label}</dt>
          <dd className="mt-1 text-2xl font-bold text-slate-950">{count}</dd>
        </div>
      ))}
    </dl>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Top 3 problems</h3>
        {value.topProblems.length
          ? <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">{value.topProblems.map((problem, index) => (
            <li key={`${problem.problem}-${index}`}><strong>{problem.problem}</strong> · {problem.severity}<span className="mt-1 block text-xs text-slate-600">Next action: {problem.action}</span></li>
          ))}</ol>
          : <p className="text-sm text-slate-600">No screened problems are available.</p>}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Top 3 actions</h3>
        {value.recommendations.length
          ? <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">{value.recommendations.map(({ action, source, status }, index) => (
            <li key={`${action}-${index}`}>{action} <StatusBadge status={status} /><span className="mt-1 block text-xs text-slate-500">{source}</span></li>
          ))}</ol>
          : <p className="text-sm text-slate-600">No recommendations are available from the current data.</p>}
      </section>
    </div>
    <p className="mt-3 text-xs text-slate-600">This analytical report is not an official warning or validated forecast.</p>
  </div>
);

const RiskSummary = ({ risks }) => (
  risks.length
    ? <div className="space-y-3">{risks.map((risk, index) => (
      <article key={`${risk.risk}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{risk.risk}</h3>
          <StatusBadge status={risk.level} />
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-600">Location</dt><dd>{risk.location}</dd></div>
          <div><dt className="font-semibold text-slate-600">Evidence</dt><dd>{risk.evidence}</dd></div>
          <div><dt className="font-semibold text-slate-600">Expected impact</dt><dd>{risk.expectedImpact}</dd></div>
          <div><dt className="font-semibold text-slate-600">Expected time</dt><dd>{risk.expectedTime}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold text-slate-600">Recommended action</dt><dd>{risk.action}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">{risk.source} · {risk.timestamp} · {risk.status}</p>
      </article>
    ))}</div>
    : <p className="text-sm text-slate-700">Data unavailable — risk cannot be reliably assessed from the current snapshot.</p>
);

const ClimateSummary = ({ value }) => (
  <RiskSummary risks={value.risks} />
);

const ProblemSummary = ({ problems }) => (
  problems.length
    ? <div className="space-y-3">{problems.map((problem, index) => (
      <article key={`${problem.problem}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{problem.problem}</h3>
          <StatusBadge status={problem.severity} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          <strong>Evidence:</strong> {problem.evidence} <span className="text-slate-500">({problem.evidenceType})</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          <strong>Possible cause:</strong> {problem.possibleCause} <span className="text-slate-500">— {problem.causeStatus}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700"><strong>Action:</strong> {problem.action}</p>
        <p className="mt-2 text-xs text-slate-500">{problem.source} · {problem.timestamp}</p>
      </article>
    ))}</div>
    : <p className="text-sm text-slate-700">No screened problems are available in this snapshot.</p>
);

const ScenarioSummary = ({ value }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-bold text-slate-900">{value.name}</h3>
      <StatusBadge status={value.status} />
    </div>
    <p className="text-sm text-slate-700"><strong>Intervention:</strong> {displayValue(value.intervention)}</p>
    <p className="text-xs text-slate-600">{value.methodology}</p>
    {value.beforeAfter.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-slate-300 text-xs uppercase text-slate-600">
            <th className="p-2">Metric</th><th className="p-2">Before</th><th className="p-2">After</th><th className="p-2">Change</th><th className="p-2">Status</th>
          </tr></thead>
          <tbody>{value.beforeAfter.map((metric, index) => (
            <tr key={`${metric.metric}-${index}`} className="border-b border-slate-200">
              <td className="p-2 font-semibold">{metric.metric}</td>
              <td className="p-2">{displayValue(metric.before)} {metric.unit}</td>
              <td className="p-2">{displayValue(metric.after)} {metric.unit}</td>
              <td className="p-2">{displayValue(metric.change)} {metric.unit}</td>
              <td className="p-2"><StatusBadge status={metric.status} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    ) : <p className="text-sm text-slate-600">No calculated before-and-after values are available.</p>}
    <ValueView value={{ benefits: value.benefits, tradeOffs: value.tradeOffs, remainingProblems: value.remainingProblems }} label="Scenario impact" />
  </div>
);

const ForecastDetails = ({ snapshot, summary }) => (
  <div className="mt-4 space-y-3">
    <p className="text-xs leading-relaxed text-slate-600">
      {summary.confidence} · {summary.accuracy} · {summary.source}
    </p>
    {summary.currentDataGaps.length > 0 && (
      <p className="text-sm text-slate-600">{summary.currentDataGaps.join(" · ")}</p>
    )}
    <ValueView
      value={{
        hourlyWeather: snapshot.predictions.forecastDetails.hourlyWeather,
        hourlyAirQuality: snapshot.predictions.forecastDetails.hourlyAirQuality,
        scenarioHeuristics: snapshot.predictions.forecastDetails.scenarioHeuristics,
        longRangeCityProfile: snapshot.predictions.longRangeCityProfile,
      }}
      label="Forecast values and model inputs"
    />
  </div>
);

const ReportSectionBody = ({ kind, value, snapshot }) => {
  if (kind === "executive") return <ExecutiveSummary value={value} />;
  if (kind === "current") return <CurrentIntelligence snapshot={snapshot} metrics={value} />;
  if (kind === "risks") return <ClimateSummary value={value} />;
  if (kind === "problems") return <ProblemSummary problems={value} />;
  if (kind === "scenario") return value
    ? <ScenarioSummary value={value} />
    : <p className="text-sm text-slate-600">No intervention or scenario was attached to this report.</p>;
  if (kind === "warnings") return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Forecasts and predictions</h3>
        <ForecastDetails snapshot={snapshot} summary={getForecastSummary(snapshot)} />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Early warnings</h3>
        <p className="mb-2 text-xs text-slate-600">Risk triggers and bundled alerts retain their source and status; they are not verified official emergency warnings.</p>
        {value.warnings.length
          ? <ValueView value={value.warnings} label="Early warnings" />
          : <p className="text-sm text-slate-600">No active warning records are available in this snapshot.</p>}
      </section>
    </div>
  );
  if (kind === "impact") return (
    <div className="space-y-4">
      <section><h3 className="mb-2 text-sm font-bold text-slate-900">Impact analysis</h3><ValueView value={value.impactAnalysis} label="Impact analysis" /></section>
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Recommendations</h3>
        {value.recommendations.length
          ? <ValueView value={value.recommendations} label="Recommendations" />
          : <p className="text-sm text-slate-600">No recommendations are available from the current data.</p>}
      </section>
      <section><h3 className="mb-2 text-sm font-bold text-slate-900">Urban optimization</h3><ValueView value={value.optimization} label="Optimization" /></section>
    </div>
  );
  if (kind === "health") return <ValueView value={value} label="City health and resilience" />;
  if (kind === "provenance") return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(value.coverage.statusCounts || {}).map(([status, count]) => (
          <article key={status} className="rounded-xl border border-slate-200 bg-white p-3">
            <StatusBadge status={status} />
            <p className="mt-2 text-lg font-bold text-slate-900">{count}</p>
            <p className="text-xs text-slate-600">provenance records</p>
          </article>
        ))}
      </div>
      <p className="text-sm text-slate-700">
        {value.coverage.availableMetrics} of {value.coverage.totalMetrics} catalog metrics have values
        ({value.coverage.completenessPercent}% coverage).
      </p>
      <ValueView value={{ sources: value.sources, provenance: value.provenance, dataGaps: value.dataGaps, limitations: value.limitations, unavailableSources: value.unavailableSources }} label="Sources and limitations" />
    </div>
  );
  if (kind === "trends") return <ForecastDetails snapshot={snapshot} summary={value} />;
  return <ValueView value={value} label="Forecast summary" initialOpen />;
};

const ReportSection = ({ title, snapshot, select, chartKind, sectionKind, expandAll, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <details
      className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      open={isOpen || expandAll}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
        {title}
      </summary>
      {(isOpen || expandAll) && (
        <div className="pt-3">
          {(Array.isArray(chartKind) ? chartKind : chartKind ? [chartKind] : [])
            .map((kind) => <ReportCharts key={kind} kind={kind} snapshot={snapshot} />)}
          <ReportSectionBody kind={sectionKind} value={select(snapshot)} snapshot={snapshot} />
        </div>
      )}
    </details>
  );
};

const safeFilename = (value) => String(value || "city").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const getReportMetricText = (value, unit = "") => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return `${value}${unit ? ` ${unit}` : ""}`;
};

const getCurrentReportReadings = (snapshot) => {
  const weather = snapshot.weather.current || {};
  const air = snapshot.airQuality.current || {};
  const cityMetrics = snapshot.city.profile?.metrics || {};
  return [
    ["Temperature", getReportMetricText(weather.temperature_2m, "°C")],
    ["Feels-like temperature", getReportMetricText(weather.apparent_temperature, "°C")],
    ["Humidity", getReportMetricText(weather.relative_humidity_2m, "%")],
    ["Rainfall", getReportMetricText(weather.precipitation, "mm")],
    ["Wind speed", getReportMetricText(weather.wind_speed_10m, "km/h")],
    ["Wind gust", getReportMetricText(weather.wind_gusts_10m, "km/h")],
    ["US AQI", getReportMetricText(air.us_aqi)],
    ["Traffic profile", getReportMetricText(cityMetrics.traffic?.value, "% index")],
    ["Water-demand profile", getReportMetricText(cityMetrics.waterDemand?.value, "% index")],
    ["Energy-use profile", getReportMetricText(cityMetrics.energyUsage?.value, "% index")],
    ["Population profile", getReportMetricText(cityMetrics.population?.value, "people")],
  ].filter(([, value]) => value);
};

const buildReportNarrative = (snapshot) => {
  const currentReadings = getCurrentReportReadings(snapshot);

  const readingText = currentReadings.length
    ? currentReadings.map(([name, value]) => `${name}: ${value}`).join("; ")
    : "No current weather, air-quality, or traffic measurements were available in this snapshot.";
  const healthScore = getReportMetricText(snapshot.cityHealth.score, "/ 100");
  const screeningScore = getReportMetricText(snapshot.climateRisk.overall?.score, "/ 90");
  const healthText = healthScore ? ` The shared City Health score is ${healthScore}.` : "";
  const climateText = screeningScore
    ? ` The available climate screening score is ${screeningScore}; it is a rule-based screening indicator, not a probability.`
    : " A climate screening score could not be calculated from the available inputs.";

  return {
    executive: `This report records the available urban indicators for ${snapshot.city.name} at ${snapshot.timestamp}. At capture, ${readingText}.${healthText}${climateText} Missing feeds and unverified impacts are identified in the data-quality sections rather than inferred as measured facts.`,
    methodology: `The report is a point-in-time analytical summary produced by ${snapshot.metadata.application}. It brings together the selected CityState profile, connected public weather and air-quality model values, traffic data when available, current application indicators, and any attached scenario. Modelled, estimated, simulated, and unavailable values retain their status and provenance. This document is not an official weather warning, engineering assessment, or validated forecast.`,
    scope: `City reference: ${snapshot.city.name}${snapshot.city.state ? `, ${snapshot.city.state}` : ""}. Coordinates: ${Array.isArray(snapshot.city.coordinates) ? snapshot.city.coordinates.join(", ") : "Unavailable"}. Report ID: ${snapshot.metadata.reportId}. Data completeness: ${snapshot.dataCoverage.completenessPercent}% (${snapshot.dataCoverage.availableMetrics} of ${snapshot.dataCoverage.totalMetrics} catalog entries contain values).`,
  };
};

const getPdfSectionLines = (snapshot, index) => {
  if (index === 0) {
    const summary = getExecutiveSummary(snapshot);
    const metrics = REPORT_SECTIONS[0][1](snapshot).headlineMetrics;
    return [
      ...metrics.map((metric) => `${metric.label}: ${metric.value} ${metric.unit} · ${metric.status} · ${metric.source} · ${metric.timestamp}`),
      `Screened risks: ${summary.assessedRisks} assessed; ${summary.unassessedRisks} not assessed`,
      ...getTopProblems(snapshot).slice(0, 3).map((problem) => `Problem: ${problem.problem} · ${problem.severity} · Action: ${problem.action}`),
      ...getRecommendations(snapshot).slice(0, 3).map(({ action }) => `Priority action: ${action}`),
    ];
  }
  if (index === 1) {
    return getCurrentCityMetrics(snapshot)
      .filter(({ label }) => !["City Health", "Traffic", "AQI"].includes(label))
      .map((metric) =>
      `${metric.label}: ${metric.value} ${metric.unit} · ${metric.status} · ${metric.source} · ${metric.timestamp}`);
  }
  if (index === 2) {
    const forecast = getForecastSummary(snapshot);
    return [
      `${forecast.confidence} · ${forecast.accuracy}`,
      ...forecast.currentDataGaps.slice(0, 4),
      "Charts appear only when the snapshot contains enough finite values; chart point source, time, unit, and status are shown.",
    ];
  }
  if (index === 3) {
    const risks = getTopRisks(snapshot);
    return risks.length
      ? [
        ...risks.slice(0, 4).flatMap((risk) => [
        `${risk.risk} · ${risk.level} · ${risk.location}`,
        `Evidence: ${risk.evidence}`,
        `Expected impact/time: ${risk.expectedImpact} · ${risk.expectedTime}`,
        `Action: ${risk.action}`,
        `Source: ${risk.source} · ${risk.timestamp} · ${risk.status}`,
        ]),
        ...(risks.length > 4 ? [`${risks.length - 4} additional risk records are available in the snapshot export.`] : []),
      ]
      : ["Data unavailable — risk cannot be reliably assessed from the current snapshot."];
  }
  if (index === 4) {
    const problems = getTopProblems(snapshot);
    return problems.length
      ? [
        ...problems.slice(0, 3).flatMap((problem) => [
        `${problem.problem} · ${problem.severity}`,
        `Evidence: ${problem.evidence} (${problem.evidenceType})`,
        `Possible cause: ${problem.possibleCause} · ${problem.causeStatus}`,
        `Action: ${problem.action}`,
        ]),
        ...(problems.length > 3 ? [`${problems.length - 3} additional problem records are available in the snapshot export.`] : []),
      ]
      : ["No screened problems are available in this snapshot."];
  }
  if (index === 5) {
    const predictions = snapshot.predictions.forecastDetails;
    const warnings = Array.isArray(snapshot.earlyWarnings) ? snapshot.earlyWarnings : [];
    const forecastRows = [
      ...(predictions.hourlyWeather || []),
      ...(predictions.hourlyAirQuality || []),
    ].filter((row) => row.status !== "UNAVAILABLE" && finiteNumber(row.predictedValue) !== null);
    return [
      `Predictions: ${forecastRows.length} available forecast points · confidence unavailable · accuracy not validated`,
      ...forecastRows.slice(0, 3).map((row) =>
        `${humanizeLabel(row.prediction)}: ${displayValue(row.predictedValue)} ${row.unit || ""} · ${row.forecastHorizonHours ?? "—"} h · ${row.status}`),
      `Warning records: ${warnings.length} · none are verified official emergency alerts`,
      ...warnings.filter(({ status }) => status !== "SIMULATED").slice(0, 2).map((warning) =>
        `${warning.warningType || warning.title || "Warning"} · ${warning.severity || "Unavailable"} · ${warning.location || "Location unavailable"} · ${warning.recommendedAction || "Action unavailable"}`),
      ...(!warnings.length ? ["No warning records are available in this snapshot."] : []),
    ];
  }
  if (index === 6) {
    const scenario = getScenarioSummary(snapshot);
    if (!scenario) return [];
    return [
      `${scenario.name} · ${scenario.status}`,
      `Intervention: ${displayValue(scenario.intervention)}`,
      scenario.methodology,
      ...scenario.beforeAfter.slice(0, 8).map((metric) =>
        `${metric.metric}: ${displayValue(metric.before)} → ${displayValue(metric.after)} ${metric.unit} · Change: ${displayValue(metric.change)}`),
      ...(scenario.beforeAfter.length > 8 ? [`${scenario.beforeAfter.length - 8} additional scenario metrics are available in the JSON/CSV snapshot.`] : []),
      ...(scenario.benefits.length ? [`Benefits: ${scenario.benefits.slice(0, 3).join("; ")}`] : []),
      ...(scenario.benefits.length > 3 ? [`${scenario.benefits.length - 3} additional benefits are available in the JSON/CSV snapshot.`] : []),
      ...(scenario.tradeOffs.length ? [`Trade-offs: ${scenario.tradeOffs.slice(0, 3).join("; ")}`] : []),
      ...(scenario.tradeOffs.length > 3 ? [`${scenario.tradeOffs.length - 3} additional trade-offs are available in the JSON/CSV snapshot.`] : []),
      ...(scenario.remainingProblems.length ? [`Remaining: ${scenario.remainingProblems.slice(0, 3).join("; ")}`] : []),
      ...(scenario.remainingProblems.length > 3 ? [`${scenario.remainingProblems.length - 3} additional remaining problems are available in the JSON/CSV snapshot.`] : []),
    ];
  }
  if (index === 7) {
    const decision = getDecisionSummary(snapshot);
    return [
      `Expected impact: ${decision.expectedImpact?.reason || decision.expectedImpact?.status || "Not available from current data source"}`,
      ...getRecommendations(snapshot).slice(0, 4).map(({ action, status }) => `Recommendation (${status}): ${action}`),
    ];
  }
  if (index === 8) {
    return [
      `City Health: ${displayValue(snapshot.cityHealth.score)} / 100 · ${snapshot.cityHealth.score == null ? "UNAVAILABLE" : "ESTIMATED"} · ${snapshot.cityHealth.timestamp || "Timestamp unavailable"}`,
      ...(snapshot.cityHealth.dimensions || []).filter(({ score }) => finiteNumber(score) !== null)
        .map(({ label, score, status }) => `${label}: ${score} · ${status || "ESTIMATED"}`),
      `Sustainability: ${displayValue(snapshot.sustainability?.score ?? "Unavailable")}`,
      `Resilience: ${displayValue(snapshot.resilience?.score ?? "Unavailable")}`,
      snapshot.cityHealth.methodology || "City Health methodology unavailable.",
    ];
  }
  return [
    `Data coverage: ${snapshot.dataCoverage.completenessPercent}% · ${snapshot.dataCoverage.availableMetrics}/${snapshot.dataCoverage.totalMetrics} catalog metrics`,
    ...Object.entries(snapshot.dataCoverage.statusCounts || {}).map(([status, count]) => `${status}: ${count}`),
    `Sources: ${Object.values(snapshot.dataSources || {}).map((source) => source?.source || source?.name || "Unavailable").filter(Boolean).join("; ") || "Unavailable"}`,
    ...(snapshot.dataGaps || []).slice(0, 5).map((gap) => `Data gap: ${gap}`),
    ...(snapshot.limitations || []).slice(0, 3).map((limitation) => `Limitation: ${limitation}`),
    "Complete metric-level provenance is retained in the companion JSON and CSV snapshot exports.",
  ];
};

const loadBrandLogoDataUrl = () => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Could not prepare the YUG NIRMAN logo for PDF export."));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL("image/png"));
  };
  image.onerror = () => reject(new Error("Could not load the YUG NIRMAN logo for PDF export."));
  image.src = new URL("../assets/yug-nirman-mark.svg", import.meta.url).href;
});

const ReportGeneration = () => {
  const cityState = useCity();
  const { currentUser } = useAuth();
  const location = useLocation();
  const populationResult = useCurrentPopulationEstimate(cityState.city);
  const predictions = useRealTimePredictions(
    cityState.liveAirQuality,
    cityState.liveAirQualityHourly,
    cityState.liveWeather,
    cityState.liveWeatherHourly,
  );
  const [snapshot, setSnapshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  useEffect(() => {
    if (!isPrintReady) return undefined;
    const handleAfterPrint = () => setIsPrintReady(false);
    window.addEventListener("afterprint", handleAfterPrint);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [isPrintReady]);
  const transformation = useMemo(
    () => normalizeCityTransformation(location.state?.cityTransformation, cityState.city.id),
    [cityState.city.id, location.state],
  );
  const scenario = useMemo(() => {
    const value = new URLSearchParams(location.search).get("demoScenario");
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      const decisionLabels = {
        "transit-first": "Transit-first mix",
        "green-corridor": "Green corridor",
        "dynamic-pricing": "Dynamic pricing",
      };
      const numericValues = [
        parsed.trafficBefore,
        parsed.trafficAfter,
        parsed.aqiBefore,
        parsed.aqiAfter,
      ];
      if (parsed.cityId !== cityState.city.id || !decisionLabels[parsed.optionId]
        || numericValues.some((item) => !Number.isFinite(item) || item < 0 || item > 1000)) return null;
      return {
        intervention: decisionLabels[parsed.optionId],
        trafficBefore: parsed.trafficBefore,
        trafficAfter: parsed.trafficAfter,
        aqiBefore: parsed.aqiBefore,
        aqiAfter: parsed.aqiAfter,
      };
    } catch {
      return null;
    }
  }, [cityState.city.id, location.search]);

  const createSnapshot = () => {
    setExportError("");
    setIsCapturing(true);
    window.setTimeout(() => {
      try {
        const problems = getCityDiagnosis({
          city: cityState.city,
          liveAirQuality: cityState.liveAirQuality,
          liveTrafficFlow: cityState.liveTrafficFlow,
        });
        const nextSnapshot = buildReportSnapshot({
          ...cityState,
          timestamp: new Date().toISOString(),
          populationEstimate: populationResult.estimate,
          predictions,
          cityHealth: calculateCityHealth({
            city: cityState.city,
            liveAirQuality: cityState.liveAirQuality,
            liveTrafficFlow: cityState.liveTrafficFlow,
          }),
          cityTransformation: transformation,
          demoScenario: transformation ? null : scenario,
          recommendations: cityState.aiInsights,
          aiInsights: cityState.aiInsights,
          problems,
          rootCauses: problems.map((problem) => ({
            problem: problem.title,
            evidence: problem.evidence,
            evidenceClass: problem.evidenceClass,
            possibleCause: problem.cause,
            causeStatus: "INFERRED / UNCONFIRMED",
            prediction: "Not available from current data source",
            recommendedAction: problem.nextCheck,
          })),
        });
        setSnapshot(nextSnapshot);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : "Could not generate the report snapshot.");
      } finally {
        setIsCapturing(false);
      }
    }, 0);
  };

  const download = (format) => {
    if (!snapshot) return;
    try {
      const body = format === "json"
        ? JSON.stringify(snapshot, null, 2)
        : [
          ["field", "value", "unit", "source", "timestamp", "status"].map(csvCell).join(","),
          ...flattenReportSnapshot(snapshot).map((row) => {
            const provenance = snapshot.dataProvenance.find(({ path }) => path === row.path);
            return [
              row.path,
              typeof row.value === "object" ? JSON.stringify(row.value) : row.value,
              provenance?.unit || row.unit,
              provenance?.source || row.source,
              provenance?.timestamp || row.timestamp,
              provenance?.status || row.status,
            ].map(csvCell).join(",");
          }),
        ].join("\n");
      const blob = new Blob([body], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFilename(snapshot.city.name)}-urban-intelligence-${snapshot.metadata.reportId}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : `Could not create ${format.toUpperCase()} export.`);
    }
  };

  const downloadPdf = async () => {
    if (!snapshot) return;
    setExportError("");
    setExportNotice("");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const logoDataUrl = await loadBrandLogoDataUrl();
      const margin = 14;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = margin;
      const ensureSpace = (needed = 6) => {
        if (y + needed <= pageHeight - margin) return;
        if (pdf.getNumberOfPages() >= 7) {
          throw new Error("This report exceeds the seven-page limit. Reduce available report details and try again.");
        }
        pdf.addPage();
        y = margin;
      };
      const narrative = buildReportNarrative(snapshot);
      const write = (text) => {
        const lines = pdf.splitTextToSize(String(text), width);
        lines.forEach((line) => {
          ensureSpace(6);
          pdf.text(line, margin, y);
          y += 5;
        });
      };
      const heading = (text) => {
        y += 3;
        ensureSpace(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        write(text);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        y += 1;
      };
      const drawLineChart = (title, rows, color) => {
        const values = rows.map((row) => finiteNumber(row.value)).filter((value) => value !== null);
        if (values.length < 2) return;
        ensureSpace(48);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(title, margin, y);
        y += 4;
        const plotX = margin + 8;
        const plotY = y;
        const plotWidth = width - 12;
        const plotHeight = 27;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max === min ? 1 : max - min;
        pdf.setDrawColor(190, 198, 207);
        pdf.setLineWidth(0.25);
        pdf.line(plotX, plotY, plotX, plotY + plotHeight);
        pdf.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight);
        const points = rows.flatMap((row, index) => {
          const value = finiteNumber(row.value);
          if (value === null) return [];
          return [{
            x: plotX + (rows.length === 1 ? 0 : index * plotWidth / (rows.length - 1)),
            y: plotY + plotHeight - ((value - min) / range) * (plotHeight - 2),
          }];
        });
        const rgb = color === "teal" ? [15, 118, 110] : color === "indigo" ? [79, 70, 229] : [100, 116, 139];
        pdf.setDrawColor(...rgb);
        pdf.setLineWidth(0.8);
        points.slice(1).forEach((point, index) => {
          pdf.line(points[index].x, points[index].y, point.x, point.y);
        });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(90, 100, 110);
        pdf.text(String(rows[0].label || ""), plotX, plotY + plotHeight + 4);
        pdf.text(String(rows.at(-1).label || ""), plotX + plotWidth, plotY + plotHeight + 4, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        y += plotHeight + 9;
      };
      const drawBarChart = (title, rows, unit, color = "teal") => {
        const data = rows
          .map((row) => ({ ...row, value: finiteNumber(row.value) }))
          .filter(({ value }) => value !== null);
        if (data.length < 2) return;
        ensureSpace(43);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(`${title} · ${unit}`, margin, y);
        y += 4;
        const plotY = y;
        const plotHeight = 22;
        const slotWidth = width / data.length;
        const maximum = Math.max(1, ...data.map(({ value }) => Math.abs(value)));
        const rgb = color === "amber" ? [217, 119, 6] : color === "rose" ? [190, 24, 93] : [15, 118, 110];
        data.forEach((row, index) => {
          const barWidth = Math.min(12, slotWidth * 0.55);
          const barHeight = Math.abs(row.value) / maximum * plotHeight;
          const x = margin + slotWidth * index + (slotWidth - barWidth) / 2;
          pdf.setFillColor(...rgb);
          pdf.rect(x, plotY + plotHeight - barHeight, barWidth, barHeight, "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6);
          pdf.setTextColor(90, 100, 110);
          pdf.text(String(row.name || "").slice(0, 14), x + barWidth / 2, plotY + plotHeight + 4, { align: "center" });
        });
        pdf.setTextColor(0, 0, 0);
        y += plotHeight + 9;
      };
      const drawPieChart = (title, rows) => {
        const data = rows
          .map((row) => ({ ...row, value: finiteNumber(row.value) }))
          .filter(({ value }) => value !== null && value > 0);
        const total = data.reduce((sum, row) => sum + row.value, 0);
        if (data.length < 2 || total <= 0) return;
        ensureSpace(52);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(title, margin, y);
        y += 4;
        const colors = [[15, 118, 110], [8, 145, 178], [79, 70, 229], [217, 119, 6], [190, 24, 93], [100, 116, 139], [71, 85, 105]];
        const centerX = margin + 23;
        const centerY = y + 19;
        const radius = 17;
        let startAngle = -Math.PI / 2;
        data.forEach((row, index) => {
          const endAngle = startAngle + row.value / total * Math.PI * 2;
          pdf.setFillColor(...colors[index % colors.length]);
          const segments = Math.max(1, Math.ceil((endAngle - startAngle) / (Math.PI / 36)));
          for (let segment = 0; segment < segments; segment += 1) {
            const angle1 = startAngle + (endAngle - startAngle) * segment / segments;
            const angle2 = startAngle + (endAngle - startAngle) * (segment + 1) / segments;
            pdf.triangle(
              centerX,
              centerY,
              centerX + Math.cos(angle1) * radius,
              centerY + Math.sin(angle1) * radius,
              centerX + Math.cos(angle2) * radius,
              centerY + Math.sin(angle2) * radius,
              "F",
            );
          }
          startAngle = endAngle;
          const legendY = y + 7 + index * 5;
          pdf.setFillColor(...colors[index % colors.length]);
          pdf.rect(margin + 48, legendY - 2.5, 3, 3, "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(70, 80, 90);
          pdf.text(`${row.name}: ${row.value}`, margin + 53, legendY);
        });
        pdf.setTextColor(0, 0, 0);
        y += 42;
      };
      const drawScenarioChart = (scenario) => {
        const rows = scenario?.beforeAfter || [];
        const comparable = rows.filter((row) => finiteNumber(row.before) !== null && finiteNumber(row.after) !== null);
        if (!comparable.length || !comparable.every(({ unit }) => unit === comparable[0].unit)) return;
        ensureSpace(50);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(`Before vs after · ${comparable[0].unit}`, margin, y);
        y += 5;
        const max = Math.max(1, ...comparable.flatMap(({ before, after }) => [Number(before), Number(after)]));
        const chartWidth = width / comparable.length;
        const chartHeight = 25;
        comparable.forEach((row, index) => {
          const center = margin + chartWidth * (index + 0.5);
          const barWidth = Math.min(8, chartWidth / 4);
          const beforeHeight = Number(row.before) / max * chartHeight;
          const afterHeight = Number(row.after) / max * chartHeight;
          pdf.setFillColor(100, 116, 139);
          pdf.rect(center - barWidth - 1, y + chartHeight - beforeHeight, barWidth, beforeHeight, "F");
          pdf.setFillColor(8, 145, 178);
          pdf.rect(center + 1, y + chartHeight - afterHeight, barWidth, afterHeight, "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6);
          pdf.text(String(row.metric).slice(0, 18), center, y + chartHeight + 4, { align: "center" });
        });
        y += chartHeight + 10;
        pdf.setFontSize(7);
        pdf.text("Before", margin, y);
        pdf.setFillColor(100, 116, 139);
        pdf.rect(margin + 12, y - 2.5, 3, 3, "F");
        pdf.text("After", margin + 20, y);
        pdf.setFillColor(8, 145, 178);
        pdf.rect(margin + 30, y - 2.5, 3, 3, "F");
        y += 5;
      };
      pdf.addImage(logoDataUrl, "PNG", margin, y, 16, 16);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("YUG NIRMAN", margin + 21, y + 7);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text("AI-POWERED URBAN DIGITAL TWIN · CITY INTELLIGENCE", margin + 21, y + 12);
      y += 23;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      write(`${snapshot.city.name} Urban Intelligence Report`);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      write(`Generated: ${snapshot.timestamp} · Report ID: ${snapshot.metadata.reportId}`);
      write(`Coverage: ${snapshot.dataCoverage.completenessPercent}% · Forecast confidence unavailable unless stated · Accuracy not validated`);
      write("Complete field-level values and provenance are available in the matching JSON and CSV snapshot exports.");
      write(narrative.methodology);
      write("");
      REPORT_SECTIONS.forEach(([sectionTitle], index) => {
        if (index === 6 && snapshot.scenarios.length === 0) return;
        heading(sectionTitle);
        getPdfSectionLines(snapshot, index).forEach(write);
        if (index === 2) {
          const temperature = getForecastChartRows(snapshot, "weather");
          const aqi = getForecastChartRows(snapshot, "air");
          const traffic = (Array.isArray(snapshot.traffic.profile.today) ? snapshot.traffic.profile.today : [])
            .flatMap((point) => {
              const value = finiteNumber(point.congestion);
              return value === null || !point.time ? [] : [{ label: point.time, value }];
            });
          if (temperature.length >= 2) {
                write(`Temperature · ${temperature[0].unit} · ${temperature[0].source} · ${temperature[0].status} · ${temperature[0].timestamp} to ${temperature[temperature.length - 1].timestamp}`);
            drawLineChart("Temperature forecast", temperature, "teal");
          }
          if (aqi.length >= 2) {
                write(`Air quality · ${aqi[0].unit} · ${aqi[0].source} · ${aqi[0].status} · ${aqi[0].timestamp} to ${aqi[aqi.length - 1].timestamp}`);
            drawLineChart("Air-quality forecast", aqi, "indigo");
          }
          if (traffic.length >= 2) {
            write("Traffic profile · congestion index (%) · Bundled traffic profile · ESTIMATED · timestamp unavailable");
            drawLineChart("Traffic profile trend", traffic, "slate");
          }
          const water = (Array.isArray(snapshot.water.weeklyTrend) ? snapshot.water.weeklyTrend : [])
            .flatMap((point) => {
              const value = finiteNumber(point.consumption);
              return value === null ? [] : [{ name: point.day || "Day", value }];
            });
          if (water.length >= 2) {
            write("Water demand profile · MLD · Bundled water profile · ESTIMATED · timestamp unavailable");
            drawBarChart("Water use by day", water, "MLD", "teal");
          }
          const energy = (Array.isArray(snapshot.energy.hourlyGridLoad) ? snapshot.energy.hourlyGridLoad : [])
            .flatMap((point) => {
              const value = finiteNumber(point.actual);
              return value === null ? [] : [{ label: point.time || "Time unavailable", value }];
            });
          if (energy.length >= 2) {
            write("Energy load profile · MW · Bundled energy profile · ESTIMATED · timestamp unavailable");
            drawLineChart("Energy load profile", energy, "teal");
          }
          const population = (Array.isArray(snapshot.population.profile?.historyAndForecast)
            ? snapshot.population.profile.historyAndForecast
            : [])
            .flatMap((point) => {
              const value = finiteNumber(point.population);
              return value === null ? [] : [{ label: String(point.year || "Year unavailable"), value }];
            });
          if (population.length >= 2) {
            write("Population profile · million people · Bundled population profile · ESTIMATED · year labels only; not live observations");
            drawLineChart("Population profile", population, "slate");
          }
        }
        if (index === 3) {
          const severityOrder = ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"];
          const risks = getTopRisks(snapshot)
            .filter(({ level }) => severityOrder.includes(level))
            .slice(0, 5)
            .map((risk) => ({ name: risk.risk, value: severityOrder.indexOf(risk.level) + 1 }));
          if (risks.length >= 2) {
            write("Risk severity · ordered scale 1–5, not probability · report snapshot climate-risk records");
            drawBarChart("Available climate-risk severity", risks, "severity level", "amber");
          }
        }
        if (index === 4) {
          const problems = getProblemCounts(snapshot, "problems");
          if (problems.length >= 2) {
            write("Problem records grouped by stated severity · source: City diagnosis · count, not probability");
            drawBarChart("Top problem records", problems, "records", "rose");
          }
        }
        if (index === 8) {
          const health = (Array.isArray(snapshot.cityHealth.dimensions) ? snapshot.cityHealth.dimensions : [])
            .flatMap(({ label, score }) => {
              const value = finiteNumber(score);
              return value === null ? [] : [{ name: label, value }];
            });
          if (health.length >= 2) {
            write(`City Health dashboard dimensions · score / 100 · ${snapshot.cityHealth.methodology || "Shared City Health calculator"} · ${chartTimestamp(snapshot.cityHealth.timestamp)}`);
            drawBarChart("City Health components", health, "score / 100", "teal");
          }
        }
        if (index === 9) {
          const coverage = Object.entries(snapshot.dataCoverage.statusCounts || [])
            .flatMap(([name, rawValue]) => {
              const value = finiteNumber(rawValue);
              return value === null || value <= 0 ? [] : [{ name, value }];
            });
          if (coverage.length >= 2) {
            write(`Data status counts · report snapshot provenance · ${chartTimestamp(snapshot.timestamp)}`);
            drawPieChart("Data status composition", coverage);
          }
        }
        if (index === 6) drawScenarioChart(getScenarioSummary(snapshot));
      });
      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`YUG NIRMAN · ${snapshot.city.name} · Page ${page} of ${totalPages}`, margin, pageHeight - 7);
      }
      const filename = `${safeFilename(snapshot.city.name)}-urban-intelligence-${snapshot.metadata.reportId}.pdf`;
      const pdfBlob = pdf.output("blob");
      pdf.save(filename);
      if (currentUser?.authType === "user") {
        try {
          await archiveCityIntelligencePdf(snapshot, currentUser, pdfBlob, filename);
          setExportNotice("PDF downloaded and saved to this browser’s report archive.");
          setExportError("");
        } catch (error) {
          setExportError(`PDF downloaded, but archive save failed: ${error instanceof Error ? error.message : "Unknown storage error."}`);
        }
      } else {
        setExportError("");
        setExportNotice("PDF downloaded. Report archiving is unavailable in the public demo.");
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not create PDF export.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeader
        title="Urban Intelligence Report"
        subtitle="A concise city decision report: current indicators, emerging risks, trends, actions, and data limitations."
        badge="Snapshot report"
      />
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-4">
        <button
          type="button"
          onClick={createSnapshot}
          disabled={isCapturing}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isCapturing ? "animate-spin" : ""}`} />
          {isCapturing ? "Capturing snapshot…" : snapshot ? "Capture new snapshot" : "Generate report snapshot"}
        </button>
        {snapshot && (
          <>
            <button type="button" onClick={() => download("json")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/50">
              <FileJson2 aria-hidden="true" className="h-4 w-4" /> JSON
            </button>
            <button type="button" onClick={() => download("csv")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/50">
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" /> CSV
            </button>
            <button type="button" onClick={downloadPdf} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/50">
              <Download aria-hidden="true" className="h-4 w-4" /> Summary PDF
            </button>
            <button type="button" onClick={() => setIsPrintReady(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/50">
              <Printer aria-hidden="true" className="h-4 w-4" /> Print
            </button>
          </>
        )}
        {exportError && <p role="alert" className="w-full text-xs text-rose-300">{exportError}</p>}
        {exportNotice && <p role="status" className="w-full text-xs text-emerald-300">{exportNotice}</p>}
        <p className="w-full text-xs leading-relaxed text-slate-400">
          All formats use the same frozen snapshot. The PDF is a concise summary; the searchable register and JSON/CSV contain the complete available detail. Missing values are never fabricated.
        </p>
      </div>
      {!snapshot ? (
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
          <h2 className="text-lg font-bold text-white">Ready to capture {cityState.city.name}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Generate a point-in-time report from CityState, current weather and air-quality feeds, traffic status, prediction output, city health, map features, and any attached what-if run.
          </p>
          {cityState.liveDataLoading && <p className="mt-3 text-xs text-cyan-200">Live feeds are still loading. You can wait for them or generate a report that records their current status.</p>}
          {transformation && <p className="mt-3 text-xs text-emerald-200">A simulated city transformation is attached to this report.</p>}
          {!transformation && !scenario && <p className="mt-3 text-xs text-slate-500">{NO_SCENARIO}</p>}
        </section>
      ) : (
        <article key={snapshot.metadata.reportId} className="report-snapshot space-y-4 rounded-2xl bg-slate-100 p-4 text-slate-900 md:p-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <BrandMark className="h-12 w-12 rounded-xl bg-emerald-300 p-2" />
              <div>
                <p className="text-base font-black tracking-wide text-slate-950">YUG NIRMAN</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                  AI-Powered Urban Digital Twin
                </p>
              </div>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Urban intelligence report</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{snapshot.city.name} Urban Intelligence Report</h1>
            <p className="mt-3 text-sm text-slate-700">Generated {snapshot.timestamp} · Report ID: {snapshot.metadata.reportId}</p>
            <p className="mt-2 text-sm text-slate-600">
              {snapshot.city.state ? `Region: ${snapshot.city.state} · ` : ""}
              Data coverage: {snapshot.dataCoverage.completenessPercent}% · Accuracy: not validated
            </p>
          </header>
          <p className="px-1 text-sm leading-relaxed text-slate-700">
          Each report section has one purpose: headline indicators appear once, and the complete metric register includes the remaining fields with their source, timestamp, and status. JSON and CSV preserve the full frozen snapshot.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">Report sections</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isPrintReady || showAllDetails
                  ? "All report sections are open. The metric register stays searchable and paged."
                  : "Open a section for details. Search the complete metric register to find any captured field."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAllDetails(true)}
                disabled={isPrintReady || showAllDetails}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-700/40 px-3 py-2 text-sm font-semibold text-teal-900 hover:border-teal-600 disabled:cursor-default disabled:opacity-50"
              >
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
                Expand all sections
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllDetails(false);
                  setDetailRevision((revision) => revision + 1);
                }}
                disabled={isPrintReady}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500 disabled:cursor-default disabled:opacity-50"
              >
                <ChevronUp aria-hidden="true" className="h-4 w-4" />
                Collapse all
              </button>
            </div>
          </div>
          <div key={detailRevision} className="space-y-3">
            {REPORT_SECTIONS
              .filter(([title]) => title !== "07 What-If + Before → After" || snapshot.scenarios.length > 0)
              .map(([title, select, chartKind, sectionKind], index) => (
                <ReportSection
                  key={title}
                  title={title}
                  snapshot={snapshot}
                  select={select}
                  chartKind={chartKind}
                  sectionKind={sectionKind}
                  expandAll={isPrintReady || showAllDetails}
                  initiallyOpen={index < 2}
                />
              ))}
          </div>
        </article>
      )}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .report-snapshot { color: black !important; }
          .report-snapshot section, .report-snapshot header { break-inside: avoid; background: white !important; color: black !important; border-color: #999 !important; }
          .report-snapshot * { color: black !important; }
          button, nav, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportGeneration;
