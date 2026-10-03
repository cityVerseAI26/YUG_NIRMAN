// Comprehensive AI Predictions Dataset for Future City Simulator with Real-Time Telemetry Support

export const getPredictionsForCity = (
  cityName = "Mumbai",
  year = 2030,
  modelType = "lstm",
  liveTelemetry = null
) => {
  const modelLabel =
    modelType === "lstm"
      ? "Deep Attention LSTM"
      : modelType === "arima"
      ? "ARIMA Time-Series"
      : "Agent-Based Neural Sim";

  // Real-time telemetry offsets if live stream is active
  const tLive = liveTelemetry?.traffic;
  const wLive = liveTelemetry?.water;
  const eLive = liveTelemetry?.energy;
  const aqiLive = liveTelemetry?.aqi;
  const pLive = liveTelemetry?.population;
  const confDrift = liveTelemetry?.confidenceDrift || 0;

  // Real-time dynamically calculated stats
  const trafficStat = tLive
    ? `Live ${tLive.current}% → Proj ${Math.min(99, Math.round(year >= 2035 ? 92 + tLive.delta * 0.4 : 82 + tLive.delta * 0.4))}%`
    : year >= 2035 ? "92% Expressway Saturation" : "82% Peak Congestion";

  const aqiStat = aqiLive
    ? `Live ${aqiLive.current} AQI → Proj ${year >= 2035 ? "118 AQI" : Math.round(174 + aqiLive.delta * 0.3) + " AQI"}`
    : year >= 2035 ? "118 AQI (Target Level)" : "174 AQI (Unhealthy)";

  const waterStat = wLive
    ? `Live ${wLive.current}% → Proj ${Math.min(99, Math.round(year >= 2035 ? 94 + wLive.delta * 0.3 : 84 + wLive.delta * 0.3))}% Demand`
    : year >= 2035 ? "94% Water Grid Stress" : "84% Reservoir Capacity";

  const energyStat = eLive
    ? `Live ${eLive.current}% (${eLive.loadMw} MW) → Proj ${year >= 2035 ? "100% Parity" : "+24% Peak"}`
    : year >= 2035 ? "100% Renewable Parity" : "+24% Peak Megawatts";

  return [
    {
      id: "pred-pop",
      step: 1,
      category: "Demographics & Density",
      icon: "Users",
      title: `${cityName} Demographic Surge & Urban Density`,
      horizon: year,
      stat: year >= 2035 ? "+38.4% Growth" : "+18.6% Growth",
      statDetail: year >= 2035 ? "16.8M Citizens Projected" : "14.8M Citizens Projected",
      confidence: +(94.2 + confDrift).toFixed(1),
      riskLevel: "High Strain",
      riskColor: "rose",
      liveSensor: pLive
        ? {
            metric: "Live Urban Flow Index",
            value: `${pLive.current} Idx`,
            delta: pLive.delta >= 0 ? `+${pLive.delta}` : `${pLive.delta}`,
            status: pLive.status,
            activeSensors: "26,610 Nodes"
          }
        : null,
      spokenIntro: `Prediction number one: Urban Demographics and Population Density for ${cityName}.`,
      spokenBody: `By the year ${year}, our ${modelLabel} projects metropolitan density to accelerate, with total urban population increasing by ${
        year >= 2035 ? "38.4 percent" : "18.6 percent"
      }. Primary transit corridors and suburban belts will face compounding residential demand, requiring immediate municipal zoning adjustments and localized high-density civic amenities.`,
      spokenText: `Prediction number one: Urban Demographics and Population Density for ${cityName}. By the year ${year}, our ${modelLabel} projects metropolitan density to accelerate, with total urban population increasing by ${
        year >= 2035 ? "38.4 percent" : "18.6 percent"
      }. Primary transit corridors and suburban belts will face compounding residential demand, requiring immediate municipal zoning adjustments and localized high-density civic amenities.`
    },
    {
      id: "pred-traffic",
      step: 2,
      category: "Mobility & Congestion",
      icon: "Car",
      title: "Arterial Roadway Saturation & Transit Bottlenecks",
      horizon: year,
      stat: trafficStat,
      statDetail: tLive ? `Avg Speed: ${tLive.speed} km/h (Sensor sync 2s)` : "Commute delay +28 min average",
      confidence: +(91.8 + confDrift).toFixed(1),
      riskLevel: tLive && tLive.current > 84 ? "CRITICAL SPIKE" : "Critical Alert",
      riskColor: "rose",
      liveSensor: tLive
        ? {
            metric: "Live Arterial Congestion",
            value: `${tLive.current}%`,
            delta: tLive.delta >= 0 ? `+${tLive.delta}%` : `${tLive.delta}%`,
            status: tLive.status,
            activeSensors: "18,420 Nodes"
          }
        : null,
      spokenIntro: "Prediction number two: Mobility and Arterial Roadway Congestion.",
      spokenBody: `Without aggressive mass-transit diversion, vehicular volume along major highway corridors will reach ${
        year >= 2035 ? "92 percent" : "82 percent"
      } of theoretical road saturation by ${year}. Real-time telemetry currently streams at ${tLive ? tLive.current : 76} percent saturation. The model recommends rolling out synchronized adaptive dynamic traffic signals and variable congestion pricing to preserve essential commercial throughput.`,
      spokenText: `Prediction number two: Mobility and Arterial Roadway Congestion. Without aggressive mass-transit diversion, vehicular volume along major highway corridors will reach ${
        year >= 2035 ? "92 percent" : "82 percent"
      } of theoretical road saturation by ${year}. The model recommends rolling out synchronized adaptive dynamic traffic signals and variable congestion pricing to preserve essential commercial throughput.`
    },
    {
      id: "pred-water",
      step: 3,
      category: "Hydrology & Water Reserves",
      icon: "Droplet",
      title: "Drinking Water Reserve Stress & Aquifer Depletion",
      horizon: year,
      stat: waterStat,
      statDetail: wLive ? `Reserve: ${wLive.reserveMl} ML (Real-time telemetry)` : "Deficit risk in dry seasons",
      confidence: +(89.5 + confDrift).toFixed(1),
      riskLevel: wLive && wLive.current > 88 ? "CRITICAL DEFICIT" : "High Strain",
      riskColor: "amber",
      liveSensor: wLive
        ? {
            metric: "Live Reservoir Utilization",
            value: `${wLive.current}%`,
            delta: wLive.delta >= 0 ? `+${wLive.delta}%` : `${wLive.delta}%`,
            status: wLive.status,
            activeSensors: "14,200 Nodes"
          }
        : null,
      spokenIntro: "Prediction number three: Hydrological Reserves and Water Security.",
      spokenBody: `By ${year}, aggregate municipal water demand will approach critical reservoir thresholds, running at ${
        year >= 2035 ? "94 percent" : "84 percent"
      } capacity. Live aquifer sensors currently register ${wLive ? wLive.current : 78} percent utilization. To avert seasonal water rationing, ${cityName} must mandate decentralized wastewater recycling across commercial complexes and scale tertiary water recycling plants.`,
      spokenText: `Prediction number three: Hydrological Reserves and Water Security. By ${year}, aggregate municipal water demand will approach critical reservoir thresholds, running at ${
        year >= 2035 ? "94 percent" : "84 percent"
      } capacity. To avert seasonal water rationing, ${cityName} must mandate decentralized wastewater recycling across commercial complexes and scale tertiary water recycling plants.`
    },
    {
      id: "pred-energy",
      step: 4,
      category: "Energy Grid & Microgrids",
      icon: "Zap",
      title: "Peak Energy Consumption & Solar Microgrid Parity",
      horizon: year,
      stat: energyStat,
      statDetail: eLive ? `Substation Draw: ${eLive.loadMw} MW` : "Substation load at 89%",
      confidence: +(93.1 + confDrift).toFixed(1),
      riskLevel: eLive && eLive.current > 90 ? "GRID OVERLOAD" : "Moderate",
      riskColor: "cyan",
      liveSensor: eLive
        ? {
            metric: "Live Power Grid Load",
            value: `${eLive.current}%`,
            delta: eLive.delta >= 0 ? `+${eLive.delta}%` : `${eLive.delta}%`,
            status: eLive.status,
            activeSensors: "22,600 Nodes"
          }
        : null,
      spokenIntro: "Prediction number four: Electrical Power Infrastructure and Clean Energy Transition.",
      spokenBody: `Industrial activity and cooling demand will push peak electrical load up by ${
        year >= 2035 ? "39 percent" : "24 percent"
      }. Real-time telemetry registers power draw at ${eLive ? eLive.current : 82} percent capacity. However, rapid deployment of commercial rooftop photovoltaic arrays and localized battery storage systems will achieve daytime grid parity by ${year}, significantly mitigating blackout vulnerability.`,
      spokenText: `Prediction number four: Electrical Power Infrastructure and Clean Energy Transition. Industrial activity and cooling demand will push peak electrical load up by ${
        year >= 2035 ? "39 percent" : "24 percent"
      }. However, rapid deployment of commercial rooftop photovoltaic arrays and localized battery storage systems will achieve daytime grid parity by ${year}, significantly mitigating blackout vulnerability.`
    },
    {
      id: "pred-aqi",
      step: 5,
      category: "Environmental Quality & Climate",
      icon: "Wind",
      title: "Air Quality Index Trajectory & Carbon Neutrality",
      horizon: year,
      stat: aqiStat,
      statDetail: aqiLive ? `PM2.5: ${aqiLive.pm25} µg/m³ (Optical mesh sensor)` : year >= 2035 ? "-32% Particulate Matter" : "Elevated winter particulate levels",
      confidence: +(88.7 + confDrift).toFixed(1),
      riskLevel: aqiLive && aqiLive.current > 200 ? "HAZARDOUS" : year >= 2035 ? "Improving" : "At Risk",
      riskColor: aqiLive && aqiLive.current > 200 ? "rose" : year >= 2035 ? "emerald" : "amber",
      liveSensor: aqiLive
        ? {
            metric: "Live Atmospheric AQI",
            value: `${aqiLive.current} AQI`,
            delta: aqiLive.delta >= 0 ? `+${aqiLive.delta}` : `${aqiLive.delta}`,
            status: aqiLive.status,
            activeSensors: "12,850 Nodes"
          }
        : null,
      spokenIntro: "Prediction number five: Environmental Quality and Air Quality Index.",
      spokenBody: `Atmospheric sensor modeling indicates ambient pollution will remain elevated unless electrification policies are enforced. Ambient laser telemetry is currently streaming at ${aqiLive ? aqiLive.current : 156} AQI. Under current baseline simulations for ${year}, transitioning 40 percent of public transit and commercial fleet to electric propulsion will curb fine particulate matter by up to 26 percent.`,
      spokenText: `Prediction number five: Environmental Quality and Air Quality Index. Atmospheric sensor modeling indicates ambient pollution will remain elevated unless electrification policies are enforced. Ambient laser telemetry is currently streaming at ${aqiLive ? aqiLive.current : 156} AQI. Under current baseline simulations for ${year}, transitioning 40 percent of public transit and commercial fleet to electric propulsion will curb fine particulate matter by up to 26 percent.`
    },
    {
      id: "pred-milestone",
      step: 6,
      category: "Strategic AI Milestone",
      icon: "Sparkles",
      title: "Autonomous Municipal Digital Twin Equilibrium",
      horizon: year,
      stat: "99.2% Reliability",
      statDetail: liveTelemetry ? `Inference Latency: ${liveTelemetry.inferenceLatency}ms · ${liveTelemetry.packetsReceived} pkts` : "Full multi-agent closed-loop telemetry",
      confidence: +(96.0 + confDrift).toFixed(1),
      riskLevel: "Milestone Target",
      riskColor: "purple",
      liveSensor: liveTelemetry
        ? {
            metric: "Live Telemetry Ingestion",
            value: `${liveTelemetry.activeSensors.toLocaleString()} Nodes`,
            delta: `${liveTelemetry.inferenceLatency}ms latency`,
            status: "STREAMING",
            activeSensors: "94,680 Mesh"
          }
        : null,
      spokenIntro: "Prediction number six: Autonomous Policy Milestone and Smart City Equilibrium.",
      spokenBody: `By ${year}, full telemetry integration between IoT sensor arrays, traffic cameras, and digital twin models will enable predictive policy response times under two minutes. This autonomous orchestration will safeguard municipal resilience across climate and logistical shocks.`,
      spokenText: `Prediction number six: Autonomous Policy Milestone and Smart City Equilibrium. By ${year}, full telemetry integration between IoT sensor arrays, traffic cameras, and digital twin models will enable predictive policy response times under two minutes. This autonomous orchestration will safeguard municipal resilience across climate and logistical shocks.`
    }
  ];
};
