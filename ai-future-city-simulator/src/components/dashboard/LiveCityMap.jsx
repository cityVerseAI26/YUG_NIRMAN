import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Activity, RefreshCw } from "lucide-react";
import { useCity } from "../../context/CityContext";

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

const buildOverpassQuery = ([lat, lon]) => `
  [out:json][timeout:25];
  (
    nwr(around:10000,${lat},${lon})["highway"="traffic_signals"];
    nwr(around:10000,${lat},${lon})["public_transport"];
    nwr(around:10000,${lat},${lon})["railway"~"station|halt|tram_stop"];
    nwr(around:10000,${lat},${lon})["highway"="bus_stop"];
    nwr(around:10000,${lat},${lon})["amenity"="charging_station"];
    nwr(around:10000,${lat},${lon})["amenity"~"hospital|clinic|school|university|college"];
    nwr(around:10000,${lat},${lon})["healthcare"];
    nwr(around:10000,${lat},${lon})["leisure"~"park|garden|nature_reserve"];
    nwr(around:10000,${lat},${lon})["natural"~"water|wood"];
    nwr(around:10000,${lat},${lon})["landuse"~"industrial|reservoir"];
    nwr(around:10000,${lat},${lon})["waterway"];
  );
  out center tags 250;
`;

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

export const LiveCityMap = () => {
  const {
    city,
    liveWeather,
    liveAirQuality,
    liveWeatherError,
    liveAirQualityError,
    liveDataLoading,
    refreshLiveData,
  } = useCity();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [featureResult, setFeatureResult] = useState({ key: "", features: [], error: "", updatedAt: "" });
  const requestKey = `${city.id}:${refreshVersion}`;
  const features = featureResult.key === requestKey ? featureResult.features : [];
  const featuresLoading = featureResult.key !== requestKey;
  const featuresError = featureResult.key === requestKey ? featureResult.error : "";
  const weather = liveWeather;
  const airQuality = liveAirQuality;
  const weatherError = liveWeatherError;
  const airQualityError = liveAirQualityError;
  const lastUpdated = featureResult.key === requestKey ? featureResult.updatedAt : "";

  // Layer toggles
  const [layers, setLayers] = useState({
    all: true,
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

  useEffect(() => {
    const controller = new AbortController();

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: `data=${encodeURIComponent(buildOverpassQuery(city.coordinates))}`,
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`OpenStreetMap query failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        const mappedFeatures = (data.elements || []).flatMap((element) => {
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
        });
        setFeatureResult({
          key: requestKey,
          features: mappedFeatures,
          error: "",
          updatedAt: new Date().toLocaleTimeString(),
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setFeatureResult({
          key: requestKey,
          features: [],
          error: "Could not load OpenStreetMap features. Retry in a moment.",
          updatedAt: "",
        });
      });
    return () => controller.abort();
  }, [city.coordinates, requestKey]);

  const toggleLayer = (key) => {
    if (key === "all") {
      const nextState = !layers.all;
      setLayers({
        all: nextState,
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
              <span>LIVE CITY DIGITAL TWIN</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {city.name} • Public Data
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real OpenStreetMap features and modeled current air quality • Select a marker for source details
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={featuresLoading || liveDataLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={featuresLoading || liveDataLoading ? "animate-spin" : ""} />
            Refresh data
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
      <p className="mt-2 text-[10px] text-slate-500 flex items-start gap-1.5">
        <Activity size={12} className="mt-0.5 shrink-0 text-cyan-500" />
        Current weather and air quality are Open-Meteo model data for {city.name}; AQI is not a roadside sensor reading. Live traffic speeds and city IoT sensors are not connected.
      </p>
      <p className="text-[10px] text-slate-500">
        Data time: {weather?.time || lastUpdated || "Waiting for public data…"} · Values refresh when the city changes or you select Refresh data.
      </p>
      {featuresError && <p role="status" className="mt-2 text-xs text-amber-300">{featuresError}</p>}
      {airQualityError && <p role="status" className="mt-1 text-xs text-amber-300">{airQualityError}</p>}
      {weatherError && <p role="status" className="mt-1 text-xs text-amber-300">{weatherError}</p>}

      {/* Interactive Map Canvas */}
      <div className="mt-4 h-[420px] w-full rounded-xl overflow-hidden border border-cyan-500/20 shadow-inner relative z-10">
        <MapContainer
          center={city.coordinates}
          zoom={city.zoom}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <MapRecenter center={city.coordinates} zoom={city.zoom} />
          <MapBaseMapStyle isDark={baseMap === "dark"} />

          {/* Both basemaps use public OpenStreetMap tiles; dark styling is applied locally. */}
          <TileLayer
            key={baseMap}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

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
                  <div className="text-[11px] text-slate-300">Community-mapped location from OpenStreetMap.</div>
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
        </MapContainer>

        {/* Floating public-data map status */}
        <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md text-[11px] text-cyan-300 flex items-center gap-2 pointer-events-none">
          <span className={`w-2 h-2 rounded-full ${featuresLoading ? "bg-amber-400 animate-pulse" : featuresError ? "bg-rose-400" : "bg-emerald-400"}`}></span>
          <span>
            {featuresLoading ? "Loading OpenStreetMap features" : `${filteredFeatures.length} mapped features`}
            {` • ${city.coordinates[0].toFixed(2)}°N, ${city.coordinates[1].toFixed(2)}°E`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveCityMap;
