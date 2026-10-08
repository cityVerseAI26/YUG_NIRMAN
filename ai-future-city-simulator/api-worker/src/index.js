import { unzipSync } from "fflate";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const allowedOrigins = (env) =>
  (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const validCoordinates = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const tomtomRequestError = (service, status) => {
  if (status === 401 || status === 403) {
    return `TomTom rejected the configured key for ${service} (${status}). Verify that the key is active and enabled for this API.`;
  }
  return `${service} request failed (${status}).`;
};

const tomtomFetchError = (service, error) => {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return json({ error: `TomTom ${service} request timed out.` }, 504);
  }
  console.error(`TomTom ${service.toLowerCase()} request failed`, error?.name || "UnknownError");
  return json({ error: `Could not retrieve TomTom ${service.toLowerCase()} data.` }, 502);
};

const populationFetchError = (source, error) => {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return json({ error: `${source} request timed out.` }, 504);
  }
  console.error(`${source} request failed`, error?.name || "UnknownError");
  return json({ error: `Could not retrieve ${source}.` }, 502);
};

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSM_API_FALLBACK_RADII = [700, 350];
const CENSUS_POPULATION_URL =
  "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv";
const CENSUS_POPULATION_SOURCE =
  "https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html";
const WORLD_CITIES_DATASET_URL =
  "https://www.kaggle.com/api/v1/datasets/download/viswanathanc/world-cities-datasets?fileName=worldcities.csv";
const WORLD_CITIES_DATASET_SOURCE =
  "https://www.kaggle.com/datasets/viswanathanc/world-cities-datasets";
const WORLD_CITIES_ORIGINAL_SOURCE = "https://simplemaps.com/data/world-cities";
const WORLD_CITIES_DATASET_UPDATED_AT = "2020-01-30";

const parseCsvRow = (line) => {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
};

const normalizePlaceName = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(city|town|village|borough|municipality|cdp)\b/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

async function getUsCityPopulation(url) {
  const cityName = url.searchParams.get("city")?.trim();
  const stateName = url.searchParams.get("state")?.trim();
  if (!cityName || cityName.length > 100 || !stateName || stateName.length > 100) {
    return json({ error: "Provide a valid city and state." }, 400);
  }

  const response = await fetch(CENSUS_POPULATION_URL, {
    cf: { cacheTtl: 86_400, cacheEverything: true },
    headers: { Accept: "text/csv" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("U.S. Census population estimates request failed", response.status);
    return json({ error: "The latest U.S. Census population estimates are unavailable." }, 502);
  }

  const csv = await response.text();
  const rows = csv.split(/\r?\n/);
  const headers = parseCsvRow(rows[0] || "");
  const normalizedCity = normalizePlaceName(cityName);
  const normalizedState = normalizePlaceName(stateName);
  const place = rows.slice(1).map(parseCsvRow).find((fields) =>
    fields[0] === "162" &&
    normalizePlaceName(fields[8] || "") === normalizedCity &&
    normalizePlaceName(fields[9] || "") === normalizedState
  );
  const estimateYears = [2020, 2021, 2022, 2023, 2024, 2025];
  const history = estimateYears.map((year) => {
    const column = headers.indexOf(`POPESTIMATE${year}`);
    return {
      year,
      population: column < 0 ? NaN : Number(place?.[column]),
    };
  });
  const population = history.at(-1)?.population;
  if (!Number.isSafeInteger(population) || population < 0) {
    return json({ error: "No matching incorporated city estimate was found in the latest U.S. Census data." }, 404);
  }
  if (history.some(({ population: value }) => !Number.isSafeInteger(value) || value < 0)) {
    return json({ error: "The U.S. Census population history is incomplete for this city." }, 502);
  }

  return json(
    {
      city: cityName,
      state: stateName,
      population,
      history,
      estimateYear: 2025,
      referenceDate: "2025-07-01",
      source: "U.S. Census Bureau Population Estimates Program",
      sourceUrl: CENSUS_POPULATION_SOURCE,
    },
    200,
    { "Cache-Control": "public, max-age=86400" }
  );
}

const hasRelevantOsmFeature = (tags = {}) =>
  tags.highway === "traffic_signals" ||
  Boolean(tags.crossing) ||
  Boolean(tags.public_transport) ||
  ["station", "halt", "tram_stop"].includes(tags.railway) ||
  tags.highway === "bus_stop" ||
  tags.amenity === "charging_station" ||
  /^(hospital|clinic|school|university|college)$/.test(tags.amenity || "") ||
  Boolean(tags.healthcare) ||
  /^(park|garden|nature_reserve)$/.test(tags.leisure || "") ||
  /^(water|wood)$/.test(tags.natural || "") ||
  /^(industrial|reservoir)$/.test(tags.landuse || "") ||
  Boolean(tags.waterway);

const isMajorOsmRoad = (tags = {}) =>
  /^(motorway|trunk|primary|secondary|tertiary)$/.test(tags.highway || "");

const osmPointDistance = (latitude, longitude, point) => {
  const latitudeMeters = (point.lat - latitude) * 111_320;
  const longitudeMeters =
    (point.lon - longitude) * 111_320 * Math.cos(latitude * Math.PI / 180);
  return Math.hypot(latitudeMeters, longitudeMeters);
};

async function getOpenStreetMapApiFallback(latitude, longitude) {
  let lastError;
  for (const radius of OSM_API_FALLBACK_RADII) {
    const latitudeDelta = radius / 111_320;
    const longitudeDelta =
      radius / (111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
    const bounds = [
      longitude - longitudeDelta,
      latitude - latitudeDelta,
      longitude + longitudeDelta,
      latitude + latitudeDelta,
    ].join(",");
    const requestUrl = new URL(
      `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bounds}`
    );

    try {
      const response = await fetch(requestUrl, {
        headers: {
          "Accept": "application/json",
          "Referer": "https://ai-future-city-simulator.yug-nirmanyug-nirman.workers.dev/",
          "User-Agent": "YUG-NIRMAN-CityMap/1.0",
        },
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 400 && /too many nodes/i.test(errorBody) && radius > 350) {
          lastError = new Error("OpenStreetMap map area is too dense; retrying with a smaller area.");
          continue;
        }
        throw new Error(`OpenStreetMap map API failed (${response.status}).`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload.elements)) {
        throw new Error("OpenStreetMap map API returned an invalid response.");
      }

      const nodes = new Map(
        payload.elements
          .filter((element) =>
            element.type === "node" &&
            validCoordinates(element.lat, element.lon)
          )
          .map((node) => [String(node.id), { lat: node.lat, lon: node.lon }])
      );
      const ways = new Map(
        payload.elements
          .filter((element) => element.type === "way")
          .map((way) => [
            String(way.id),
            (way.nodes || []).map((nodeId) => nodes.get(String(nodeId))).filter(Boolean),
          ])
      );
      const centerOf = (points) => {
        if (!points.length) return null;
        const center = points.reduce(
          (sum, point) => ({ lat: sum.lat + point.lat, lon: sum.lon + point.lon }),
          { lat: 0, lon: 0 }
        );
        return { lat: center.lat / points.length, lon: center.lon / points.length };
      };
      const elements = [];

      for (const element of payload.elements) {
        const tags = element.tags || {};
        const isFeature = hasRelevantOsmFeature(tags);
        const isRoad = isMajorOsmRoad(tags);
        if (!isFeature && !isRoad) continue;

        if (element.type === "node") {
          if (isFeature && osmPointDistance(latitude, longitude, element) <= radius) {
            elements.push({
              type: "node",
              id: element.id,
              lat: element.lat,
              lon: element.lon,
              tags,
            });
          }
          continue;
        }

        if (element.type === "way") {
          const geometry = ways.get(String(element.id)) || [];
          const center = centerOf(geometry);
          if (!center) continue;
          if (
            (isFeature && osmPointDistance(latitude, longitude, center) <= radius) ||
            (isRoad && geometry.some((point) => osmPointDistance(latitude, longitude, point) <= radius))
          ) {
            elements.push({
              type: "way",
              id: element.id,
              center,
              geometry,
              tags,
            });
          }
          continue;
        }

        if (element.type === "relation" && isFeature) {
          const relationPoints = (element.members || [])
            .filter((member) => member.type === "way")
            .flatMap((member) => ways.get(String(member.ref)) || []);
          const center = centerOf(relationPoints);
          if (center && osmPointDistance(latitude, longitude, center) <= radius) {
            elements.push({ type: "relation", id: element.id, center, tags });
          }
        }
      }

      return { elements, source: "OpenStreetMap map API", coverageRadiusMeters: radius };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("OpenStreetMap map API is unavailable.");
}

const buildOsmQuery = (latitude, longitude) => `
  [out:json][timeout:10];
  (
    nwr(around:5000,${latitude},${longitude})["highway"="traffic_signals"];
    nwr(around:5000,${latitude},${longitude})["public_transport"];
    nwr(around:5000,${latitude},${longitude})["railway"~"station|halt|tram_stop"];
    nwr(around:5000,${latitude},${longitude})["highway"="bus_stop"];
    nwr(around:5000,${latitude},${longitude})["amenity"="charging_station"];
    nwr(around:5000,${latitude},${longitude})["amenity"~"hospital|clinic|school|university|college"];
    nwr(around:5000,${latitude},${longitude})["healthcare"];
    nwr(around:5000,${latitude},${longitude})["leisure"~"park|garden|nature_reserve"];
    nwr(around:5000,${latitude},${longitude})["natural"~"water|wood"];
    nwr(around:5000,${latitude},${longitude})["landuse"~"industrial|reservoir"];
    nwr(around:5000,${latitude},${longitude})["waterway"];
  )->.features;
  way(around:5000,${latitude},${longitude})["highway"~"motorway|trunk|primary|secondary|tertiary"]->.roads;
  .features out center 400;
  .roads out geom 500;
`;

async function getOpenStreetMapData(url) {
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  if (!validCoordinates(latitude, longitude)) {
    return json({ error: "Provide valid lat and lon coordinates." }, 400);
  }

  const cache = globalThis.caches?.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  const query = buildOsmQuery(latitude, longitude);
  const failures = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": "https://ai-future-city-simulator.yug-nirmanyug-nirman.workers.dev/",
          "User-Agent": "YUG-NIRMAN-CityMap/1.0",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(4_000),
      });
      if (response.status === 406 || response.status === 429) {
        failures.push({
          message: `Overpass asked this app to pause after HTTP ${response.status}.`,
          name: "RateLimitError",
        });
        break;
      }
      if (!response.ok) throw new Error(`OpenStreetMap query failed (${response.status})`);
      const payload = await response.json();
      if (payload.remark || !Array.isArray(payload.elements)) {
        throw new Error(payload.remark || "OpenStreetMap returned an invalid response.");
      }
      const result = json(payload, 200, { "Cache-Control": "public, max-age=300" });
      if (cache) await cache.put(cacheKey, result.clone());
      return result;
    } catch (error) {
      const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
      failures.push({
        message: timedOut ? "OpenStreetMap query timed out." : error.message || "OpenStreetMap mirror failed.",
        name: timedOut ? "TimeoutError" : error.name,
      });
    }
  }

  const allTimedOut = failures.length > 0 && failures.every((failure) => failure.name === "TimeoutError");
  const messages = failures.map((failure) => failure.message);
  try {
    const fallback = await getOpenStreetMapApiFallback(latitude, longitude);
    const result = json(fallback, 200, { "Cache-Control": "public, max-age=300" });
    if (cache) await cache.put(cacheKey, result.clone());
    return result;
  } catch (fallbackError) {
    messages.push(fallbackError.message || "OpenStreetMap map API fallback failed.");
  }

  console.error("OpenStreetMap proxy request failed", messages);
  return json({
    error: allTimedOut
      ? `Overpass mirrors timed out; ${messages[messages.length - 1]}`
      : messages.join("; ") || "All OpenStreetMap mirrors failed.",
    retryAfterSeconds: 30,
  }, allTimedOut ? 504 : 502, {
    "Cache-Control": "no-store",
    "Retry-After": "30",
  });
}

async function getWorldCityPopulation(url) {
  const cityName = url.searchParams.get("city")?.trim();
  const countryName = url.searchParams.get("country")?.trim();
  const adminName = url.searchParams.get("admin")?.trim();
  if (
    !cityName || cityName.length > 100 ||
    !countryName || countryName.length > 100 ||
    (adminName && adminName.length > 100)
  ) {
    return json({ error: "Provide a valid city and country." }, 400);
  }

  const response = await fetch(WORLD_CITIES_DATASET_URL, {
    cf: { cacheTtl: 604_800, cacheEverything: true },
    headers: { Accept: "application/zip" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Kaggle world-cities dataset request failed", response.status);
    return json({ error: "The dated world-city population reference is unavailable." }, 502);
  }

  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const csvFile = archive["worldcities.csv"];
  if (!csvFile) {
    console.error("Kaggle world-cities archive did not contain worldcities.csv");
    return json({ error: "The world-city population dataset has an invalid file layout." }, 502);
  }

  const csv = new TextDecoder("utf-8").decode(csvFile).replace(/^\uFEFF/, "");
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = parseCsvRow(headerLine || "");
  const cityIndex = headers.indexOf("city_ascii");
  const countryIndex = headers.indexOf("country");
  const adminIndex = headers.indexOf("admin_name");
  const populationIndex = headers.indexOf("population");
  if ([cityIndex, countryIndex, adminIndex, populationIndex].some((index) => index < 0)) {
    console.error("Kaggle world-cities CSV is missing required columns");
    return json({ error: "The world-city population dataset is missing required fields." }, 502);
  }

  const normalizedCity = normalizePlaceName(cityName);
  const normalizedCountry = normalizePlaceName(countryName);
  const normalizedAdmin = adminName ? normalizePlaceName(adminName) : "";
  const candidates = lines
    .filter(Boolean)
    .map(parseCsvRow)
    .filter((fields) =>
      normalizePlaceName(fields[cityIndex] || "") === normalizedCity &&
      normalizePlaceName(fields[countryIndex] || "") === normalizedCountry
    );
  const matches = normalizedAdmin
    ? candidates.filter((fields) => normalizePlaceName(fields[adminIndex] || "") === normalizedAdmin)
    : candidates;
  if (matches.length > 1) {
    return json({
      error: "More than one matching city was found; provide a state or region to identify it.",
    }, 409);
  }
  const populationText = matches[0]?.[populationIndex]?.trim();
  const population = populationText ? Number(populationText) : null;
  if (!Number.isSafeInteger(population) || population < 0) {
    return json({
      error: matches.length
        ? "This dataset has no population value for the selected city."
        : "No matching city was found in the world-cities dataset.",
    }, 404);
  }

  return json(
    {
      city: cityName,
      country: countryName,
      population,
      estimateYear: null,
      datasetUpdatedAt: WORLD_CITIES_DATASET_UPDATED_AT,
      populationReference: "Urban population estimate; the dataset does not specify the population reference year.",
      source: "Kaggle World Cities Dataset (SimpleMaps)",
      sourceUrl: WORLD_CITIES_DATASET_SOURCE,
      originalSourceUrl: WORLD_CITIES_ORIGINAL_SOURCE,
      license: "CC BY 4.0",
    },
    200,
    { "Cache-Control": "public, max-age=604800" }
  );
}

const withCors = (response, origin) => {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  if (headers.has("Retry-After")) headers.set("Access-Control-Expose-Headers", "Retry-After");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
};

async function getOpenAqStations(url, env, context) {
  if (!env.OPENAQ_API_KEY) {
    return json({ error: "OpenAQ is not configured on the data worker." }, 503);
  }

  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  if (!validCoordinates(latitude, longitude)) {
    return json({ error: "Provide valid lat and lon coordinates." }, 400);
  }

  const radius = Number(url.searchParams.get("radius") || 25000);
  if (!Number.isInteger(radius) || radius < 1 || radius > 25000) {
    return json({ error: "radius must be an integer between 1 and 25000 meters." }, 400);
  }

  const cache = globalThis.caches?.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  const locationsUrl = new URL("https://api.openaq.org/v3/locations");
  locationsUrl.search = new URLSearchParams({
    coordinates: `${latitude},${longitude}`,
    radius: String(radius),
    limit: "8",
    page: "1",
  });
  const headers = { "X-API-Key": env.OPENAQ_API_KEY };
  const locationsResponse = await fetch(locationsUrl, { headers });
  if (!locationsResponse.ok) {
    console.error("OpenAQ locations request failed", locationsResponse.status);
    return json({ error: `OpenAQ locations request failed (${locationsResponse.status}).` }, 502);
  }

  const locationsPayload = await locationsResponse.json();
  if (!Array.isArray(locationsPayload.results)) {
    return json({ error: "OpenAQ returned an invalid locations response." }, 502);
  }

  const locations = locationsPayload.results.filter((location) =>
    validCoordinates(location.coordinates?.latitude, location.coordinates?.longitude)
  );
  const latestResponses = await Promise.allSettled(
    locations.map(async (location) => {
      const latestUrl = new URL(
        `https://api.openaq.org/v3/locations/${encodeURIComponent(location.id)}/latest`
      );
      latestUrl.search = new URLSearchParams({ limit: "100", page: "1" });
      const response = await fetch(latestUrl, { headers });
      if (!response.ok) {
        throw new Error(`OpenAQ latest request failed (${response.status})`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload.results)) {
        throw new Error("OpenAQ returned an invalid latest response.");
      }
      return { location, results: payload.results };
    })
  );

  const stations = [];
  let failedStationRequests = 0;
  for (const result of latestResponses) {
    if (result.status === "rejected") {
      failedStationRequests += 1;
      console.error("OpenAQ latest request failed", result.reason);
      continue;
    }

    const { location, results } = result.value;
    const sensorsById = new Map((location.sensors || []).map((sensor) => [sensor.id, sensor]));
    const measurements = results.flatMap((measurement) => {
      if (!Number.isFinite(measurement.value)) return [];
      const sensor = sensorsById.get(measurement.sensorsId);
      const parameter = sensor?.parameter || measurement.parameter || {};
      return [{
        parameter: parameter.displayName || parameter.name || sensor?.name || "Measurement",
        value: measurement.value,
        unit: parameter.units || "",
        observedAt: measurement.datetime?.utc || measurement.datetime?.local || "",
      }];
    });

    stations.push({
      id: location.id,
      name: location.name || "OpenAQ monitoring station",
      coordinates: [location.coordinates.latitude, location.coordinates.longitude],
      provider: location.provider?.name || location.owner?.name || "OpenAQ",
      measurements,
    });
  }

  if (latestResponses.length > 0 && stations.length === 0 && failedStationRequests > 0) {
    return json({ error: "OpenAQ latest readings failed for every nearby monitoring station." }, 502);
  }

  const response = json(
    {
      source: "OpenAQ",
      updatedAt: new Date().toISOString(),
      stations,
      failedStationRequests,
    },
    200,
    { "Cache-Control": "public, max-age=120" }
  );
  if (cache && context) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function getTrafficTile(url, env, segments) {
  if (!env.TOMTOM_API_KEY) {
    return json({ error: "TomTom traffic is not configured on the data worker." }, 503);
  }

  const [zoomText, xText, yText] = segments;
  const zoom = Number(zoomText);
  const x = Number(xText);
  const y = Number(yText);
  if (
    !Number.isInteger(zoom) ||
    zoom < 0 ||
    zoom > 22 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= 2 ** zoom ||
    y >= 2 ** zoom
  ) {
    return json({ error: "Invalid traffic tile coordinates." }, 400);
  }

  const style = url.searchParams.get("style") || "light";
  if (!["light", "dark"].includes(style)) {
    return json({ error: "style must be light or dark." }, 400);
  }

  const upstreamUrl = new URL(
    `https://api.tomtom.com/maps/orbis/traffic/flow/raster/tile/${zoom}/${x}/${y}`
  );
  upstreamUrl.search = new URLSearchParams({
    apiVersion: "2",
    style,
    tileSize: "256",
  });
  const response = await fetch(upstreamUrl, {
    headers: {
      "TomTom-Api-Key": env.TOMTOM_API_KEY,
      Accept: "image/png",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    console.error("TomTom traffic tile request failed", response.status);
    const retryAfter = response.headers.get("Retry-After");
    return json(
      { error: tomtomRequestError("Traffic tile", response.status) },
      response.status === 429 ? 429 : 502,
      retryAfter ? { "Retry-After": retryAfter } : {}
    );
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=60",
    },
  });
}

async function getTrafficFlow(url, env) {
  if (!env.TOMTOM_API_KEY) {
    return json({ error: "TomTom traffic is not configured on the data worker." }, 503);
  }

  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  if (!validCoordinates(latitude, longitude)) {
    return json({ error: "Provide valid lat and lon coordinates." }, 400);
  }

  const upstreamUrl = new URL(
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
  );
  upstreamUrl.search = new URLSearchParams({
    point: `${latitude},${longitude}`,
    unit: "kmph",
    key: env.TOMTOM_API_KEY,
  });
  const response = await fetch(upstreamUrl, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    console.error("TomTom flow segment request failed", response.status);
    const retryAfter = response.headers.get("Retry-After");
    return json(
      { error: tomtomRequestError("Traffic Flow API", response.status) },
      response.status === 429 ? 429 : 502,
      retryAfter ? { "Retry-After": retryAfter } : {}
    );
  }

  const payload = await response.json();
  const segment = payload.flowSegmentData;
  if (
    !segment ||
    !Number.isFinite(segment.currentSpeed) ||
    !Number.isFinite(segment.freeFlowSpeed) ||
    !Number.isFinite(segment.currentTravelTime) ||
    segment.currentTravelTime <= 0 ||
    !Number.isFinite(segment.freeFlowTravelTime) ||
    segment.freeFlowTravelTime <= 0 ||
    !Number.isFinite(segment.confidence) ||
    segment.confidence < 0 ||
    segment.confidence > 1 ||
    segment.currentSpeed < 0 ||
    segment.freeFlowSpeed <= 0 ||
    typeof segment.roadClosure !== "boolean"
  ) {
    return json({ error: "TomTom returned an invalid flow-segment response." }, 502);
  }

  return json(
    {
      source: "TomTom Traffic Flow Segment API",
      requestedPoint: [latitude, longitude],
      currentSpeed: segment.currentSpeed,
      freeFlowSpeed: segment.freeFlowSpeed,
      currentTravelTime: segment.currentTravelTime,
      freeFlowTravelTime: segment.freeFlowTravelTime,
      confidence: segment.confidence,
      roadClosure: segment.roadClosure,
      retrievedAt: new Date().toISOString(),
      speedUnit: "km/h",
      travelTimeUnit: "seconds",
    },
    200,
    { "Cache-Control": "public, max-age=60" }
  );
}

export default {
  async fetch(request, env, context) {
    const origin = request.headers.get("Origin");
    const origins = allowedOrigins(env);
    if (!origin || !origins.includes(origin)) {
      return json({ error: "This site origin is not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }
    if (request.method !== "GET") {
      return withCors(json({ error: "Only GET requests are supported." }, 405), origin);
    }

    const url = new URL(request.url);
    const isSensorRequest = url.pathname === "/api/sensors";
    const isOsmRequest = url.pathname === "/api/osm/map";
    const isTrafficRequest = url.pathname.startsWith("/api/traffic/tiles/");
    const isTrafficFlowRequest = url.pathname === "/api/traffic/flow";
    const isPopulationRequest = url.pathname === "/api/population/us-city";
    const isWorldPopulationRequest = url.pathname === "/api/population/world-city";
    const rateLimiter = isSensorRequest
      ? env.SENSOR_RATE_LIMITER
      : isOsmRequest || isTrafficRequest || isTrafficFlowRequest || isPopulationRequest || isWorldPopulationRequest
        ? env.TRAFFIC_RATE_LIMITER
        : null;
    if (rateLimiter) {
      const clientIp = request.headers.get("CF-Connecting-IP") || origin;
      const { success } = await rateLimiter.limit({
        key: `${clientIp}:${isSensorRequest ? "sensors" : "traffic"}`,
      });
      if (!success) {
        return withCors(json(
          { error: "Request limit reached; retry shortly." },
          429,
          { "Retry-After": "60" }
        ), origin);
      }
    }

    let response;
    if (url.pathname === "/api/status") {
      response = json({
        traffic: Boolean(env.TOMTOM_API_KEY),
        sensors: Boolean(env.OPENAQ_API_KEY),
      });
    } else if (isOsmRequest) {
      try {
        response = await getOpenStreetMapData(url);
      } catch (error) {
        console.error("OpenStreetMap proxy request failed", error);
        response = json({ error: "Could not retrieve OpenStreetMap data." }, 502);
      }
    } else if (isSensorRequest) {
      try {
        response = await getOpenAqStations(url, env, context);
      } catch (error) {
        console.error("OpenAQ request failed", error);
        response = json({ error: "Could not retrieve OpenAQ sensor readings." }, 502);
      }
    } else if (isTrafficRequest) {
      try {
        const tileCoordinates = url.pathname
          .slice("/api/traffic/tiles/".length)
          .split("/");
        response = await getTrafficTile(url, env, tileCoordinates);
      } catch (error) {
        response = tomtomFetchError("traffic tile", error);
      }
    } else if (isTrafficFlowRequest) {
      try {
        response = await getTrafficFlow(url, env);
      } catch (error) {
        response = tomtomFetchError("road flow", error);
      }
    } else if (isPopulationRequest) {
      try {
        response = await getUsCityPopulation(url);
      } catch (error) {
        response = populationFetchError("U.S. Census population estimates", error);
      }
    } else if (isWorldPopulationRequest) {
      try {
        response = await getWorldCityPopulation(url);
      } catch (error) {
        response = populationFetchError("the world-cities population reference", error);
      }
    } else {
      response = json({ error: "Endpoint not found." }, 404);
    }

    return withCors(response, origin);
  },
};
