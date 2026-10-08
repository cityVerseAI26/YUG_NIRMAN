import React from "react";
import { Database } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import DataSourceCenter from "../components/dashboard/DataSourceCenter";

export default function DataCenter() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        subtitle="See where the information comes from and what it can tell you."
        icon={Database}
      />
      <DataSourceCenter />
    </div>
  );
}
