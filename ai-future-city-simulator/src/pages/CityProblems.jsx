import React from "react";
import { AlertTriangle } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import CityDiagnosis from "../components/dashboard/CityDiagnosis";

export default function CityProblems() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Possible City Problems"
        subtitle="See which indicators may need attention."
        icon={AlertTriangle}
        whyFeatureIds={["traffic-intelligence", "pollution-detection", "infrastructure-risk"]}
      />
      <CityDiagnosis />
    </div>
  );
}
