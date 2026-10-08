import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CityProvider } from "./context/CityContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";

import LandingPage        from "./pages/LandingPage";
import CitySelection      from "./pages/CitySelection";
import Dashboard          from "./pages/Dashboard";
import DataCenter         from "./pages/DataCenter";
import CityHealth         from "./pages/CityHealth";
import CityProblems       from "./pages/CityProblems";
import DigitalTwin        from "./pages/DigitalTwin";
import FuturePredictions  from "./pages/FuturePredictions";
import ReportGeneration   from "./pages/ReportGeneration";
import WhatIfSimulator    from "./pages/WhatIfSimulator";
import ScenarioComparison from "./pages/ScenarioComparison";
import Transportation     from "./pages/Transportation";
import Environment        from "./pages/Environment";
import ClimateRisks       from "./pages/ClimateRisks";
import AIRecommendations  from "./pages/AIRecommendations";
import Sustainability     from "./pages/Sustainability";
import Settings           from "./pages/Settings";
import UserHistory        from "./pages/UserHistory";
import PopulationProfile from "./pages/PopulationProfile";
import IntelligenceCenter from "./pages/IntelligenceCenter";

const City3D = lazy(() => import("./pages/City3D"));

function AdminRoute() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <div className="min-h-screen bg-slate-950 p-8 text-slate-200" role="status">Checking administrator session…</div>;
  return currentUser?.authType === "admin" ? <AdminDashboard /> : <Navigate to="/admin-login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/admin-login" element={<AuthPage adminOnly />} />
      <Route path="/admin-dashboard" element={<AdminRoute />} />
      <Route path="/admin-chat" element={<Navigate to="/admin-dashboard" replace />} />
      <Route path="/select-city" element={<CitySelection />} />

      <Route path="/" element={<MainLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="data-center" element={<DataCenter />} />
        <Route path="city-health" element={<CityHealth />} />
        <Route path="city-problems" element={<CityProblems />} />
        <Route path="digital-twin" element={<DigitalTwin />} />
        <Route path="future-predictions" element={<FuturePredictions />} />
        <Route path="what-if-simulator" element={<WhatIfSimulator />} />
        <Route path="scenario-comparison" element={<ScenarioComparison />} />
        <Route path="transportation" element={<Transportation />} />
        <Route path="environment" element={<Environment />} />
        <Route path="climate-risks" element={<ClimateRisks />} />
        <Route path="ai-recommendations" element={<AIRecommendations />} />
        <Route path="sustainability" element={<Sustainability />} />
        <Route path="city-3d" element={<Suspense fallback={<div role="status" className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-6 text-sm text-slate-300">Loading interactive 3D city scene…</div>}><City3D /></Suspense>} />
        <Route path="report-generation" element={<ReportGeneration />} />
        <Route path="settings" element={<Settings />} />
        <Route path="history" element={<UserHistory />} />
        <Route path="messages" element={<Navigate to="/dashboard" replace />} />
        <Route path="population-profile" element={<PopulationProfile />} />
        <Route path="intelligence-center" element={<IntelligenceCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </CityProvider>
    </AuthProvider>
  );
}

export default App;
