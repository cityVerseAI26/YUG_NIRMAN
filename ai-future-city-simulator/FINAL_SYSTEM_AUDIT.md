# YUG NIRMAN — System Audit Report

**Audit date:** 2026-10-08  
**Project version:** `0.0.0` (package manifest)  
**Audited by:** AI assistant using Copilot SDK in VS Code  
**Overall health score:** Not scored. No project-approved scoring rubric exists, and a numeric score would imply unsupported precision.  
**Final status:** **NOT PRODUCTION READY**

## 1. Executive summary

The repository contains a substantial React/Vite city-planning application. The application build succeeds, key calculation/worker tests have passed, and the dashboard is reachable on the Worker-hosted app after signing in. This does not establish production readiness.

The currently shared GitHub Pages URL still returns **404**. The repository workflow was moved to the repository-root `.github/workflows/deploy.yml` and adjusted to build the app from its subdirectory, but that change has not been pushed or deployed. A direct browser visit to the data Worker's `/api/status` currently returns `This site origin is not allowed`; earlier production probes found TomTom upstream `401`s and population endpoints `404`s. Live data is therefore not verified as operational.

Population figures are bundled static planning estimates with uncertain source/boundary provenance. Additional-city operational profiles reuse Mumbai scenario values. Long-range population numbers use an assumed 2% growth rate. Scenario and what-if screens contain fixed illustrative assumptions, not calibrated forecasts. Forecast accuracy is not validated. Authentication and admin authorization are client-side and insecure for production.

The interface is a planning/demo tool with some external weather, air-quality and community-sensor integrations. It should not be used for operational decisions, official forecasts, or secure account administration until the blockers in this report are resolved.

## 2. Feature status summary

| Feature | Status | Data | Prediction | API | Issues |
|---|---|---|---|---|---|
| Dashboard | PARTIALLY WORKING | Mixture of illustrative profile and public feeds | Some derived/demo indicators | Partial | Requires sign-in; several KPIs are profile values, not live measurements |
| City Health | PARTIALLY WORKING | Profile/proxy metrics | Rule-based composite | N/A | Equal mean of available normalized dimensions; not a validated municipal index |
| Traffic | PARTIALLY WORKING | TomTom nearest-road flow if available; otherwise bundled profile | No validated citywide forecast | FAIL / NOT VERIFIED | Earlier production TomTom probes returned upstream 401; do not interpret a point sample as citywide traffic |
| Population | DEMO ONLY | Bundled static planning estimates | Assumed-rate projection | UNAVAILABLE | Source/boundary provenance incomplete; worker endpoints previously returned 404 |
| Air Quality | PARTIALLY WORKING | Open-Meteo coordinate model; Sensor.Community stations if returned | Short-range public model output | PARTIAL | Modeled AQI is not a municipal monitor; station coverage varies |
| Water | DEMO ONLY | Bundled profile values | Illustrative saved-profile values | UNAVAILABLE | No verified municipal utility feed |
| Energy | DEMO ONLY | Bundled profile values | Illustrative saved-profile values | UNAVAILABLE | No verified utility/grid feed |
| Infrastructure | DEMO ONLY | Profile/proxy values | Rule-based/profile scenarios | UNAVAILABLE | No validated asset inventory or condition feed |
| Prediction | PARTIALLY WORKING | Public short-range weather/AQ models; bundled annual profiles | Mixed model estimates and illustrative values | PARTIAL | No city-specific backtesting; annual traffic/water/energy values are sample profiles |
| What-if | DEMO ONLY | User inputs and bundled baseline | Fixed rule-based arithmetic | N/A | Outputs are illustrative and not calibrated |
| Scenario | DEMO ONLY | Fixed sample values | Not a validated model | N/A | Sample confidence/source labels were corrected locally; values remain illustrative |
| Before vs After | PARTIALLY WORKING | Supplied values | Delta calculations | N/A | Arithmetic is tested, but many inputs/outputs are fixed samples |
| AI Advisor | DEMO ONLY | Local sample templates | No connected AI inference | N/A | Recommendation text contains unverified sample claims; no calibrated confidence is presented |
| Reports | PARTIALLY WORKING | Available public model outputs plus bundled/demo content | Mixed | PARTIAL | Export controls are wired locally; exported content inherits source and provenance limitations |

Status labels describe this repository and available evidence, not a guarantee that every deployed browser page has been exercised.

## 3. Data integrity report

**Overall data integrity:** Not numerically scored; no approved rubric.

| Dataset | Source/type | Time/unit/geography | Status |
|---|---|---|---|
| Traffic flow | TomTom Flow Segment API; live upstream when valid | WGS84 point, speed in km/h, travel-time fields; nearest road segment | NOT VERIFIED in production: earlier probes returned 401 |
| Traffic profile | Bundled city profile | Index-like values; not verified citywide observations | STATIC / ILLUSTRATIVE |
| Population | Bundled YUG NIRMAN estimates | Rounded 2026 planning values; geographic boundary/method not sufficiently documented | STATIC / ESTIMATED; accuracy NOT VERIFIED |
| Population legacy series | Local legacy dataset | Historical/future-shaped series, normalized not to claim actual observations | SIMULATED |
| Population projection | Bundled estimate plus assumed annual rate (2%) | Target year is selectable; model omits migration, boundary changes, household composition and uncertainty | PROJECTED / ASSUMED |
| Weather | Open-Meteo forecast API | Selected city coordinate, provider-reported units/timestamps, short-range forecast including hourly soil moisture and precipitation probability | Public model forecast; soil-moisture availability depends on the selected model/location |
| Air quality | Open-Meteo air-quality API | Selected city coordinate; US/European AQI and pollutant fields where returned | MODEL OUTPUT, not municipal monitor; live response not freshly probed |
| Community sensors | Sensor.Community public endpoint | Stations within 25 km; station timestamps/measurements; coverage/device quality varies | LIVE source in code; city-specific availability NOT VERIFIED |
| Water/energy/infrastructure | Bundled profiles and formulas | Indices/proxies, not verified utility units | STATIC / ILLUSTRATIVE |

Data consistency across all screens: **PARTIAL / NOT FULLY VERIFIED**. A known mismatch was fixed: station readings came from Sensor.Community while two UI surfaces called them OpenAQ. Annual indicators for additional catalog cities inherit Mumbai forecast values; those surfaces now disclose the reference-city provenance.

**Climate Risk follow-up (2026-10-08):** The climate page now requests hourly 0–7 cm soil moisture and displays it with Open-Meteo model provenance when returned. Rain probability is read from the nearest hourly forecast; current pressure and cloud cover are displayed from the existing weather response. These additions expose available measurements but do not create a drought/flood severity, utility availability, or climate-impact score. Such assessments remain unavailable without locally calibrated thresholds, hydrology, utility telemetry, and spatial exposure data.

## 4. Live API report

### TomTom

| Check | Result |
|---|---|
| API status | FAIL in earlier upstream probes; current end-to-end status NOT VERIFIED |
| API key | Worker reported configured earlier; validity NOT VERIFIED |
| Traffic data | Earlier flow and tile probes returned upstream 401 |
| Incidents/routing/search | No such TomTom integration found |
| Coordinates/city mapping | Selected city coordinates feed the flow request; tested code path uses point latitude/longitude. Full map-area coverage is not established |
| Timestamp/freshness | Worker response includes retrieval timestamp; current live response unavailable, so freshness cannot be asserted |
| Error handling | Worker surfaces provider errors/timeouts/rate limits; UI reports unavailable rather than inventing live traffic |
| Rate limits | Worker forwards upstream 429/Retry-After where available; quota behavior not load-tested |
| Fallback | Profile values may appear in non-live views, classified as illustrative rather than live; no fake live-flow fallback is intended |

**Root cause/action:** Production key/access needs operator verification and Worker redeployment. No secret was supplied or changed. A direct browser request to `/api/status` was rejected by the Worker's Origin allowlist; that response alone does not determine upstream key validity.

### Other live APIs

| Provider | Purpose / endpoint family | Status and limitations |
|---|---|---|
| Open-Meteo Forecast | Current/hourly weather and soil-moisture model by selected coordinates | Client requests hourly soil_moisture_0_to_7cm and precipitation_probability; failure clears values and presents unavailable. Availability varies by model/location. |
| Open-Meteo Air Quality | Current/hourly AQI/pollutants by selected coordinates | Model estimates, not official station observations. Failure clears values and presents unavailable. |
| Sensor.Community | Nearby community sensor stations within 25 km | Fetched directly by the client; not OpenAQ. Actual station coverage varies. |
| OpenAQ Worker routes | Population/air-related provider service code | Frontend station view does not call OpenAQ; production population endpoints previously returned 404. |
| Wikipedia API | City-selection images | Optional imagery; errors warn and do not block city selection. |
| OpenStreetMap/Overpass | Map baselayer/features | Map fallback exists; live completeness and quotas not exhaustively tested. |

## 5. Population data report

- **Source/type:** Bundled rounded YUG NIRMAN 2026 planning estimates; no authoritative source and geographic boundary are sufficiently documented to certify the values. They are not a connected live Census feed.
- **Current/historical/projected:** Current label should be read as a planning baseline, not a live headcount. Legacy time series is simulated. Future values are projections using an assumed 2% yearly growth rate.
- **City/country mapping:** Records are selected by city ID. A full independent cross-check of every city, country, and boundary was not completed.
- **Year:** Dataset is labeled 2026. It must not be represented as verified 2026 official population.
- **City vs metro distinction:** UNCLEAR across the catalog; estimates may reflect different geographic definitions.
- **Population accuracy:** NOT VERIFIED.
- **Used by:** Population screens and future population display/report. No validated population-derived traffic, water, energy, housing, or infrastructure demand model was found.
- **Issues:** Production worker population endpoints previously returned 404; no metro/municipal boundary normalization; assumed growth is not official.

## 6–7. Prediction integrity and validation

**Overall prediction integrity:** Not numerically scored. **Accuracy NOT VALIDATED.**

| Prediction | Inputs/method | Validation and status |
|---|---|---|
| Traffic diagnosis | TomTom current/free-flow travel time ratio when available; otherwise bundled traffic profile | Formula is `(currentTravelTime / freeFlowTravelTime - 1) × 100`; this is nearest-road delay, not citywide congestion. No accuracy/backtest. PARTIAL. |
| Air quality short range | Open-Meteo hourly AQI forecast at selected coordinates | Public model output. No local station validation/backtest. PARTIAL; current live status NOT VERIFIED. |
| Weather | Open-Meteo hourly forecast at selected coordinates | Model forecast; no local validation performed. PARTIAL; current live status NOT VERIFIED. |
| Population | Rounded bundled baseline; assumed 2% annual growth unless a qualifying Census trend record is available | Arithmetic is deterministic; no demonstrated validated history for bundled cities. Accuracy NOT VALIDATED. |
| Annual traffic/water/energy | Stored city forecasts; additional city profiles copy Mumbai values | STATIC / ILLUSTRATIVE, not city-specific forecasts for additional cities. |
| What-if health/traffic/AQI | Fixed coefficient/rule arithmetic driven by sliders and bundled baseline | Unit tests exercise arithmetic and unavailable values; assumptions are not empirically calibrated. DEMO ONLY. |

No evidence of random prediction in the specifically inspected prediction and calculation paths; this is **NOT VERIFIED across every file/runtime path**. Hardcoded and static scenario values do exist. No historical prediction validation, calibrated confidence, or held-out accuracy was supplied. Data leakage is **NOT VERIFIED**; a full temporal split/backtesting audit has not been performed.

## 8. City health score validation

- **Formula:** Average of available valid normalized dimension scores in `[0,100]`; invalid, missing and out-of-range values are excluded.
- **Weights:** Equal weight among dimensions with valid scores. No validated domain weighting.
- **Normalization/missing values:** Unit tests pass for averaging available inputs and returning no score when none are valid.
- **Random values:** No random value in the score aggregator; broader upstream input provenance includes bundled values.
- **Hardcoded values:** Yes, underlying profile/proxy dimensions and thresholds exist.
- **Overall expected/application score/difference:** Not independently compared against official benchmark data.
- **Result:** PARTIAL as arithmetic; the index is not a validated official city-health measure.

## 9. What-if / simulation validation

Flow: **user-selected sliders + bundled baseline → deterministic rule formulas → illustrative before/after snapshot**. Tests verify representative traffic/AQI/health arithmetic, missing values remain unavailable, zero baselines do not produce invalid percentages, and report normalization recomputes deltas and rejects another city.

Logical arithmetic: PASS for tested cases. Empirical model validity: NOT VERIFIED. Hardcoded coefficients and fixed sample scenario values exist. No real city state or map layer is updated by the Scenario Comparison selection. **Simulation status: PARTIAL / DEMO ONLY.**

## 10. Before/after validation

Absolute change is calculated as `after - before`; percentage change uses the absolute baseline and is unavailable for zero baselines. Dedicated transformation tests pass these cases and verify unavailable metrics remain unavailable. **Calculation implementation: PASS for tested helper cases.** Scenario data inputs are often illustrative, and every screen/report pair has not been exhaustively compared. Overall: **PARTIAL**, not a validation of real-world impact.

## 11. Cross-feature consistency

- Population displayed from the city-keyed estimate table; other screens can show profile/demo values with different provenance. Do not treat these as one verified integrated dataset.
- Additional-city annual traffic/AQI/water/energy forecasts reuse Mumbai's profile values; this source limitation is now shown in the forecast surface/report disclaimer.
- TomTom nearest-road delay and bundled traffic index are different quantities and must not be compared as equivalent citywide metrics.
- Sensor.Community/OpenAQ provider-label mismatch was fixed locally.
- Report metrics reuse available report generation inputs and contain limitations; full browser-by-browser reconciliation remains NOT VERIFIED.

## 12. Root-cause intelligence

Diagnosis uses threshold rules over live model/flow values where available, otherwise profile indices. It labels profile/live evidence and explicitly says root causes are not established. For example, traffic diagnosis identifies one nearby road's delay or an illustrative index and calls out missing network volume/capacity/incident evidence. **Causation claims are not supported and should not be inferred.** Evidence quality is usually INFERRED or INSUFFICIENT DATA; live readings are observed model/provider data, not confirmed municipal outcomes.

## 13. AI city advisor

- Connected generative AI service: **NO** in the inspected recommendation feature.
- City context: city name/context is shown, but local recommendation cards are sample templates.
- Generic/template answers: YES.
- Hallucination/recommendation accuracy: NOT VERIFIED / NOT VALIDATED.
- Context awareness: PARTIAL.
- UI calls these sample templates, not municipal-approved AI actions. Numeric claims within the example text are not independently validated.

## 14. Map / 2D / 3D validation

| Check | Result |
|---|---|
| 2D basemap | PARTIAL; public map/geospatial layers and fallbacks exist; city-specific completeness not exhaustively tested |
| 3D city | NOT VERIFIED at runtime; performance not measured |
| Coordinates | Selected-city coordinates are wired into public-data requests; full catalog audit NOT VERIFIED |
| City boundary | NOT VERIFIED; no uniform verified administrative boundary dataset established |
| Traffic layer | TomTom tile layer fails in earlier production probe with upstream 401; layer is not proof of live traffic |
| Risk/infrastructure layers | Primarily profile/heuristic; not verified inventory or live sensor map |
| Markers | Sensor.Community markers are returned-station data; other profile/pressure overlays may be illustrative |
| Real-time synchronization | City selection updates request coordinates in code; live freshness and all zoom/area cases NOT VERIFIED |
| Performance | NOT VERIFIED interactively |

## 15. UI / UX report

**Visual score:** Not scored; no approved rubric and no full responsive/accessibility audit.

The shared browser confirms the login page renders. Dashboard route protection redirects unauthenticated visitors to login; after sign-in a user must choose a city. Current GitHub Pages URL remains a 404. Source includes loading/error/unavailable states for reviewed feeds, but mobile/tablet/desktop, accessibility, tooltips, and every empty/error state were not manually exercised.

## 16. Sidebar audit

Route modules and sidebar paths were checked by a read-only audit; no confirmed declared route/page mismatch was found. Exact counts of working/partial/broken entries are not claimed. The authenticated dashboard routes require a session. Navigation-level manual testing across every route is NOT VERIFIED.

## 17. Security report

- **Provider API keys:** TomTom/OpenAQ keys are read by Worker server-side bindings in inspected code; no frontend provider-key exposure was identified in this audit. Production secret validity is NOT VERIFIED.
- **Authentication:** FAIL for production. Browser-local account registry stores plaintext passwords; login/session are client-side.
- **Authorization/admin protection:** FAIL. Admin credentials are hardcoded in shipped client code; role/session data is controlled by local storage and can be modified by the browser.
- **Password reset:** FAIL for production; uses local account data and lacks independent ownership proof.
- **CORS:** Origin allowlist is not authentication. Direct Worker browser navigation is currently rejected; non-browser callers can forge an Origin header. API resource authorization/rate limits are a separate concern.
- **Input validation:** Worker validates coordinate ranges/tile inputs and bounds sensor radius in inspected paths; not a complete security certification.
- **Security issues:** Must replace client-side identity/roles/password storage with server-backed auth and enforce roles server-side before production. No actual secret values are included in this report.

## 18. Performance report

- **Build:** Succeeds. Latest measured build has a main JS chunk around 1.66 MB minified, plus a 599 KB 3D chunk; Vite warns that chunks exceed 500 KB.
- **CSS:** Build warns that a font `@import` appears after rules.
- **API calls/duplicate requests/memory leaks:** NOT VERIFIED by network profiling/runtime leak testing.
- **3D performance:** NOT VERIFIED.
- **Chart performance:** NOT VERIFIED.
- **Recommendation:** Consider route-level code splitting and verify runtime/API request behavior before production.

## 19. Error handling

| Case | Status |
|---|---|
| TomTom upstream failure/429/timeout/network | Worker regression tests cover representative failures; UI reports unavailable rather than fake live data |
| Missing/invalid/empty upstream fields | Worker schema checks and regression tests cover representative cases |
| Population route/source failure | Worker failure tests exist; production endpoint had previously returned 404 |
| Weather/AQ failure | Reviewed code clears current values and shows unavailable; underlying error is generic |
| Sensor failure | Error is retained and surfaced; no station response can mean no nearby coverage |
| Model failure | No learned prediction model is connected; all model-failure modes not applicable or NOT VERIFIED |
| No NaN/undefined/infinite loading | Selected calculations validate finite values; whole-app/browser exhaustive check NOT VERIFIED |

## 20. Issues found

| ID | Severity | Feature | Problem/root cause | Status |
|---|---|---|---|---|
| P0-001 | Critical | Authentication/admin | Client-shipped admin credentials and localStorage-controlled role bypass | OPEN; needs server-backed auth and server-side authorization |
| P0-002 | Critical | User accounts | Plaintext browser-local passwords and unauthenticated local reset | OPEN; needs server-backed identity/reset flow |
| P1-001 | Major | Deployment | GitHub Pages site currently 404; workflow was nested in app folder | Root workflow fixed locally; NOT DEPLOYED |
| P1-002 | Major | TomTom | Earlier production flow/tile probes returned upstream 401 | Worker code surfaces errors; valid key/deployment needed |
| P1-003 | Major | Population | Population Worker endpoints previously returned 404; frontend uses static estimates | Static labeling fixed; official/live source remains unavailable |
| P1-004 | Major | City forecasts | Additional city annual scenario values inherit Mumbai forecast profile | Source disclosed; city-specific forecast data remains absent |
| P2-001 | Medium | Scenario comparison | Unsupported confidence/measured wording and false baseline improvement summary | Corrected locally |
| P2-002 | Medium | Station UI | Sensor.Community stations mislabeled as OpenAQ in two surfaces | Corrected locally |
| P2-003 | Medium | Reports | Export functions had no visible controls | CSV/JSON/PDF/print controls wired locally |
| P2-004 | Medium | Performance | Large JS chunks and CSS import-order warning | Open |

## 21. Fixes implemented

| Issue | Change | Validation/result |
|---|---|---|
| TomTom failure/status ambiguity | Worker timeout/schema/rate-limit handling and explicit UI unavailable state; no fake live substitute | Worker regression tests included in prior 50-test pass; production key still fails |
| Population provenance ambiguity | Static planning estimate and simulated-series disclosures; unsupported source attribution removed; assumed growth disclosed | Population regression tests included in prior 50-test pass |
| Unsupported scenario confidence / baseline wording | Removed false confidence percentage, labeled comparison not model-validated/illustrative, baseline describes no change | Editor diagnostics clear; build succeeds |
| City forecast source mismatch | Discloses Mumbai reference-city scenario values for additional catalog cities | Build succeeds; runtime not browser-tested |
| Wrong station provider labels | Changed dashboard/Digital Twin copy to Sensor.Community; clarified OpenAQ is not connected to this station view | Editor diagnostics clear; build succeeds |
| Unexposed report exports | Added CSV, JSON, PDF and print controls after report generation | Build succeeds; actual download flows not interactively exercised |
| GitHub Pages workflow discovery | Moved deployment workflow to repository-root `.github/workflows/deploy.yml`, adjusted install/build/artifact paths for app subfolder | YAML/source inspected; local app build passes; workflow not run on GitHub |

## 22. Additional features required before production

| Feature | Why / current gap | Priority | Implemented |
|---|---|---|---|
| Server-backed authentication and authorization | Current client-side credentials, plaintext storage, and local role checks are bypassable | Critical | No; identity-provider choice and backend work required |
| Validated live provider configuration and deployment | TomTom key rejected upstream; current Worker origin policy blocked direct status probe | High | No; operator must configure/verify secret and deploy |
| Official city population source with boundary metadata | Current rounded planning values cannot be certified as municipal counts | High | No |
| City-specific utility/traffic historical feeds | Water, energy, traffic scenarios are not verified operational data | High | No |
| Forecast backtesting/uncertainty | No held-out city-specific observations or calibration | High | No |
| Publish Pages deployment | Live Pages remains 404 until the root workflow is pushed and successful | High | Workflow corrected locally; not published |

## 23. Test results

- **Previously run combined Node regression set:** 50 passed, 0 failed (Worker, diagnosis, health score, feature explanations, transformation, population estimate tests).
- **Latest focused test:** City-health tests 2 passed, 0 failed.
- **Latest production build:** PASS, 3,139 modules transformed; CSS import-order and large-chunk warnings remain.
- **Latest lint:** PASS with 0 errors and 86 warnings.
- **API probes:** Earlier TomTom tests failed upstream with 401; population routes returned 404. Current shared browser probe of Worker status was denied by Origin allowlist.
- **Integration tests:** PARTIAL; Worker unit tests cover failure paths, production provider success not demonstrated.
- **Prediction accuracy:** NOT AVAILABLE / ACCURACY NOT VALIDATED.
- **Simulation/Before-After helper tests:** PASS for selected deterministic calculations and missing/zero cases; empirical validity NOT VERIFIED.
- **End-to-end:** NOT VERIFIED for every feature; no complete browser automation run.

## 24–25. Final score and verdict

| Dimension | Score |
|---|---|
| Data correctness | Not scored |
| Live data reliability | Not scored |
| Prediction integrity | Not scored |
| Simulation | Not scored |
| AI reliability | Not scored |
| UI/UX | Not scored |
| Integration | Not scored |
| Security | Not scored |
| Performance | Not scored |

**Overall YUG NIRMAN score:** Not scored; no defensible agreed rubric.  
**Final verdict: NOT PRODUCTION READY.** The site is still not deployed at the Pages URL; live TomTom is failing in previous probes; population/utility data are not verified; forecasts and simulations are not validated; and authentication/admin protection is client-side and insecure.

## 26. Most important remaining issues

1. Replace client-side authentication/admin checks with server-backed identity and server-enforced authorization.
2. Push and verify the root Pages workflow; current Pages URL returns 404.
3. Restore valid TomTom upstream access and verify real flow responses from multiple selected cities/areas.
4. Replace or clearly maintain static population estimates with source, year, and geographic-boundary documentation; resolve missing deployed population routes.
5. Obtain city-specific historical observations and validate prediction/simulation methods before presenting results as forecasts or measured impacts.

## 27. Trust and reliability verdict

| Area | Verdict |
|---|---|
| Live data | PARTIAL |
| Population | NOT VERIFIED |
| TomTom | NOT VERIFIED / previous probes failed |
| Predictions | NOT VERIFIED; accuracy not validated |
| Simulations | PARTIAL; illustrative arithmetic only |
| Reports | PARTIAL; generated content inherits data limitations |

## 28. Final honest assessment

1. **Is every feature working?** No; full route/runtime verification is incomplete and Pages is 404.
2. **Which features are broken?** GitHub Pages deployment currently unavailable; earlier TomTom requests failed; deployed population endpoints previously returned 404; secure admin/user authentication is not implemented.
3. **Which are demo features?** Scenario comparison, most water/energy/infrastructure values, additional-city annual profiles, AI recommendation templates, and what-if coefficients.
4. **Is any data hardcoded?** Yes: bundled profiles, static population estimates, thresholds, scenario values, and assumptions.
5. **Is any prediction hardcoded?** Yes, several annual scenario outputs are bundled/fixed examples; this is not a trained city-specific forecast.
6. **Is any prediction random?** Not identified in inspected paths; NOT VERIFIED across the entire application.
7. **Are predictions validated?** No; ACCURACY NOT VALIDATED.
8. **Is live data unavailable?** Yes. TomTom had upstream failures; population endpoints previously returned 404; current Worker status probe was Origin-blocked.
9. **Is TomTom working correctly?** Not established; earlier live probes returned 401.
10. **Is population data correct?** NOT VERIFIED; static estimates have insufficiently documented source/boundary provenance.
11. **Are calculations correct?** Selected helper formulas pass tests; domain validity and every screen's calculation are not fully verified.
12. **Are Before/After calculations correct?** Tested helper arithmetic passes; scenario values may be illustrative, not observed.
13. **Is dashboard data consistent with reports?** Not fully verified; known provenance issue was disclosed and a provider label mismatch corrected.
14. **Are there misleading labels?** Some were found and corrected locally; production deployment and exhaustive UI verification are pending.
15. **What must be fixed before production?** Secure server-backed authentication; deploy Pages workflow; repair and validate live providers; document/replace population provenance; obtain city-specific datasets; backtest predictions; complete end-to-end/accessibility/performance validation.

## 29. Latest Before → After changes and verification

This addendum records changes made after the evidence above was collected. It does not replace the production blockers or turn illustrative data into verified observations.

| Area | Before | After | Status / evidence |
|---|---|---|---|
| Dashboard availability | Dashboard previously crashed because `liveTrafficLoading` was used but not read from city context. | Context value is destructured; the local dashboard was previously confirmed rendering after sign-in. | FIXED locally; production deployment is separate. |
| TomTom | Upstream access failed in earlier production probes; local Worker had no configured key. | Worker error states remain explicit and no fake live flow is substituted. | LIVE traffic still unavailable/unverified; no valid local key or successful current provider response. |
| Population | Bundled estimates could be confused with verified city counts. | UI and dataset identify static planning estimates; official population feed remains unavailable and municipal/metro boundary provenance is undocumented. | Labeling improved; values are not independently verified or replaced with invented data. |
| Scenario comparison | Fixed examples could read as city-specific outcomes; the investment slider changed health/traffic/AQI without a validated funding-impact model; no relative delta was shown. | Screen now states values are non-city-specific samples, labels the 2035 population sample, shows absolute and relative before/after deltas, handles a zero baseline as unavailable, and scales example CapEx only. Selecting a scenario updates the comparison. | Browser verified on localhost: baseline and Hyper-Dense selection rendered; 150% changed example CapEx while its traffic outcome remained unchanged. Outputs remain illustrative. |
| Recommendation examples | A percentage “Template score” exposed unvalidated confidence values. | Removed the displayed score and the unused confidence fields; cards label content as sample policy. | Source checked; still template content, not connected AI or evidence-backed municipal advice. |
| Remaining release blockers | Client-side auth/admin controls, undeployed Pages workflow, unverified TomTom access, undocumented population boundaries, and unvalidated forecasts. | No production infrastructure, credentials, provider configuration, or deployment was changed by this pass. | OPEN; not resolved by local UI/code fixes. |

### Revalidation performed for this addendum

- `npm run build`: PASS; 3,137 modules transformed. Existing CSS `@import` ordering and large-chunk warnings remain.
- `npm run lint`: PASS; 0 errors and 72 warnings.
- Worker regression tests: PASS; 32 tests, 0 failures. Logged simulated upstream failures are exercised test cases, not production success.
- Population estimate tests: PASS; 2 tests, 0 failures. These assert coverage/date/classification, not real-world population accuracy.
- Local browser: scenario comparison rendered with six relative-change rows; selecting baseline and Hyper-Dense updated the “After” summary. At 150% scale example CapEx updated while traffic stayed unchanged.
- Provider success, production deployment, complete route traversal, accessibility, performance under load, and forecast accuracy were NOT VERIFIED.
