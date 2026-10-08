const WORKER_ORIGIN = "https://city-digital-twin-data.yug-nirmanyug-nirman.workers.dev";
const ALLOWED_WORKER_ORIGIN = "https://cityverseai26.github.io";
const FUNCTION_PATH = "/.netlify/functions/api";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", Allow: "GET" },
      body: JSON.stringify({ error: "Only GET requests are supported." }),
    };
  }

  const workerPath = event.path.slice(FUNCTION_PATH.length);
  if (!workerPath.startsWith("/api/")) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API endpoint not found." }),
    };
  }

  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const target = `${WORKER_ORIGIN}${workerPath}${query}`;

  try {
    const response = await fetch(target, {
      headers: {
        Accept: event.headers?.accept || "*/*",
        Origin: ALLOWED_WORKER_ORIGIN,
      },
    });
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const headers = { "Content-Type": contentType };
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) headers["Cache-Control"] = cacheControl;

    if (contentType.startsWith("image/")) {
      return {
        statusCode: response.status,
        headers,
        body: Buffer.from(await response.arrayBuffer()).toString("base64"),
        isBase64Encoded: true,
      };
    }

    return { statusCode: response.status, headers, body: await response.text() };
  } catch (error) {
    console.error("Cloudflare Worker proxy request failed", error);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "The city data service is unavailable." }),
    };
  }
};
