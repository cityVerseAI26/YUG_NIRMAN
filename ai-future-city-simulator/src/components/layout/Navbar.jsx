import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Flame,
  Waves,
  Car,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useCity } from "../../context/CityContext";
import { FLAT_NAVIGATION_ITEMS } from "./Sidebar";

export const Navbar = () => {
  const {
    selectedCity,
    setSelectedCity,
    citiesList,
    city,
    alerts,
    markAlertAsRead,
    markAllAlertsAsRead,
    unreadAlertCount,
    currentTime,
    currentDate,
    sidebarCollapsed,
    setMobileMenuOpen,
    displayMode,
    setDisplayMode
  } = useCity();

  const location = useLocation();
  const navigate = useNavigate();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const notifRef = useRef(null);
  const cityRef = useRef(null);
  const searchRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute dynamic page title & subtitle based on current route
  const getPageMeta = () => {
    const current = FLAT_NAVIGATION_ITEMS.find((item) => item.path === `${location.pathname}${location.hash}`)
      || FLAT_NAVIGATION_ITEMS.find((item) => item.path.split("#")[0] === location.pathname);
    if (!current) return { title: "Command Center", subtitle: "City dashboard and public-data overview" };

    switch (current.path.split("#")[0]) {
      case "/":
        return { title: "City Command Center", subtitle: "Current data, city context & scenarios" };
      case "/digital-twin":
        return { title: "City Digital Twin", subtitle: "OpenStreetMap features and public model conditions" };
      case "/data-center":
        return { title: "Data Center", subtitle: "Sources, coverage, and data trust" };
      case "/intelligence-center":
        return { title: "Intelligence Center", subtitle: "City alerts, signals, and available evidence" };
      case "/population-profile":
        return { title: "Population Profile", subtitle: "Population profile and illustrative growth scenarios" };
      case "/city-problems":
        return { title: "City Problems", subtitle: "Threshold-based city indicators" };
      case "/future-predictions":
        return { title: "Future Predictions", subtitle: "Multi-Decade Urban Simulation Engine" };
      case "/what-if-simulator":
        return { title: "What-If Simulator", subtitle: "Urban Policy Sandbox & Dynamic Impact Analyzer" };
      case "/scenario-comparison":
        return { title: "Scenario Comparison", subtitle: "Cross-Model Trajectory Matrix" };
      case "/transportation":
        return { title: "Transportation & Transit", subtitle: "Arterial Congestion & Transit Fleet Optimization" };
      case "/environment":
        return { title: "Environmental Conditions", subtitle: "Open-Meteo air-quality and weather model data" };
      case "/climate-risks":
        return { title: "Climate Risk Scenarios", subtitle: "Public weather context and what-if flood simulation" };
      case "/ai-recommendations":
        return { title: "Policy Decision Support", subtitle: "Review city insights and sample policy recommendations" };
      case "/sustainability":
        return { title: "Sustainability Matrix", subtitle: "Clean Energy Transition & Circular Resource Metrics" };
      case "/city-3d":
        return { title: "3D City Visualizer", subtitle: "Interactive Volumetric WebGL Digital Twin" };
      case "/report-generation":
        return { title: "Report Generation", subtitle: "Create and export city forecast assessments" };
      case "/settings":
        return { title: "Simulator Settings", subtitle: "Local scenario and display preferences" };
      case "/history":
        return { title: "My History", subtitle: "Your recent city simulator activity on this browser" };
      default:
        return { title: current.label, subtitle: "City simulator sample-data module" };
    }
  };

  const { title, subtitle } = getPageMeta();

  // Search filtering
  const searchResults = searchQuery.trim()
    ? FLAT_NAVIGATION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <header
      className={`sticky top-0 z-30 bg-[#080d19]/90 backdrop-blur-md border-b border-cyan-500/15 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 h-[72px]">
        {/* Left: Mobile hamburger + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
              </h1>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                CITY WORKSPACE
              </span>
              {city.dataMode === "illustrative" && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30"
                  title="This city's dashboard indicators use an illustrative template. The map uses its selected coordinates and public data."
                >
                  ILLUSTRATIVE METRICS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Section: City Selector, Clock, Actions, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* City Selector Dropdown */}
          <div className="relative" ref={cityRef}>
            <button
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/60 text-xs font-semibold text-slate-200 transition-all duration-200 shadow-md shadow-cyan-500/5"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-300">{city.name}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${cityDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {cityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 max-h-[70vh] overflow-y-auto rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Select Active City Twin
                </div>
                {citiesList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCity(c.id);
                      setCityDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${selectedCity === c.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                  >
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.country || c.state}</div>
                    </div>
                    {selectedCity === c.id && (
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Clock */}
          <div className="hidden xl:flex flex-col items-end px-3 py-1 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="font-mono text-xs font-semibold text-cyan-300 tracking-wider">
              {currentTime || "12:00:00 PM"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currentDate || "Mon, Sep 7, 2026"}
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all duration-200"
              title="Quick Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {searchOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl p-3 z-50">
                <div className="relative">
                  <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search modules, telemetry, zones..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-cyan-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 text-left transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-cyan-400" />
                        <span>{item.label}</span>
                      </button>
                    ))
                  ) : searchQuery ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No modules matching "{searchQuery}"
                    </div>
                  ) : (
                    <div className="p-2 text-[11px] text-slate-500 text-center">
                      Quick navigation across 12 digital twin modules
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all duration-200"
              title="City Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Sample City Alerts
                    </span>
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadAlertCount} New
                    </span>
                  </div>
                  {unreadAlertCount > 0 && (
                    <button
                      onClick={markAllAlertsAsRead}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => markAlertAsRead(alert.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${alert.read
                            ? "bg-slate-950/40 border-slate-800 text-slate-400"
                            : alert.priority === "high"
                              ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                              : alert.priority === "warning"
                                ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                                : "bg-slate-900/80 border-cyan-500/20 text-cyan-200"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            {alert.priority === "high" && (
                              <Flame className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            {alert.priority === "warning" && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            {alert.priority === "medium" && (
                              <Waves className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            {alert.priority === "normal" && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>{alert.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            Example
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {alert.description}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                          <span className="text-cyan-400/80 font-medium">{alert.location}</span>
                          {!alert.read && (
                            <span className="text-cyan-400 font-semibold">Click to mark read</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No sample alerts in {city.name}.
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-cyan-500/10 text-center">
                  <button
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate("/climate-risks");
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                  >
                    <span>Open Climate Scenario Simulator</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Day / night display toggle */}
          <button
            onClick={() => setDisplayMode(displayMode === "night" ? "day" : "night")}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all duration-200"
            title={`Switch to ${displayMode === "night" ? "day" : "night"} mode`}
            aria-label={`Switch to ${displayMode === "night" ? "day" : "night"} mode`}
            aria-pressed={displayMode === "day"}
          >
            {displayMode === "night" ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Public demo identity */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-800">
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg border bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 border-cyan-300/40 shadow-cyan-500/20"
              >
                PD
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950"></span>
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-white tracking-tight leading-tight">Public Demo</span>
              <span className="text-[10px] font-medium text-cyan-400/90 leading-tight">
                Read-only access
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
