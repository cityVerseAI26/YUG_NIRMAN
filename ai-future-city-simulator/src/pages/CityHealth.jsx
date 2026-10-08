import React from "react";
import CityHealthScore from "../components/dashboard/CityHealthScore";
import FeatureWhy from "../components/common/FeatureWhy";

export default function CityHealth() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white">City Health</h1>
          <p className="mt-1 text-xs text-slate-400">See the city score, the indicators behind it, and where data is missing.</p>
        </div>
        <FeatureWhy featureIds={["infrastructure-risk", "city-optimization"]} />
      </div>
      <CityHealthScore />
    </div>
  );
}
