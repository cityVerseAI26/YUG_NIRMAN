import React from "react";
import { Car, MapPin, Radio, Train, Zap } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import LiveCityMap from "../components/dashboard/LiveCityMap";

export const Transportation = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="TRANSPORTATION & MOBILITY MAP"
        subtitle="Publicly mapped roads, traffic signals, transit stops and charging locations"
        icon={Car}
        badge="OpenStreetMap data"
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        Map markers are real community-mapped OpenStreetMap locations. Live vehicle speeds, transit arrivals/ridership, and charger availability require operator data feeds that are not connected.
      </div>

      <LiveCityMap />

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
