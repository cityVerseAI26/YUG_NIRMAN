import React, { createContext, useContext, useState, useEffect } from "react";
import { CITIES } from "../data/cityData";
import { TRAFFIC_DATA } from "../data/trafficData";
import { POLLUTION_DATA } from "../data/pollutionData";
import { POPULATION_DATA } from "../data/populationData";
import { ENERGY_DATA } from "../data/energyData";
import { WATER_DATA } from "../data/waterData";
import { INITIAL_ALERTS } from "../data/alertsData";
import { AI_INSIGHTS } from "../data/aiInsightsData";

const CityContext = createContext(null);

export const CityProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(() => {
    try {
      const savedCity = localStorage.getItem("city_selected_city");
      return savedCity && CITIES[savedCity] ? savedCity : "mumbai";
    } catch {
      return "mumbai";
    }
  });
  const [timeRange, setTimeRange] = useState("today");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsState, setAlertsState] = useState(INITIAL_ALERTS);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [publicDataRefresh, setPublicDataRefresh] = useState(0);
  const [weatherResult, setWeatherResult] = useState({ key: "", current: null, hourly: null, error: "" });
  const [airQualityResult, setAirQualityResult] = useState({ key: "", current: null, hourly: null, currentUnits: null, error: "" });
  const city = CITIES[selectedCity] || CITIES.mumbai;
  const liveDataKey = `${selectedCity}:${publicDataRefresh}`;
  const liveWeather = weatherResult.key === liveDataKey ? weatherResult.current : null;
  const liveWeatherHourly = weatherResult.key === liveDataKey ? weatherResult.hourly : null;
  const liveAirQuality = airQualityResult.key === liveDataKey ? airQualityResult.current : null;
  const liveWeatherError = weatherResult.key === liveDataKey ? weatherResult.error : "";
  const liveAirQualityError = airQualityResult.key === liveDataKey ? airQualityResult.error : "";
  const liveAirQualityHourly = airQualityResult.key === liveDataKey ? airQualityResult.hourly : null;
  const liveAirQualityUnits = airQualityResult.key === liveDataKey ? airQualityResult.currentUnits : null;
  const liveDataLoading = weatherResult.key !== liveDataKey || airQualityResult.key !== liveDataKey;
  const refreshLiveData = () => setPublicDataRefresh((revision) => revision + 1);

  useEffect(() => {
    const controller = new AbortController();
    const [latitude, longitude] = city.coordinates;
    const weatherParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,uv_index,pressure_msl,visibility",
      hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,pressure_msl,visibility",
      timezone: "auto",
      timeformat: "unixtime",
      forecast_days: "5",
    });
    const airQualityParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide",
      hourly: "us_aqi,european_aqi,pm2_5,pm10",
      past_days: "1",
      forecast_days: "5",
      timezone: "auto",
      timeformat: "unixtime",
    });

    fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (!data.current) throw new Error("Weather API returned no current conditions");
        setWeatherResult({ key: liveDataKey, current: data.current, hourly: data.hourly || null, error: "" });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setWeatherResult({ key: liveDataKey, current: null, hourly: null, error: "Current weather is unavailable." });
        }
      });

    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airQualityParams}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Air-quality request failed (${response.status})`);
        return response.json();
      })
      .then((data) => setAirQualityResult({
        key: liveDataKey,
        current: data.current || null,
        hourly: data.hourly || null,
        currentUnits: data.current_units || null,
        error: data.current ? "" : "Air-quality API returned no current conditions.",
      }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setAirQualityResult({ key: liveDataKey, current: null, hourly: null, currentUnits: null, error: "Current air-quality data is unavailable." });
        }
      });

    return () => controller.abort();
  }, [city.coordinates, liveDataKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPublicDataRefresh((revision) => revision + 1);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onWindowFocus = () => setPublicDataRefresh((revision) => revision + 1);
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("city_selected_city", selectedCity);
    } catch {
      // Keep the selected city for this session if browser storage is unavailable.
    }
  }, [selectedCity]);

  // Live digital clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const traffic = TRAFFIC_DATA[selectedCity] || TRAFFIC_DATA.mumbai;
  const pollution = POLLUTION_DATA[selectedCity] || POLLUTION_DATA.mumbai;
  const population = POPULATION_DATA[selectedCity] || POPULATION_DATA.mumbai;
  const energy = ENERGY_DATA[selectedCity] || ENERGY_DATA.mumbai;
  const water = WATER_DATA[selectedCity] || WATER_DATA.mumbai;
  const cityAlerts = alertsState[selectedCity] || [];
  const cityAiInsights = AI_INSIGHTS[selectedCity] || [];

  const markAlertAsRead = (alertId) => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] || []).map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      )
    }));
  };

  const dismissAlert = (alertId) => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] || []).filter((a) => a.id !== alertId)
    }));
  };

  const markAllAlertsAsRead = () => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] || []).map((a) => ({ ...a, read: true }))
    }));
  };

  const unreadAlertCount = cityAlerts.filter((a) => !a.read).length;

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        city,
        liveWeather,
        liveWeatherHourly,
        liveAirQuality,
        liveAirQualityHourly,
        liveAirQualityUnits,
        liveWeatherError,
        liveAirQualityError,
        liveDataLoading,
        refreshLiveData,
        traffic,
        pollution,
        population,
        energy,
        water,
        alerts: cityAlerts,
        markAlertAsRead,
        dismissAlert,
        markAllAlertsAsRead,
        unreadAlertCount,
        aiInsights: cityAiInsights,
        timeRange,
        setTimeRange,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        currentTime,
        currentDate,
        citiesList: Object.values(CITIES)
      }}
    >
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
};
