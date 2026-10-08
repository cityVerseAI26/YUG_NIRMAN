import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  Activity,
  Boxes,
  Car,
  Leaf,
  Zap,
  Users,
  TrendingUp,
  FlaskConical,
  GitCompare,
  Bot,
  FileText,
  Settings,
  History,
  CircleHelp,
  ChevronLeft,
  X,
  Sparkles,
  Waves,
  MapPin,
  Droplet,
  MessageSquare
} from "lucide-react";
import { useCity } from "../../context/CityContext";
import { useAuth } from "../../context/AuthContext";
import useUnreadChatCount from "../../hooks/useUnreadChatCount";
import Tooltip from "../common/Tooltip";
import BrandMark from "../common/BrandMark";

export const NAVIGATION_ITEMS = [
  {
    section: "START HERE",
    description: "Get a quick city summary, check the score, and see which indicators need attention.",
    items: [
      {
        path: "/dashboard",
        label: "City Overview",
        sublabel: "Current condition",
        icon: LayoutDashboard,
        badge: "Start Here",
        badgeStyle: "cyan",
        storyOutput: "What city is this?",
      },
      {
        path: "/city-health",
        label: "City Health",
        sublabel: "Score and key indicators",
        icon: Activity,
        storyOutput: "How the city scores on available indicators",
      },
      {
        path: "/city-problems",
        label: "Possible Problems",
        sublabel: "Indicators to check",
        icon: AlertTriangle,
        storyOutput: "What needs a closer look",
      },
    ],
  },
  {
    section: "CITY MAPS",
    description: "Explore a sample 3D city view or the interactive 2D map.",
    items: [
      {
        path: "/city-3d",
        label: "3D City View",
        sublabel: "Illustrative 3D scene",
        icon: Boxes,
        badge: "3D",
        badgeStyle: "purple",
        storyOutput: "See & interact with the city",
      },
      {
        path: "/digital-twin",
        label: "City Map",
        sublabel: "Map and available sensors",
        icon: MapPin,
      },
    ],
  },
  {
    section: "ALERTS & DATA",
    description: "Review city alerts and find out where the information comes from.",
    items: [
      {
        path: "/intelligence-center",
        label: "Alerts & Insights",
        sublabel: "What may need attention",
        icon: Sparkles,
      },
      {
        path: "/data-center",
        label: "Data Sources",
        sublabel: "Where the information comes from",
        icon: Database,
      },
    ],
  },
  {
    section: "CITY SERVICES",
    description: "Explore traffic, air, weather, water, energy, climate, and population information.",
    items: [
      {
        path: "/transportation",
        label: "Traffic & Transport",
        sublabel: "Roads, transit, and travel",
        icon: Car,
      },
      {
        path: "/environment",
        label: "Air & Weather",
        sublabel: "Air quality and weather",
        icon: Leaf,
      },
      {
        path: "/climate-risks",
        label: "Climate & Risk Intelligence",
        sublabel: "Weather, hazards, and actions",
        icon: Waves,
        alert: true,
      },
      {
        path: "/sustainability#water-consumption",
        label: "Water Use",
        sublabel: "Demand and storage",
        icon: Droplet,
      },
      {
        path: "/sustainability",
        label: "Energy & Sustainability",
        sublabel: "Energy and water use",
        icon: Zap,
      },
      {
        path: "/population-profile",
        label: "Population",
        sublabel: "Population estimates",
        icon: Users,
      },
    ],
  },
  {
    section: "FORECASTS",
    description: "Explore forecasts and sample views of how the city could change.",
    items: [
      {
        path: "/future-predictions",
        label: "Future Outlook",
        sublabel: "Forecasts by city and year",
        icon: TrendingUp,
        badge: "SAMPLE",
        badgeStyle: "slate",
        storyOutput: "What happens if trends continue?",
      },
    ],
  },
  {
    section: "TRY A SCENARIO",
    description: "Change a few settings to explore an example of what could happen.",
    items: [
      {
        path: "/what-if-simulator",
        label: "What-If Scenario",
        sublabel: "Explore example outcomes",
        icon: FlaskConical,
      },
    ],
  },
  {
    section: "SUGGESTIONS",
    description: "Review sample ideas for city planning. Check the evidence before using them.",
    items: [
      {
        path: "/ai-recommendations",
        label: "Planning Suggestions",
        sublabel: "Ideas to review",
        icon: Bot,
      },
    ],
  },
  {
    section: "COMPARE RESULTS",
    description: "Compare example results from different city scenarios.",
    items: [
      {
        path: "/scenario-comparison",
        label: "Compare Scenarios",
        sublabel: "See example results side by side",
        icon: GitCompare,
        badge: "COMPARE",
        badgeStyle: "cyan",
        storyOutput: "Review supported impact and limitations",
      },
    ],
  },
  {
    section: "REPORTS",
    description: "Create and export a report about the selected city.",
    items: [
      {
        path: "/report-generation",
        label: "City Report",
        sublabel: "Details and data sources",
        icon: FileText,
        storyOutput: "Complete simulation report",
      },
    ],
  },
  {
    section: "COMMUNICATION",
    description: "Citizen inquiries, municipal discussion, and administration chat.",
    items: [
      {
        path: "/messages",
        label: "Messages & Chat",
        sublabel: "Support and discussions",
        icon: MessageSquare,
        badge: "Chat",
        badgeStyle: "purple",
      },
    ],
  },
  {
    section: "DEMO SETTINGS",
    description: "Review the current browser session and display preferences.",
    items: [
      { path: "/history", label: "Recent Activity", sublabel: "Pages and cities you viewed", icon: History },
      { path: "/settings", label: "Settings", sublabel: "City and display options", icon: Settings },
    ],
  },
];

// Flat list for other consumers
export const FLAT_NAVIGATION_ITEMS = NAVIGATION_ITEMS.flatMap((g) => g.items);

export const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen, unreadAlertCount } = useCity();
  const { currentUser } = useAuth();
  const unreadMessageCount = useUnreadChatCount();
  const location = useLocation();

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const getBadgeClass = (style) => {
    switch (style) {
      case "purple": return "bg-purple-500/20 text-purple-300 border border-purple-500/30";
      case "amber": return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
      case "slate": return "bg-slate-700/50 text-slate-300 border border-slate-600/40";
      default: return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30";
    }
  };

  const navContent = (
    <div className="premium-sidebar-shell relative flex h-full flex-col select-none">
      {/* Brand Header */}
      <div className="premium-sidebar-brand flex min-h-[76px] items-center justify-between border-b border-cyan-300/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 360, damping: 16 }}
            className="premium-sidebar-mark flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-200/30 bg-gradient-to-br from-cyan-100 via-teal-200 to-cyan-400 shadow-lg shadow-cyan-400/25"
          >
            <motion.span
              animate={{ rotate: [0, 3, 0, -3, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="flex"
            >
              <BrandMark className="h-7 w-7" />
            </motion.span>
          </motion.div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                key="sidebar-brand-name"
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -8, width: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex min-w-0 flex-col overflow-hidden"
              >
                <span className="truncate bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-sm font-extrabold tracking-wider text-transparent">
                  YUG NIRMAN
                </span>
                <span className="flex items-center gap-1 truncate text-[11px] font-medium tracking-wide text-cyan-200/75">
                  <span className="premium-sidebar-live-dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  Urban Intelligence Platform
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Story Flow Badge */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div
            key="sidebar-story-flow"
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="premium-sidebar-story mx-3 mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold tracking-wider text-cyan-200">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <span>QUICK GUIDE <span aria-hidden="true">→</span></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Links — grouped by story phase */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {NAVIGATION_ITEMS.map((group, groupIndex) => (
          <motion.section
            key={group.section}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: groupIndex * 0.035, ease: "easeOut" }}
            className="mb-2 last:mb-0"
          >
            {/* Section header */}
            <AnimatePresence initial={false}>
              {!sidebarCollapsed ? (
                <motion.h2
                  key={`${group.section}-title`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  title={group.description}
                  className="overflow-hidden px-3 pb-1.5 pt-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500"
                >
                  <span className="flex items-center justify-between gap-2">
                    {group.section}
                    {group.description && (
                      <CircleHelp
                        className="h-3 w-3 shrink-0 text-slate-600"
                        aria-label={group.description}
                        title={group.description}
                        tabIndex={0}
                      />
                    )}
                  </span>
                </motion.h2>
              ) : (
                <motion.div
                  key={`${group.section}-divider`}
                  aria-hidden="true"
                  initial={{ opacity: 0, scaleX: 0.65 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  title={group.description}
                  className="my-2 border-t border-slate-700/50"
                />
              )}
            </AnimatePresence>

            {group.items.map((item, itemIndex) => {
              const Icon = item.icon;
              const [itemPath, itemHash] = item.path.split("#");
              const isActive = itemHash
                ? location.pathname === itemPath && location.hash === `#${itemHash}`
                : location.pathname === item.path && location.hash === "";

              const linkContent = (
                <motion.div
                  whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                  whileTap={{ scale: 0.975 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="relative"
                >
                <NavLink
                  to={item.path}
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`premium-sidebar-link relative flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                    isActive
                      ? "is-active text-cyan-100 bg-cyan-400/10 border-cyan-300/35 shadow-md shadow-cyan-950/30"
                      : "text-slate-400 border-transparent hover:border-cyan-300/15 hover:bg-slate-800/50 hover:text-slate-100"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      aria-hidden="true"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="premium-sidebar-indicator absolute -left-px top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-cyan-200 via-cyan-400 to-teal-300 shadow-[0_0_14px_rgba(34,211,238,0.95)]"
                    />
                  )}

                  {/* Step number dot (collapsed: just icon; expanded: number dot) */}
                  {!sidebarCollapsed && item.step && (
                    <span className={`text-[9px] font-black font-mono w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-cyan-500/30 text-cyan-300"
                        : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300"
                    }`}>
                      {item.step}
                    </span>
                  )}

                  <motion.span
                    whileHover={{ y: -2, rotate: -5, scale: 1.12 }}
                    whileTap={{ scale: 0.86, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 14 }}
                    className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center"
                  >
                    <Icon
                      className={`h-[18px] w-[18px] transition-colors duration-200 ${
                        isActive
                          ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.75)]"
                          : "text-slate-400 group-hover:text-cyan-300"
                      }`}
                    />
                  </motion.span>
                  {sidebarCollapsed && item.path === "/messages" && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                  )}

                  <AnimatePresence initial={false}>
                    {!sidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0, x: -5 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -5 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="flex min-w-0 flex-1 flex-col overflow-hidden"
                      >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.alert && unreadAlertCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                          {item.path === "/messages" && unreadMessageCount > 0 ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              {unreadMessageCount > 99 ? "99+" : `${unreadMessageCount} new`}
                            </span>
                          ) : item.badge && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${getBadgeClass(item.badgeStyle)}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.sublabel && (
                        <span className="text-[10px] text-slate-600 truncate font-medium mt-0.5">{item.sublabel}</span>
                      )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </NavLink>
                </motion.div>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.path} content={item.label} position="right">
                    {linkContent}
                  </Tooltip>
                );
              }

              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: groupIndex * 0.025 + itemIndex * 0.018 }}
                  className="mb-1"
                >
                  {linkContent}
                </motion.div>
              );
            })}
          </motion.section>
        ))}
      </nav>

      {/* Story Legend + Collapse Toggle */}
      <div className="border-t border-cyan-300/10 p-3">
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 5 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="premium-sidebar-profile mb-3 flex items-center gap-3 rounded-xl p-2.5">
                <motion.span
                  animate={{ boxShadow: ["0 0 12px rgba(34,211,238,0.08)", "0 0 20px rgba(34,211,238,0.22)", "0 0 12px rgba(34,211,238,0.08)"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.08, rotate: 4 }}
                  className="premium-sidebar-avatar flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black text-cyan-100"
                >
                  {currentUser?.avatar || "US"}
                </motion.span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-slate-100">
                    {currentUser?.name || "Citizen User"}
                  </span>
                  <span className="truncate text-[10px] text-cyan-200/65">
                    {currentUser?.role || "Verified Citizen"}
                  </span>
                </span>
                <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <div className="premium-sidebar-story mb-3 rounded-xl p-3">
                <div className="text-[10px] leading-relaxed text-slate-400">
                    <span className="mb-1 block font-bold tracking-[0.14em] text-cyan-300">QUICK GUIDE</span>
                    Start with the overview, check alerts, then explore a forecast or scenario.
                    <span className="mt-1 block text-slate-500">Some results are examples, not official city data.</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="premium-sidebar-toggle hidden w-full cursor-pointer items-center justify-center rounded-xl border border-cyan-300/10 px-3 py-2 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-200 lg:flex"
        >
          <motion.span
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.span>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="ml-2">Collapse Sidebar</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <>
      {/* Desktop Sidebar */}
      {!mobileMenuOpen && (
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 76 : 256 }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          className="fixed bottom-0 left-0 top-0 z-40 hidden lg:block"
        >
          {navContent}
        </motion.aside>
      )}

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <motion.div
            initial={{ x: "-100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative z-50 h-full w-72 max-w-[80vw] shadow-2xl"
          >
            {navContent}
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
    </MotionConfig>
  );
};

export default Sidebar;
