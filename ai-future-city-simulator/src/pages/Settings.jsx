import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Download, RefreshCw, Cpu, Database, Bell, CheckCircle } from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";

export const Settings = () => {
  const { city, selectedCity, setSelectedCity, citiesList } = useCity();
  const [refreshInterval, setRefreshInterval] = useState("5s");
  const [sensitivity, setSensitivity] = useState("high");
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportData = () => {
    const exportBlob = new Blob([JSON.stringify(city, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(exportBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${city.name.toLowerCase()}-sample-city-profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Choose your city and update display options."
        icon={SettingsIcon}
        badge="Local demo settings"
        actions={
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        }
      />

      {savedToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Preferences applied in this page session. Feed polling and alert sensitivity are not connected to a backend.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Simulation Preferences */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-cyan-500/15">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Demo Display Preferences</span>
          </h3>

          {/* Default City */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Selected City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 text-cyan-300 text-xs py-2 px-3 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
            >
              {citiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.country || c.state})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">Selecting a city changes the map center and public weather/AQI queries.</p>
          </div>

          {/* Demo polling preference (not connected to remote feeds) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Demo refresh preference</label>
            <div className="grid grid-cols-3 gap-2">
              {["1s (Real-time)", "5s (Balanced)", "15s (Conserve)"].map((val) => (
                <button
                  key={val}
                  onClick={() => setRefreshInterval(val.split(" ")[0])}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    refreshInterval === val.split(" ")[0]
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-900/60 border-slate-800 text-slate-400"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Demo sensitivity preference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Sample anomaly sensitivity</label>
            <div className="grid grid-cols-3 gap-2">
              {["high", "standard", "conservative"].map((val) => (
                <button
                  key={val}
                  onClick={() => setSensitivity(val)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold uppercase border transition-all ${
                    sensitivity === val
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : "bg-slate-900/60 border-slate-800 text-slate-400"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export & Project Information */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-cyan-500/15">
            <Database className="w-4 h-4 text-purple-400" />
            <span>City Profile Export & Project Details</span>
          </h3>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white">Export City Profile</div>
            <p className="text-[11px] text-slate-400">
              Download the selected {city.name} profile, sample metrics, and bundled forecast values as JSON. This export does not contain a live sensor feed.
            </p>
            <button
              onClick={handleExportData}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {city.name} Sample Profile (JSON)</span>
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span>Academic Scope:</span>
              <span className="text-white font-semibold">BE Information Technology Major Project</span>
            </div>
            <div className="flex justify-between">
              <span>Frontend Architecture:</span>
              <span className="text-cyan-300 font-mono">React 19 + Vite 8 + Tailwind v4</span>
            </div>
            <div className="flex justify-between">
              <span>GIS Engine:</span>
              <span className="text-emerald-300 font-mono">Leaflet & CartoDB Dark Matter</span>
            </div>
            <div className="flex justify-between">
              <span>3D Engine:</span>
              <span className="text-purple-300 font-mono">Three.js WebGL</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
