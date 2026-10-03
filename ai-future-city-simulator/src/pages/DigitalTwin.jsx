import React from "react";
import {
  MapPin,
  Radio,
  Database,
  ExternalLink,
  Wind
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import LiveCityMap from "../components/dashboard/LiveCityMap";

export const DigitalTwin = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CITY DIGITAL TWIN"
        subtitle="Interactive city map powered by public geospatial and air-quality data"
        icon={MapPin}
        badge="Public Data"
      />

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
            This app does not yet connect to municipal IoT sensors or live traffic-speed feeds. Those metrics are not presented as live readings on this map.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Radio className="w-3.5 h-3.5" /> Public datasets only
          </span>
        </article>
      </div>
    </div>
  );
};

export default DigitalTwin;
