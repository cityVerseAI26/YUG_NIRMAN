import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MapPin,
  Sparkles,
  FlaskConical,
  GitCompare,
  Car,
  Leaf,
  Waves,
  Bot,
  Recycle,
  Boxes,
  FileText,
  Settings,
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  X
} from "lucide-react";
import { useCity } from "../../context/CityContext";
import Tooltip from "../common/Tooltip";
import BrandMark from "../common/BrandMark";
import useUnreadChatCount from "../../hooks/useUnreadChatCount";

export const NAVIGATION_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: "Demo" },
  { path: "/digital-twin", label: "City Digital Twin", icon: MapPin },
  { path: "/future-predictions", label: "Future Predictions", icon: Sparkles, badge: "AI" },
  { path: "/what-if-simulator", label: "What-If Simulator", icon: FlaskConical },
  { path: "/scenario-comparison", label: "Scenario Comparison", icon: GitCompare },
  { path: "/transportation", label: "Transportation", icon: Car },
  { path: "/environment", label: "Environment", icon: Leaf },
  { path: "/climate-risks", label: "Climate & Risks", icon: Waves, alert: true },
  { path: "/ai-recommendations", label: "AI Recommendations", icon: Bot, badge: "4 New" },
  { path: "/sustainability", label: "Sustainability", icon: Recycle },
  { path: "/city-3d", label: "3D City", icon: Boxes, badge: "WebGL" },
  { path: "/report-generation", label: "Report Generation", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/history", label: "My History", icon: History },
  { path: "/messages", label: "Messages", icon: MessageSquare, badge: "Chat" }
];

export const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen, unreadAlertCount } = useCity();
  const unreadMessageCount = useUnreadChatCount();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#090e1a]/95 border-r border-cyan-500/15 backdrop-blur-xl relative select-none">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-cyan-500/10 min-h-[72px]">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#70e2d0] flex items-center justify-center shadow-lg shadow-cyan-500/25 flex-shrink-0 border border-cyan-300/30">
              <BrandMark className="h-7 w-7" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 truncate">
                YUG NIRMAN
              </span>
              <span className="text-[11px] text-cyan-400/80 font-medium tracking-wide truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                AI City Simulator
              </span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#70e2d0] flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-300/30">
            <BrandMark className="h-7 w-7" />
          </div>
        )}

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          const linkContent = (
            <NavLink
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                  ? "text-cyan-300 bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700/50 border border-transparent"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r shadow-glow-cyan"
                />
              )}

              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" : "text-slate-400 group-hover:text-cyan-400"
                  }`}
              />
              {sidebarCollapsed && item.path === "/messages" && unreadMessageCount > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#090e1a]" aria-label={`${unreadMessageCount} unread messages`} />
              )}

              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${item.path === "/messages" && unreadMessageCount > 0
                          ? "bg-rose-500/20 text-rose-200 border border-rose-400/40"
                          : item.badge === "Live"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : item.badge === "AI"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}
                    >
                      {item.path === "/messages" && unreadMessageCount > 0
                        ? unreadMessageCount > 99 ? "99+" : unreadMessageCount
                        : item.badge}
                    </span>
                  )}
                  {item.alert && unreadAlertCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </div>
              )}
            </NavLink>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.path} content={item.label} position="right">
                {linkContent}
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </div>

      {/* Demo data status / sidebar toggle */}
      <div className="p-3 border-t border-cyan-500/10">
        {!sidebarCollapsed && (
          <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-500/20">
            <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
              <Zap className="w-3.5 h-3.5" /> Demo AI examples
            </div>
            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
              No external AI service or municipal sensor network is connected.
            </p>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <span className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-[76px]" : "w-64"
          }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-50">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
export default Sidebar;
