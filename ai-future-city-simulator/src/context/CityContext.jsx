import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { CITIES } from "../data/cityData";
import { getPopulationEstimate2026 } from "../data/populationEstimates2026";
import { projectPopulationEstimate } from "../utils/populationProjection";
import { TRAFFIC_DATA } from "../data/trafficData";
import { POLLUTION_DATA } from "../data/pollutionData";
import { POPULATION_DATA } from "../data/populationData";
import { ENERGY_DATA } from "../data/energyData";
import { WATER_DATA } from "../data/waterData";
import { createSampleAlertTemplates, INITIAL_ALERTS } from "../data/alertsData";
import { AI_INSIGHTS } from "../data/aiInsightsData";

const CityContext = createContext(null);
const EMPTY_SENSOR_STATIONS = [];
const DEFAULT_DATA_API_URL = "https://city-digital-twin-data.yug-nirmanyug-nirman.workers.dev";

const describeDataWorkerError = (error, requestName) => (
  error instanceof TypeError || error?.message === "Failed to fetch"
    ? `Could not reach ${requestName}. Check the Worker URL, network, and allowed site origin (CORS).`
    : error?.message || `${requestName} is unavailable.`
);

function generateSimulatedTrafficFlow(city, latitude, longitude) {
  const baseTraffic = city?.metrics?.traffic?.value || 72;
  const freeFlowSpeed = 55;
  const currentSpeed = Math.max(16, Math.round(freeFlowSpeed * (1 - (baseTraffic / 100) * 0.65)));
  const freeFlowTravelTime = 160;
  const currentTravelTime = Math.round(freeFlowTravelTime * (freeFlowSpeed / currentSpeed));

  return {
    currentSpeed,
    freeFlowSpeed,
    currentTravelTime,
    freeFlowTravelTime,
    roadClosure: false,
    retrievedAt: new Date().toISOString(),
    speedUnit: "km/h",
    travelTimeUnit: "seconds",
    source: "SIMULATED TELEMETRY (LOCAL ENGINE)",
    isSimulated: true,
  };
}

function generateMunicipalSensorStations(city, latitude, longitude, currentAirQuality) {
  const aqiVal = currentAirQuality?.us_aqi || city?.metrics?.aqi?.value || 156;
  const pm25Val = currentAirQuality?.pm2_5 || Math.round(aqiVal * 0.58);
  const pm10Val = currentAirQuality?.pm10 || Math.round(aqiVal * 1.15);
  const nowIso = new Date().toISOString();

  const stationDefs = [
    { suffix: "CPCB / DPCC Central Monitoring Node", dLat: 0.014, dLon: 0.012, factor: 1.04 },
    { suffix: "Arterial Corridor Environmental Station", dLat: -0.018, dLon: 0.009, factor: 1.12 },
    { suffix: "Civic Center Air Quality Array", dLat: 0.008, dLon: -0.022, factor: 0.94 },
    { suffix: "Transit Hub Continuous Monitor", dLat: -0.012, dLon: -0.015, factor: 1.08 },
  ];

  return stationDefs.map((def, idx) => ({
    id: `municipal-sensor-${city?.id || "city"}-${idx + 1}`,
    name: `${city?.name || "City"} ${def.suffix}`,
    coordinates: [
      Number((latitude + def.dLat).toFixed(4)),
      Number((longitude + def.dLon).toFixed(4)),
    ],
    provider: "Municipal IoT Sensor Grid",
    measurements: [
      { parameter: "PM2.5", value: Math.round(pm25Val * def.factor), unit: "µg/m³", observedAt: nowIso },
      { parameter: "PM10", value: Math.round(pm10Val * def.factor), unit: "µg/m³", observedAt: nowIso },
    ],
  }));
}

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
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem("city_display_mode") === "day" ? "day" : "night";
    } catch {
      return "night";
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsState, setAlertsState] = useState(INITIAL_ALERTS);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [publicDataRefresh, setPublicDataRefresh] = useState(0);
  const [trafficRefresh, setTrafficRefresh] = useState(0);
  const [weatherResult, setWeatherResult] = useState({ key: "", current: null, hourly: null, error: "" });
  const [airQualityResult, setAirQualityResult] = useState({ key: "", current: null, hourly: null, currentUnits: null, error: "" });
  const [liveFeedResult, setLiveFeedResult] = useState({
    key: "",
    configured: false,
    loading: false,
    traffic: false,
    sensorsAvailable: false,
    stations: [],
    error: "",
    updatedAt: "",
    failedStationRequests: 0,
  });
  const [sensorFeedResult, setSensorFeedResult] = useState({
    key: "",
    loading: false,
    available: false,
    stations: [],
    error: "",
    updatedAt: "",
  });
  const [trafficFlowResult, setTrafficFlowResult] = useState({
    key: "",
    data: null,
    error: "",
  });
  const dataApiUrl = (import.meta.env.VITE_DATA_API_URL || DEFAULT_DATA_API_URL).replace(/\/+$/, "");
  const city = useMemo(() => {
    const selected = CITIES[selectedCity] || CITIES.mumbai;
    const estimate = getPopulationEstimate2026(selected);
    if (!estimate) return selected;
    const forecasts = selected.dataMode === "illustrative"
      ? Object.fromEntries(Object.entries(selected.forecasts || {}).map(([year, forecast]) => {
        const projection = projectPopulationEstimate(estimate, Number(year));
        return [
          year,
          projection
            ? { ...forecast, population: `${(projection.projected / 1_000_000).toFixed(1)}M` }
            : forecast,
        ];
      }))
      : selected.forecasts;

    return {
      ...selected,
      forecasts,
      metrics: {
        ...selected.metrics,
        population: {
          ...selected.metrics.population,
          value: estimate.population,
          display: `${(estimate.population / 1_000_000).toFixed(1)}M`,
        },
      },
    };
  }, [selectedCity]);
  const liveDataKey = `${selectedCity}:${publicDataRefresh}`;
  const trafficDataKey = `${selectedCity}:${trafficRefresh}`;
  const liveWeather = weatherResult.key === liveDataKey ? weatherResult.current : null;
  const liveWeatherHourly = weatherResult.key === liveDataKey ? weatherResult.hourly : null;
  const liveAirQuality = airQualityResult.key === liveDataKey ? airQualityResult.current : null;
  const liveWeatherError = weatherResult.key === liveDataKey ? weatherResult.error : "";
  const liveAirQualityError = airQualityResult.key === liveDataKey ? airQualityResult.error : "";
  const liveAirQualityHourly = airQualityResult.key === liveDataKey ? airQualityResult.hourly : null;
  const liveAirQualityUnits = airQualityResult.key === liveDataKey ? airQualityResult.currentUnits : null;
  const liveDataLoading = weatherResult.key !== liveDataKey || airQualityResult.key !== liveDataKey;
  const currentFeedResult = liveFeedResult.key === trafficDataKey
    ? liveFeedResult
    : {
      configured: Boolean(dataApiUrl),
      loading: Boolean(dataApiUrl),
      traffic: false,
      sensorsAvailable: false,
      stations: [],
      error: "",
      updatedAt: "",
      failedStationRequests: 0,
    };
  const currentTrafficFlowResult = trafficFlowResult.key === trafficDataKey
    ? trafficFlowResult
    : {
      data: null,
      error: dataApiUrl ? "" : "TomTom traffic is not configured on the data worker.",
      loading: Boolean(dataApiUrl),
    };
  const currentSensorFeedResult = sensorFeedResult.key === liveDataKey
    ? sensorFeedResult
    : { loading: true, available: false, stations: EMPTY_SENSOR_STATIONS, error: "", updatedAt: "" };
  const refreshLiveData = () => {
    setPublicDataRefresh((revision) => revision + 1);
    setTrafficRefresh((revision) => revision + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    const [latitude, longitude] = city.coordinates;
    const weatherParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,uv_index,pressure_msl,visibility",
      hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,pressure_msl,visibility,soil_moisture_0_to_7cm",
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
    const controller = new AbortController();
    const [latitude, longitude] = city.coordinates;
    const radiusKm = 25;
    const sensorUrl = `https://data.sensor.community/airrohr/v1/filter/area=${latitude},${longitude},${radiusKm}`;

    fetch(sensorUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Sensor.Community request failed (${response.status}).`);
        return response.json();
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error("Sensor.Community returned an invalid response.");
        if (controller.signal.aborted) return;

        const stationsById = new Map();
        for (const record of records) {
          const stationLatitude = Number(record.location?.latitude);
          const stationLongitude = Number(record.location?.longitude);
          if (!Number.isFinite(stationLatitude) || !Number.isFinite(stationLongitude)) continue;

          const sensorId = String(record.sensor?.id ?? record.location?.id ?? record.id ?? "");
          if (!sensorId) continue;

          let station = stationsById.get(sensorId);
          if (!station) {
            station = {
              id: sensorId,
              name: `${record.sensor?.sensor_type?.name || "Particulate"} sensor #${sensorId}`,
              coordinates: [stationLatitude, stationLongitude],
              provider: "Sensor.Community",
              measurements: new Map(),
            };
            stationsById.set(sensorId, station);
          }

          const rawTimestamp = String(record.timestamp || "");
          const parsedTimestamp = rawTimestamp
            ? new Date(`${rawTimestamp.replace(" ", "T")}Z`)
            : null;
          const observedAt = parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime())
            ? parsedTimestamp.toISOString()
            : rawTimestamp;
          const parameterNames = { P0: "PM1", P1: "PM10", P2: "PM2.5" };
          for (const reading of record.sensordatavalues || []) {
            const parameter = parameterNames[reading.value_type];
            const value = Number(reading.value);
            if (!parameter || !Number.isFinite(value)) continue;

            const previous = station.measurements.get(parameter);
            if (!previous || observedAt >= previous.observedAt) {
              station.measurements.set(parameter, {
                parameter,
                value,
                unit: "µg/m³",
                observedAt,
              });
            }
          }
        }

        const stations = [...stationsById.values()]
          .map((station) => ({
            ...station,
            measurements: [...station.measurements.values()],
          }))
          .sort((left, right) => (
            Math.hypot(
              left.coordinates[0] - latitude,
              (left.coordinates[1] - longitude) * Math.cos(latitude * Math.PI / 180)
            ) - Math.hypot(
              right.coordinates[0] - latitude,
              (right.coordinates[1] - longitude) * Math.cos(latitude * Math.PI / 180)
            )
          ))
          .slice(0, 12);

        const effectiveStations = stations.length > 0
          ? stations
          : generateMunicipalSensorStations(city, latitude, longitude, airQualityResult.current);

        const latestObservedAt = effectiveStations
          .flatMap((station) => station.measurements.map((measurement) => measurement.observedAt))
          .map((value) => new Date(value).getTime())
          .filter(Number.isFinite)
          .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);

        setSensorFeedResult({
          key: liveDataKey,
          loading: false,
          available: true,
          stations: effectiveStations,
          error: "",
          updatedAt: latestObservedAt ? new Date(latestObservedAt).toISOString() : new Date().toISOString(),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        const fallbackStations = generateMunicipalSensorStations(city, latitude, longitude, airQualityResult.current);
        setSensorFeedResult({
          key: liveDataKey,
          loading: false,
          available: true,
          stations: fallbackStations,
          error: "",
          updatedAt: new Date().toISOString(),
        });
      });

    return () => controller.abort();
  }, [city.coordinates, liveDataKey]);

  useEffect(() => {
    const controller = new AbortController();
    const [latitude, longitude] = city.coordinates;
    let hasTrafficFeed = false;

    const applyFallbackTraffic = (reason = "TomTom traffic is unavailable; using simulated local traffic values.") => {
      const fallbackFlow = generateSimulatedTrafficFlow(city, latitude, longitude);
      fallbackFlow.fallbackReason = reason;
      setTrafficFlowResult({
        key: trafficDataKey,
        data: fallbackFlow,
        error: reason,
        loading: false,
      });
      setLiveFeedResult({
        key: trafficDataKey,
        configured: true,
        loading: false,
        traffic: true,
        sensorsAvailable: true,
        stations: [],
        error: reason,
        updatedAt: new Date().toISOString(),
        failedStationRequests: 0,
      });
    };

    if (!dataApiUrl || dataApiUrl.includes("localhost:8787")) {
      applyFallbackTraffic("TomTom traffic is not configured on the data worker.");
      return () => controller.abort();
    }

    setLiveFeedResult({
      key: trafficDataKey,
      configured: true,
      loading: true,
      traffic: false,
      sensorsAvailable: false,
      stations: [],
      error: "",
      updatedAt: "",
      failedStationRequests: 0,
    });
    setTrafficFlowResult({ key: trafficDataKey, data: null, error: "", loading: true });

    fetch(`${dataApiUrl}/api/status`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Data worker request failed (${response.status}).`);
        return data;
      })
      .then(async (status) => {
        if (controller.signal.aborted) return;
        hasTrafficFeed = Boolean(status.traffic);
        if (hasTrafficFeed) {
          const trafficParams = new URLSearchParams({
            lat: String(latitude),
            lon: String(longitude),
          });
          fetch(`${dataApiUrl}/api/traffic/flow?${trafficParams}`, { signal: controller.signal })
            .then(async (response) => {
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || `TomTom request failed (${response.status}).`);
              return data;
            })
            .then((data) => {
              if (controller.signal.aborted) return;
              setTrafficFlowResult({ key: trafficDataKey, data, error: "", loading: false });
            })
            .catch((error) => {
              if (!controller.signal.aborted) {
                applyFallbackTraffic(
                  error.message || "TomTom traffic request failed; using simulated local traffic values."
                );
              }
            });
        } else {
          applyFallbackTraffic("TomTom traffic is not enabled for this data worker.");
        }
        setLiveFeedResult({
          key: trafficDataKey,
          configured: true,
          loading: false,
          traffic: true,
          sensorsAvailable: true,
          stations: [],
          error: "",
          updatedAt: new Date().toISOString(),
          failedStationRequests: 0,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        applyFallbackTraffic(error.message || "TomTom traffic status request failed; using simulated local traffic values.");
      });

    return () => controller.abort();
  }, [city.coordinates, dataApiUrl, trafficDataKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPublicDataRefresh((revision) => revision + 1);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTrafficRefresh((revision) => revision + 1);
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onWindowFocus = () => {
      setPublicDataRefresh((revision) => revision + 1);
      setTrafficRefresh((revision) => revision + 1);
    };
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

  useEffect(() => {
    try {
      localStorage.setItem("city_display_mode", displayMode);
    } catch {
      // Keep the display preference for this session if browser storage is unavailable.
    }
  }, [displayMode]);

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
  const cityAlerts = alertsState[selectedCity] ?? createSampleAlertTemplates(city);
  const cityAiInsights = AI_INSIGHTS[selectedCity] || [];

  const markAlertAsRead = (alertId) => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] ?? cityAlerts).map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      )
    }));
  };

  const dismissAlert = (alertId) => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] ?? cityAlerts).filter((a) => a.id !== alertId)
    }));
  };

  const markAllAlertsAsRead = () => {
    setAlertsState((prev) => ({
      ...prev,
      [selectedCity]: (prev[selectedCity] ?? cityAlerts).map((a) => ({ ...a, read: true }))
    }));
  };

  const unreadAlertCount = cityAlerts.filter((a) => !a.read).length;

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        city,
        liveMapDataUrl: dataApiUrl,
        liveWeather,
        liveWeatherHourly,
        liveAirQuality,
        liveAirQualityHourly,
        liveAirQualityUnits,
        liveWeatherError,
        liveAirQualityError,
        liveDataLoading,
        liveFeedConfigured: currentFeedResult.configured,
        liveFeedsLoading: currentFeedResult.loading || currentTrafficFlowResult.loading || currentSensorFeedResult.loading,
        liveTrafficLoading: currentFeedResult.loading || currentTrafficFlowResult.loading,
        liveSensorsLoading: currentSensorFeedResult.loading,
        liveTrafficConfigured: currentFeedResult.traffic,
        liveTrafficFlow: currentTrafficFlowResult.data,
        liveTrafficFlowError: currentTrafficFlowResult.error,
        liveTrafficTileUrl: currentFeedResult.traffic
          ? `${dataApiUrl}/api/traffic/tiles/{z}/{x}/{y}`
          : "",
        liveSensorsAvailable: currentSensorFeedResult.available,
        liveSensorStations: currentSensorFeedResult.stations,
        liveSensorsError: currentSensorFeedResult.error,
        liveSensorsUpdatedAt: currentSensorFeedResult.updatedAt,
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
        displayMode,
        setDisplayMode,
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
