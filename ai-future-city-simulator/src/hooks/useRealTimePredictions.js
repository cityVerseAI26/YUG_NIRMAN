const formatStatus = (value) => {
  if (!Number.isFinite(value)) return "LIVE DATA UNAVAILABLE";
  if (value >= 200) return "VERY HIGH";
  if (value >= 151) return "HIGH";
  if (value >= 101) return "ELEVATED";
  return "LOW";
};

const describeWeatherCode = (code) => {
  if (code == null) return "Unavailable";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
};

const normalizeProviderTime = (time) => {
  const timestamp = typeof time === "number" ? time * 1000 : Date.parse(time);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const readFiniteNumber = (value) => {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * Estimate live energy demand adjustment based on temperature.
 * For every °C above 25°C: +1.2% grid load (cooling)
 * For every °C below 15°C: +0.8% grid load (heating)
 * Returns { adjustmentPct, status, source } or null if no temp available
 */
const estimateLiveEnergyAdjustment = (temperature) => {
  if (temperature == null || !Number.isFinite(temperature)) return null;
  let adjustmentPct = 0;
  let note = "";
  if (temperature > 25) {
    adjustmentPct = Math.round((temperature - 25) * 1.2);
    note = `+${adjustmentPct}% est. cooling load above 25°C`;
  } else if (temperature < 15) {
    adjustmentPct = Math.round((15 - temperature) * 0.8);
    note = `+${adjustmentPct}% est. heating load below 15°C`;
  } else {
    note = "Neutral temperature range · moderate load";
  }
  return {
    adjustmentPct,
    note,
    status: adjustmentPct > 20 ? "HIGH DEMAND" : adjustmentPct > 10 ? "ELEVATED" : "NOMINAL",
    source: "Open-Meteo temperature → grid-load heuristic",
  };
};

/**
 * Estimate live water demand adjustment.
 * High temp + no rain = higher demand; rain = reduced outdoor demand.
 */
const estimateLiveWaterAdjustment = (temperature, precipitation) => {
  if (temperature == null || !Number.isFinite(temperature)) return null;
  const rain = Number.isFinite(precipitation) ? precipitation : 0;
  let adjustmentPct = 0;
  let note = "";
  if (rain >= 10) {
    adjustmentPct = -15;
    note = `−15% est. reduced demand (heavy rain ${rain} mm)`;
  } else if (rain >= 2) {
    adjustmentPct = -8;
    note = `−8% est. reduced demand (rain ${rain} mm)`;
  } else if (temperature > 30) {
    adjustmentPct = 20;
    note = `+20% est. peak demand (${temperature}°C, dry)`;
  } else if (temperature > 25) {
    adjustmentPct = 10;
    note = `+10% est. elevated demand (${temperature}°C, dry)`;
  } else {
    note = "Normal temperature/precipitation range";
  }
  return {
    adjustmentPct,
    note,
    status: adjustmentPct >= 15 ? "HIGH DEMAND" : adjustmentPct <= -10 ? "REDUCED" : "NOMINAL",
    source: "Open-Meteo temp + precipitation → water-demand heuristic",
  };
};

/**
 * Estimate live traffic impact based on precipitation and visibility.
 * Rain/fog/low-visibility increases congestion.
 */
const estimateLiveTrafficImpact = (precipitation, visibility, weatherCode) => {
  if (precipitation == null && visibility == null && weatherCode == null) return null;
  const rain = Number.isFinite(precipitation) ? precipitation : 0;
  const vis = Number.isFinite(visibility) ? visibility : 10000;
  let adjustmentPct = 0;
  let note = "";

  const isThunderstorm = [95, 96, 99].includes(weatherCode);
  const isFog = [45, 48].includes(weatherCode);

  if (isThunderstorm) {
    adjustmentPct = 35;
    note = "Thunderstorm · severe congestion likely (+35% est.)";
  } else if (isFog || vis < 1000) {
    adjustmentPct = 20;
    note = `Reduced visibility (${(vis / 1000).toFixed(1)} km) · elevated congestion est.`;
  } else if (rain >= 10) {
    adjustmentPct = 25;
    note = `Heavy precipitation (${rain} mm) · congestion est. +25%`;
  } else if (rain >= 2) {
    adjustmentPct = 12;
    note = `Moderate rain (${rain} mm) · congestion est. +12%`;
  } else {
    note = "Clear/dry conditions · nominal traffic";
  }

  return {
    adjustmentPct,
    note,
    status: adjustmentPct >= 25 ? "HIGH IMPACT" : adjustmentPct >= 12 ? "MODERATE IMPACT" : "NOMINAL",
    source: "Open-Meteo precipitation + visibility → traffic-impact heuristic",
  };
};

export function useRealTimePredictions(liveAirQuality, liveAirQualityHourly, liveWeather, liveWeatherHourly) {
  const currentAqi = readFiniteNumber(liveAirQuality?.us_aqi);
  const pm25 = readFiniteNumber(liveAirQuality?.pm2_5);
  const dynamicProjectionData = (liveAirQualityHourly?.time || [])
    .map((time, index) => {
      const value = readFiniteNumber(liveAirQualityHourly.us_aqi?.[index]);
      const normalizedTime = normalizeProviderTime(time);
      return value != null
        ? { time: normalizedTime, timestamp: normalizedTime ? Date.parse(normalizedTime) : NaN, aqi: value }
        : null;
    })
    .filter((point) => point && Number.isFinite(point.timestamp) && point.timestamp >= Date.now())
    .slice(0, 120);
  const weatherForecastData = (liveWeatherHourly?.time || [])
    .map((time, index) => {
      const normalizedTime = normalizeProviderTime(time);
      const weatherCode = readFiniteNumber(liveWeatherHourly.weather_code?.[index]);
      return {
        time: normalizedTime,
        timestamp: normalizedTime ? Date.parse(normalizedTime) : NaN,
        temperature: readFiniteNumber(liveWeatherHourly.temperature_2m?.[index]),
        apparentTemperature: readFiniteNumber(liveWeatherHourly.apparent_temperature?.[index]),
        precipitationProbability: readFiniteNumber(liveWeatherHourly.precipitation_probability?.[index]),
        precipitation: readFiniteNumber(liveWeatherHourly.precipitation?.[index]),
        relativeHumidity: readFiniteNumber(liveWeatherHourly.relative_humidity_2m?.[index]),
        windSpeed: readFiniteNumber(liveWeatherHourly.wind_speed_10m?.[index]),
        windGusts: readFiniteNumber(liveWeatherHourly.wind_gusts_10m?.[index]),
        cloudCover: readFiniteNumber(liveWeatherHourly.cloud_cover?.[index]),
        uvIndex: readFiniteNumber(liveWeatherHourly.uv_index?.[index]),
        pressure: readFiniteNumber(liveWeatherHourly.pressure_msl?.[index]),
        visibility: readFiniteNumber(liveWeatherHourly.visibility?.[index]),
        condition: describeWeatherCode(weatherCode),
      };
    })
    .filter((point) => Number.isFinite(point.timestamp) && point.timestamp >= Date.now())
    .slice(0, 120);

  // ── Live weather-derived estimates ──────────────────────────────────────────
  const liveTemp = readFiniteNumber(liveWeather?.temperature_2m);
  const livePrecip = readFiniteNumber(liveWeather?.precipitation);
  const liveVis = readFiniteNumber(liveWeather?.visibility);
  const liveWeatherCode = readFiniteNumber(liveWeather?.weather_code);

  const energyEstimate = estimateLiveEnergyAdjustment(liveTemp);
  const waterEstimate = estimateLiveWaterAdjustment(liveTemp, livePrecip);
  const trafficEstimate = estimateLiveTrafficImpact(livePrecip, liveVis, liveWeatherCode);

  return {
    telemetry: {
      aqi: {
        current: currentAqi,
        pm25,
        status: formatStatus(currentAqi),
        source: "Open-Meteo Air Quality API",
        observedAt: normalizeProviderTime(liveAirQuality?.time),
      },
      weather: {
        temperature: readFiniteNumber(liveWeather?.temperature_2m),
        apparentTemperature: readFiniteNumber(liveWeather?.apparent_temperature),
        precipitation: readFiniteNumber(liveWeather?.precipitation),
        windSpeed: readFiniteNumber(liveWeather?.wind_speed_10m),
        windGusts: readFiniteNumber(liveWeather?.wind_gusts_10m),
        relativeHumidity: readFiniteNumber(liveWeather?.relative_humidity_2m),
        cloudCover: readFiniteNumber(liveWeather?.cloud_cover),
        uvIndex: readFiniteNumber(liveWeather?.uv_index),
        pressure: readFiniteNumber(liveWeather?.pressure_msl),
        visibility: readFiniteNumber(liveWeather?.visibility),
        condition: describeWeatherCode(readFiniteNumber(liveWeather?.weather_code)),
        observedAt: normalizeProviderTime(liveWeather?.time),
      },
      // Weather-correlated live estimates (not verified city sensors)
      traffic: trafficEstimate
        ? {
            current: trafficEstimate.adjustmentPct,
            status: trafficEstimate.status,
            note: trafficEstimate.note,
            source: trafficEstimate.source,
            isLiveEstimate: true,
          }
        : { current: null, status: "LIVE DATA UNAVAILABLE", isLiveEstimate: false },
      water: waterEstimate
        ? {
            current: waterEstimate.adjustmentPct,
            status: waterEstimate.status,
            note: waterEstimate.note,
            source: waterEstimate.source,
            isLiveEstimate: true,
          }
        : { current: null, status: "LIVE DATA UNAVAILABLE", isLiveEstimate: false },
      energy: energyEstimate
        ? {
            current: energyEstimate.adjustmentPct,
            status: energyEstimate.status,
            note: energyEstimate.note,
            source: energyEstimate.source,
            isLiveEstimate: true,
          }
        : { current: null, status: "LIVE DATA UNAVAILABLE", isLiveEstimate: false },
      population: { current: null, status: "LIVE DATA UNAVAILABLE", isLiveEstimate: false },
    },
    dynamicProjectionData,
    weatherForecastData,
    // Convenience accessors for components
    liveEnergyAdjustment: energyEstimate,
    liveWaterAdjustment: waterEstimate,
    liveTrafficImpact: trafficEstimate,
  };
}

export default useRealTimePredictions;
