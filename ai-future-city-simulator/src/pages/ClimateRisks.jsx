import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CloudRain,
  Database,
  Droplet,
  Eye,
  Flame,
  Gauge,
  MapPin,
  ShieldCheck,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import ClimateRiskMap from "../components/dashboard/ClimateRiskMap";
import { useCity } from "../context/CityContext";
import useCurrentPopulationEstimate from "../hooks/useCurrentPopulationEstimate";
import { getClimateSystemIndicators } from "../utils/climateSystemIndicators";
import {
  assessCityWeatherForecast,
  assessClimateSignals,
  buildClimateScenario,
  calculateScreeningScore,
  classifyHeat,
  classifyRainfall,
  classifyUsAqi,
  classifyWind,
  formatTimestamp,
  getForecastSnapshot,
  getRiskTrend,
  toTimestampMs,
} from "../utils/climateRiskEngine";

const UNAVAILABLE = "Data unavailable — risk cannot be reliably assessed.";

const RISK_SCORE_CLASSES = {
  LOW: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  MODERATE: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
  HIGH: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  "VERY HIGH": "border-rose-400/30 bg-rose-400/10 text-rose-200",
  CRITICAL: "border-red-500/40 bg-red-500/15 text-red-200",
  "CONTEXT ONLY": "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  "PROXY AVAILABLE": "border-violet-400/30 bg-violet-400/10 text-violet-100",
  "MULTIPLE SIGNALS": "border-orange-400/30 bg-orange-400/10 text-orange-100",
  UNAVAILABLE: "border-slate-600 bg-slate-800 text-slate-300",
};

const SEVERITY_ORDER = ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"];
const SCREENING_SCORE_TIERS = {
  10: "LOW",
  30: "MODERATE",
  55: "HIGH",
  75: "VERY HIGH",
  90: "CRITICAL",
};

const SYSTEM_INDICATOR_ICONS = {
  "Climate risk screening": Flame,
  Traffic: Activity,
  "Energy demand": Zap,
  "Water demand": Droplet,
  "Infrastructure readiness proxy": Gauge,
  Population: MapPin,
  "Public safety": ShieldCheck,
  "Climate resilience proxy": ShieldCheck,
};

const compareSeverity = (first, second) =>
  SEVERITY_ORDER.indexOf(first) - SEVERITY_ORDER.indexOf(second);

const screeningLevel = (score) => SCREENING_SCORE_TIERS[score] || "UNAVAILABLE";

const riskAction = (level, kind) => {
  if (level === "UNAVAILABLE") return UNAVAILABLE;
  if (level === "CRITICAL" || level === "VERY HIGH" || level === "HIGH") {
    return "Check official local alerts and follow the city's relevant response plan.";
  }
  if (level === "MODERATE") return "Review local conditions and continue monitoring official updates.";
  if (kind === "airQuality") return "Continue monitoring the public air-quality model.";
  return "Continue monitoring the available city-coordinate forecast.";
};

const readMetric = ({ name, value, unit, source, timestamp, status }) => ({
  name,
  value: typeof value === "number" && Number.isFinite(value) ? value : null,
  unit: unit || "",
  source: source || "No connected source",
  timestamp: timestamp || null,
  status: value == null || !Number.isFinite(Number(value)) ? "UNAVAILABLE" : status,
});

const formatMetricValue = (metric, digits = 1) => {
  if (metric.value === null) return UNAVAILABLE;
  return `${Number(metric.value.toFixed(digits))}${metric.unit ? ` ${metric.unit}` : ""}`;
};

const formatLocation = (city) => {
  if (!Array.isArray(city.coordinates) || city.coordinates.length !== 2) return "City location unavailable";
  return `${city.name} city-centre reference · ${city.coordinates[0]}, ${city.coordinates[1]}`;
};

const findForecastPeak = ({ weatherHourly, airQualityHourly, signal, now }) => {
  const candidates = [];
  const weatherTimes = weatherHourly?.time || [];
  const airTimes = airQualityHourly?.time || [];
  const maxLength = Math.max(weatherTimes.length, airTimes.length);

  for (let index = 0; index < maxLength; index += 1) {
    const weatherTimestamp = toTimestampMs(weatherTimes[index]);
    const airTimestamp = toTimestampMs(airTimes[index]);
    const timestamp = weatherTimestamp ?? airTimestamp;
    if (timestamp === null || timestamp < now || timestamp > now + 5 * 24 * 60 * 60 * 1000) continue;

    const snapshot = getForecastSnapshot({
      weatherHourly,
      airQualityHourly,
      targetTimestamp: timestamp,
    });
    const value = signal.value(snapshot);
    const level = signal.classify(value);
    if (level && value !== null) candidates.push({ level, timestamp, value });
  }

  return candidates.sort((left, right) => compareSeverity(right.level, left.level))[0] || null;
};

const getLevel = (signals, keys) => {
  const levels = keys.map((key) => signals[key]).filter(Boolean);
  return levels.sort(compareSeverity).at(-1) || "UNAVAILABLE";
};

const ClimateMetricCard = ({ metric, icon: Icon }) => (
  <article className="rounded-2xl border border-slate-700/80 bg-slate-950/65 p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-slate-300">{metric.name}</h3>
      {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />}
    </div>
    <p className={`mt-2 break-words text-lg font-bold leading-snug ${metric.value === null ? "text-slate-400" : "text-white"}`}>
      {formatMetricValue(metric)}
    </p>
    <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-400">
      <p><span className="text-slate-500">Source:</span> {metric.source}</p>
      <p><span className="text-slate-500">Time:</span> {formatTimestamp(metric.timestamp)}</p>
      <p><span className="text-slate-500">Status:</span> {metric.status}</p>
    </div>
  </article>
);

const SeverityBadge = ({ level }) => (
  <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${RISK_SCORE_CLASSES[level] || RISK_SCORE_CLASSES.UNAVAILABLE}`}>
    {level}
  </span>
);

const RiskCard = ({ risk, isSelected, onSelect }) => (
  <motion.button
    type="button"
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.99 }}
    onClick={onSelect}
    aria-pressed={isSelected}
    className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
      isSelected ? "border-cyan-300/50 bg-cyan-950/30" : "border-slate-700/80 bg-slate-950/65 hover:border-slate-500"
    }`}
  >
    <span className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-bold text-white">{risk.name}</span>
      <SeverityBadge level={risk.level} />
    </span>
    <span className="mt-2 block text-xs text-slate-300">{risk.location}</span>
    <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">
      <strong className="text-slate-300">Evidence:</strong> {risk.evidence}
    </span>
    <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">
      <strong className="text-slate-300">Expected:</strong> {risk.expectedTime}
    </span>
    <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">
      <strong className="text-slate-300">Forecast:</strong> {risk.forecast}
    </span>
    <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">
      <strong className="text-slate-300">Potential impact:</strong> {risk.potentialImpact}
    </span>
    <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">
      <strong className="text-slate-300">Action:</strong> {risk.action}
    </span>
    <span className="mt-2 block border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-500">
      {risk.status} · {risk.source} · {formatTimestamp(risk.timestamp)}
    </span>
  </motion.button>
);

const getSignalDefinitions = (measurements) => [
  {
    id: "heat",
    name: "Extreme heat",
    metric: "temperature",
    unit: "°C",
    source: measurements.temperature.source,
    timestamp: measurements.temperature.timestamp,
    classify: classifyHeat,
    value: (snapshot) => Math.max(
      Number.isFinite(snapshot.temperature) ? snapshot.temperature : Number.NEGATIVE_INFINITY,
      Number.isFinite(snapshot.feelsLike) ? snapshot.feelsLike : Number.NEGATIVE_INFINITY,
    ),
    evidence: (value) => `City-coordinate temperature / feels-like screen ${value.toFixed(1)} °C`,
    actionKind: "heat",
    potentialImpact: "City-specific health and energy impacts are not connected.",
  },
  {
    id: "rainfall",
    name: "Heavy rainfall",
    metric: "precipitation",
    unit: "mm",
    source: measurements.rainfall.source,
    timestamp: measurements.rainfall.timestamp,
    classify: classifyRainfall,
    value: (snapshot) => snapshot.precipitation,
    evidence: (value) => `City-coordinate rainfall model ${value.toFixed(1)} mm`,
    actionKind: "rainfall",
    potentialImpact: "Local drainage and road impact data are not connected.",
  },
  {
    id: "wind",
    name: "Storm / high wind",
    metric: "windGust",
    unit: "km/h",
    source: measurements.windGust.source,
    timestamp: measurements.windGust.timestamp,
    classify: classifyWind,
    value: (snapshot) => snapshot.windGust,
    evidence: (value) => `City-coordinate wind gust model ${value.toFixed(1)} km/h`,
    actionKind: "wind",
    potentialImpact: "Local structural and service impacts are not connected.",
  },
  {
    id: "airQuality",
    name: "Air quality risk",
    metric: "aqi",
    unit: "US AQI",
    source: measurements.aqi.source,
    timestamp: measurements.aqi.timestamp,
    classify: classifyUsAqi,
    value: (snapshot) => snapshot.aqi,
    evidence: (value) => `Open-Meteo US AQI model ${Math.round(value)}`,
    actionKind: "airQuality",
    potentialImpact: "Local exposure and health impacts are not connected.",
  },
];

export const ClimateRisks = () => {
  const {
    city,
    liveWeather,
    liveWeatherHourly,
    liveWeatherError,
    liveAirQuality,
    liveAirQualityHourly,
    liveAirQualityError,
    liveTrafficFlow,
    liveDataLoading,
  } = useCity();
  const populationResult = useCurrentPopulationEstimate(city);
  const [selectedRiskId, setSelectedRisk] = useState("heat");
  const [rainfallChange, setRainfallChange] = useState(30);
  const [temperatureChange, setTemperatureChange] = useState(3);
  const [waterAvailabilityChange, setWaterAvailabilityChange] = useState(20);
  const now = Date.now();
  const location = formatLocation(city);
  const weatherTimestamp = liveWeather?.time ?? null;
  const airTimestamp = liveAirQuality?.time ?? null;
  const weatherSource = "Open-Meteo forecast model";
  const airQualitySource = "Open-Meteo air-quality model";
  const usAqi = Number(liveAirQuality?.us_aqi);
  const hasUsAqi = liveAirQuality?.us_aqi != null && Number.isFinite(usAqi);
  const hourlyNow = getForecastSnapshot({
    weatherHourly: liveWeatherHourly,
    targetTimestamp: toTimestampMs(weatherTimestamp),
  });

  const weather = liveWeather || {};
  const air = liveAirQuality || {};
  const aqiUnit = air.us_aqi != null
    ? "US AQI"
    : air.european_aqi != null
      ? "European AQI"
      : "";
  const measurements = {
    temperature: readMetric({
        name: "Temperature",
        value: weather.temperature_2m == null ? null : Number(weather.temperature_2m),
        unit: "°C",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    feelsLike: readMetric({
        name: "Feels like",
        value: weather.apparent_temperature == null ? null : Number(weather.apparent_temperature),
        unit: "°C",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    humidity: readMetric({
        name: "Humidity",
        value: weather.relative_humidity_2m == null ? null : Number(weather.relative_humidity_2m),
        unit: "%",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    rainfall: readMetric({
        name: "Rainfall",
        value: weather.precipitation == null ? null : Number(weather.precipitation),
        unit: "mm",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    windSpeed: readMetric({
        name: "Wind speed",
        value: weather.wind_speed_10m == null ? null : Number(weather.wind_speed_10m),
        unit: "km/h",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    windGust: readMetric({
        name: "Wind gust",
        value: weather.wind_gusts_10m == null ? null : Number(weather.wind_gusts_10m),
        unit: "km/h",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    aqi: readMetric({
        name: "Air quality index",
        value: hasUsAqi ? usAqi : air.european_aqi == null ? null : Number(air.european_aqi),
        unit: aqiUnit,
        source: airQualitySource,
        timestamp: airTimestamp,
        status: "ESTIMATED",
      }),
    uvIndex: readMetric({
        name: "UV index",
        value: weather.uv_index == null ? null : Number(weather.uv_index),
        unit: "index",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    visibility: readMetric({
        name: "Visibility",
        value: weather.visibility == null ? null : Number(weather.visibility) / 1000,
        unit: "km",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    precipitationProbability: readMetric({
        name: "Rain probability",
        value: hourlyNow.precipitationProbability,
        unit: "%",
        source: weatherSource,
        timestamp: hourlyNow.timestamp ?? weatherTimestamp,
        status: "ESTIMATED",
      }),
    pressure: readMetric({
        name: "Pressure",
        value: weather.pressure_msl == null ? null : Number(weather.pressure_msl),
        unit: "hPa",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    cloudCover: readMetric({
        name: "Cloud cover",
        value: weather.cloud_cover == null ? null : Number(weather.cloud_cover),
        unit: "%",
        source: weatherSource,
        timestamp: weatherTimestamp,
        status: "ESTIMATED",
      }),
    soilMoisture: readMetric({
        name: "Soil moisture (0–7 cm)",
        value: hourlyNow.soilMoisture,
        unit: "m³/m³",
        source: "Open-Meteo soil-moisture model",
        timestamp: hourlyNow.timestamp,
        status: "ESTIMATED",
    }),
  };

  const currentSnapshot = {
    temperature: measurements.temperature.value,
    feelsLike: measurements.feelsLike.value,
    precipitation: measurements.rainfall.value,
    windGust: measurements.windGust.value,
    aqi: hasUsAqi ? measurements.aqi.value : null,
  };
  const currentSignals = assessClimateSignals(currentSnapshot);
  const currentScreeningScore = calculateScreeningScore(Object.values(currentSignals));
  const forecast24 = assessCityWeatherForecast({
    weatherHourly: liveWeatherHourly,
    airQualityHourly: liveAirQualityHourly,
    startTimestamp: now,
    hours: 24,
  });
  const forecastScreeningScore = forecast24?.score ?? null;
  const trend = getRiskTrend(currentScreeningScore, forecastScreeningScore);
  const systemIndicators = getClimateSystemIndicators({
    city,
    liveTrafficFlow,
    liveAirQuality,
    soilMoisture: measurements.soilMoisture.value,
    soilMoistureTimestamp: measurements.soilMoisture.timestamp,
    populationEstimate: populationResult.estimate,
    climateRiskScore: currentScreeningScore,
    climateRiskTimestamp: weatherTimestamp || airTimestamp,
  });
  const resilienceIndicator = systemIndicators.find(({ name }) => name === "Climate resilience proxy");
  const infrastructureIndicator = systemIndicators.find(({ name }) => name === "Infrastructure readiness proxy");
  const vulnerabilityProxy = resilienceIndicator?.value == null
    ? null
    : Number((100 - resilienceIndicator.value).toFixed(1));
  const infrastructureStressProxy = infrastructureIndicator?.value == null
    ? null
    : Number((100 - infrastructureIndicator.value).toFixed(1));

  const signals = getSignalDefinitions(measurements);
  const signalRisks = signals.map((signal) => {
    const rawCurrentValue = signal.metric === "aqi" && !hasUsAqi
      ? null
      : signal.value(currentSnapshot);
    const currentValue = Number.isFinite(rawCurrentValue) ? rawCurrentValue : null;
    const currentLevel = signal.classify(currentValue);
    const peak = findForecastPeak({
      weatherHourly: liveWeatherHourly,
      airQualityHourly: liveAirQualityHourly,
      signal,
      now,
    });
    const forecastLevel = peak?.level || "UNAVAILABLE";
    const level = currentLevel || forecastLevel;
    const evidence = currentValue == null
      ? UNAVAILABLE
      : signal.evidence(currentValue);
    const forecast = peak
      ? `PREDICTED · ${peak.level} · ${signal.evidence(peak.value)}`
      : UNAVAILABLE;

    return {
      id: signal.id,
      name: signal.name,
      location,
      level,
      status: currentLevel ? "INFERRED" : peak ? "PREDICTED" : "UNAVAILABLE",
      evidence,
      expectedTime: currentLevel && compareSeverity(currentLevel, "HIGH") >= 0
          ? "Now (current model conditions)"
          : peak && compareSeverity(peak.level, "HIGH") >= 0
          ? formatTimestamp(peak.timestamp)
          : currentLevel
            ? "No HIGH-or-above signal in the available forecast"
            : "Unavailable",
      forecast,
      potentialImpact: signal.potentialImpact,
      action: riskAction(level, signal.actionKind),
      source: currentValue != null ? signal.source : peak ? "Open-Meteo hourly forecast model" : "No connected source",
      timestamp: currentValue != null ? signal.timestamp : peak?.timestamp ?? null,
      currentLevel: currentLevel || "UNAVAILABLE",
      forecastLevel,
    };
  });

  const highCurrentRisks = signalRisks.filter((risk) =>
    risk.currentLevel !== "UNAVAILABLE" && compareSeverity(risk.currentLevel, "HIGH") >= 0
  );
  const coOccurringHighSignals = highCurrentRisks.length;
  const combinedLevel = coOccurringHighSignals >= 2 ? "MULTIPLE SIGNALS" : "UNAVAILABLE";
  const extremeLevel = getLevel(currentSignals, ["heat", "rainfall", "wind"]);
  const rainfallRisk = signalRisks.find(({ id }) => id === "rainfall");
  const soilMoisture = measurements.soilMoisture;

  const risks = [
    signalRisks.find(({ id }) => id === "heat"),
    signalRisks.find(({ id }) => id === "rainfall"),
    {
      id: "flood",
      name: "Flood risk · rainfall-driver screen",
      location,
      level: rainfallRisk?.currentLevel === "UNAVAILABLE" ? "UNAVAILABLE" : rainfallRisk?.currentLevel || "UNAVAILABLE",
      status: rainfallRisk?.currentLevel === "UNAVAILABLE" ? "UNAVAILABLE" : "INFERRED · RAINFALL ONLY",
      evidence: measurements.rainfall.value === null
        ? "Rainfall measurement unavailable. Flooding cannot be assessed without local gauges, drainage, elevation, and flood-zone data."
        : `Rainfall model: ${measurements.rainfall.value.toFixed(1)} mm; rain probability: ${measurements.precipitationProbability.value == null ? "unavailable" : `${measurements.precipitationProbability.value}%`}. This screens rainfall only; it does not estimate flooding.`,
      expectedTime: rainfallRisk?.expectedTime || "Unavailable",
      forecast: rainfallRisk?.forecast || UNAVAILABLE,
      potentialImpact: "Flood depth, extent, affected roads, and neighbourhood exposure are not available from this weather feed.",
      action: measurements.rainfall.value === null
        ? UNAVAILABLE
        : "Use local flood alerts and gauge data; this rainfall screen is not a flood warning.",
      source: measurements.rainfall.source,
      timestamp: measurements.rainfall.timestamp,
      currentLevel: rainfallRisk?.currentLevel || "UNAVAILABLE",
      forecastLevel: rainfallRisk?.forecastLevel || "UNAVAILABLE",
    },
    signalRisks.find(({ id }) => id === "wind"),
    {
      id: "drought",
      name: "Drought / water-stress context",
      location,
      level: soilMoisture.value === null ? "UNAVAILABLE" : "CONTEXT ONLY",
      status: soilMoisture.value === null ? "UNAVAILABLE" : "ESTIMATED",
      evidence: soilMoisture.value === null
        ? "Soil-moisture model is unavailable; no connected utility water-availability feed."
        : `Open-Meteo modelled soil moisture (0–7 cm): ${soilMoisture.value.toFixed(3)} m³/m³. No local historical baseline is available to classify drought.`,
      expectedTime: "Drought timing not calculated",
      forecast: soilMoisture.value === null ? UNAVAILABLE : "Soil moisture is a model context value, not a drought forecast.",
      potentialImpact: "Municipal supply, groundwater, reservoir, and crop/soil baseline data are not connected.",
      action: soilMoisture.value === null ? UNAVAILABLE : "Compare with local soil-moisture history and water-supply reports before assessing drought.",
      source: soilMoisture.source,
      timestamp: soilMoisture.timestamp,
      currentLevel: "UNAVAILABLE",
      forecastLevel: "UNAVAILABLE",
    },
    signalRisks.find(({ id }) => id === "airQuality"),
    {
      id: "extreme-weather",
      name: "Extreme weather",
      location,
      level: extremeLevel,
      status: extremeLevel === "UNAVAILABLE" ? "UNAVAILABLE" : "INFERRED",
      evidence: extremeLevel === "UNAVAILABLE"
        ? UNAVAILABLE
        : `Highest available heat, rainfall, or wind screen: ${extremeLevel}. No official warning feed is connected.`,
      expectedTime: forecast24?.timestamp ? formatTimestamp(forecast24.timestamp) : "Unavailable",
      forecast: forecast24
        ? `PREDICTED · Highest available city-coordinate screening score: ${forecast24.score}/90`
        : UNAVAILABLE,
      potentialImpact: "No validated city impact model is connected.",
      action: riskAction(extremeLevel, "extremeWeather"),
      source: "Open-Meteo city-coordinate weather model",
      timestamp: weatherTimestamp,
      currentLevel: extremeLevel,
      forecastLevel: forecast24 ? "PREDICTED" : "UNAVAILABLE",
    },
    {
      id: "climate-vulnerability",
      name: "Climate vulnerability context",
      location,
      level: vulnerabilityProxy === null ? "UNAVAILABLE" : "PROXY AVAILABLE",
      status: vulnerabilityProxy === null ? "UNAVAILABLE" : "ESTIMATED · CITY HEALTH PROXY",
      evidence: vulnerabilityProxy === null
        ? "Shared City Health resilience inputs are unavailable."
        : `Inverse of the shared City Health climate-resilience proxy: ${vulnerabilityProxy}/100. This is not a validated vulnerability or exposure score.`,
      expectedTime: "Long-term vulnerability assessment not calculated",
      forecast: "No long-range climate hazard or neighbourhood exposure model is connected.",
      potentialImpact: "Sensitivity, adaptive capacity, and spatial exposure are not jointly measured.",
      action: "Use this proxy only as context; assess vulnerability with validated local exposure and demographic data.",
      source: resilienceIndicator?.source || "Shared City Health calculation",
      timestamp: resilienceIndicator?.timestamp || null,
      currentLevel: "UNAVAILABLE",
      forecastLevel: "UNAVAILABLE",
    },
    {
      id: "infrastructure-stress",
      name: "Infrastructure climate-stress context",
      location,
      level: infrastructureStressProxy === null ? "UNAVAILABLE" : "PROXY AVAILABLE",
      status: infrastructureStressProxy === null ? "UNAVAILABLE" : "ESTIMATED · READINESS PROXY",
      evidence: infrastructureStressProxy === null
        ? "Shared City Health infrastructure readiness proxy is unavailable."
        : `Inverse of the shared City Health infrastructure-readiness proxy: ${infrastructureStressProxy}/100. This is not measured climate damage or asset stress.`,
      expectedTime: "Asset-specific stress timing not calculated",
      forecast: "No asset inventory, condition data, or climate-stress model is connected.",
      potentialImpact: "Asset-level damage, service interruption, and affected locations are not available.",
      action: "Use asset-condition records and local climate design standards for infrastructure stress assessment.",
      source: infrastructureIndicator?.source || "Shared City Health calculation",
      timestamp: infrastructureIndicator?.timestamp || null,
      currentLevel: "UNAVAILABLE",
      forecastLevel: "UNAVAILABLE",
    },
    {
      id: "combined",
      name: "Combined / multi-hazard risk",
      location,
      level: combinedLevel,
      status: coOccurringHighSignals >= 2 ? "INFERRED · CO-OCCURRENCE ONLY" : "UNAVAILABLE",
      evidence: `${coOccurringHighSignals} separately screened weather signal${coOccurringHighSignals === 1 ? "" : "s"} currently at HIGH or above: ${highCurrentRisks.map(({ name, currentLevel }) => `${name} (${currentLevel})`).join(", ") || "none"}. Co-occurrence is counted; combined effects are not modelled.`,
      expectedTime: "Current model time; compound timing not calculated",
      forecast: "Individual signal forecasts are available on their own risk cards; no compound forecast model is connected.",
      potentialImpact: "No validated combined city-impact model is connected.",
      action: coOccurringHighSignals >= 2
        ? "Review each active signal independently and follow official local advisories; no compound response plan is calculated."
        : UNAVAILABLE,
      source: "Rule-based comparison of available weather-model signals",
      timestamp: weatherTimestamp,
      currentLevel: combinedLevel,
      forecastLevel: "UNAVAILABLE",
    },
  ].filter(Boolean);

  const selectedRisk = risks.find(({ id }) => id === selectedRiskId) || risks[0];

  const metricCards = [
    [measurements.temperature, Thermometer],
    [measurements.feelsLike, Flame],
    [measurements.humidity, Droplet],
    [measurements.rainfall, CloudRain],
    [measurements.windSpeed, Wind],
    [measurements.windGust, Wind],
    [measurements.aqi, Activity],
    [measurements.uvIndex, Zap],
    [measurements.visibility, Eye],
    [measurements.precipitationProbability, CloudRain],
    [measurements.pressure, Gauge],
    [measurements.cloudCover, Eye],
    [measurements.soilMoisture, Droplet],
  ];

  const timeline = [
    { label: "NOW", hours: 0 },
    { label: "+6 HOURS", hours: 6 },
    { label: "+12 HOURS", hours: 12 },
    { label: "+24 HOURS", hours: 24 },
    { label: "+3 DAYS", hours: 72 },
    { label: "+7 DAYS", hours: 168 },
  ].map((point) => {
    if (point.hours === 0) {
      return {
        ...point,
        level: screeningLevel(currentScreeningScore),
        timestamp: weatherTimestamp || airTimestamp,
        signals: currentSignals,
      };
    }

    const timestamp = now + point.hours * 60 * 60 * 1000;
    const forecast = getForecastSnapshot({
      weatherHourly: liveWeatherHourly,
      airQualityHourly: liveAirQualityHourly,
      targetTimestamp: timestamp,
    });
    const actualTimestamp = toTimestampMs(forecast.timestamp);
    const forecastIsAvailable = actualTimestamp !== null &&
      Math.abs(actualTimestamp - timestamp) <= 90 * 60 * 1000;
    if (!forecastIsAvailable) {
      return { ...point, level: "UNAVAILABLE", timestamp: null, signals: null };
    }

    const projectedSignals = assessClimateSignals({
      temperature: forecast.temperature,
      feelsLike: forecast.feelsLike,
      precipitation: forecast.precipitation,
      windGust: forecast.windGust,
      aqi: forecast.aqi,
    });
    const score = calculateScreeningScore(Object.values(projectedSignals));
    const level = screeningLevel(score);

    return { ...point, level, timestamp: forecast.timestamp, signals: projectedSignals };
  });

  const emergingRisks = signalRisks.filter((risk) =>
    risk.currentLevel !== "UNAVAILABLE" &&
    risk.forecastLevel !== "UNAVAILABLE" &&
    compareSeverity(risk.forecastLevel, risk.currentLevel) > 0
  );
  const earlyWarnings = signalRisks.filter((risk) =>
    risk.currentLevel === "HIGH" ||
    risk.currentLevel === "VERY HIGH" ||
    risk.currentLevel === "CRITICAL" ||
    ["HIGH", "VERY HIGH", "CRITICAL"].includes(risk.forecastLevel)
  );

  const scenario = buildClimateScenario({
    current: currentSnapshot,
    changes: {
      rainfallPercent: rainfallChange,
      temperatureCelsius: temperatureChange,
      waterAvailabilityPercent: waterAvailabilityChange,
    },
  });
  const scenarioScoreChange =
    scenario.score === null || currentScreeningScore === null
      ? null
      : scenario.score - currentScreeningScore;

  const formatScenarioNumber = (value, unit) =>
    Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : UNAVAILABLE;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Climate & Risk Intelligence"
        subtitle={`Understand current weather-model signals and what they may mean for ${city.name}.`}
        icon={ShieldCheck}
        badge="Public model data"
        whyFeatureIds={["flood-risk", "emergency-simulation"]}
      />

      <div role="note" className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-4 text-xs leading-relaxed text-slate-300">
        <strong className="text-cyan-200">How to read this page:</strong> Weather and air values are estimates from public models for the selected city coordinates. Risk levels are rule-based screening indicators, not official warnings. US AQI risk bands are not applied to the European AQI scale. Neighbourhood exposure, flood gauges, soil moisture, and validated city-system impacts are not connected.
        {liveDataLoading && <span className="ml-2 text-cyan-200">Loading the latest available public data…</span>}
        {!liveDataLoading && liveWeatherError && <span className="ml-2 text-amber-200">{liveWeatherError}</span>}
        {!liveDataLoading && liveAirQualityError && <span className="ml-2 text-amber-200">{liveAirQualityError}</span>}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_2fr]">
        <article className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/50 via-slate-950/80 to-slate-950 p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Climate screening score</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-white">
                {currentScreeningScore === null ? "—" : currentScreeningScore}
                <span className="ml-2 text-base font-medium text-slate-400">/ 90</span>
              </p>
              <div className="mt-3"><SeverityBadge level={screeningLevel(currentScreeningScore)} /></div>
            </div>
            <Gauge aria-hidden="true" className="h-7 w-7 text-cyan-300" />
          </div>
          <p className="relative mt-4 text-xs leading-relaxed text-slate-300">
            {currentScreeningScore === null
              ? UNAVAILABLE
              : "Highest tier across available temperature, rainfall, wind-gust, and US AQI screens. This is not a probability or a full city risk score."}
          </p>
          <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-slate-700/70 pt-4">
            <div>
              <span className="block text-[10px] uppercase text-slate-500">Risk trend</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-white">
                {trend === "INCREASING"
                  ? <ArrowUpRight className="h-4 w-4 text-orange-300" />
                  : trend === "DECREASING"
                    ? <ArrowDownRight className="h-4 w-4 text-emerald-300" />
                    : <Activity className="h-4 w-4 text-cyan-300" />}
                {trend}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-slate-500">Forecast risk</span>
              <span className="mt-1 block text-xs font-bold text-white">{screeningLevel(forecastScreeningScore)}</span>
            </div>
          </div>
          <p className="relative mt-3 text-[10px] leading-relaxed text-slate-500">
            Transparent tier score: LOW 10 · MODERATE 30 · HIGH 55 · VERY HIGH 75 · CRITICAL 90. Uses the highest assessable signal only.
          </p>
          <p className="relative mt-2 text-[10px] leading-relaxed text-slate-500">
            Status: {currentScreeningScore === null ? "UNAVAILABLE" : "INFERRED"} · Sources: Open-Meteo current weather and US AQI models · Updated: {formatTimestamp(weatherTimestamp || airTimestamp)}
          </p>
        </article>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metricCards.map(([metric, Icon]) => (
            <ClimateMetricCard key={metric.name} metric={metric} icon={Icon} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-bold text-white">Urban climate resilience</h2>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-200">
            {resilienceIndicator?.value == null
              ? "UNAVAILABLE"
              : `${Math.round(resilienceIndicator.value)} / 100 · ESTIMATED PROXY`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {resilienceIndicator?.value == null
              ? "The shared City Health calculation has no available resilience inputs for this city."
              : `${resilienceIndicator.source} This is the same resilience component used by the City Health score; it is a proxy, not a verified citywide measure.`}
          </p>
          <p className="mt-2 text-[10px] text-slate-500">
            Data status: {resilienceIndicator?.status || "UNAVAILABLE"} · Time: {formatTimestamp(resilienceIndicator?.timestamp)}
          </p>
        </article>
        <details className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
          <summary className="cursor-pointer text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
            Risk screening thresholds and limits
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Transparent rule bands used by this screen only. These are not official alert thresholds or locally calibrated hazard models.
          </p>
          <ul className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <li>Heat (temperature or feels-like): 30 / 32 / 35 / 40 °C</li>
            <li>Rainfall: 7.5 / 20 / 30 / 50 mm per hour</li>
            <li>Wind gust: 40 / 60 / 80 / 100 km/h</li>
            <li>US AQI: 51 / 101 / 151 / 201</li>
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            Cutoffs mark MODERATE / HIGH / VERY HIGH / CRITICAL respectively. Values below the first cutoff are LOW. Missing measurements stay UNAVAILABLE.
          </p>
        </details>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <ClimateRiskMap city={city} risk={selectedRisk} />
        <article className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-bold text-white">Selected risk details</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-bold text-white">{selectedRisk.name}</h3>
              <SeverityBadge level={selectedRisk.level} />
            </div>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Where:</strong> {selectedRisk.location}</p>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Why / evidence:</strong> {selectedRisk.evidence}</p>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Expected time:</strong> {selectedRisk.expectedTime}</p>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Forecast:</strong> {selectedRisk.forecast}</p>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Potential impact:</strong> {selectedRisk.potentialImpact}</p>
            <p className="text-xs leading-relaxed text-slate-300"><strong className="text-slate-100">Recommended action:</strong> {selectedRisk.action}</p>
            <div className="grid gap-2 border-t border-slate-800 pt-3 text-[10px] text-slate-400 sm:grid-cols-2">
              <p><strong className="text-slate-300">Data status:</strong> {selectedRisk.status}</p>
              <p><strong className="text-slate-300">Source:</strong> {selectedRisk.source}</p>
              <p className="sm:col-span-2"><strong className="text-slate-300">Timestamp:</strong> {formatTimestamp(selectedRisk.timestamp)}</p>
            </div>
            <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100/90">
              Affected neighbourhoods cannot be identified from city-coordinate weather data alone.
            </p>
          </div>
        </article>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">City risk assessments</h2>
            <p className="mt-1 text-xs text-slate-400">Select a card to inspect the evidence, forecast, and response guidance.</p>
          </div>
          <span className="text-[10px] text-slate-500">OBSERVED input status is not used for model-only readings.</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {risks.map((risk) => (
            <RiskCard
              key={risk.id}
              risk={risk}
              isSelected={risk.id === selectedRiskId}
              onSelect={() => setSelectedRisk(risk.id)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="h-4 w-4 text-cyan-300" />
              <h2 className="text-base font-bold text-white">Climate risk timeline</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">Forecast entries use the nearest hourly city-coordinate model value. No values are extrapolated. Source: Open-Meteo hourly models.</p>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">PREDICTED when available</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {timeline.map((item, index) => (
            <motion.article
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
            >
              <p className="text-[10px] font-bold tracking-wide text-slate-400">{item.label}</p>
              <div className="mt-2"><SeverityBadge level={item.level} /></div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                {item.timestamp ? formatTimestamp(item.timestamp) : UNAVAILABLE}
              </p>
              {item.signals && (
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  {Object.entries(item.signals)
                    .filter(([, level]) => level)
                    .map(([name, level]) => `${name}: ${level}`)
                    .join(" · ") || "No assessable forecast input"}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-orange-400/20 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-orange-300" />
            <h2 className="text-base font-bold text-white">Top emerging risks</h2>
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-bold text-violet-200">PREDICTED</span>
          </div>
          {emergingRisks.length ? (
            <ul className="mt-4 space-y-3">
              {emergingRisks.map((risk) => (
                <li key={risk.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-white">{risk.name}</strong>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-200">
                      <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                      {risk.currentLevel} → {risk.forecastLevel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">Why: available hourly model values cross a higher screening threshold. Expected: {risk.expectedTime}. Forecast value: {risk.forecast}.</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              {signalRisks.every((risk) => risk.currentLevel === "UNAVAILABLE" || risk.forecastLevel === "UNAVAILABLE")
                ? UNAVAILABLE
                : "No assessed signal crosses into a higher risk tier in the available forecast window."}
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-rose-400/25 bg-rose-950/10 p-5">
          <div className="flex items-center gap-2 border-b border-rose-400/15 pb-3">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-rose-300" />
            <h2 className="text-base font-bold text-white">Early warning</h2>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-100">MODEL SCREEN · NOT AN OFFICIAL ALERT</span>
          </div>
          {earlyWarnings.length ? (
            <ul className="mt-4 space-y-3">
              {earlyWarnings.map((risk) => {
                const riskLevel = risk.forecastLevel === "UNAVAILABLE" ||
                  compareSeverity(risk.currentLevel, risk.forecastLevel) >= 0
                  ? risk.currentLevel
                  : risk.forecastLevel;
                const isCurrentRisk =
                  compareSeverity(risk.currentLevel, "HIGH") >= 0 &&
                  compareSeverity(risk.currentLevel, risk.forecastLevel) >= 0;
                return (
                  <li key={risk.id} className="rounded-xl border border-rose-400/20 bg-slate-950/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-white">{risk.name}</strong>
                      <SeverityBadge level={riskLevel} />
                    </div>
                    <p className="mt-2 text-xs text-slate-300"><strong>Location:</strong> {risk.location}</p>
                    <p className="mt-1 text-xs text-slate-300"><strong>Expected:</strong> {isCurrentRisk ? "Now (current model conditions)" : risk.expectedTime}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400"><strong>Evidence:</strong> {isCurrentRisk ? risk.evidence : risk.forecast}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400"><strong>Action:</strong> {riskAction(riskLevel, risk.id)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Confidence: not calculated. Source: {risk.source}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              {signalRisks.every((risk) => risk.currentLevel === "UNAVAILABLE" && risk.forecastLevel === "UNAVAILABLE")
                ? UNAVAILABLE
                : "No HIGH or greater signal was found in the available city-coordinate inputs and forecast."}
            </p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-cyan-300" />
          <div>
            <h2 className="text-base font-bold text-white">City system indicators and climate links</h2>
            <p className="mt-1 text-xs text-slate-400">Available baselines are shown with their source. An indicator is not evidence that climate caused a change.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {systemIndicators.map((indicator) => {
            const Icon = SYSTEM_INDICATOR_ICONS[indicator.name] || Activity;
            const value = indicator.value == null
              ? "Unavailable"
              : indicator.name === "Population"
                ? `${indicator.value.toLocaleString()} ${indicator.unit}`
                : indicator.name === "Climate risk screening"
                  ? `${indicator.value} ${indicator.unit}`
                  : `${Number(indicator.value.toFixed(1))} ${indicator.unit}`;
            return (
              <article key={indicator.name} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start gap-3">
                  <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <div className="min-w-0">
                    <strong className="block text-xs text-white">{indicator.name}</strong>
                    <span className="mt-1 block break-words text-sm font-bold text-slate-200">{value}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-cyan-200">{indicator.status}</span>
                    <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-400">{indicator.source}</p>
                    <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">{indicator.climateImpact}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Time: {formatTimestamp(indicator.timestamp)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Current city profile values and screening proxies are included to make available context visible. They do not establish a climate impact; flood exposure, utility loads, infrastructure condition, population exposure, and public-safety effects still require connected measurements and validated models.
        </p>
      </section>

      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CloudRain aria-hidden="true" className="h-4 w-4 text-cyan-300" />
              <h2 className="text-base font-bold text-white">What-if climate scenario</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">Change weather inputs to re-run the same transparent risk thresholds. This does not change live data.</p>
          </div>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">SIMULATED INPUT</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex justify-between gap-2 text-xs font-semibold text-slate-200">
              <span>Rainfall increase</span><span>+{rainfallChange}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={rainfallChange}
              onChange={(event) => setRainfallChange(Number(event.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Rainfall increase percent"
            />
            <span className="block text-[10px] text-slate-500">Scenario rainfall: {formatScenarioNumber(scenario.precipitation, "mm")}</span>
          </label>
          <label className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex justify-between gap-2 text-xs font-semibold text-slate-200">
              <span>Temperature increase</span><span>+{temperatureChange}°C</span>
            </span>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={temperatureChange}
              onChange={(event) => setTemperatureChange(Number(event.target.value))}
              className="w-full accent-orange-400"
              aria-label="Temperature increase in Celsius"
            />
            <span className="block text-[10px] text-slate-500">Scenario temperature: {formatScenarioNumber(scenario.temperature, "°C")}</span>
          </label>
          <label className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex justify-between gap-2 text-xs font-semibold text-slate-200">
              <span>Water availability decrease</span><span>−{waterAvailabilityChange}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={waterAvailabilityChange}
              onChange={(event) => setWaterAvailabilityChange(Number(event.target.value))}
              className="w-full accent-blue-400"
              aria-label="Water availability decrease percent"
            />
            <span className="block text-[10px] text-slate-500">Measured water availability: unavailable</span>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="p-3">Indicator</th>
                <th className="p-3">Before</th>
                <th className="p-3">Scenario input</th>
                <th className="p-3">After</th>
                <th className="p-3">Change</th>
                <th className="p-3">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <th className="p-3 font-semibold text-white">Temperature</th>
                <td className="p-3">{formatScenarioNumber(currentSnapshot.temperature, "°C")}</td>
                <td className="p-3">+{temperatureChange}°C (assumption)</td>
                <td className="p-3">{formatScenarioNumber(scenario.temperature, "°C")}</td>
                <td className="p-3">+{temperatureChange}°C (assumption)</td>
                <td className="p-3">SIMULATED input only</td>
              </tr>
              <tr>
                <th className="p-3 font-semibold text-white">Feels like</th>
                <td className="p-3">{formatScenarioNumber(currentSnapshot.feelsLike, "°C")}</td>
                <td className="p-3">+{temperatureChange}°C (assumption)</td>
                <td className="p-3">{formatScenarioNumber(scenario.feelsLike, "°C")}</td>
                <td className="p-3">+{temperatureChange}°C (assumption)</td>
                <td className="p-3">SIMULATED input only</td>
              </tr>
              <tr>
                <th className="p-3 font-semibold text-white">Rainfall</th>
                <td className="p-3">{formatScenarioNumber(currentSnapshot.precipitation, "mm")}</td>
                <td className="p-3">+{rainfallChange}% (assumption)</td>
                <td className="p-3">{formatScenarioNumber(scenario.precipitation, "mm")}</td>
                <td className="p-3">+{rainfallChange}% (assumption)</td>
                <td className="p-3">SIMULATED input only</td>
              </tr>
              <tr>
                <th className="p-3 font-semibold text-white">Screening tier</th>
                <td className="p-3"><SeverityBadge level={screeningLevel(currentScreeningScore)} /></td>
                <td className="p-3">Rain +{rainfallChange}%, temperature +{temperatureChange}°C</td>
                <td className="p-3"><SeverityBadge level={screeningLevel(scenario.score)} /></td>
                <td className="p-3">{scenarioScoreChange === null ? UNAVAILABLE : `${scenarioScoreChange > 0 ? "+" : ""}${scenarioScoreChange} points`}</td>
                <td className="p-3">Rule-based screen; not a probability</td>
              </tr>
              <tr>
                <th className="p-3 font-semibold text-white">Water availability</th>
                <td className="p-3">UNAVAILABLE</td>
                <td className="p-3">−{scenario.waterAvailabilityDecreasePercent}% (assumption)</td>
                <td className="p-3">UNAVAILABLE</td>
                <td className="p-3">Not calculated</td>
                <td className="p-3">No measured baseline water availability</td>
              </tr>
              {[
                ["Flood risk", "No hydrology or flood map data"],
                ["Water stress", "No measured water availability"],
                ["Energy demand", "No validated weather-to-energy model"],
                ["Traffic disruption", "No weather-linked live road impact model"],
                ["Infrastructure stress", "No asset condition/exposure data"],
                ["Population exposure", "No spatial population exposure data"],
              ].map(([label, reason]) => (
                <tr key={label}>
                  <th className="p-3 font-semibold text-white">{label}</th>
                  <td className="p-3">UNAVAILABLE</td>
                  <td className="p-3">Weather inputs changed</td>
                  <td className="p-3">UNAVAILABLE</td>
                  <td className="p-3">Not calculated</td>
                  <td className="p-3">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
          <div className="border-b border-slate-800 px-3 py-3">
            <h3 className="text-xs font-bold text-white">Available city baselines</h3>
            <p className="mt-1 text-[10px] text-slate-400">
              Context only. These profile values are not recalculated as scenario outcomes and do not imply a climate impact.
            </p>
          </div>
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="p-3">Indicator</th>
                <th className="p-3">Current baseline</th>
                <th className="p-3">Status</th>
                <th className="p-3">Source / limitation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {systemIndicators
                .filter(({ name, value }) => name !== "Climate risk screening" && name !== "Public safety" && value !== null)
                .map((indicator) => (
                  <tr key={`baseline-${indicator.name}`}>
                    <th className="p-3 font-semibold text-white">{indicator.name}</th>
                    <td className="p-3">
                      {indicator.name === "Population"
                        ? `${indicator.value.toLocaleString()} ${indicator.unit}`
                        : `${Number(indicator.value.toFixed(1))} ${indicator.unit}`}
                    </td>
                    <td className="p-3">{indicator.status}</td>
                    <td className="p-3">{indicator.source}</td>
                  </tr>
                ))}
              {systemIndicators.every(({ name, value }) =>
                name === "Climate risk screening" || name === "Public safety" || value === null
              ) && (
                <tr>
                  <td colSpan={4} className="p-3 text-slate-400">No city-system baseline metrics are available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5">
        <div className="flex items-center gap-2">
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-bold text-white">Continue the city risk workflow</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["2D city map", "/digital-twin"],
            ["3D city view", "/city-3d"],
            ["Forecasts", "/future-predictions"],
            ["What-if simulator", "/what-if-simulator"],
            ["City report", "/report-generation"],
          ].map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {label}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-bold text-white">Data status and boundaries</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["OBSERVED", "INFERRED", "PREDICTED", "SIMULATED", "ESTIMATED", "UNAVAILABLE"].map((status) => (
              <span key={status} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[9px] font-bold text-slate-300">{status}</span>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
            <li><strong className="text-slate-200">ESTIMATED:</strong> Current values from Open-Meteo city-coordinate models.</li>
            <li><strong className="text-slate-200">PREDICTED:</strong> Future hourly values from the same public weather / air models.</li>
            <li><strong className="text-slate-200">INFERRED:</strong> A transparent threshold screen applied to those model values.</li>
            <li><strong className="text-slate-200">SIMULATED:</strong> User-selected changes applied to available current weather values only.</li>
            <li><strong className="text-slate-200">OBSERVED:</strong> No verified municipal climate observations are connected to this module.</li>
            <li><strong className="text-slate-200">UNAVAILABLE:</strong> No reliable connected input; no score is produced.</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-amber-400/25 bg-amber-950/10 p-5">
          <div className="flex items-center gap-2 border-b border-amber-400/15 pb-3">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-bold text-amber-100">Safety notice</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-amber-50/85">
            This dashboard is not an emergency service and does not issue official warnings. It has no connected local flood gauges, water-level sensors, emergency dispatch, shelter capacity, or verified hazard-zone map. For immediate danger, follow local authorities and emergency services.
          </p>
        </article>
      </section>
    </div>
  );
};

export default ClimateRisks;
