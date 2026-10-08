import React from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { AlertTriangle, MapPin } from "lucide-react";
import { formatTimestamp } from "../../utils/climateRiskEngine";

const RISK_COLORS = {
  LOW: "#34d399",
  MODERATE: "#fbbf24",
  HIGH: "#fb923c",
  "VERY HIGH": "#f43f5e",
  CRITICAL: "#dc2626",
  UNAVAILABLE: "#94a3b8",
};

export const ClimateRiskMap = ({ city, risk }) => {
  const color = RISK_COLORS[risk.level] || RISK_COLORS.UNAVAILABLE;
  const timestamp = risk.timestamp ? formatTimestamp(risk.timestamp) : "Unavailable";

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 text-cyan-300" />
          <div>
            <h2 className="text-sm font-bold text-white">City risk map</h2>
            <p className="text-[11px] text-slate-400">City-centre weather reference, not a mapped hazard boundary.</p>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-300">{city.name}</span>
      </div>

      <div className="relative h-[320px] w-full sm:h-[380px]">
        <MapContainer
          key={`${city.id}-climate-risk`}
          center={city.coordinates}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <CircleMarker
            center={city.coordinates}
            radius={12}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.78, weight: 3 }}
          >
            <Popup>
              <div className="min-w-48 space-y-1 text-slate-900">
                <strong>{city.name} city-centre reference</strong>
                <div>Selected screening: {risk.name}</div>
                <div>Risk level: {risk.level}</div>
                <div>Current evidence: {risk.evidence}</div>
                <div>Forecast: {risk.forecast}</div>
                <div>Potential impact: {risk.potentialImpact}</div>
                <div>Recommended action: {risk.action}</div>
                <div>Coordinates: {city.coordinates[0]}, {city.coordinates[1]}</div>
                <div>Source: {risk.source}</div>
                <div>Updated: {timestamp}</div>
                <div>Local affected zones: unavailable</div>
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-200 shadow-lg">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {risk.name}: {risk.level}
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-800 p-4 text-xs sm:grid-cols-2">
        <div className="flex items-start gap-2 text-slate-300">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <span>
            <strong className="text-white">Known location:</strong> {city.name} model point ({city.coordinates[0]}, {city.coordinates[1]}).
          </span>
        </div>
        <div className="flex items-start gap-2 text-slate-300">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <strong className="text-white">Affected neighbourhoods:</strong> unavailable; no verified flood, heat-exposure, or hazard-zone layer is connected.
          </span>
        </div>
      </div>
    </section>
  );
};

export default ClimateRiskMap;
