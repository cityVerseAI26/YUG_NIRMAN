import React from "react";
import { Users } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import PopulationChart from "../components/dashboard/PopulationChart";

export default function PopulationProfile() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Population & Growth"
        subtitle="2026 planning estimates and example projections. Source details may be limited."
        icon={Users}
        badge="Population data"
        whyFeatureIds="population-growth"
      />
      <PopulationChart />
    </div>
  );
}
