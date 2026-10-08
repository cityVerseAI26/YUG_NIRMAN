import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  Waves,
  ShieldCheck,
  CheckCircle,
  X,
  Bell
} from "lucide-react";
import { useCity } from "../../context/CityContext";

export const RecentAlerts = () => {
  const { alerts, markAlertAsRead, dismissAlert, markAllAlertsAsRead, unreadAlertCount, city } = useCity();
  const [filter, setFilter] = useState("all"); // "all" | "high" | "warning" | "medium" | "normal"

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.priority === filter;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "high":
        return {
          border: "border-rose-500/30 hover:border-rose-500/60",
          bg: "bg-rose-950/20",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          icon: Flame,
          iconColor: "text-rose-400"
        };
      case "warning":
        return {
          border: "border-amber-500/30 hover:border-amber-500/60",
          bg: "bg-amber-950/20",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          icon: AlertTriangle,
          iconColor: "text-amber-400"
        };
      case "medium":
        return {
          border: "border-yellow-500/30 hover:border-yellow-500/60",
          bg: "bg-yellow-950/20",
          badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
          icon: Waves,
          iconColor: "text-yellow-400"
        };
      case "normal":
      default:
        return {
          border: "border-emerald-500/30 hover:border-emerald-500/60",
          bg: "bg-emerald-950/20",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          icon: ShieldCheck,
          iconColor: "text-emerald-400"
        };
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>CITY ALERT CENTER</span>
              <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                {alerts.length} Templates
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Illustrative alert templates for {city.name} · no municipal alert feed connected
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex-wrap">
          {["all", "high", "warning", "medium", "normal"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards Feed */}
      <div className="space-y-2.5 my-3 max-h-96 overflow-y-auto pr-1">
        <AnimatePresence>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => {
              const style = getPriorityStyle(alert.priority);
              const Icon = style.icon;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-xl border transition-all duration-200 ${
                    style.bg
                  } ${style.border} ${alert.read ? "opacity-60" : "opacity-100"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 ${style.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {alert.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider border ${style.badge}`}
                          >
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {alert.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="text-cyan-400 font-medium">📍 {alert.location}</span>
                          <span>•</span>
                          <span>Template only</span>
                          <span>•</span>
                          <span className="text-slate-500">{alert.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {!alert.read && (
                        <button
                          onClick={() => markAlertAsRead(alert.id)}
                          className="p-1 rounded-lg text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 text-[10px] font-semibold flex items-center gap-1 border border-cyan-500/30"
                          title="Mark this sample alert as read"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Mark read</span>
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        aria-label={`Dismiss alert: ${alert.title}`}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No templates matching the "{filter}" category in {city.name}. Select All to view other categories.
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer summary */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Templates only · no live or emergency alert feed connected</span>
        <button
          type="button"
          onClick={markAllAlertsAsRead}
          disabled={unreadAlertCount === 0}
          aria-label={`Acknowledge all alerts (${unreadAlertCount} unread)`}
          className="text-cyan-400 hover:underline font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          Acknowledge All ({unreadAlertCount})
        </button>
      </div>
    </div>
  );
};

export default RecentAlerts;
