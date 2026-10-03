import React from "react";
import { Recycle, SunMedium, Wind, Droplet, Trees, Zap, CheckCircle2 } from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import EnergyChart from "../components/dashboard/EnergyChart";
import WaterChart from "../components/dashboard/WaterChart";

export const Sustainability = () => {
  const { city } = useCity();

  return (
    <div className="space-y-6">
      <PageHeader
        title="SUSTAINABILITY & NET-ZERO MATRIX"
        subtitle="Sample energy/water profiles and an illustrative decarbonization roadmap"
        icon={Recycle}
        badge="Scenario data"
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        Utility usage, carbon offsets, and roadmap milestones on this page are sample scenario values. No city electricity, water-utility, or emissions inventory feed is connected.
      </div>

      {/* Resource Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnergyChart />
        <WaterChart />
      </div>

      {/* Decarbonization Roadmap */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Trees className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              ILLUSTRATIVE DECARBONIZATION SCENARIO (2026 → 2040)
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold">
            Sample target: not measured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-cyan-400 font-bold">Milestone 1 (2028)</span>
            <h4 className="text-sm font-bold text-white mt-1">100% Public Fleet EV</h4>
            <p className="text-xs text-slate-400 mt-1">All municipal buses and emergency light vehicles fully electrified.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-blue-400 font-bold">Milestone 2 (2032)</span>
            <h4 className="text-sm font-bold text-white mt-1">50% Solar & Wind Grid</h4>
            <p className="text-xs text-slate-400 mt-1">Decentralized rooftop solar mandates and interstate clean energy links.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-purple-400 font-bold">Milestone 3 (2036)</span>
            <h4 className="text-sm font-bold text-white mt-1">Circular Water Parity</h4>
            <p className="text-xs text-slate-400 mt-1">Zero untreated wastewater discharge into coastal rivers or lakes.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-mono text-emerald-400 font-bold">Target 2040</span>
            <h4 className="text-sm font-bold text-white mt-1">Net-Zero GHG Metropolis</h4>
            <p className="text-xs text-slate-400 mt-1">Total scope 1 & 2 carbon neutrality with native forest biosequestration.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sustainability;
