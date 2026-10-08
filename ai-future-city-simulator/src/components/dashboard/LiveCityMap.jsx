import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Activity, RefreshCw } from "lucide-react";
import { useCity } from "../../context/CityContext";
import { SAFAR_STATIONS } from "../../data/safarStations";
import { TRAFFIC_DATA } from "../../data/trafficData";

const classifyFeature = (tags = {}) => {
  if (tags.highway === "traffic_signals" || tags.crossing) return "traffic";
  if (tags.amenity === "charging_station") return "charging";
  if (tags.public_transport || ["station", "halt", "tram_stop"].includes(tags.railway) || tags.highway === "bus_stop") return "transport";
  if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.healthcare) return "hospital";
  if (["school", "university", "college"].includes(tags.amenity)) return "school";
  if (["park", "garden", "nature_reserve"].includes(tags.leisure) || tags.natural === "wood") return "green";
  if (tags.landuse === "industrial") return "industrial";
  if (tags.waterway || tags.natural === "water" || tags.landuse === "reservoir") return "flood";
  return null;
};

const getFeaturePosition = (element) => {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return [element.lat, element.lon];
  if (Number.isFinite(element.center?.lat) && Number.isFinite(element.center?.lon)) {
    return [element.center.lat, element.center.lon];
  }
  return null;
};

const MAP_FEATURE_CATEGORIES = [
  { id: "traffic", label: "Traffic signals" },
  { id: "transport", label: "Transit stops" },
  { id: "charging", label: "Charging stations" },
  { id: "hospital", label: "Hospitals & clinics" },
  { id: "school", label: "Schools & colleges" },
  { id: "green", label: "Green spaces" },
  { id: "industrial", label: "Industrial areas" },
  { id: "flood", label: "Waterways & water" },
];

const validMapCoordinate = (coordinate) =>
  Array.isArray(coordinate) &&
  coordinate.length === 2 &&
  Number.isFinite(coordinate[0]) &&
  coordinate[0] >= -90 &&
  coordinate[0] <= 90 &&
  Number.isFinite(coordinate[1]) &&
  coordinate[1] >= -180 &&
  coordinate[1] <= 180;

const getRoadPath = (element) => {
  if (!Array.isArray(element.geometry)) return [];
  return element.geometry
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
    .map((point) => [point.lat, point.lon]);
};

const metersFromPointToSegment = (point, start, end) => {
  const latitudeScale = 111_320;
  const longitudeScale = latitudeScale * Math.cos(point[0] * Math.PI / 180);
  const startX = (start[1] - point[1]) * longitudeScale;
  const startY = (start[0] - point[0]) * latitudeScale;
  const endX = (end[1] - point[1]) * longitudeScale;
  const endY = (end[0] - point[0]) * latitudeScale;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const progress = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / lengthSquared));
  return Math.hypot(startX + progress * segmentX, startY + progress * segmentY);
};

const nearestMappedRoad = (point, roads) => roads.reduce((nearest, road) => {
  for (let index = 1; index < road.path.length; index += 1) {
    const distance = metersFromPointToSegment(point, road.path[index - 1], road.path[index]);
    if (!nearest || distance < nearest.distance) nearest = { road, distance };
  }
  return nearest;
}, null);

const ROAD_PRIORITY = {
  motorway: 28,
  trunk: 28,
  primary: 25,
  secondary: 17,
  tertiary: 10,
};

const FEATURE_PRESSURE = {
  traffic: 42,
  transport: 32,
  school: 27,
  hospital: 18,
  charging: 12,
};

const TRAFFIC_ACTIONS = {
  traffic: "Review signal timing and turn queues; protect pedestrian crossing phases before adjusting vehicle flow.",
  transport: "Check stop placement, bus dwell and curb conflicts; consider a bus bay or signal priority where appropriate.",
  school: "Review school arrival/departure access, crossing safety and pickup curb management with the school community.",
  hospital: "Keep emergency access and drop-off clear; review curb use and signal priority with the hospital operator.",
  charging: "Check charger access and vehicle queues; manage curb space so charging traffic does not block through lanes.",
};

let osmRetryUntil = 0;
const OSM_CACHE_PREFIX = "city_osm_map_v1_";
const OVERPASS_BROWSER_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DIRECT_OVERPASS_RADII = [1_500, 700];

const getOsmCacheKey = (city) =>
  `${OSM_CACHE_PREFIX}${encodeURIComponent(`${city.id}:${city.coordinates.join(",")}`)}`;

const isValidCachedMap = (snapshot) => {
  if (
    !snapshot ||
    !Number.isFinite(Date.parse(snapshot.savedAt)) ||
    !Array.isArray(snapshot.features) ||
    snapshot.features.length > 1_000 ||
    !Array.isArray(snapshot.roads) ||
    snapshot.roads.length > 500 ||
    (snapshot.coverageRadiusMeters !== undefined &&
      (!Number.isFinite(snapshot.coverageRadiusMeters) || snapshot.coverageRadiusMeters < 1))
  ) return false;

  const categories = new Set(MAP_FEATURE_CATEGORIES.map(({ id }) => id));
  return snapshot.features.every((feature) =>
    feature &&
    typeof feature.id === "string" &&
    ["node", "way", "relation"].includes(feature.osmType) &&
    (typeof feature.osmId === "string" || Number.isFinite(feature.osmId)) &&
    validMapCoordinate(feature.coords) &&
    categories.has(feature.category) &&
    typeof feature.name === "string" &&
    feature.tags &&
    typeof feature.tags === "object" &&
    !Array.isArray(feature.tags)
  ) && snapshot.roads.every((road) =>
    road &&
    typeof road.id === "string" &&
    typeof road.name === "string" &&
    typeof road.highway === "string" &&
    Array.isArray(road.path) &&
    road.path.length >= 2 &&
    road.path.length <= 20_000 &&
    road.path.every(validMapCoordinate)
  );
};

const readCachedOsmMap = (city) => {
  try {
    const raw = localStorage.getItem(getOsmCacheKey(city));
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    return isValidCachedMap(snapshot) ? snapshot : null;
  } catch (error) {
    console.warn("Could not read saved OpenStreetMap data", error);
    return null;
  }
};

const saveCachedOsmMap = (city, snapshot) => {
  try {
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 1_500_000) {
      console.warn("OpenStreetMap result was too large to save for offline map use.");
      return;
    }
    localStorage.setItem(getOsmCacheKey(city), serialized);
  } catch (error) {
    console.warn("Could not save OpenStreetMap data for offline map use", error);
  }
};

const mapOsmElements = (elements) => ({
  features: elements.flatMap((element) => {
    const position = getFeaturePosition(element);
    const category = classifyFeature(element.tags);
    if (!position || !category) return [];
    return [{
      id: `${element.type}-${element.id}`,
      osmType: element.type,
      osmId: element.id,
      coords: position,
      category,
      name: element.tags?.name || element.tags?.official_name || `${category} location`,
      tags: element.tags || {},
    }];
  }),
  roads: elements.flatMap((element) => {
    const path = getRoadPath(element);
    if (path.length < 2) return [];
    return [{
      id: `way-${element.id}`,
      osmId: element.id,
      name: element.tags?.name || element.tags?.ref || "Unnamed mapped road",
      highway: element.tags?.highway || "road",
      path,
    }];
  }),
});

const buildTrafficPressurePoints = (features, roads) => features.flatMap((feature) => {
  const featurePressure = FEATURE_PRESSURE[feature.category];
  if (!featurePressure || roads.length === 0) return [];
  const nearest = nearestMappedRoad(feature.coords, roads);
  if (!nearest || nearest.distance > 150) return [];

  const score = Math.min(100, featurePressure + (ROAD_PRIORITY[nearest.road.highway] || 0));
  if (score < 35) return [];
  return [{
    ...feature,
    road: nearest.road,
    distanceToRoad: Math.round(nearest.distance),
    score,
    level: score >= 65 ? "Higher attention" : score >= 45 ? "Moderate attention" : "Monitor",
    action: TRAFFIC_ACTIONS[feature.category],
  }];
});

const createTrafficPressureIcon = (score) => {
  const color = score >= 65 ? "#f43f5e" : score >= 45 ? "#f59e0b" : "#38bdf8";
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border:2px solid ${color};border-radius:9999px;background:#111827;box-shadow:0 0 16px ${color}99;display:flex;align-items:center;justify-content:center;color:${color};font-size:17px;font-weight:900">!</div>`,
    className: "custom-leaflet-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
};

const fetchMapData = async (apiUrl, [latitude, longitude], signal) => {
  let workerError;
  try {
    return await fetchWorkerMapData(apiUrl, latitude, longitude, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    workerError = error;
  }

  try {
    return await fetchBrowserOverpassData(latitude, longitude, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    const combinedError = new Error(
      `The map data worker failed (${workerError.message}); direct OpenStreetMap fallback failed (${error.message}).`
    );
    combinedError.retryAfterSeconds = error.retryAfterSeconds || workerError.retryAfterSeconds || 0;
    throw combinedError;
  }
};

const fetchWorkerMapData = async (apiUrl, latitude, longitude, signal) => {
  const retryAfterSeconds = Math.ceil((osmRetryUntil - Date.now()) / 1000);
  if (retryAfterSeconds > 0) {
    const error = new Error(`OpenStreetMap asked this app to pause. Try again in ${retryAfterSeconds} seconds.`);
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  let response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(`${apiUrl}/api/osm/map?${params}`, { signal });
      break;
    } catch (error) {
      if (signal.aborted || !(error instanceof TypeError) || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      if (signal.aborted) throw error;
    }
  }
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.error || `OpenStreetMap request failed (${response.status}).`);
    error.retryAfterSeconds = Number(data?.retryAfterSeconds || response.headers.get("Retry-After")) || 0;
    if (error.retryAfterSeconds > 0) osmRetryUntil = Date.now() + error.retryAfterSeconds * 1000;
    throw error;
  }
  if (!Array.isArray(data?.elements)) throw new Error("OpenStreetMap returned an invalid response.");
  osmRetryUntil = 0;
  return data;
};

const fetchBrowserOverpassData = async (latitude, longitude, signal) => {
  let lastError;
  for (const radius of DIRECT_OVERPASS_RADII) {
    const query = `
      [out:json][timeout:15];
      (
        nwr(around:${radius},${latitude},${longitude})["highway"="traffic_signals"];
        nwr(around:${radius},${latitude},${longitude})["public_transport"];
        nwr(around:${radius},${latitude},${longitude})["railway"~"station|halt|tram_stop"];
        nwr(around:${radius},${latitude},${longitude})["highway"="bus_stop"];
        nwr(around:${radius},${latitude},${longitude})["amenity"="charging_station"];
        nwr(around:${radius},${latitude},${longitude})["amenity"~"hospital|clinic|school|university|college"];
        nwr(around:${radius},${latitude},${longitude})["healthcare"];
        nwr(around:${radius},${latitude},${longitude})["leisure"~"park|garden|nature_reserve"];
        nwr(around:${radius},${latitude},${longitude})["natural"~"water|wood"];
        nwr(around:${radius},${latitude},${longitude})["landuse"~"industrial|reservoir"];
        nwr(around:${radius},${latitude},${longitude})["waterway"];
      )->.features;
      way(around:${radius},${latitude},${longitude})["highway"~"motorway|trunk|primary|secondary|tertiary"]->.roads;
      .features out center 200;
      .roads out geom 200;
    `;
    const requestUrl = new URL(OVERPASS_BROWSER_ENDPOINT);
    requestUrl.searchParams.set("data", query);
    const response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
      signal,
    });
    const responseText = await response.text();
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
    if (!response.ok || !payload || payload.remark || !Array.isArray(payload.elements)) {
      const errorMessage = payload?.remark || payload?.error || (
        responseText.trimStart().startsWith("<")
          ? responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240)
          : `OpenStreetMap query failed (${response.status}).`
      );
      lastError = new Error(errorMessage || `OpenStreetMap query failed (${response.status}).`);
      const retryAfter = Number(response.headers.get("Retry-After")) || 0;
      if (response.status === 429 || retryAfter > 0) {
        lastError.retryAfterSeconds = retryAfter || 30;
        osmRetryUntil = Date.now() + lastError.retryAfterSeconds * 1000;
        break;
      }
      continue;
    }

    return {
      ...payload,
      source: "OpenStreetMap Overpass (direct fallback)",
      coverageRadiusMeters: radius,
    };
  }
  throw lastError || new Error("OpenStreetMap direct fallback returned no data.");
};

const weatherCondition = (code) => {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Conditions unavailable";
};

// Controller to fly the map when active city changes
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const container = map.getContainer();
    let frameId = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [map]);

  return null;
};

const MapBaseMapStyle = ({ isDark }) => {
  const map = useMap();

  useEffect(() => {
    map.getContainer().classList.toggle("leaflet-dark-basemap", isDark);
  }, [isDark, map]);

  return null;
};

// Create futuristic cyberpunk div icons for each zone type
const createCustomIcon = (category) => {
  let iconHtml = "";
  let glowColor = "rgba(6, 182, 212, 0.6)";

  switch (category) {
    case "traffic":
      glowColor = "rgba(244, 63, 94, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #f43f5e; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #f43f5e;">
          <span style="font-size: 16px;">🚦</span>
        </div>`;
      break;
    case "transport":
      glowColor = "rgba(34, 211, 238, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #22d3ee; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #22d3ee;">
          <span style="font-size: 16px;">🚉</span>
        </div>`;
      break;
    case "charging":
      glowColor = "rgba(16, 185, 129, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #10b981; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #10b981;">
          <span style="font-size: 16px;">🔌</span>
        </div>`;
      break;
    case "hospital":
      glowColor = "rgba(16, 185, 129, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #10b981; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #10b981;">
          <span style="font-size: 16px;">🏥</span>
        </div>`;
      break;
    case "school":
      glowColor = "rgba(59, 130, 246, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #3b82f6; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #3b82f6;">
          <span style="font-size: 16px;">🏫</span>
        </div>`;
      break;
    case "green":
      glowColor = "rgba(34, 197, 94, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #22c55e; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #22c55e;">
          <span style="font-size: 16px;">🌳</span>
        </div>`;
      break;
    case "industrial":
      glowColor = "rgba(168, 85, 247, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #a855f7; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #a855f7;">
          <span style="font-size: 16px;">🏭</span>
        </div>`;
      break;
    case "flood":
      glowColor = "rgba(245, 158, 11, 0.7)";
      iconHtml = `
        <div style="background: #111827; border: 2px solid #f59e0b; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #f59e0b;">
          <span style="font-size: 16px;">🌊</span>
        </div>`;
      break;
    default:
      iconHtml = `
        <div style="background: #111827; border: 2px solid #06b6d4; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${glowColor}; color: #06b6d4;">
          <span style="font-size: 16px;">📍</span>
        </div>`;
  }

  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

const SAFAR_STATION_ICON = L.divIcon({
  html: '<div style="width:34px;height:34px;border:2px solid #c084fc;border-radius:9999px;background:#1e1b4b;box-shadow:0 0 14px rgba(192,132,252,.75);display:flex;align-items:center;justify-content:center;font-size:17px">📡</div>',
  className: "custom-leaflet-marker",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const COMMUNITY_SENSOR_ICON = L.divIcon({
  html: '<div style="width:34px;height:34px;border:2px solid #f0abfc;border-radius:9999px;background:#581c87;box-shadow:0 0 14px rgba(240,171,252,.75);display:flex;align-items:center;justify-content:center;font-size:17px">◉</div>',
  className: "custom-leaflet-marker",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

export const LiveCityMap = () => {
  const {
    city,
    liveWeather,
    liveAirQuality,
    liveWeatherError,
    liveAirQualityError,
    liveDataLoading,
    liveMapDataUrl,
    liveFeedConfigured,
    liveFeedsLoading,
    liveTrafficConfigured,
    liveTrafficLoading,
    liveTrafficFlow,
    liveTrafficFlowError,
    liveTrafficTileUrl,
    liveSensorsAvailable,
    liveSensorStations,
    liveSensorsError,
    liveSensorsUpdatedAt,
    refreshLiveData,
  } = useCity();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [osmRetrySeconds, setOsmRetrySeconds] = useState(0);
  const [featureResult, setFeatureResult] = useState({ key: "", features: [], error: "", updatedAt: "" });
  const [roadResult, setRoadResult] = useState({ key: "", roads: [], error: "" });
  const [trafficTileStatus, setTrafficTileStatus] = useState("unavailable");
  const trafficTileLoadedRef = useRef(false);
  const [baseTileStatus, setBaseTileStatus] = useState("loading");
  const baseTileLoadedRef = useRef(false);
  const requestKey = `${city.id}:${refreshVersion}`;
  const isOsmRetrying = osmRetrySeconds > 0;
  const features = featureResult.key === requestKey ? featureResult.features : [];
  const featuresLoading = featureResult.key !== requestKey || Boolean(featureResult.isLoading);
  const featuresError = featureResult.key === requestKey ? featureResult.error : "";
  const featuresStale = featureResult.key === requestKey && featureResult.isStale;
  const featuresSource = featureResult.key === requestKey ? featureResult.source : "";
  const featuresCoverageRadius = featureResult.key === requestKey ? featureResult.coverageRadiusMeters : 0;
  const mappedDataZoom = featuresSource === "OpenStreetMap map API"
    ? Math.max(city.zoom, 15)
    : city.zoom;
  const canRequestTrafficTiles =
    liveTrafficConfigured &&
    Boolean(liveTrafficTileUrl) &&
    !liveTrafficFlowError &&
    Boolean(liveTrafficFlow);
  const roads = roadResult.key === requestKey ? roadResult.roads : [];
  const roadsLoading = roadResult.key !== requestKey || Boolean(roadResult.isLoading);
  const weather = liveWeather;
  const airQuality = liveAirQuality;
  const weatherError = liveWeatherError;
  const airQualityError = liveAirQualityError;
  const lastUpdated = featureResult.key === requestKey ? featureResult.updatedAt : "";
  const safarStations = SAFAR_STATIONS[city.id] || [];
  const trafficProfile = TRAFFIC_DATA[city.id];
  const fallbackCongestion = Number(city.metrics?.traffic?.value ?? 72);
  const fallbackTrafficSummary = trafficProfile?.summary || {
    currentCongestion: `${fallbackCongestion}%`,
    averageSpeed: `${Math.max(15, Math.round(55 - fallbackCongestion * 0.35))} km/h`,
    peakTime: "evening commute",
  };

  // Layer toggles
  const [layers, setLayers] = useState({
    all: true,
    congestionRisk: true,
    traffic: true,
    transport: true,
    charging: true,
    hospital: true,
    school: true,
    green: true,
    industrial: true,
    flood: true,
  });
  const [baseMap, setBaseMap] = useState("street");
  const [roadPathsVisible, setRoadPathsVisible] = useState(true);

  useEffect(() => {
    if (!isOsmRetrying) return undefined;
    const interval = setInterval(() => {
      setOsmRetrySeconds(Math.max(0, Math.ceil((osmRetryUntil - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOsmRetrying]);

  useEffect(() => {
    trafficTileLoadedRef.current = false;
    setTrafficTileStatus(canRequestTrafficTiles ? "loading" : "unavailable");
  }, [baseMap, city.id, canRequestTrafficTiles, liveTrafficFlow?.retrievedAt]);

  useEffect(() => {
    baseTileLoadedRef.current = false;
    setBaseTileStatus("loading");
  }, [baseMap, city.id]);

  useEffect(() => {
    const controller = new AbortController();
    const cachedMap = readCachedOsmMap(city);
    if (cachedMap) {
      const savedAt = new Date(cachedMap.savedAt);
      setFeatureResult({
        key: requestKey,
        features: cachedMap.features,
        error: "",
        updatedAt: savedAt.toLocaleTimeString(),
        savedAt: cachedMap.savedAt,
        source: cachedMap.source,
        coverageRadiusMeters: cachedMap.coverageRadiusMeters || 5_000,
        isStale: true,
        isLoading: true,
      });
      setRoadResult({
        key: requestKey,
        roads: cachedMap.roads,
        error: "",
        isLoading: true,
      });
    }

    fetchMapData(liveMapDataUrl, city.coordinates, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const { elements } = result;
        const { features: mappedFeatures, roads: mappedRoads } = mapOsmElements(elements);
        const savedAt = new Date().toISOString();
        const source = result.source || "Overpass API";
        const coverageRadiusMeters = Number(result.coverageRadiusMeters) || 5_000;
        saveCachedOsmMap(city, {
          savedAt,
          source,
          coverageRadiusMeters,
          features: mappedFeatures,
          roads: mappedRoads,
        });
        setFeatureResult({
          key: requestKey,
          features: mappedFeatures,
          error: mappedFeatures.length
            ? ""
            : `OpenStreetMap returned no mapped features within ${coverageRadiusMeters >= 1_000
              ? `${(coverageRadiusMeters / 1_000).toFixed(1)} km`
              : `${coverageRadiusMeters} m`} of this city center.`,
          updatedAt: new Date(savedAt).toLocaleTimeString(),
          savedAt,
          source,
          coverageRadiusMeters,
          isStale: false,
          isLoading: false,
        });
        setRoadResult({
          key: requestKey,
          roads: mappedRoads,
          error: mappedRoads.length
            ? ""
            : "No mapped major road paths were returned within 5 km.",
          isLoading: false,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.retryAfterSeconds > 0) setOsmRetrySeconds(error.retryAfterSeconds);
        console.error("OpenStreetMap map data query failed", error);
        const liveError = error.message || "OpenStreetMap is unavailable";
        setFeatureResult({
          key: requestKey,
          features: cachedMap?.features || [],
          error: cachedMap
            ? `Live OpenStreetMap lookup failed: ${liveError}. Showing saved ${cachedMap.source || "OpenStreetMap"} data from ${new Date(cachedMap.savedAt).toLocaleString()}; it may be outdated.`
            : `OpenStreetMap feature request failed: ${liveError}. No saved map data is available for this city, and no placeholder locations are shown.`,
          updatedAt: cachedMap ? new Date(cachedMap.savedAt).toLocaleTimeString() : "",
          savedAt: cachedMap?.savedAt || "",
          source: cachedMap?.source || "",
          coverageRadiusMeters: cachedMap?.coverageRadiusMeters || 5_000,
          isStale: Boolean(cachedMap),
          isLoading: false,
        });
        setRoadResult({
          key: requestKey,
          roads: cachedMap?.roads || [],
          error: cachedMap
            ? `Live road lookup failed. Showing ${cachedMap.roads.length} saved road paths from ${new Date(cachedMap.savedAt).toLocaleString()}.`
            : `Mapped road paths are unavailable: ${liveError}. No saved road paths are available for this city.`,
          isLoading: false,
        });
      });
    return () => controller.abort();
  }, [city, liveMapDataUrl, requestKey]);

  const toggleLayer = (key) => {
    if (key === "all") {
      const nextState = !layers.all;
      setLayers({
        all: nextState,
        congestionRisk: nextState,
        traffic: nextState,
        transport: nextState,
        charging: nextState,
        hospital: nextState,
        school: nextState,
        green: nextState,
        industrial: nextState,
        flood: nextState
      });
    } else {
      setLayers((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        const allActive =
          updated.traffic &&
          updated.congestionRisk &&
          updated.transport &&
          updated.charging &&
          updated.hospital &&
          updated.school &&
          updated.green &&
          updated.industrial &&
          updated.flood;
        return { ...updated, all: allActive };
      });
    }
  };

  const filteredFeatures = features.filter((feature) => layers[feature.category]);
  const mappedFeatureCount = filteredFeatures.length;
  const trafficPressurePoints = buildTrafficPressurePoints(features, roads);
  const handleRefresh = () => {
    setRefreshVersion((version) => version + 1);
    refreshLiveData();
  };

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col relative overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-cyan-500/15">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>CITY MAP · PUBLIC DATA</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {city.name} • Public Data
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            OpenStreetMap infrastructure and modeled air quality • SAFAR station locations where available
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={featuresLoading || osmRetrySeconds > 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={featuresLoading ? "animate-spin" : ""} />
            {osmRetrySeconds > 0
              ? `Retry in ${osmRetrySeconds}s`
              : featuresError ? "Retry map data" : "Refresh map data"}
          </button>
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Map</span>
          <button
            type="button"
            onClick={() => setBaseMap("street")}
            aria-pressed={baseMap === "street"}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              baseMap === "street"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setBaseMap("dark")}
            aria-pressed={baseMap === "dark"}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              baseMap === "dark"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => toggleLayer("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              layers.all
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Layers
          </button>
          <button
            type="button"
            onClick={() => toggleLayer("congestionRisk")}
            aria-pressed={layers.congestionRisk}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
              layers.congestionRisk
                ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <span aria-hidden="true">⚠</span>
            <span>
              Potential traffic pressure {featuresLoading ? "(loading…)" : `(${trafficPressurePoints.length})`}
            </span>
          </button>
          <button
            onClick={() => toggleLayer("traffic")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.traffic
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🚦</span>
            <span className="hidden sm:inline">Signals</span>
          </button>
          <button
            type="button"
            onClick={() => setRoadPathsVisible((visible) => !visible)}
            aria-pressed={roadPathsVisible}
            aria-label="Toggle mapped OpenStreetMap road paths"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              roadPathsVisible
                ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🛣️</span>
            <span className="hidden sm:inline">Mapped roads</span>
          </button>
          <button
            onClick={() => toggleLayer("transport")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.transport
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🚉</span>
            <span className="hidden sm:inline">Transit stops</span>
          </button>
          <button
            onClick={() => toggleLayer("charging")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.charging
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🔌</span>
            <span className="hidden sm:inline">Chargers</span>
          </button>
          <button
            onClick={() => toggleLayer("hospital")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.hospital
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🏥</span>
            <span className="hidden sm:inline">Hospitals</span>
          </button>
          <button
            onClick={() => toggleLayer("school")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.school
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🏫</span>
            <span className="hidden sm:inline">Schools</span>
          </button>
          <button
            onClick={() => toggleLayer("green")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.green
                ? "bg-green-500/20 border-green-500/50 text-green-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🌳</span>
            <span className="hidden sm:inline">Green</span>
          </button>
          <button
            onClick={() => toggleLayer("industrial")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.industrial
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🏭</span>
            <span className="hidden sm:inline">Industrial</span>
          </button>
          <button
            onClick={() => toggleLayer("flood")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              layers.flood
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            }`}
          >
            <span>🌊</span>
            <span className="hidden sm:inline">Waterways</span>
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2">
        <div className="p-3 rounded-xl bg-slate-900/70 border border-cyan-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Map features</div>
          <div className="mt-1 text-lg font-bold font-mono text-cyan-300">
            {featuresLoading ? "…" : filteredFeatures.length}
          </div>
          <div className="text-[10px] text-slate-500">{featuresLoading ? "Loading OpenStreetMap" : "OpenStreetMap objects"}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-sky-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Current condition</div>
          <div className="mt-1 text-sm font-bold text-sky-300">
            {weather ? weatherCondition(weather.weather_code) : weatherError ? "Unavailable" : "Loading…"}
          </div>
          <div className="text-[10px] text-slate-500">Open-Meteo current model</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-orange-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Temperature</div>
          <div className="mt-1 text-lg font-bold font-mono text-orange-300">
            {weather?.temperature_2m != null ? `${weather.temperature_2m}°C` : weatherError ? "—" : "…"}
          </div>
          <div className="text-[10px] text-slate-500">
            {weather?.apparent_temperature != null ? `Feels like ${weather.apparent_temperature}°C` : "Current estimate"}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-blue-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Humidity</div>
          <div className="mt-1 text-lg font-bold font-mono text-blue-300">
            {weather?.relative_humidity_2m != null ? `${weather.relative_humidity_2m}%` : weatherError ? "—" : "…"}
          </div>
          <div className="text-[10px] text-slate-500">Relative humidity</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-indigo-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Wind</div>
          <div className="mt-1 text-lg font-bold font-mono text-indigo-300">
            {weather?.wind_speed_10m != null ? `${weather.wind_speed_10m} km/h` : weatherError ? "—" : "…"}
          </div>
          <div className="text-[10px] text-slate-500">
            {weather?.wind_direction_10m != null ? `${weather.wind_direction_10m}° direction` : "10 m height"}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-emerald-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">European AQI</div>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-300">
            {airQuality?.european_aqi ?? (airQualityError ? "—" : "…")}
          </div>
          <div className="text-[10px] text-slate-500">Open-Meteo model estimate</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/70 border border-amber-500/20">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">PM2.5</div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-300">
            {airQuality?.pm2_5 != null ? `${airQuality.pm2_5} µg/m³` : airQualityError ? "—" : "…"}
          </div>
          <div className="text-[10px] text-slate-500">Modeled concentration</div>
        </div>
      </div>
      {safarStations.length > 0 && (
        <p className="mt-2 text-[10px] text-purple-300">
          {safarStations.length} SAFAR station locations are shown for Mumbai; these reference markers are not live SAFAR readings.
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-500 flex items-start gap-1.5">
        <Activity size={12} className="mt-0.5 shrink-0 text-cyan-500" />
        Open-Meteo provides atmospheric conditions. {liveTrafficFlow ? `Arterial road-flow telemetry active (${liveTrafficFlow.currentSpeed} km/h); map shows relative flow conditions. ` : liveTrafficLoading ? "Checking traffic conditions. " : "Arterial traffic simulation active. "}
        {liveSensorStations?.length > 0
          ? `${liveSensorStations.length} ambient monitoring stations active near ${city.name}; markers show ambient PM2.5 / PM10.`
          : "Ambient atmospheric monitoring active."}
      </p>
      <p className="text-[10px] text-slate-500">
        Data time: {weather?.time
          ? new Date(Number(weather.time) * 1000).toLocaleString()
          : lastUpdated || "Waiting for public data…"}
        {liveSensorsUpdatedAt ? ` · Stations retrieved ${new Date(liveSensorsUpdatedAt).toLocaleTimeString()}` : ""}
        {" · Values refresh when the city changes or you select Refresh data."}
      </p>
      {featuresSource === "OpenStreetMap map API" && (
        <p role="status" className="mt-1 text-[10px] text-amber-300">
          Overpass is unavailable. Showing verified OpenStreetMap data within
          {" "}{featuresCoverageRadius} m of this city center; coverage is smaller than the normal Overpass query.
        </p>
      )}
      {featuresError && <p role="status" className="mt-2 text-xs text-amber-300">{featuresError}</p>}
      {airQualityError && <p role="status" className="mt-1 text-xs text-amber-300">{airQualityError}</p>}
      {weatherError && <p role="status" className="mt-1 text-xs text-amber-300">{weatherError}</p>}
      {liveSensorsError && <p role="status" className="mt-1 text-xs text-amber-300">{liveSensorsError}</p>}
      {!liveFeedConfigured && !liveTrafficFlow && (
        <p role="status" className="mt-1 text-xs text-amber-300">
          TomTom live traffic unavailable: this site has no data-worker URL. Deploy the Cloudflare Worker and set VITE_DATA_API_URL to its URL. Sensor.Community loads directly when community stations are available nearby.
        </p>
      )}
      {liveFeedConfigured && liveFeedsLoading && (
        <p role="status" className="mt-1 text-xs text-cyan-300">Checking TomTom and Sensor.Community feeds…</p>
      )}
      {/* Interactive Map Canvas */}
      <div className="mt-4 h-[420px] w-full rounded-xl overflow-hidden border border-cyan-500/20 shadow-inner relative z-10">
        <MapContainer
          center={city.coordinates}
          zoom={city.zoom}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <MapRecenter center={city.coordinates} zoom={mappedDataZoom} />
          <MapBaseMapStyle isDark={baseMap === "dark"} />

          {/* Both basemaps use public OpenStreetMap tiles; dark styling is applied locally. */}
          <TileLayer
            key={baseMap}
            className="leaflet-base-map-tile"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            eventHandlers={{
              loading: () => {
                baseTileLoadedRef.current = false;
                setBaseTileStatus("loading");
              },
              tileload: () => {
                baseTileLoadedRef.current = true;
                setBaseTileStatus("loaded");
              },
              tileerror: () => {
                if (!baseTileLoadedRef.current) setBaseTileStatus("error");
              },
            }}
          />

          {canRequestTrafficTiles && (
            <TileLayer
              key={`${city.id}-${baseMap}-${liveTrafficTileUrl}-${liveTrafficFlow?.retrievedAt || ""}`}
              attribution='Traffic flow &copy; <a href="https://www.tomtom.com/">TomTom</a>'
              url={`${liveTrafficTileUrl}?style=${baseMap === "dark" ? "dark" : "light"}&tileSize=256`}
              opacity={0.8}
              maxZoom={22}
              zIndex={450}
              eventHandlers={{
                loading: () => {
                  trafficTileLoadedRef.current = false;
                  setTrafficTileStatus("loading");
                },
                tileload: () => {
                  trafficTileLoadedRef.current = true;
                  setTrafficTileStatus("loaded");
                },
                tileerror: () => {
                  if (!trafficTileLoadedRef.current) setTrafficTileStatus("error");
                },
              }}
            />
          )}

          {roadPathsVisible && roads.map((road) => (
            <Polyline
              key={`osm-road-${city.id}-${road.id}`}
              positions={road.path}
              pathOptions={{ color: "#38bdf8", weight: road.highway === "primary" || road.highway === "trunk" || road.highway === "motorway" ? 4 : 3, opacity: 0.78 }}
            >
              <Popup>
                <div className="p-1 min-w-[190px]">
                  <div className="font-bold text-white text-xs pb-1.5 mb-2 border-b border-cyan-400/30">{road.name}</div>
                  <div className="text-[11px] text-slate-300">OpenStreetMap road path · {road.highway}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {road.path.length} mapped path points · starts {road.path[0][0].toFixed(5)}, {road.path[0][1].toFixed(5)} · ends {road.path[road.path.length - 1][0].toFixed(5)}, {road.path[road.path.length - 1][1].toFixed(5)}
                  </div>
                  <a
                    className="mt-2 inline-block text-[10px] text-cyan-300 hover:underline"
                    href={`https://www.openstreetmap.org/way/${road.osmId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View mapped road in OpenStreetMap
                  </a>
                </div>
              </Popup>
            </Polyline>
          ))}

          {layers.congestionRisk && trafficPressurePoints.map((point) => (
            <Marker
              key={`traffic-pressure-${point.id}`}
              position={point.coords}
              icon={createTrafficPressureIcon(point.score)}
              zIndexOffset={900}
            >
              <Popup>
                <div className="min-w-[230px] p-1">
                  <div className="mb-2 flex items-center justify-between gap-3 border-b border-amber-400/30 pb-1.5">
                    <span className="text-xs font-bold text-white">Potential traffic pressure</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      point.score >= 65 ? "bg-rose-500/20 text-rose-200" : "bg-amber-500/20 text-amber-200"
                    }`}>
                      {point.level}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-100">{point.name}</div>
                  <div className="mt-1 text-[10px] text-slate-300">
                    Planning indicator score: {point.score}/100 · heuristic, not a measured probability or live congestion reading.
                  </div>
                  <div className="mt-1 text-[10px] text-slate-300">
                    Nearby mapped road: {point.road.name} ({point.road.highway}), about {point.distanceToRoad} m away.
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Mapped {point.category} location · {point.coords[0].toFixed(5)}, {point.coords[1].toFixed(5)}
                  </div>
                  <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-100">
                    <strong>Suggested review:</strong> {point.action}
                  </div>
                  <a
                    className="mt-2 inline-block text-[10px] text-cyan-300 hover:underline"
                    href={`https://www.openstreetmap.org/${point.osmType}/${point.osmId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verify mapped location in OpenStreetMap
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {filteredFeatures.map((feature) => (
            <Marker
              key={feature.id}
              position={feature.coords}
              icon={createCustomIcon(feature.category)}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-cyan-500/30">
                    <span className="font-bold text-white text-xs">
                      {feature.name}
                    </span>
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 uppercase">
                      {feature.category === "flood" ? "waterway" : feature.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Community-mapped location from OpenStreetMap.
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Coordinates: {feature.coords[0].toFixed(5)}, {feature.coords[1].toFixed(5)}
                  </div>
                  {feature.tags.operator && <div className="mt-1 text-[10px] text-slate-400">Operator: {feature.tags.operator}</div>}
                  {feature.tags.amenity && <div className="mt-1 text-[10px] text-slate-400">Amenity: {feature.tags.amenity}</div>}
                  <a
                    className="mt-2 inline-block text-[10px] text-cyan-300 hover:underline"
                    href={`https://www.openstreetmap.org/${feature.osmType}/${feature.osmId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source object in OpenStreetMap
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {safarStations.map((station) => (
            <Marker
              key={`safar-${station.id}`}
              position={station.coordinates}
              icon={SAFAR_STATION_ICON}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="font-bold text-white text-xs pb-1.5 mb-2 border-b border-purple-400/30">
                    SAFAR station · {station.name}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Monitoring-station location listed by SAFAR. This map does not receive live readings from this station.
                  </div>
                  <a
                    className="mt-2 inline-block text-[10px] text-purple-300 hover:underline"
                    href="https://safar.tropmet.res.in/AQI-47-12-Details"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open SAFAR AQI portal
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {liveSensorStations.map((station) => (
            <Marker
              key={`community-sensor-${station.id}`}
              position={station.coordinates}
              icon={COMMUNITY_SENSOR_ICON}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="font-bold text-white text-xs pb-1.5 mb-2 border-b border-fuchsia-400/30">
                    {station.name}
                  </div>
                  <div className="text-[10px] text-fuchsia-200">
                    Community sensor data · Provider: {station.provider}
                  </div>
                  {station.measurements.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {station.measurements.slice(0, 5).map((measurement, index) => (
                        <li key={`${measurement.parameter}-${measurement.observedAt}-${index}`} className="text-[11px] text-slate-200">
                          {measurement.parameter}: {measurement.value} {measurement.unit}
                          {measurement.observedAt && (
                            <span className="block text-[9px] text-slate-400">
                              Observed {new Date(measurement.observedAt).toLocaleString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400">No latest readings reported.</div>
                  )}
                  <a
                    className="mt-2 inline-block text-[10px] text-fuchsia-300 hover:underline"
                    href="https://sensor.community/en/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Sensor.Community
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>

        {/* Floating public-data map status */}
        <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md text-[11px] text-cyan-300 flex items-center gap-2 pointer-events-none">
          <span className={`w-2 h-2 rounded-full ${featuresLoading ? "bg-amber-400 animate-pulse" : featuresError ? "bg-rose-400" : "bg-emerald-400"}`}></span>
          <span>
            {featuresLoading
              ? featuresStale
                ? `${mappedFeatureCount} saved OSM features · refreshing live data`
                : safarStations.length
                  ? `${safarStations.length} SAFAR station locations · Loading mapped features`
                  : "Loading OpenStreetMap features"
              : featuresError
                ? featuresStale
                  ? `${mappedFeatureCount} saved OSM features · ${trafficPressurePoints.length} pressure markers · not live`
                  : featuresError.startsWith("OpenStreetMap feature request failed")
                    ? "OpenStreetMap data unavailable"
                    : `${mappedFeatureCount} mapped features · no nearby matches`
                : `${mappedFeatureCount} mapped features · ${trafficPressurePoints.length} pressure markers`}
            {` • ${city.coordinates[0].toFixed(2)}°N, ${city.coordinates[1].toFixed(2)}°E`}
          </span>
        </div>
        <div className={`absolute bottom-3 right-3 z-[1000] max-w-[min(360px,calc(100%-24px))] rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-lg backdrop-blur-md pointer-events-none ${
          trafficTileStatus === "loaded" || liveTrafficFlow
            ? "border-emerald-400/40 bg-slate-950/90 text-emerald-200"
            : trafficTileStatus === "error"
              ? "border-rose-400/50 bg-slate-950/95 text-rose-200"
              : trafficTileStatus === "loading"
                ? "border-amber-400/40 bg-slate-950/90 text-amber-100"
                : "border-slate-500/40 bg-slate-950/90 text-slate-300"
        }`}>
          {trafficTileStatus === "loaded"
            ? "Live TomTom traffic overlay loaded · relative flow, not exact speed"
            : liveTrafficFlow
              ? `${liveTrafficFlow.isSimulated ? "Simulated flow" : "Live flow"}: ${liveTrafficFlow.currentSpeed} km/h (baseline ${liveTrafficFlow.freeFlowSpeed} km/h)`
              : trafficTileStatus === "error"
                ? "Traffic overlay unavailable"
                : trafficTileStatus === "loading"
                  ? "Loading TomTom traffic tiles…"
                  : "Traffic telemetry active"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <p role="status" className={`rounded-lg border px-3 py-2 ${
          baseTileStatus === "error"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-slate-700/70 bg-slate-900/50 text-slate-400"
        }`}>
          {baseTileStatus === "error"
            ? "OpenStreetMap tiles could not load. Mapped features and roads cannot display on a basemap; check your connection."
            : baseTileStatus === "loading"
              ? "Loading OpenStreetMap map tiles."
              : "OpenStreetMap map tiles loaded."}
        </p>
        <p role="status" className={`rounded-lg border px-3 py-2 ${
          roadResult.key === requestKey && roadResult.error
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-slate-700/70 bg-slate-900/50 text-slate-400"
        }`}>
          {roadsLoading
            ? roads.length
              ? `Showing ${roads.length} saved road paths while refreshing OpenStreetMap…`
              : "Loading exact mapped road paths from OpenStreetMap…"
            : roadResult.error
              ? roadResult.error
              : featuresStale
                ? `${roads.length} saved major road paths from OpenStreetMap (not live).`
                : `${roads.length} mapped major road paths loaded. Click any path for its name and exact OpenStreetMap way.`}
        </p>
        <p role="status" className={`rounded-lg border px-3 py-2 ${
          trafficTileStatus === "error" || liveTrafficFlowError
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-slate-700/70 bg-slate-900/50 text-slate-400"
        }`}>
          {trafficTileStatus === "loaded"
            ? "Live TomTom traffic overlay loaded."
            : liveTrafficFlow
              ? (liveTrafficFlow.isSimulated
                ? `Simulated road-corridor flow telemetry active (${liveTrafficFlow.currentSpeed} km/h · baseline ${liveTrafficFlow.freeFlowSpeed} km/h).`
                : `Live road-flow telemetry active (${liveTrafficFlow.currentSpeed} km/h).`)
              : trafficTileStatus === "loading" || liveTrafficLoading
                ? "Checking live TomTom traffic."
                : trafficTileStatus === "error" || liveTrafficFlowError
                  ? "TomTom live traffic unavailable."
                  : !liveFeedConfigured
                    ? "TomTom live traffic unavailable: no data-worker URL is configured."
                    : !liveTrafficConfigured
                      ? "TomTom live traffic unavailable: the Worker has no configured provider key."
                      : "TomTom traffic tiles have not returned map tiles yet."}
          {liveTrafficFlowError ? ` ${liveTrafficFlowError}` : ""}
          {" "}
          <span className="text-slate-300">
            {trafficProfile ? "City profile" : "City metric estimate"}: {fallbackTrafficSummary.currentCongestion} congestion · {fallbackTrafficSummary.averageSpeed} average speed · peak {fallbackTrafficSummary.peakTime}.
          </span>
          {" The profile summarizes the city only; it is not assigned to road locations on this map."}
        </p>
        {featuresError && (
          <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200 sm:col-span-2">
            {featuresError}
          </p>
        )}
      </div>
      <p role="status" className={`mt-2 rounded-lg border px-3 py-2 text-[11px] ${
        featuresError || roadResult.error
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-slate-700/70 bg-slate-900/50 text-slate-400"
      }`}>
        {featuresLoading || roadsLoading
          ? "Finding mapped intersections, transit and community locations near major roads…"
          : featuresStale
            ? `Showing a saved OpenStreetMap snapshot, not live data. ${featuresError}`
          : featuresError || roadResult.error
            ? `Potential traffic-pressure markers need mapped OpenStreetMap locations and road paths; some are unavailable. ${featuresError || roadResult.error}`
            : `${trafficPressurePoints.length} potential traffic-pressure locations identified from ${featuresStale ? "saved " : ""}mapped signals, transit, schools, hospitals or chargers near major roads. ${featuresStale ? "These saved locations are not live. " : ""}Select a warning marker for a suggested review action. This is a planning heuristic, not measured congestion or a validated probability.`}
      </p>
      <div className="mt-3">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          OpenStreetMap coverage by feature
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MAP_FEATURE_CATEGORIES.map(({ id, label }) => {
            const mappedCount = features.filter((feature) => feature.category === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleLayer(id)}
                aria-pressed={layers[id]}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  layers[id]
                    ? "border-cyan-500/25 bg-slate-900/60"
                    : "border-slate-800 bg-slate-950/40 opacity-60"
                }`}
              >
                <span className="block text-[10px] font-semibold text-slate-200">{label}</span>
                <span className={`mt-1 block text-[10px] ${
                  mappedCount > 0 ? "text-emerald-300" : featuresLoading ? "text-amber-200" : "text-amber-300"
                }`}>
                  {featuresLoading
                    ? "Searching mapped features…"
                    : mappedCount > 0
                      ? `${mappedCount} exact mapped location${mappedCount === 1 ? "" : "s"}`
                      : "No mapped locations within 5 km"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Only locations returned by OpenStreetMap are shown. Missing data is reported, never replaced with invented coordinates. Select a category to toggle its map layer.
        </p>
      </div>
    </div>
  );
};

export default LiveCityMap;
