import React from "react";
import { Car, MapPin, Train, Zap } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import LiveCityMap from "../components/dashboard/LiveCityMap";
import TrafficSimulationPanel from "../components/dashboard/TrafficSimulationPanel";
import TrafficChart from "../components/dashboard/TrafficChart";
import { useCity } from "../context/CityContext";

export const Transportation = () => {
  const {
    city,
    liveTrafficConfigured,
    liveTrafficFlow,
    liveTrafficFlowError,
    liveTrafficLoading,
  } = useCity();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic & Transport"
        subtitle="Explore mapped roads, traffic lights, transit stops, and charging points."
        icon={Car}
        badge="OpenStreetMap data"
        whyFeatureIds="traffic-intelligence"
      />

      <div className="grid gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
        <p className="text-slate-300">
          <span className="font-semibold text-cyan-200">Map locations:</span> Only real mapped OpenStreetMap roads and features are drawn. Unavailable categories and network problems are reported below the map.
        </p>
        <p className="text-slate-300">
          <span className="font-semibold text-amber-200">Potential pressure:</span> Warning markers identify mapped signals and busy destinations close to major roads. Open each marker for its location and a suggested planning review; this is a heuristic, not measured traffic or a validated prediction.
        </p>
        <p className="text-slate-300">
          <span className="font-semibold text-cyan-200">Traffic display:</span> The chart below updates locally every 15 seconds as a simulation based on bundled sample profiles. It is not live measured traffic or verified history.
        </p>
        <p className="text-slate-300">
          <span className="font-semibold text-cyan-200">Arterial flow feed:</span>{" "}
          {liveTrafficLoading
            ? "Checking arterial flow telemetry."
            : liveTrafficFlow
              ? (liveTrafficFlow.isSimulated
                ? `Simulated road-corridor flow active for ${city.name} (${liveTrafficFlow.currentSpeed} km/h · baseline ${liveTrafficFlow.freeFlowSpeed} km/h).`
                : `Live road flow active for ${city.name} (${liveTrafficFlow.currentSpeed} km/h).`)
              : liveTrafficFlowError
                ? "Corridor flow telemetry unavailable."
                : "Active arterial baseline."}
          {" "}Transit arrivals and charger availability need operator feeds.
        </p>
      </div>

      <LiveCityMap />

      <TrafficSimulationPanel />

      <TrafficChart />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-cyan-500/20 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
          <div><h3 className="text-sm font-bold text-white">Road features</h3><p className="mt-1 text-xs text-slate-400">Street basemap and mapped traffic signals from OpenStreetMap.</p></div>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-sky-500/20 flex items-start gap-3">
          <Train className="w-5 h-5 text-sky-400 shrink-0" />
          <div><h3 className="text-sm font-bold text-white">Transit locations</h3><p className="mt-1 text-xs text-slate-400">Mapped transit stops and stations; no live timetable or occupancy data.</p></div>
        </div>
        <div className="p-4 rounded-xl glass-panel border border-emerald-500/20 flex items-start gap-3">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <div><h3 className="text-sm font-bold text-white">Charging locations</h3><p className="mt-1 text-xs text-slate-400">Mapped charging locations; online status and connector availability are not provided.</p></div>
        </div>
      </div>
    </div>
  );
};

export default Transportation;
