export function summarizeHealthDimensions(dimensions) {
  const scoredDimensions = dimensions.filter(({ score }) => (
    typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
  ));
  const score = scoredDimensions.length
    ? scoredDimensions.reduce((total, { score: value }) => total + value, 0) / scoredDimensions.length
    : null;
  return { score, scoredDimensions };
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const scoreAqi = (value) => {
  if (value == null || value < 0) return null;
  if (value <= 50) return 100;
  if (value <= 100) return 80;
  if (value <= 150) return 60;
  if (value <= 200) return 40;
  if (value <= 300) return 20;
  return 0;
};

const scoreEuropeanAqi = (value) => {
  if (value == null || value < 0) return null;
  if (value <= 20) return 100;
  if (value <= 40) return 80;
  if (value <= 60) return 60;
  if (value <= 80) return 40;
  if (value <= 100) return 20;
  return 0;
};

const estimatePopulationPressureScore = ({
  population,
  trafficIndex,
  energyLoad,
  waterLoad,
  greenCoverValue,
}) => {
  if (population == null) return null;
  const populationIndex = clamp((population / 20_000_000) * 100);
  const trafficIndexValue = toFiniteNumber(trafficIndex) ?? 0;
  const energyLoadValue = toFiniteNumber(energyLoad) ?? 0;
  const waterLoadValue = toFiniteNumber(waterLoad) ?? 0;
  const greenCoverValueNumber = toFiniteNumber(greenCoverValue) ?? 0;
  const pressureValue = (
    (populationIndex * 0.18)
    + (trafficIndexValue * 0.26)
    + (energyLoadValue * 0.22)
    + (waterLoadValue * 0.18)
    + ((100 - greenCoverValueNumber) * 0.16)
  );
  return clamp(pressureValue * 0.76);
};

const estimateClimateResilienceScore = ({ aqiScore, greenCoverScore, waterScore }) => {
  if (aqiScore == null && greenCoverScore == null && waterScore == null) return null;
  const safeAqi = toFiniteNumber(aqiScore) ?? 0;
  const safeGreenCover = toFiniteNumber(greenCoverScore) ?? 0;
  const safeWater = toFiniteNumber(waterScore) ?? 0;
  return clamp((safeAqi * 0.30) + (safeGreenCover * 0.42) + (safeWater * 0.28));
};

const estimateHousingScore = ({ populationPressureScore, greenCoverScore, mobilityScore }) => {
  if (populationPressureScore == null && greenCoverScore == null && mobilityScore == null) return null;
  const safePressure = toFiniteNumber(populationPressureScore) ?? 0;
  const safeGreenCover = toFiniteNumber(greenCoverScore) ?? 0;
  const safeMobility = toFiniteNumber(mobilityScore) ?? 0;
  return clamp((safePressure * 0.38) + (safeGreenCover * 0.38) + (safeMobility * 0.24));
};

const estimateInfrastructureScore = ({ energyScore, waterScore, mobilityScore }) => {
  if (energyScore == null && waterScore == null && mobilityScore == null) return null;
  const safeEnergy = toFiniteNumber(energyScore) ?? 0;
  const safeWater = toFiniteNumber(waterScore) ?? 0;
  const safeMobility = toFiniteNumber(mobilityScore) ?? 0;
  return clamp((safeEnergy * 0.36) + (safeWater * 0.34) + (safeMobility * 0.30));
};

export function calculateCityHealth({ city, liveAirQuality, liveTrafficFlow }) {
  const metrics = city?.metrics || {};
  const liveUsAqi = toFiniteNumber(liveAirQuality?.us_aqi);
  const liveEuropeanAqi = toFiniteNumber(liveAirQuality?.european_aqi);
  const demoAqi = toFiniteNumber(metrics.aqi?.value);
  const aqi = liveUsAqi ?? liveEuropeanAqi ?? demoAqi;
  const aqiScore = liveUsAqi != null
    ? scoreAqi(liveUsAqi)
    : liveEuropeanAqi != null
      ? scoreEuropeanAqi(liveEuropeanAqi)
      : scoreAqi(demoAqi);
  const aqiScale = liveUsAqi != null ? "US AQI" : liveEuropeanAqi != null ? "European AQI" : "profile AQI";
  const hasLiveAqi = liveUsAqi != null || liveEuropeanAqi != null;

  const profileTraffic = toFiniteNumber(metrics.traffic?.value);
  const liveTrafficDelay = !liveTrafficFlow?.isSimulated && liveTrafficFlow?.freeFlowTravelTime > 0
    ? ((liveTrafficFlow.currentTravelTime / liveTrafficFlow.freeFlowTravelTime) - 1) * 100
    : null;
  const hasLiveTraffic = Number.isFinite(liveTrafficDelay);
  const congestion = hasLiveTraffic ? clamp(liveTrafficDelay) : profileTraffic;
  const mobilityScore = congestion == null ? null : 100 - clamp(congestion);
  const greenCover = toFiniteNumber(metrics.greenCover?.value);
  const greenCoverScore = greenCover == null ? null : clamp(greenCover);
  const energyLoad = toFiniteNumber(metrics.energyUsage?.value);
  const energyScore = energyLoad == null ? null : 100 - clamp(energyLoad);
  const waterLoad = toFiniteNumber(metrics.waterDemand?.value);
  const waterScore = waterLoad == null ? null : 100 - clamp(waterLoad);
  const population = toFiniteNumber(metrics.population?.value);
  const populationContext = metrics.population?.display
    || (population == null ? null : `${(population / 1_000_000).toFixed(1)}M people`);
  const populationPressureScore = estimatePopulationPressureScore({
    population,
    trafficIndex: profileTraffic,
    energyLoad,
    waterLoad,
    greenCoverValue: greenCover,
  });
  const climateResilienceScore = estimateClimateResilienceScore({
    aqiScore,
    greenCoverScore,
    waterScore,
  });
  const housingScore = estimateHousingScore({
    populationPressureScore,
    greenCoverScore,
    mobilityScore,
  });
  const infrastructureScore = estimateInfrastructureScore({
    energyScore,
    waterScore,
    mobilityScore,
  });

  const dimensions = [
    {
      label: "Mobility",
      score: mobilityScore,
      source: hasLiveTraffic ? "LIVE" : "DEMO",
      category: hasLiveTraffic ? "live" : "demo",
      detail: hasLiveTraffic
        ? `100 − nearest-road delay (${Math.round(congestion)}%); one TomTom segment, not a citywide measure.`
        : profileTraffic == null
          ? "No traffic measure is available."
          : `100 − bundled congestion index (${Math.round(profileTraffic)}%); illustrative, not an observed citywide average.`,
    },
    {
      label: "Air quality",
      score: aqiScore,
      source: hasLiveAqi ? "LIVE" : "DEMO",
      category: hasLiveAqi ? "live" : "demo",
      detail: aqiScore == null
        ? "No AQI reading is available."
        : `${aqiScale} ${Math.round(aqi)} mapped to ${Math.round(aqiScore)} using the AQI bands below; modeled/coordinate-level data is not a local station reading.`,
    },
    {
      label: "Green cover",
      score: greenCoverScore,
      source: "DEMO",
      category: "demo",
      detail: greenCover == null
        ? "No green-cover estimate is available."
        : `Bundled green-cover estimate (${Math.round(greenCover)}%); GIS or municipal land-cover data is not connected.`,
    },
    {
      label: "Energy",
      score: energyScore,
      source: "DEMO",
      category: "demo",
      detail: energyLoad == null
        ? "No energy load index is available."
        : `100 − bundled energy-use index (${Math.round(energyLoad)}%); a profile proxy, not grid telemetry.`,
    },
    {
      label: "Water",
      score: waterScore,
      source: "DEMO",
      category: "demo",
      detail: waterLoad == null
        ? "No water-demand index is available."
        : `100 − bundled water-demand index (${Math.round(waterLoad)}%); a profile proxy, not utility telemetry.`,
    },
    {
      label: "Population pressure",
      score: populationPressureScore,
      source: populationPressureScore != null ? "ESTIMATE" : "N/A",
      category: populationPressureScore != null ? "estimate" : "context",
      contextValue: populationContext,
      detail: populationPressureScore == null
        ? populationContext
          ? "2026 planning estimate gives population scale only; a proxy pressure score cannot be calculated without the service-demand profile."
          : "No population estimate is available. Population size alone would not establish service pressure."
        : `Estimated from population scale, congestion, energy demand, and water demand; current proxy is ${Math.round(populationPressureScore)} / 100.`,
    },
    {
      label: "Climate & resilience",
      score: climateResilienceScore,
      source: climateResilienceScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: climateResilienceScore == null
        ? "No validated citywide climate-resilience score is connected. Short-range weather forecasts and illustrative hazard scenarios are not long-term climate-risk measures."
        : `Proxy resilience estimate reflects AQI, green cover, and water stress; current score is ${Math.round(climateResilienceScore)} / 100.`,
    },
    {
      label: "Housing",
      score: housingScore,
      source: housingScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: housingScore == null
        ? "No housing supply/demand dataset is connected."
        : `Proxy housing readiness is estimated from pressure, mobility, and green-cover context; current score is ${Math.round(housingScore)} / 100.`,
    },
    {
      label: "Infrastructure",
      score: infrastructureScore,
      source: infrastructureScore != null ? "ESTIMATE" : "N/A",
      category: "estimate",
      detail: infrastructureScore == null
        ? "No verified asset-condition or service-capacity dataset is connected. Bundled legacy infrastructure ratings are not used in this calculated index."
        : `Proxy infrastructure readiness combines energy, water, and mobility demand; current score is ${Math.round(infrastructureScore)} / 100.`,
    },
  ];

  const { score, scoredDimensions } = summarizeHealthDimensions(dimensions);
  const hasLiveInput = dimensions.some(({ category }) => category === "live");
  return {
    score,
    dimensions,
    scoredDimensions,
    hasLiveInput,
    methodology: "Arithmetic mean of all scored dimensions; unscored dimensions are excluded. Component formulas and inputs are described per dimension.",
    timestamp: liveAirQuality?.time || liveTrafficFlow?.retrievedAt || null,
  };
}
