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
      traffic: { current: null, status: "LIVE DATA UNAVAILABLE" },
      water: { current: null, status: "LIVE DATA UNAVAILABLE" },
      energy: { current: null, status: "LIVE DATA UNAVAILABLE" },
      population: { current: null, status: "LIVE DATA UNAVAILABLE" },
    },
    dynamicProjectionData,
    weatherForecastData,
  };
}

export default useRealTimePredictions;
