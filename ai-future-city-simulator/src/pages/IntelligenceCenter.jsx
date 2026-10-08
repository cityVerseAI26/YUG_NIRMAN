import React from "react";
import { Activity } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import DataSourceCenter from "../components/dashboard/DataSourceCenter";
import RecentAlerts from "../components/dashboard/RecentAlerts";

export default function IntelligenceCenter() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="City Alerts & Insights"
        subtitle="Review alerts and see what information supports them."
        icon={Activity}
        badge="City signals"
        whyFeatureIds="ai-command-center"
      />
      <RecentAlerts />
      <DataSourceCenter />
    </div>
  );
}
