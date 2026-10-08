import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useCity } from "../../context/CityContext";
import { useAuth } from "../../context/AuthContext";
import { recordUserAction, recordUserHistory } from "../../utils/userHistory";

const DATA_STATE_LEGEND = [
  { label: "LIVE", color: "bg-emerald-400", description: "Current data from public feeds" },
  { label: "PAST", color: "bg-sky-400", description: "Previously recorded data" },
  { label: "FORECAST", color: "bg-violet-400", description: "A model's estimate of the future" },
  { label: "SCENARIO", color: "bg-amber-400", description: "A what-if result" },
  { label: "SAMPLE", color: "bg-slate-400", description: "Example data, not a live reading" },
];

const getActivityLabel = (element) => {
  const text = element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.textContent;
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 100);
};

export const MainLayout = () => {
  const { sidebarCollapsed, city, displayMode, liveWeather, liveAirQuality, liveDataLoading, liveWeatherError, liveAirQualityError } = useCity();
  const { currentUser } = useAuth();
  const location = useLocation();
  useEffect(() => {
    recordUserHistory(currentUser, location.pathname, city);
  }, [currentUser, location.pathname, city]);

  useEffect(() => {
    const targetId = location.hash.slice(1);
    if (!targetId) return undefined;

    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    };

    if (scrollToTarget()) return undefined;

    const observer = new MutationObserver(() => {
      if (scrollToTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname, location.hash]);

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
  const publicFeedStatus = `Weather: ${liveWeather ? "available" : liveWeatherError ? "unavailable" : "loading"} · Air quality: ${liveAirQuality ? "available" : liveAirQualityError ? "unavailable" : "loading"}`;

  return (
    <div
      id="app-layout"
      data-display-mode={displayMode}
      className={`min-h-screen text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950 ${displayMode === "day" ? "bg-slate-100" : "bg-[#070a13] bg-grid-cyber"}`}
    >
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

        <div className="mx-4 mt-3 sm:mx-6 lg:mx-8 px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-xs text-cyan-100">
          Public demo · no sign-in or admin access. Planning controls model local scenarios; they do not operate real city systems.
        </div>

        <div className="mx-4 mt-3 sm:mx-6 lg:mx-8 px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-700/70 text-[10px] sm:text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`w-2 h-2 rounded-full ${publicFeedsReady ? "bg-emerald-400" : publicFeedsUnavailable ? "bg-rose-400" : "bg-amber-400 animate-pulse"}`} />
          <span className="font-semibold">Current public data:</span>
          <span>{liveDataLoading ? "Loading…" : publicFeedStatus}</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span>Maps use public map data. Some traffic, energy, water, alert, and AI results are examples or estimates. Check each page's data label.</span>
          <div role="group" aria-label="Data status legend" className="flex flex-wrap items-center gap-1.5 pt-1">
            {DATA_STATE_LEGEND.map(({ label, color, description }) => (
              <span key={label} title={description} className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1680px] w-full mx-auto">
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
              City Planning Dashboard
            </span>
            <span>•</span>
            <span>Version 2.6</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Final-year project</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono">Public and sample data</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
