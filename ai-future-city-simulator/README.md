# YUG NIRMAN | AI Future City Simulator

## Netlify deployment

Connect this repository to Netlify and deploy from the repository root. The
root `netlify.toml` configures the app directory, Node.js 22, the Vite build,
and a single-page-app fallback so direct links to client-side routes work.
Netlify will build and publish the site on each push to the connected branch.

The optional live-data API is a separate Cloudflare Worker. After Netlify
assigns the site its `*.netlify.app` URL, add that exact origin to
`ALLOWED_ORIGINS` in `api-worker/wrangler.toml` and redeploy the Worker.
Include the origin for any custom domain too; do not include URL paths.

## GitHub Pages deployment

The site deploys automatically when changes are pushed to the `main` branch.
The workflow builds the Vite app with the repository-specific base path and
publishes the output from `dist/`.

To enable deployment, open **Settings → Pages** in the GitHub repository and
set **Build and deployment → Source** to **GitHub Actions**. The first workflow
run will publish the site; subsequent pushes to `main` update it automatically.

Client-side routes are served through the included `404.html` fallback.

## Live traffic and monitoring data

The map uses OpenStreetMap tiles and community-mapped features. A single
combined mapped-feature and major-road query runs through the Cloudflare data
Worker with identifying request headers and five-minute caching. The Worker
tries Overpass mirrors sequentially, then falls back to the OpenStreetMap
standard map API for a bounded 700 m radius (350 m in dense areas). It pauses
after Overpass rate limits rather than retrying that service. Fallback coverage
is smaller and is identified in the map UI. A successful mapped result is also
saved in that browser, separately per city
and city-center coordinate, so a later outage can show the last retrieved map
with its saved timestamp and a stale-data warning. This is a last-known map
snapshot, not an official historical archive. On a new browser with no saved
snapshot, an outage of all configured OpenStreetMap sources remains an explicit
error; if the Worker cannot be reached from the browser, the map tries a direct
read-only Overpass query before reporting the error. The map does not fabricate
locations. Current weather
and air-quality values come from Open-Meteo models; they are not readings from
municipal roadside sensors. TomTom can provide a live traffic-flow overlay
(relative flow colors, not exact speeds). Sensor.Community provides nearby
community-operated particulate readings without an API key; coverage varies,
and stations are not guaranteed to be roadside or municipal. SAFAR markers are
station locations only, not live SAFAR readings.

When live TomTom traffic is unavailable or its tiles fail, the Transportation
map reports that status and retains the citywide bundled traffic profile as
summary context; it does not place that profile at invented road locations.
No verified historical traffic archive is connected. Major road paths are
drawn from returned OpenStreetMap way geometry and link to their source way.
The eight feature categories show only returned OpenStreetMap locations; empty
categories report that no mapped locations were returned within 5 km rather
than displaying invented points.
The mobility map additionally marks potential traffic-pressure locations by
matching mapped signals, transit stops, schools, hospitals, and chargers to
nearby major mapped roads. Marker scores are transparent planning heuristics,
not measured congestion probabilities; each marker offers a suggested review
action. Marker locations require both mapped feature and road data to load.

The Transportation page also includes a locally generated, rolling traffic
simulation that refreshes every 15 seconds without a provider key. It is
explicitly labeled `LIVE SIMULATION`: its short time series is derived from
bundled illustrative profiles, not live city measurements or historical
observations.

Configure and deploy the Cloudflare Worker to enable the optional TomTom traffic
layer and the proxied OpenStreetMap lookups:

1. Edit `api-worker/wrangler.toml` and set `ALLOWED_ORIGINS` to your exact
   GitHub Pages origin (this repository deploys from
   `https://cityverseai26.github.io`) and
   `http://localhost:5173` for local development. Do not include URL paths.
2. Install Wrangler 4.36.0 or later, then deploy from `api-worker/`:

   ```sh
   npx wrangler deploy
   ```

3. Store the TomTom key as a Worker secret; never put it in Vite variables or
   commit it. Wrangler prompts for the secret value:

   ```sh
   npx wrangler secret put TOMTOM_API_KEY
   ```

   For local Worker development only, create `api-worker/.dev.vars` with
   `TOMTOM_API_KEY="<your TomTom key>"`. This file is ignored by Git. Do not
   add the key to `.env.local`, `wrangler.toml`, or any `VITE_*` variable.
4. The app defaults to this project's deployed data Worker URL. If you use a
   different Worker, set `VITE_DATA_API_URL` to that public URL in `.env.local`
   or as the GitHub Actions repository variable. This URL is public; it is not
   an API key.
5. The map requests TomTom traffic tiles, and the dashboard
   requests the nearest-road Flow Segment reading from the Worker. The
   dashboard's TomTom KPI is the road segment nearest the selected city's
   reference coordinates, not a citywide traffic average. Check
   `<worker-url>/api/status` to confirm the Worker reports `"traffic": true`;
   then use the dashboard Data Center to verify the current road-flow response.
   While the app is open, it refreshes TomTom flow data and traffic tiles about
   once per minute. Weather and air quality use a separate 15-minute refresh.
   A `"traffic": true` status means a secret is configured, not that TomTom has
   accepted it. If flow or tile requests return 401/403, rotate the key, verify
   TomTom Traffic Flow and raster-tile API access is enabled for it, then set
   the replacement with `npx wrangler secret put TOMTOM_API_KEY`.

Change the rate-limit namespace IDs in `wrangler.toml` if those IDs are already
used by another Worker in your Cloudflare account. The API keys are only stored
on the Worker. For official Mumbai AQI information, see the
[SAFAR AQI portal](https://safar.tropmet.res.in/AQI-47-12-Details) and the
[CPCB Central Control Room](https://airquality.cpcb.gov.in/ccr/).

The dashboard uses Open-Meteo model data for weather and AQI, not municipal
sensor readings. The Environment page and map show nearby Sensor.Community
particulate observations with station locations and observation timestamps when
the public source has coverage. TomTom's current road-flow point is shown only
when the Worker and provider key are configured; no generated fallback values
are presented as a live road reading.
Utility, land-cover, historical traffic charts, health scores, alerts, and
policy suggestions remain labeled sample/illustrative data until authoritative
source datasets or telemetry are connected. The population profile is backed
by a bundled 2026 planning-estimate table for every selectable city, so it
remains available without a network connection. These values are static,
rounded estimates; their source records, calculation method, and city versus
metro/urban-area boundaries are not documented, and they are not official or
verified counts. The U.S. Census and dated world-city population endpoints in
the Worker are not consumed by the population UI; the UN World Urbanization
Prospects URL is not the source of the bundled city values. A separate legacy
population series is also present in the app state; it is explicitly classified
as simulated and none of its values are historical observations.
Cities without bundled alert examples show generic templates only; these are
not active incidents, local readings, or emergency notifications.
City-problem screening applies transparent thresholds to the available
indicators and distinguishes live provider feeds, coordinate-level model output,
and bundled profile proxies. Each flagged indicator includes a suggested
verification step; these are not AI-generated root causes, confirmed incidents,
or quantified intervention impacts. Run `npm run test:diagnosis` to verify the
screening rules and evidence labels.
Population estimates use July 1, 2026 as a common reference date. The profile
and Future Predictions views project from that baseline using an explicitly
assumed 2% annual growth rate for selectable 2027, 2030, 2035, 2040, 2045, and
2050 horizons. These future values are illustrative projections, not measured
changes or official forecasts.

The dashboard's **Data Center** lists each connected feed, its provider update
or Worker retrieval time, and the limitations of the reading. Its persistent status legend
distinguishes current API/feed values (`LIVE`), verified archives
(`HISTORICAL`), connected model output (`PREDICTED`), what-if results
(`SIMULATED`), and bundled illustrative data (`DEMO`). In the current project,
chart series other than the static 2026 population estimates and their explicitly
assumed-growth projections, city baselines, long-range outlooks except those
population projections, and policy prompts are bundled demo data; there is no
connected historical archive or trained ML prediction/recommendation model.
Major planning screens provide a shared animated **Why?** panel describing the
urban problem, the feature's current analysis/prediction/simulation limits,
planning decisions, directional expected outcomes, and a without/with
comparison. The panel distinguishes project goals from shipped capabilities;
its arrows are not measured or guaranteed impacts, and current behavior is not
represented as trained AI. Run `npm run test:feature-why` to verify that every
requested feature has complete explanatory content and capability caveats.
The What-if Simulator captures the current slider outputs when **Run
simulation** is selected and compares them with the bundled city profile.
Traffic, AQI, and the existing illustrative rating are the only calculated
after-values; unavailable city metrics remain explicitly not modeled. A map
overlay is not claimed because the scenario does not calculate changed
geometries. The snapshot can be passed to the City Intelligence Report and
included in JSON, CSV, printable, and PDF outputs. These are rule-based demo
calculations, not validated municipal forecasts. Run
`npm run test:transformation` to check the before/after calculations and missing
data behavior.
The population projection assumes 2% annual growth and is not an official
forecast. Weather and AQI returned by Open-Meteo are current
numerical-model output, not municipal sensor observations.

The City Health Score is a transparent demonstration index, not a standardized
municipal rating. It equally averages the available Mobility, Environment,
Energy, and Water scores; missing Housing and Infrastructure dimensions are
excluded. Mobility is `100 - congestion/delay index`; Environment is the mean of
an AQI-band score and bundled green-cover percentage; Energy and Water are
`100 - bundled use/demand index`. AQI bands and input provenance are explained
in the dashboard. The score does not claim a trend because a verified
historical time series is not connected.

The 3D city scene is procedurally generated and lazy-loaded when its route is
opened. Buildings, roads, traffic, transit, green areas, waterways, beacons,
and heatmaps are illustrative/demo layers, not surveyed infrastructure or live
telemetry. Population, housing, and pollutant hotspot geometry are not
connected. Drag to orbit, shift-drag or right-drag to pan, and scroll to zoom;
the viewport also supports reset-camera and fullscreen controls. Use the 2D
map route to inspect available OpenStreetMap features and optional feeds.

City Diagnosis applies documented screening thresholds to available metrics
and labels the evidence source. The severity thresholds are illustrative, not
official standards. City-level indicators do not establish a local incident
or its cause; missing network, emissions, utility, and neighborhood data are
reported as limitations rather than inferred explanations.

Analytics charts answer a specific question and distinguish feed output from
bundled profiles. Traffic's current TomTom point is separate from its demo
curve; Open-Meteo's hourly AQI series is model output rather than municipal
sensor history. Utility profiles are illustrative. For cities without annual
official population history, historical values remain unavailable rather than
being filled from demo data; the common 2026 baseline is a separate planning
estimate. The dashboard does not claim a verified city historical time series.

Current Open-Meteo and TomTom readings are context only; they do not calibrate
the bundled long-range city outlooks. Weather-based KPI adjustments are
heuristics and are labeled simulated; current weather does not rewrite the
bundled energy or water chart profiles. What-if results use fixed, uncalibrated
demo arithmetic and are not validated impact estimates.

## Local development

```sh
npm ci
npm run dev
```

To build and preview the production bundle locally:

```sh
npm run build
npm run preview
```
