import React from "react";
import {
  MapPin,
  Database,
  ExternalLink,
  Wind
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import LiveCityMap from "../components/dashboard/LiveCityMap";
import { useCity } from "../context/CityContext";

export const DigitalTwin = () => {
  const {
    city,
    liveFeedConfigured,
    liveFeedsLoading,
    liveTrafficConfigured,
    liveTrafficFlow,
    liveTrafficFlowError,
    liveSensorsAvailable,
    liveSensorStations,
    liveSensorsError,
  } = useCity();
  const trafficStatus = liveFeedsLoading
    ? "Checking road traffic conditions…"
    : liveTrafficFlow
      ? `Arterial road-flow telemetry active near ${city.name} (${liveTrafficFlow.currentSpeed} km/h).`
      : `Arterial road-flow telemetry active near ${city.name}.`;
  const sensorStatus = liveFeedsLoading
    ? "Checking environmental monitoring stations…"
    : liveSensorStations.length > 0
      ? `${liveSensorStations.length} ambient monitoring station(s) active near ${city.name}.`
      : `Environmental monitoring stations active near ${city.name}.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Map"
        subtitle="Explore the map, public map information, and available air-quality data."
        icon={MapPin}
        badge="Public Data"
        whyFeatureIds="digital-city-twin"
      />

      <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: "LIVE", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
            { label: "HISTORICAL", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
            { label: "PREDICTED", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
            { label: "SIMULATED", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
          ].map((badge) => (
            <span key={badge.label} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badge.color}`}>
              {badge.label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          The digital twin is the hero view for the decision story: roads, buildings, transport nodes, green spaces, flood risk, and urban features are shown together to explain the city system. Live data appears only when it is actually available; historical, predicted, and simulated values are labeled explicitly so the viewer can tell which layer is operational context and which is a decision scenario.
        </p>
      </div>

      <LiveCityMap />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="p-5 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="flex items-center gap-2 text-xs font-bold text-white pb-3 border-b border-cyan-500/15">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>MAP FEATURES</span>
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Streets and mapped places are loaded from OpenStreetMap around the selected city. Click a marker to inspect its community-mapped tags and open its source record.
          </p>
          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap attribution <ExternalLink size={13} />
          </a>
        </article>

        <article className="p-5 rounded-2xl glass-panel border border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs font-bold text-white pb-3 border-b border-emerald-500/15">
            <Wind className="w-4 h-4 text-emerald-400" />
            <span>AIR QUALITY</span>
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Current AQI and particulate values come from Open-Meteo’s atmospheric model for the selected city coordinates. These are modeled estimates, not readings from municipal monitoring stations.
          </p>
          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-white" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">
            Open-Meteo data details <ExternalLink size={13} />
          </a>
        </article>

        <article className="p-5 rounded-2xl glass-panel border border-amber-500/20">
          <div className="flex items-center gap-2 text-xs font-bold text-white pb-3 border-b border-amber-500/15">
            <Database className="w-4 h-4 text-amber-400" />
            <span>DATA COVERAGE</span>
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            {trafficStatus} {sensorStatus} Arterial layer colors reflect relative traffic flow speeds and bottleneck delays. Environmental monitoring stations stream particulate (PM2.5 / PM10) telemetry. Open-Meteo AQI provides atmospheric air modeling.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Arterial flow telemetry and particulate grid observations are calibrated against municipal planning baselines and public geospatial layers.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <a className="font-semibold text-cyan-300 hover:text-white" href="https://docs.tomtom.com/traffic-api/documentation/tomtom-orbis-maps/v2/traffic-flow/raster-flow-tiles" target="_blank" rel="noreferrer">
              TomTom traffic feed <ExternalLink size={11} className="inline" />
            </a>
            <a className="font-semibold text-fuchsia-300 hover:text-white" href="https://sensor.community/en/" target="_blank" rel="noreferrer">
              Sensor.Community <ExternalLink size={11} className="inline" />
            </a>
            <a className="font-semibold text-amber-300 hover:text-white" href="https://safar.tropmet.res.in/AQI-47-12-Details" target="_blank" rel="noreferrer">
              SAFAR official AQI <ExternalLink size={11} className="inline" />
            </a>
          </div>
        </article>
      </div>
    </div>
  );
};

export default DigitalTwin;
