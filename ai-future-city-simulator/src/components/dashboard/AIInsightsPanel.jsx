import React, { useState } from "react";
import { Bot, ArrowRight, Check, ClipboardCheck, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../../context/CityContext";

export const AIInsightsPanel = () => {
  const { aiInsights, city, liveAirQuality, liveWeather } = useCity();
  const navigate = useNavigate();
  const [appliedPolicies, setAppliedPolicies] = useState({});

  const handleReviewPolicy = (insightId) => {
    setAppliedPolicies((prev) => ({ ...prev, [insightId]: true }));
  };

  // Generate dynamic live-triggered insights based on Open-Meteo
  const liveUsAqi = liveAirQuality?.us_aqi != null && Number.isFinite(Number(liveAirQuality.us_aqi))
    ? Number(liveAirQuality.us_aqi)
    : null;
  const liveEuropeanAqi = liveAirQuality?.european_aqi != null && Number.isFinite(Number(liveAirQuality.european_aqi))
    ? Number(liveAirQuality.european_aqi)
    : null;
  const liveAqi = liveUsAqi ?? liveEuropeanAqi;
  const liveAqiScale = liveUsAqi != null ? "US AQI" : "European AQI";
  const liveTemp = liveWeather?.temperature_2m != null ? Number(liveWeather.temperature_2m) : null;
  const livePrecip = liveWeather?.precipitation != null ? Number(liveWeather.precipitation) : null;

  const liveTriggeredInsights = [];
  if ((liveUsAqi != null && liveUsAqi >= 150) || (liveEuropeanAqi != null && liveEuropeanAqi >= 80)) {
    liveTriggeredInsights.push({
      id: "live-aqi-trigger",
      category: "Model threshold prompt",
      timeframe: "Current model value",
      title: `Review modeled ${liveAqiScale} ${Math.round(liveAqi)}`,
      insight: `Open-Meteo reports modeled ${liveAqiScale} ${Math.round(liveAqi)} at the selected coordinates. This is a threshold prompt, not an official alert; compare with a local monitoring station before taking action.`,
      isLiveTrigger: true,
    });
  } else if (liveTemp != null && liveTemp >= 30) {
    liveTriggeredInsights.push({
      id: "live-heat-trigger",
      category: "Weather threshold prompt",
      timeframe: "Current model value",
      title: `Review warm conditions: ${liveTemp.toFixed(1)}°C`,
      insight: `Open-Meteo reports ${liveTemp.toFixed(1)}°C for the selected coordinates. Check local weather and utility load data before planning a response.`,
      isLiveTrigger: true,
    });
  } else if (livePrecip != null && livePrecip >= 5) {
    liveTriggeredInsights.push({
      id: "live-rain-trigger",
      category: "Weather threshold prompt",
      timeframe: "Current model value",
      title: `Review precipitation: ${livePrecip.toFixed(1)} mm/h`,
      insight: `Open-Meteo reports ${livePrecip.toFixed(1)} mm/h for the selected coordinates. This is not a flood alert; compare with local rainfall and drainage observations.`,
      isLiveTrigger: true,
    });
  }

  // Combine live triggered with base insights
  const displayInsights = [...liveTriggeredInsights, ...aiInsights.slice(0, 4 - liveTriggeredInsights.length)];

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>POLICY DECISION SUPPORT</span>
              <span className="px-2 py-0.2 text-[10px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                Templates + model thresholds
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Demo policy templates and coordinate-level model prompts for {city.name}; no connected AI policy model
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/ai-recommendations")}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>Full Policy Suite</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
        {displayInsights.map((insight) => {
          const isApplied = appliedPolicies[insight.id];
          const isLive = insight.isLiveTrigger;

          return (
            <div
              key={insight.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                isLive
                  ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20"
                  : "bg-slate-900/60 border-slate-800/90 hover:border-cyan-500/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                    isLive
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1"
                      : "bg-slate-800 text-cyan-300 border border-slate-700"
                  }`}>
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                    {insight.category}
                  </span>
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {isLive ? "Rule triggered" : "Sample template"}
                  </span>
                </div>

                <h4 className={`text-xs font-bold transition-colors ${isLive ? "text-rose-200" : "text-white group-hover:text-cyan-300"}`}>
                  {insight.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  "{insight.insight}"
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  Horizon: {insight.timeframe}
                </span>

                <button
                  onClick={() => handleReviewPolicy(insight.id)}
                  disabled={isApplied}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isApplied
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                      : isLive
                        ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40"
                        : "bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/20"
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Reviewed locally</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-3 h-3" />
                      <span>Mark reviewed</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>Screening triggers: US AQI ≥150 or European AQI ≥80, temperature ≥30°C, or precipitation ≥5 mm/h. These are demo thresholds, not official alerts. Policy cards are bundled examples; review changes only local interface state.</span>
        <span className="text-cyan-300 font-semibold font-mono">Demo decision support</span>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
