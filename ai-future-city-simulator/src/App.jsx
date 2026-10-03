import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CityProvider } from "./context/CityContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";

import LandingPage        from "./pages/LandingPage";
import UserLogin          from "./pages/UserLogin";
import AdminLogin         from "./pages/AdminLogin";
import CitySelection      from "./pages/CitySelection";
import Dashboard          from "./pages/Dashboard";
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
import City3D             from "./pages/City3D";
import Settings           from "./pages/Settings";
import UserHistory        from "./pages/UserHistory";
import AdminDashboard     from "./pages/AdminDashboard";
import MessagesCenter     from "./pages/MessagesCenter";

/* Protected route — requires login */
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  return isLoggedIn
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
}

function AdminRoute({ children }) {
  const { isLoggedIn, currentUser } = useAuth();
  return isLoggedIn && currentUser?.authType === "admin"
    ? children
    : <Navigate to="/admin-login" replace />;
}

function AppRoutes() {
  const { isLoggedIn, currentUser } = useAuth();
  const signedInPath = currentUser?.authType === "admin" ? "/admin-dashboard" : "/select-city";

  return (
    <Routes>
      {/* Public pages */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/login"       element={isLoggedIn ? <Navigate to={signedInPath} replace /> : <UserLogin />} />
      <Route path="/admin-login" element={isLoggedIn ? <Navigate to={signedInPath} replace /> : <AdminLogin />} />
      <Route path="/select-city" element={<PrivateRoute><CitySelection /></PrivateRoute>} />
      <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin-chat" element={<AdminRoute><MessagesCenter /></AdminRoute>} />

      {/* Protected app shell */}
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="digital-twin"       element={<DigitalTwin />} />
        <Route path="future-predictions" element={<FuturePredictions />} />
        <Route path="what-if-simulator"  element={<WhatIfSimulator />} />
        <Route path="scenario-comparison" element={<ScenarioComparison />} />
        <Route path="transportation"     element={<Transportation />} />
        <Route path="environment"        element={<Environment />} />
        <Route path="climate-risks"      element={<ClimateRisks />} />
        <Route path="ai-recommendations" element={<AIRecommendations />} />
        <Route path="sustainability"     element={<Sustainability />} />
        <Route path="city-3d"            element={<City3D />} />
        <Route path="report-generation"  element={<ReportGeneration />} />
        <Route path="settings"           element={<Settings />} />
        <Route path="history"            element={<UserHistory />} />
        <Route path="messages"           element={<MessagesCenter />} />
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
