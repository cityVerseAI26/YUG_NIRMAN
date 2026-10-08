import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { afterEach, test } from "node:test";
import worker from "./index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const makeRequest = (path, origin = "https://city.example") =>
  new Request(`https://worker.example${path}`, {
    headers: { Origin: origin },
  });

const makeWorldCitiesArchive = (rows) => {
  const csv = [
    "city,city_ascii,country,admin_name,population",
    ...rows.map((row) => [
      row.city,
      row.cityAscii || row.city,
      row.country,
      row.admin,
      row.population ?? "",
    ].map((field) => `"${String(field).replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
  return zipSync({ "worldcities.csv": strToU8(csv) });
};

test("rejects origins that are not configured", async () => {
  const response = await worker.fetch(makeRequest("/api/status"), {
    ALLOWED_ORIGINS: "https://allowed.example",
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "This site origin is not allowed." });
});

test("reports provider configuration without exposing credentials", async () => {
  const response = await worker.fetch(makeRequest("/api/status"), {
    ALLOWED_ORIGINS: "https://city.example",
    TOMTOM_API_KEY: "tomtom-secret",
    OPENAQ_API_KEY: "openaq-secret",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { traffic: true, sensors: true });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://city.example");
});

test("allows the GitHub Pages site origin for browser API requests", async () => {
  const origin = "https://cityverseai26.github.io";
  const response = await worker.fetch(makeRequest("/api/status", origin), {
    ALLOWED_ORIGINS: `https://city.example,${origin}`,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
});

test("returns the latest U.S. Census city population estimate with its reference date", async () => {
  let requestedUrl;
  globalThis.fetch = async (input, options) => {
    requestedUrl = String(input);
    assert.equal(options.cf.cacheTtl, 86_400);
    return new Response([
      "SUMLEV,STATE,COUNTY,PLACE,COUSUB,CONCIT,PRIMGEO_FLAG,FUNCSTAT,NAME,STNAME,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2021,POPESTIMATE2022,POPESTIMATE2023,POPESTIMATE2024,POPESTIMATE2025",
      "162,25,025,07000,00000,00000,0,A,Boston city,Massachusetts,675647,675647,670605,665945,672814,673458,675647",
    ].join("\n"), { headers: { "Content-Type": "text/csv" } });
  };

  const response = await worker.fetch(
    makeRequest("/api/population/us-city?city=Boston&state=Massachusetts"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv");
  assert.equal(payload.population, 675647);
  assert.deepEqual(payload.history, [
    { year: 2020, population: 675647 },
    { year: 2021, population: 670605 },
    { year: 2022, population: 665945 },
    { year: 2023, population: 672814 },
    { year: 2024, population: 673458 },
    { year: 2025, population: 675647 },
  ]);
  assert.equal(payload.estimateYear, 2025);
  assert.equal(payload.referenceDate, "2025-07-01");
  assert.equal(payload.source, "U.S. Census Bureau Population Estimates Program");
  assert.match(payload.sourceUrl, /2020s-total-cities-and-towns\.html$/);
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=86400");
});

test("reports Census data timeouts distinctly", async () => {
  globalThis.fetch = async (_input, options) => {
    assert.ok(options.signal);
    throw new DOMException("Request timed out", "TimeoutError");
  };

  const response = await worker.fetch(
    makeRequest("/api/population/us-city?city=Boston&state=Massachusetts"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: "U.S. Census population estimates request timed out.",
  });
});

test("does not substitute another city or state when the Census place is missing", async () => {
  globalThis.fetch = async () => new Response([
    "SUMLEV,STATE,COUNTY,PLACE,COUSUB,CONCIT,PRIMGEO_FLAG,FUNCSTAT,NAME,STNAME,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2021,POPESTIMATE2022,POPESTIMATE2023,POPESTIMATE2024,POPESTIMATE2025",
    "162,25,025,07000,00000,00000,0,A,Boston city,Massachusetts,675647,675647,670605,665945,672814,673458,675647",
  ].join("\n"));

  const response = await worker.fetch(
    makeRequest("/api/population/us-city?city=Boston&state=California"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "No matching incorporated city estimate was found in the latest U.S. Census data.",
  });
});

test("returns an attributed historical world-city population reference", async () => {
  const archive = makeWorldCitiesArchive([
    { city: "Mumbai", country: "India", admin: "Maharashtra", population: 12_442_373 },
    { city: "Springfield", country: "United States", admin: "Illinois", population: 114_394 },
  ]);
  let requestedUrl;
  globalThis.fetch = async (input, options) => {
    requestedUrl = String(input);
    assert.equal(options.cf.cacheTtl, 604_800);
    return new Response(archive);
  };

  const response = await worker.fetch(
    makeRequest("/api/population/world-city?city=Mumbai&country=India&admin=Maharashtra"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, "https://www.kaggle.com/api/v1/datasets/download/viswanathanc/world-cities-datasets?fileName=worldcities.csv");
  assert.equal(payload.population, 12_442_373);
  assert.equal(payload.estimateYear, null);
  assert.equal(payload.datasetUpdatedAt, "2020-01-30");
  assert.match(payload.populationReference, /reference year/);
  assert.equal(payload.source, "Kaggle World Cities Dataset (SimpleMaps)");
  assert.equal(payload.license, "CC BY 4.0");
  assert.match(payload.sourceUrl, /^https:\/\/www\.kaggle\.com\/datasets\//);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://city.example");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=604800");
});

test("reports world-city dataset timeouts distinctly", async () => {
  globalThis.fetch = async (_input, options) => {
    assert.ok(options.signal);
    throw new DOMException("Request timed out", "TimeoutError");
  };

  const response = await worker.fetch(
    makeRequest("/api/population/world-city?city=Mumbai&country=India&admin=Maharashtra"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: "the world-cities population reference request timed out.",
  });
});

test("requires a region when the world-cities match is ambiguous", async () => {
  globalThis.fetch = async () => new Response(makeWorldCitiesArchive([
    { city: "Springfield", country: "United States", admin: "Illinois", population: 114_394 },
    { city: "Springfield", country: "United States", admin: "Missouri", population: 169_176 },
  ]));

  const response = await worker.fetch(
    makeRequest("/api/population/world-city?city=Springfield&country=United+States"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /provide a state or region/i);
});

test("rejects invalid world-city queries without downloading the dataset", async () => {
  globalThis.fetch = async () => {
    assert.fail("Invalid requests must not download the dataset.");
  };

  const response = await worker.fetch(
    makeRequest("/api/population/world-city?city=Mumbai"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Provide a valid city and country." });
});

test("reports missing population and malformed world-city archives", async () => {
  globalThis.fetch = async () => new Response(makeWorldCitiesArchive([
    { city: "Unknownville", country: "India", admin: "Gujarat" },
  ]));
  const missingPopulation = await worker.fetch(
    makeRequest("/api/population/world-city?city=Unknownville&country=India&admin=Gujarat"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );
  assert.equal(missingPopulation.status, 404);
  assert.match((await missingPopulation.json()).error, /no population value/i);

  globalThis.fetch = async () => new Response(strToU8("not a zip archive"));
  const malformedArchive = await worker.fetch(
    makeRequest("/api/population/world-city?city=Mumbai&country=India"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );
  assert.equal(malformedArchive.status, 502);
  assert.match((await malformedArchive.json()).error, /population reference/i);
});

test("proxies combined OpenStreetMap map data with identifying headers, CORS, and caching", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json({ elements: [{ type: "node", id: 12 }, { type: "way", id: 34 }] });
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://city.example");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300");
  assert.equal(requests.length, 1);
  const [{ url, options }] = requests;
  assert.equal(url, "https://overpass.private.coffee/api/interpreter");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Referer, "https://ai-future-city-simulator.yug-nirmanyug-nirman.workers.dev/");
  assert.equal(options.headers["User-Agent"], "YUG-NIRMAN-CityMap/1.0");
  const query = new URLSearchParams(options.body).get("data");
  assert.match(query, /around:5000,19\.076,72\.8777/);
  assert.match(query, /->\.features;/);
  assert.match(query, /->\.roads;/);
  assert.deepEqual(await response.json(), { elements: [{ type: "node", id: 12 }, { type: "way", id: 34 }] });
});

test("tries the next OpenStreetMap mirror after an upstream error", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return new Response("Unavailable", { status: 503 });
    return Response.json({ elements: [{ type: "way", id: 34 }] });
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(await response.json(), { elements: [{ type: "way", id: 34 }] });
});

test("pauses on Overpass rate-limit responses instead of immediately retrying mirrors", async () => {
  const attempts = [];
  globalThis.fetch = async (input) => {
    attempts.push(String(input));
    if (attempts.length === 1) return new Response("Rate limited", { status: 429 });
    return Response.json({ elements: [] });
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 200);
  assert.equal(attempts.length, 2);
  assert.match(attempts[1], /^https:\/\/api\.openstreetmap\.org\/api\/0\.6\/map\.json\?/);
  assert.deepEqual(await response.json(), {
    elements: [],
    source: "OpenStreetMap map API",
    coverageRadiusMeters: 700,
  });
});

test("uses a bounded main-API fallback after Overpass mirrors time out", async () => {
  let attempts = 0;
  globalThis.fetch = async (input, options) => {
    attempts += 1;
    if (String(input).startsWith("https://api.openstreetmap.org/")) {
      assert.equal(options.headers["User-Agent"], "YUG-NIRMAN-CityMap/1.0");
      return Response.json({
        elements: [
          { type: "node", id: 12, lat: 19.076, lon: 72.8777, tags: { highway: "traffic_signals" } },
          { type: "node", id: 20, lat: 19.076, lon: 72.8777 },
          { type: "node", id: 21, lat: 19.077, lon: 72.878 },
          { type: "way", id: 34, nodes: [20, 21], tags: { highway: "primary", name: "Central Road" } },
          { type: "way", id: 35, nodes: [20, 21], tags: { amenity: "school", name: "City School" } },
          { type: "node", id: 99, lat: 20, lon: 73, tags: { amenity: "school" } },
        ],
      });
    }
    const error = new Error("The operation was aborted due to timeout");
    error.name = "AbortError";
    throw error;
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 200);
  assert.equal(attempts, 4);
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300");
  const payload = await response.json();
  assert.equal(payload.source, "OpenStreetMap map API");
  assert.equal(payload.coverageRadiusMeters, 700);
  assert.deepEqual(payload.elements.map((element) => [element.type, element.id]), [
    ["node", 12],
    ["way", 34],
    ["way", 35],
  ]);
  assert.equal(payload.elements[1].geometry.length, 2);
  assert.ok(Math.abs(payload.elements[2].center.lat - 19.0765) < 0.000001);
});

test("retries dense OSM API fallback bounds at half radius", async () => {
  const fallbackUrls = [];
  globalThis.fetch = async (input) => {
    const requestUrl = String(input);
    if (!requestUrl.startsWith("https://api.openstreetmap.org/")) {
      return new Response("Unavailable", { status: 503 });
    }
    fallbackUrls.push(requestUrl);
    if (fallbackUrls.length === 1) {
      return new Response("You requested too many nodes (limit is 50000).", { status: 400 });
    }
    return Response.json({ elements: [] });
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 200);
  assert.equal(fallbackUrls.length, 2);
  assert.deepEqual(await response.json(), {
    elements: [],
    source: "OpenStreetMap map API",
    coverageRadiusMeters: 350,
  });
});

test("rejects invalid OpenStreetMap coordinates without calling upstream", async () => {
  globalThis.fetch = async () => {
    throw new Error("OpenStreetMap should not be called for invalid coordinates.");
  };

  const response = await worker.fetch(
    makeRequest("/api/osm/map?lat=91&lon=72"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Provide valid lat and lon coordinates." });
});

test("rejects invalid traffic tile coordinates without calling TomTom", async () => {
  globalThis.fetch = async () => {
    throw new Error("TomTom should not be called for an invalid tile.");
  };

  const response = await worker.fetch(makeRequest("/api/traffic/tiles/3/8/1"), {
    ALLOWED_ORIGINS: "https://city.example",
    TOMTOM_API_KEY: "tomtom-secret",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid traffic tile coordinates." });
});

test("returns OpenAQ readings without forwarding the API key to the client", async () => {
  const requestedUrls = [];
  globalThis.fetch = async (input, init) => {
    requestedUrls.push({ url: String(input), headers: init.headers });
    if (String(input).includes("/v3/locations?")) {
      return Response.json({
        results: [{
          id: 42,
          name: "Central station",
          coordinates: { latitude: 19.08, longitude: 72.88 },
          provider: { name: "Public provider" },
          sensors: [{ id: 7, parameter: { name: "pm25", units: "µg/m³" } }],
        }],
      });
    }
    return Response.json({
      results: [{
        sensorsId: 7,
        value: 12.5,
        datetime: { utc: "2026-10-04T00:00:00Z" },
      }],
    });
  };

  const response = await worker.fetch(
    makeRequest("/api/sensors?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      OPENAQ_API_KEY: "openaq-secret",
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.stations.length, 1);
  assert.deepEqual(payload.stations[0].coordinates, [19.08, 72.88]);
  assert.deepEqual(payload.stations[0].measurements[0], {
    parameter: "pm25",
    value: 12.5,
    unit: "µg/m³",
    observedAt: "2026-10-04T00:00:00Z",
  });
  assert.equal(JSON.stringify(payload).includes("openaq-secret"), false);
  assert.equal(requestedUrls.length, 2);
  assert.ok(requestedUrls.every(({ headers }) => headers["X-API-Key"] === "openaq-secret"));
});

test("reports failure when all nearby OpenAQ station readings fail", async () => {
  globalThis.fetch = async (input) => {
    if (String(input).includes("/v3/locations?")) {
      return Response.json({
        results: [{
          id: 42,
          name: "Central station",
          coordinates: { latitude: 19.08, longitude: 72.88 },
          sensors: [],
        }],
      });
    }
    return new Response("upstream unavailable", { status: 503 });
  };

  const response = await worker.fetch(
    makeRequest("/api/sensors?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      OPENAQ_API_KEY: "openaq-secret",
    }
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "OpenAQ latest readings failed for every nearby monitoring station.",
  });
});

test("proxies TomTom PNG tiles using its key in the upstream header", async () => {
  let requestedUrl;
  let requestHeaders;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestHeaders = init.headers;
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { "Content-Type": "image/png" },
    });
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/tiles/12/2044/1360?style=dark"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.match(requestedUrl, /api\.tomtom\.com\/maps\/orbis\/traffic\/flow\/raster\/tile\/12\/2044\/1360/);
  assert.equal(new URL(requestedUrl).searchParams.get("style"), "dark");
  assert.equal(requestHeaders["TomTom-Api-Key"], "tomtom-secret");
  assert.equal(response.headers.get("TomTom-Api-Key"), null);
});

test("returns validated TomTom flow data for the nearest road without exposing its key", async () => {
  let requestedUrl;
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({
      flowSegmentData: {
        currentSpeed: 24,
        freeFlowSpeed: 48,
        currentTravelTime: 150,
        freeFlowTravelTime: 75,
        confidence: 0.91,
        roadClosure: false,
      },
    });
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );
  const payload = await response.json();
  const upstreamUrl = new URL(requestedUrl);

  assert.equal(response.status, 200);
  assert.equal(upstreamUrl.pathname, "/traffic/services/4/flowSegmentData/absolute/10/json");
  assert.equal(upstreamUrl.searchParams.get("point"), "19.076,72.8777");
  assert.equal(upstreamUrl.searchParams.get("unit"), "kmph");
  assert.equal(upstreamUrl.searchParams.get("key"), "tomtom-secret");
  assert.equal(payload.source, "TomTom Traffic Flow Segment API");
  assert.deepEqual(payload.requestedPoint, [19.076, 72.8777]);
  assert.equal(payload.currentSpeed, 24);
  assert.equal(payload.freeFlowSpeed, 48);
  assert.equal(payload.currentTravelTime, 150);
  assert.equal(payload.freeFlowTravelTime, 75);
  assert.equal(payload.confidence, 0.91);
  assert.equal(payload.roadClosure, false);
  assert.match(payload.retrievedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.speedUnit, "km/h");
  assert.equal(payload.travelTimeUnit, "seconds");
  assert.equal(JSON.stringify(payload).includes("tomtom-secret"), false);
});

test("reports missing TomTom configuration without making an upstream request", async () => {
  globalThis.fetch = async () => {
    assert.fail("TomTom must not be called without a configured key.");
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    { ALLOWED_ORIGINS: "https://city.example" }
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "TomTom traffic is not configured on the data worker.",
  });
});

test("preserves TomTom rate limits and Retry-After for the client", async () => {
  globalThis.fetch = async () => new Response("Rate limited", {
    status: 429,
    headers: { "Retry-After": "30" },
  });

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "30");
  assert.equal(response.headers.get("Access-Control-Expose-Headers"), "Retry-After");
  assert.match((await response.json()).error, /Traffic Flow API request failed \(429\)/);
});

test("reports Worker rate limiting with a retry interval before contacting TomTom", async () => {
  globalThis.fetch = async () => {
    assert.fail("Rate-limited traffic requests must not call TomTom.");
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
      TRAFFIC_RATE_LIMITER: { limit: async () => ({ success: false }) },
    }
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
});

test("reports TomTom timeouts distinctly and bounds the upstream request", async () => {
  globalThis.fetch = async (_input, options) => {
    assert.ok(options.signal);
    assert.equal(options.signal.aborted, false);
    throw new DOMException("Request timed out", "TimeoutError");
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: "TomTom road flow request timed out.",
  });
});

test("reports TomTom network failures as unavailable instead of returning fallback data", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network request failed");
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Could not retrieve TomTom road flow data.",
  });
});

test("uses the requested coordinates for each selected city's flow lookup", async () => {
  const requestedPoints = [];
  globalThis.fetch = async (input) => {
    const upstreamUrl = new URL(String(input));
    const point = upstreamUrl.searchParams.get("point");
    requestedPoints.push(point);
    const [latitude, longitude] = point.split(",").map(Number);
    return Response.json({
      flowSegmentData: {
        currentSpeed: 24,
        freeFlowSpeed: 48,
        currentTravelTime: 150,
        freeFlowTravelTime: 75,
        confidence: 0.91,
        roadClosure: false,
        coordinates: { coordinate: [{ latitude, longitude }] },
      },
    });
  };

  for (const point of ["19.076,72.8777", "40.7128,-74.006"]) {
    const response = await worker.fetch(
      makeRequest(`/api/traffic/flow?lat=${point.split(",")[0]}&lon=${point.split(",")[1]}`),
      {
        ALLOWED_ORIGINS: "https://city.example",
        TOMTOM_API_KEY: "tomtom-secret",
      }
    );
    assert.equal(response.status, 200);
  }

  assert.deepEqual(requestedPoints, ["19.076,72.8777", "40.7128,-74.006"]);
});

test("explains when TomTom rejects the configured flow key", async () => {
  globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "TomTom rejected the configured key for Traffic Flow API (401). Verify that the key is active and enabled for this API.",
  });
});

test("rejects invalid TomTom flow coordinates without calling the provider", async () => {
  globalThis.fetch = async () => {
    throw new Error("TomTom should not be called for invalid coordinates.");
  };

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=91&lon=72"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Provide valid lat and lon coordinates." });
});

test("rejects malformed TomTom flow data instead of publishing fake metrics", async () => {
  globalThis.fetch = async () =>
    Response.json({ flowSegmentData: { currentSpeed: "unknown" } });

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "TomTom returned an invalid flow-segment response.",
  });
});

test("rejects incomplete TomTom flow data instead of defaulting missing closure status", async () => {
  globalThis.fetch = async () =>
    Response.json({
      flowSegmentData: {
        currentSpeed: 24,
        freeFlowSpeed: 48,
        currentTravelTime: 150,
        freeFlowTravelTime: 75,
        confidence: 0.91,
      },
    });

  const response = await worker.fetch(
    makeRequest("/api/traffic/flow?lat=19.076&lon=72.8777"),
    {
      ALLOWED_ORIGINS: "https://city.example",
      TOMTOM_API_KEY: "tomtom-secret",
    }
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "TomTom returned an invalid flow-segment response.",
  });
});
