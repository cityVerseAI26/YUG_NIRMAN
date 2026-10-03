import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import City2040Outlook from "../common/City2040Outlook";
import { useCity } from "../../context/CityContext";
import { useAuth } from "../../context/AuthContext";
import { recordUserAction, recordUserHistory } from "../../utils/userHistory";

const getActivityLabel = (element) => {
  const text = element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.textContent;
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 100);
};

export const MainLayout = () => {
  const { sidebarCollapsed, city, liveWeather, liveAirQuality, liveDataLoading, liveWeatherError, liveAirQualityError } = useCity();
  const { currentUser } = useAuth();
  const location = useLocation();
  useEffect(() => {
    recordUserHistory(currentUser, location.pathname, city);
  }, [currentUser, location.pathname, city]);

  useEffect(() => {
    const handleClick = (event) => {
      const eventTarget = event.target instanceof Element ? event.target : event.target?.parentElement;
      const interactive = eventTarget?.closest('button, a[href], [role="button"], [role="tab"], summary');
      if (!interactive || interactive.closest("[data-activity-ignore]")) return;

      const label = getActivityLabel(interactive);
      if (!label) return;
      const action = interactive.tagName === "A" ? "Opened" : "Clicked";
      recordUserAction(currentUser, location.pathname, city, `${action}: ${label}`);
    };

    const handleControlChange = (event) => {
      const control = event.target;
      if (!(control instanceof HTMLSelectElement || control instanceof HTMLInputElement)) return;
      if (control.closest("[data-activity-ignore]")) return;

      const label = control.labels?.[0]?.textContent?.trim() || control.getAttribute("aria-label") || control.name;
      if (!label) return;

      if (control instanceof HTMLSelectElement) {
        const selectedOption = control.selectedOptions[0]?.textContent?.trim();
        if (selectedOption) recordUserAction(currentUser, location.pathname, city, `Changed ${label} to ${selectedOption}`);
      } else if (control.type === "checkbox") {
        recordUserAction(currentUser, location.pathname, city, `${control.checked ? "Enabled" : "Disabled"} ${label}`);
      } else if (control.type === "radio" && control.checked) {
        recordUserAction(currentUser, location.pathname, city, `Selected ${label}`);
      } else if (control.type === "range") {
        recordUserAction(currentUser, location.pathname, city, `Adjusted ${label} to ${control.value}`);
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleControlChange, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleControlChange, true);
    };
  }, [currentUser, location.pathname, city]);

  const publicFeedsReady = Boolean(liveWeather && liveAirQuality);
  const publicFeedsUnavailable = Boolean(liveWeatherError && liveAirQualityError);
  const publicFeedStatus = `Weather: ${liveWeather ? "current model data" : liveWeatherError ? "unavailable" : "loading"} · Air quality: ${liveAirQuality ? "current model data" : liveAirQualityError ? "unavailable" : "loading"}`;

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col relative overflow-x-hidden bg-grid-cyber selection:bg-cyan-500 selection:text-slate-950">
      {/* Futuristic Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed bottom-10 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed top-1/3 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-64"
          }`}
      >
        <Navbar />

        <div className="mx-4 mt-3 sm:mx-6 lg:mx-8 px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-700/70 text-[10px] sm:text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`w-2 h-2 rounded-full ${publicFeedsReady ? "bg-emerald-400" : publicFeedsUnavailable ? "bg-rose-400" : "bg-amber-400 animate-pulse"}`} />
          <span className="font-semibold">Public feeds:</span>
          <span>{liveDataLoading ? "Loading public feeds…" : publicFeedStatus}</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span>OSM map features load on map screens. Traffic speeds, transit, energy, water, alerts, and AI insights are sample/simulated data unless a page says otherwise.</span>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1680px] w-full mx-auto">
          <City2040Outlook />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Futuristic Minimal Footer */}
        <footer className="py-4 px-6 border-t border-cyan-500/10 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-semibold text-slate-400">
              AI-Powered Future City Simulator
            </span>
            <span>•</span>
            <span>Digital Twin Infrastructure v2.6</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>BE IT Final Year Major Project</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono">Public feeds + demo modules</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
