import React from "react";
import { Sparkles, Activity } from "lucide-react";
import { useCity } from "../../context/CityContext";

export const PageHeader = ({ title, subtitle, icon: Icon, badge, actions }) => {
  const { city } = useCity();

  return (
    <div className="relative mb-6 p-5 rounded-2xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-cyan-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Icon className="w-7 h-7" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                {title}
              </h1>
              {badge && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
              <span>{subtitle}</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-medium">{city.name} Digital Twin</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>PUBLIC / SAMPLE DATA</span>
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
