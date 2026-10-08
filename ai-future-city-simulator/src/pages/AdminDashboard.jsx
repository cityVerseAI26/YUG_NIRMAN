import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  LogOut,
  MessageSquare,
  MapPin,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import BrandMark from "../components/common/BrandMark";
import useUnreadChatCount from "../hooks/useUnreadChatCount";
import MessagesCenter from "./MessagesCenter";
import {
  getAllUserHistory,
  getLocalRegisteredUsers,
  USER_HISTORY_EVENT,
} from "../utils/userHistory";
import {
  getArchivedReportPdf,
  getPredictionReportArchive,
  PREDICTION_REPORT_ARCHIVE_EVENT,
  PREDICTION_REPORT_ARCHIVE_KEY,
} from "../utils/predictionReportArchive";
import { getActivitySeries, getTopActiveUsers } from "../utils/activityAnalytics";

const RECENT_ACTIVITY_WINDOW = 5 * 60 * 1000;

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteUserAccount } = useAuth();
  const unreadMessageCount = useUnreadChatCount();
  const [users, setUsers] = useState(getLocalRegisteredUsers);
  const [activities, setActivities] = useState(getAllUserHistory);
  const [searchText, setSearchText] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [predictionReports, setPredictionReports] = useState(getPredictionReportArchive);
  const [reportArchiveError, setReportArchiveError] = useState("");
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [activityPeriod, setActivityPeriod] = useState("daily");

  useEffect(() => {
    if (!messagesOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMessagesOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [messagesOpen]);

  useEffect(() => {
    const refreshReports = () => setPredictionReports(getPredictionReportArchive());
    const handleStorage = (event) => {
      if (!event.key || event.key === PREDICTION_REPORT_ARCHIVE_KEY) refreshReports();
    };

    window.addEventListener(PREDICTION_REPORT_ARCHIVE_EVENT, refreshReports);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PREDICTION_REPORT_ARCHIVE_EVENT, refreshReports);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const refreshActivity = () => {
      setUsers(getLocalRegisteredUsers());
      setActivities(getAllUserHistory());
      setLastUpdated(Date.now());
    };
    const handleHistoryUpdate = (event) => {
      const changedKey = event.detail?.key;
      if (!changedKey || changedKey === "city_registered_users" || changedKey.startsWith("city-user-history:")) {
        refreshActivity();
      }
    };
    const handleStorageUpdate = (event) => {
      if (!event.key || event.key === "city_registered_users" || event.key.startsWith("city-user-history:")) {
        refreshActivity();
      }
    };

    window.addEventListener(USER_HISTORY_EVENT, handleHistoryUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener(USER_HISTORY_EVENT, handleHistoryUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const filteredActivities = useMemo(() => {
    if (!selectedUserEmail && !showAllActivity) return [];
    const query = searchText.trim().toLowerCase();
    return activities.filter((entry) => {
      const matchesSelectedUser = showAllActivity || entry.userEmail === selectedUserEmail;
      const matchesSearch = !query || `${entry.userName} ${entry.userEmail} ${entry.pageLabel} ${entry.actionLabel} ${entry.cityName}`.toLowerCase().includes(query);
      return matchesSelectedUser && matchesSearch;
    });
  }, [activities, searchText, selectedUserEmail, showAllActivity]);

  const recentUsers = useMemo(() => {
    const activeAfter = lastUpdated - RECENT_ACTIVITY_WINDOW;
    return new Set(activities.filter((entry) => entry.timestamp >= activeAfter).map((entry) => entry.userEmail)).size;
  }, [activities, lastUpdated]);
  const activitySeries = useMemo(
    () => getActivitySeries(activities, activityPeriod, new Date(lastUpdated)),
    [activities, activityPeriod, lastUpdated]
  );
  const mostActiveUsers = useMemo(
    () => getTopActiveUsers(activities, users, activityPeriod, new Date(lastUpdated)),
    [activities, users, activityPeriod, lastUpdated]
  );
  const selectedUser = users.find((user) => user.email === selectedUserEmail);
  const totalLogins = users.reduce((total, user) => total + (Number(user.loginCount) || 0), 0);
  const citiesExplored = new Set(activities.map((entry) => entry.cityName).filter(Boolean)).size;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleSelectUser = (email) => {
    setSelectedUserEmail((current) => current === email ? "" : email);
    setShowAllActivity(false);
    setDeleteError("");
  };

  const handleShowAllUsers = () => {
    setSelectedUserEmail("");
    setShowAllActivity(true);
    setDeleteError("");
  };

  const handleDeleteUser = (user) => {
    const userName = user.name || user.email;
    if (!window.confirm(`Delete ${userName} and their saved activity from this browser? This cannot be undone.`)) return;
    if (!deleteUserAccount(user.email)) {
      setDeleteError(`Could not delete ${userName}. The account may already be removed.`);
      return;
    }
    if (selectedUserEmail === user.email) setSelectedUserEmail("");
    setShowAllActivity(false);
    setDeleteError("");
  };

  const downloadArchivedReport = async (archiveEntry) => {
    setReportArchiveError("");
    let file;
    try {
      file = archiveEntry.archivedDocument
        ? await getArchivedReportPdf(archiveEntry.id)
        : new Blob([JSON.stringify(archiveEntry.report, null, 2)], { type: "application/json" });
    } catch (error) {
      setReportArchiveError(error instanceof Error ? error.message : "Could not read the saved report file.");
      return;
    }
    if (!file) {
      setReportArchiveError("The report record is present, but its PDF file is unavailable in this browser.");
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    const fileDate = String(archiveEntry.report.targetYear || "forecast").replace(/[^a-z0-9-]/gi, "-");
    link.download = archiveEntry.filename
      || `${String(archiveEntry.report.city || "city").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prediction-${fileDate}-admin-copy.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const summaryCards = [
    { label: "Registered users", value: users.length, detail: "Saved in this browser", icon: Users, color: "text-cyan-300", border: "border-cyan-400/20", background: "bg-cyan-400/10" },
    { label: "User logins", value: totalLogins, detail: "Successful sign-ins", icon: LogOut, color: "text-blue-300", border: "border-blue-400/20", background: "bg-blue-400/10" },
    { label: "Recent users", value: recentUsers, detail: "Active in the last 5 minutes", icon: Activity, color: "text-emerald-300", border: "border-emerald-400/20", background: "bg-emerald-400/10" },
    { label: "Activity events", value: activities.length, detail: "Visits and recorded actions", icon: Clock3, color: "text-sky-300", border: "border-sky-400/20", background: "bg-sky-400/10" },
    { label: "Cities explored", value: citiesExplored, detail: "In recorded visit history", icon: MapPin, color: "text-amber-300", border: "border-amber-400/20", background: "bg-amber-400/10" },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen bg-[#07120f] text-slate-100">
      <header className="admin-monitor-header border-b border-emerald-100/10 bg-[#0b1914]/90">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#70e2d0] text-[#10201b]">
              <BrandMark className="h-9 w-9" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#70e2d0]">YUG NIRMAN · ADMIN</p>
              <h1 className="truncate text-lg font-bold text-[#f3f4e8]">Activity monitor</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden text-xs text-slate-400 sm:inline">{currentUser?.name || "Administrator"}</span>
            <Link
              to="/select-city"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#70e2d0] px-3.5 text-xs font-bold text-[#10201b] transition-colors hover:bg-[#a1f2e5]"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Choose city
            </Link>
            <button
              type="button"
              onClick={() => setMessagesOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#70e2d0]/30 bg-[#70e2d0]/[0.06] px-3 text-xs font-semibold text-[#a5f3e5] transition-colors hover:border-[#70e2d0]/60 hover:bg-[#70e2d0]/[0.12]"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Messages
              {unreadMessageCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" aria-label={`${unreadMessageCount} unread messages`}>
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-600/70 bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:bg-white/[0.07]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="admin-monitor-content mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#70e2d0]">USER OVERSIGHT</p>
            <h2 className="text-2xl font-bold tracking-tight text-[#f3f4e8]">Registered-user activity</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Review recorded simulator visits across user accounts available in this browser.
            </p>
          </div>
          <div className="admin-monitor-updated inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/10 bg-emerald-300/[0.035] px-3 py-1.5 text-xs text-slate-400 sm:self-auto">
            <span className="admin-monitor-live-dot" aria-hidden="true" />
            Browser activity · updated {formatDateTime(lastUpdated)}
          </div>
        </section>

        <section className="admin-monitor-fan mb-7" aria-label="Activity summary">
          <div className="admin-monitor-orbit" aria-hidden="true" />
          <div className="admin-monitor-hub" aria-label={`${summaryCards.find(({ label }) => label === "Activity events").value} activity events`}>
            <span className="admin-monitor-hub-icon"><Activity size={22} aria-hidden="true" /></span>
            <span className="admin-monitor-hub-value">{summaryCards.find(({ label }) => label === "Activity events").value}</span>
            <span className="admin-monitor-hub-label">ACTIVITY EVENTS</span>
            <span className="admin-monitor-hub-caption">this browser</span>
          </div>
          {summaryCards.filter(({ label }) => label !== "Activity events").map(({ label, value, detail, icon: Icon, color, border, background }, index) => (
            <motion.article
              key={label}
              className={`admin-monitor-fan-position admin-monitor-fan-position-${index + 1}`}
              initial={{ opacity: 0, y: 13, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, delay: index * 0.065, ease: "easeOut" }}
            >
              <div className={`admin-monitor-stat admin-monitor-fan-card rounded-lg border ${border} bg-[#0d1b16] p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{label}</p>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.p
                        key={value}
                        className={`admin-monitor-stat-value mt-2 font-mono text-3xl font-bold ${color}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {value}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <span className={`admin-monitor-stat-icon grid h-9 w-9 place-items-center rounded-md ${background} ${color}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">{detail}</p>
              </div>
            </motion.article>
          ))}
        </section>

        <section className="admin-monitor-panel mb-7 overflow-hidden rounded-lg border border-slate-700/70 bg-[#0b1713]" aria-labelledby="admin-recent-activity-title">
          <div className="admin-monitor-section-header flex items-center justify-between gap-3 border-b border-slate-700/70 p-4 sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 id="admin-recent-activity-title" className="text-sm font-semibold text-white">Recent activity</h3>
                <span className="admin-monitor-stream-label"><span className="admin-monitor-live-dot" />LOCAL STREAM</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Latest recorded user events, with local date and time</p>
            </div>
            <span className="text-[10px] text-slate-500">Updated {formatDateTime(lastUpdated)}</span>
          </div>
          {activities.length > 0 ? (
            <div className="admin-monitor-timeline" aria-live="polite">
              <AnimatePresence initial={false}>
                {activities.slice(0, 6).map((entry, index) => (
                  <motion.article
                    key={entry.id}
                    layout
                    className="admin-monitor-event"
                    initial={{ opacity: 0, x: -14, y: 5 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.28, delay: index === 0 ? 0 : index * 0.035, ease: "easeOut" }}
                  >
                    <span className={`admin-monitor-event-node ${entry.type === "visit" ? "is-visit" : "is-action"}`} aria-hidden="true">
                      <span />
                    </span>
                    <div className="admin-monitor-event-card">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate text-xs font-semibold text-slate-100">{entry.userName}</span>
                            <span className={`admin-monitor-event-type ${entry.type === "visit" ? "is-visit" : "is-action"}`}>
                              {entry.type === "visit" ? "PAGE VISIT" : "USER ACTION"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-slate-300">{entry.actionLabel || entry.pageLabel}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{entry.userEmail} <span className="mx-1 text-slate-700">·</span> {entry.cityName}</p>
                        </div>
                        <time className="shrink-0 text-[10px] text-slate-500 sm:text-right" dateTime={new Date(entry.timestamp).toISOString()}>
                          {formatDateTime(entry.timestamp)}
                        </time>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="admin-monitor-empty px-5 py-10 text-center">
              <span className="admin-monitor-empty-icon mx-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-200/15 bg-emerald-200/[0.05] text-emerald-200/80">
                <Activity className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs text-slate-400">User activity will appear here as accounts explore the simulator.</p>
            </div>
          )}
        </section>

        <section className="mb-7 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]" aria-label="Activity analytics">
          <article className="min-w-0 rounded-lg border border-slate-700/70 bg-[#0b1713] p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activityPeriod === "daily" ? "Today's activity" : activityPeriod === "weekly" ? "Weekly activity" : "Monthly activity"}
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  {activityPeriod === "daily" ? "Visits and actions by hour" : activityPeriod === "weekly" ? "Visits and actions by day · last 7 days" : "Visits and actions by day · last 30 days"}
                </p>
              </div>
              <div className="inline-flex w-fit rounded-md border border-slate-700 bg-black/20 p-1" role="group" aria-label="Activity time period">
                {[{ id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }].map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setActivityPeriod(period.id)}
                    aria-pressed={activityPeriod === period.id}
                    className={`min-h-8 rounded px-2.5 text-[10px] font-semibold transition-colors ${activityPeriod === period.id ? "bg-[#70e2d0] text-[#10201b]" : "text-slate-400 hover:text-white"}`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-2 text-[10px] text-slate-500">Updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(lastUpdated)}</div>
            <div className="h-64 w-full" role="img" aria-label={`${activityPeriod} chart of user visits and actions`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitySeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    interval={activityPeriod === "monthly" ? 4 : activityPeriod === "daily" ? 2 : 0}
                    tick={{ fill: "#94a3b8", fontSize: activityPeriod === "monthly" ? 9 : 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis allowDecimals={false} width={36} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b1713", border: "1px solid rgba(112,226,208,0.24)", borderRadius: 8, color: "#e2e8f0" }}
                    labelStyle={{ color: "#f8fafc", fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                    formatter={(value, name) => [value, name === "visits" ? "Visits" : "Actions"]}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 11 }} />
                  <Bar dataKey="visits" name="Visits" stackId="activity" fill="#70e2d0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actions" name="Actions" stackId="activity" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-lg border border-slate-700/70 bg-[#0b1713] p-4 sm:p-5" aria-labelledby="most-active-users-title">
            <div className="mb-4">
              <h3 id="most-active-users-title" className="text-sm font-semibold text-white">Most active users</h3>
              <p className="mt-1 text-[11px] text-slate-400">Ranked by recorded visits and actions in this period</p>
            </div>
            {mostActiveUsers.length > 0 ? (
              <ol className="space-y-4">
                {mostActiveUsers.map((user, index) => (
                  <li key={user.email} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#70e2d0]/20 bg-[#70e2d0]/[0.06] font-mono text-[10px] font-bold text-[#70e2d0]">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-100">{user.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-300">{user.eventCount} events</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#70e2d0] to-sky-400" style={{ width: `${Math.max(6, (user.eventCount / mostActiveUsers[0].eventCount) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">{user.visits} visits · {user.actions} actions · {user.activeDays} active days · last {formatDateTime(user.lastActiveAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-700 px-4 text-center text-xs text-slate-500">
                No user activity recorded in this period.
              </div>
            )}
          </article>
        </section>

        <section className="mb-7 overflow-hidden rounded-lg border border-emerald-500/20 bg-[#0b1713]" aria-labelledby="admin-report-archive-title">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 p-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 id="admin-report-archive-title" className="text-sm font-semibold text-white">Report archive</h3>
                <p className="mt-1 text-xs text-slate-400">{predictionReports.length} user reports saved in this browser</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Admin only</span>
          </div>

          {reportArchiveError && (
            <p role="alert" className="mx-4 mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {reportArchiveError}
            </p>
          )}

          {predictionReports.length > 0 ? (
            <div className="space-y-2 p-3 sm:p-4">
              {predictionReports.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 rounded-md border border-slate-800 bg-white/[0.02] p-3">
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer list-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70e2d0]">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-100">
                            {entry.report.city?.name || entry.report.city} · {entry.archivedDocument ? "Urban Intelligence PDF" : `${entry.report.targetYear} forecast`}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-slate-400">{entry.user.name} · {entry.user.email}</p>
                        </div>
                        <p className="shrink-0 text-[10px] text-slate-500">{entry.exportFormat.toUpperCase()} · {formatDateTime(Date.parse(entry.exportedAt))}</p>
                      </div>
                    </summary>
                    {entry.archivedDocument ? (
                      <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-[10px] text-slate-400">
                        <p>Report ID: {entry.report.reportId}</p>
                        <p>Captured: {entry.report.timestamp ? formatDateTime(Date.parse(entry.report.timestamp)) : "Unknown time"}</p>
                        <p>Data coverage: {entry.report.completenessPercent == null ? "Unavailable" : `${entry.report.completenessPercent}%`}</p>
                        <p>PDF file: {entry.filename}</p>
                      </div>
                    ) : (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <p className="text-[10px] text-slate-400">
                        {entry.report.model} · Forecast valid through {entry.report.validityYear || "Unavailable"}
                        {entry.report.activeEvent ? ` · Scenario event: ${entry.report.activeEvent}` : ""}
                      </p>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-[10px]">
                          <thead className="text-slate-500">
                            <tr><th className="py-1.5 pr-3 font-semibold">Indicator</th><th className="py-1.5 pr-3 font-semibold">Baseline</th><th className="py-1.5 pr-3 font-semibold">Projection</th><th className="py-1.5 font-semibold">Change</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {(entry.report.metrics || []).map((metric) => (
                              <tr key={metric.label}><td className="py-1.5 pr-3 font-medium">{metric.label}</td><td className="py-1.5 pr-3">{metric.baseline} {metric.unit}</td><td className="py-1.5 pr-3 text-emerald-200">{metric.projected} {metric.unit}</td><td className="py-1.5">{metric.change > 0 ? "+" : ""}{metric.change} {metric.unit}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <h4 className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200">Future actions</h4>
                      <div className="mt-1 space-y-2">
                        {(entry.report.solutions || []).map((solution) => (
                          <div key={solution.title} className="border-l border-emerald-400/30 pl-2.5">
                            <p className="text-[10px] font-semibold text-slate-200">{solution.title}</p>
                            <p className="text-[10px] text-slate-400">{solution.signal}</p>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-300">{solution.action}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-500">{entry.report.disclaimer}</p>
                    </div>
                    )}
                  </details>
                  <button
                    type="button"
                    onClick={() => downloadArchivedReport(entry)}
                    title="Download archived report copy"
                    aria-label={`Download ${entry.user.name}'s ${entry.report.city?.name || entry.report.city} report copy`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-slate-500">User prediction exports will appear here with their account details.</p>
          )}
        </section>

        <section className="mb-7 overflow-hidden rounded-lg border border-slate-700/70 bg-[#0b1713]" aria-labelledby="admin-users-title">
          <div className="flex flex-col gap-3 border-b border-slate-700/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h3 id="admin-users-title" className="text-sm font-semibold text-white">Users</h3>
              <p className="mt-1 text-xs text-slate-400">Select a name to view that user’s complete recorded activity.</p>
            </div>
            <button
              type="button"
              onClick={handleShowAllUsers}
              aria-pressed={showAllActivity}
              className={`min-h-9 self-start rounded-md border px-3 text-xs font-semibold transition-colors sm:self-auto ${showAllActivity ? "border-[#70e2d0]/35 bg-[#70e2d0]/10 text-[#9af0e1]" : "border-slate-600 text-slate-300 hover:bg-white/[0.04]"}`}
            >
              All users
            </button>
          </div>
          {users.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4 sm:p-4">
              {users.map((user) => {
                const userActivityCount = activities.filter((entry) => entry.userEmail === user.email).length;
                const userLoginCount = Number(user.loginCount) || 0;
                const isSelected = selectedUserEmail === user.email;
                const userReports = predictionReports.filter((entry) => entry.user?.email === user.email);
                return (
                  <div
                    key={user.id || user.email}
                    className={`min-w-0 rounded-md border p-3 transition-colors ${isSelected ? "border-[#70e2d0]/50 bg-[#70e2d0]/[0.08]" : "border-slate-700/80 bg-white/[0.02] hover:border-slate-500 hover:bg-white/[0.04]"}`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user.email)}
                        aria-expanded={isSelected}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70e2d0]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#70e2d0]/25 bg-[#70e2d0]/10 font-mono text-[10px] font-bold text-[#70e2d0]">
                          {user.avatar || user.name?.slice(0, 2).toUpperCase() || "U"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-100">{user.name || user.email}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{user.email}</span>
                        </span>
                        {isSelected ? <ChevronUp className="h-4 w-4 shrink-0 text-[#70e2d0]" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        aria-label={`Delete ${user.name || user.email}`}
                        title={`Delete ${user.name || user.email}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {isSelected && (
                      <>
                        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-[10px]">
                          <div><dt className="text-slate-500">Logins</dt><dd className="mt-0.5 font-semibold text-slate-200">{userLoginCount}</dd></div>
                          <div><dt className="text-slate-500">Recorded events</dt><dd className="mt-0.5 font-semibold text-slate-200">{userActivityCount}</dd></div>
                          <div className="col-span-2"><dt className="text-slate-500">Last sign-in</dt><dd className="mt-0.5 text-slate-300">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never signed in"}</dd></div>
                          <div className="col-span-2"><dt className="text-slate-500">Account created</dt><dd className="mt-0.5 text-slate-300">{user.createdAt ? formatDateTime(user.createdAt) : "Unknown"}</dd></div>
                        </dl>

                        <div className="mt-3 border-t border-slate-800 pt-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Saved reports</p>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-100">
                              {userReports.length}
                            </span>
                          </div>

                          {userReports.length > 0 ? (
                            <div className="space-y-2">
                              {userReports.slice(0, 2).map((entry) => (
                                <div key={entry.id} className="rounded-md border border-slate-700 bg-slate-950/40 p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-[10px] font-semibold text-slate-100">
                                        {entry.report.city?.name || entry.report.city} · {entry.archivedDocument
                                          ? formatDateTime(Date.parse(entry.exportedAt))
                                          : entry.report.targetTime
                                            ? formatDateTime(Date.parse(entry.report.targetTime))
                                            : entry.report.targetYear}
                                      </p>
                                      <p className="mt-0.5 text-[9px] text-slate-400">{entry.exportFormat.toUpperCase()} · {formatDateTime(Date.parse(entry.exportedAt))}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => downloadArchivedReport(entry)}
                                      title="Download archived report copy"
                                      aria-label={`Download ${entry.user.name}'s ${entry.report.city?.name || entry.report.city} report copy`}
                                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-emerald-400/10 hover:text-emerald-200"
                                    >
                                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                  </div>
                                  <p className="mt-2 text-[9px] leading-relaxed text-slate-300">
                                    {entry.archivedDocument
                                      ? `Urban Intelligence PDF · ${entry.report.reportId}`
                                      : entry.report.executiveSummary || "Strategic city scenario report stored for this user."}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] leading-relaxed text-slate-500">No saved reports for this user yet.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-slate-500">No registered user accounts in this browser.</p>
          )}
          {deleteError && <p className="px-4 pb-4 text-xs text-rose-300" role="alert">{deleteError}</p>}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-700/70 bg-[#0b1713]">
          <div className="flex flex-col gap-4 border-b border-slate-700/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h3 className="text-sm font-semibold text-white">{selectedUser ? `${selectedUser.name || selectedUser.email} activity` : showAllActivity ? "All activity details" : "Activity details"}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {filteredActivities.length} {filteredActivities.length === 1 ? "event" : "events"} shown
                {selectedUser ? ` · ${Number(selectedUser.loginCount) || 0} total logins` : ` · ${users.length} user accounts`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {selectedUser && (
                <button type="button" onClick={() => setSelectedUserEmail("")} className="min-h-10 rounded-md px-2 text-xs font-semibold text-[#70e2d0] hover:bg-[#70e2d0]/[0.06]">
                  Show all users
                </button>
              )}
              <label className="flex min-h-10 w-full items-center gap-2 rounded-md border border-slate-700 bg-black/20 px-3 text-slate-400 focus-within:border-[#70e2d0]/70 sm:max-w-xs">
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Filter user, action, or city"
                  aria-label="Filter activity by user, action, or city"
                  className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                />
              </label>
            </div>
          </div>

          {filteredActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Activity</th>
                    <th className="px-5 py-3 font-semibold">City</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredActivities.map((entry) => (
                    <tr key={entry.id} className="text-slate-300 transition-colors hover:bg-white/[0.025]">
                      <td className="px-5 py-3.5">
                        <span className="block font-semibold text-slate-100">{entry.userName}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{entry.userEmail}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-slate-200">{entry.actionLabel || entry.pageLabel}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{entry.type === "visit" ? "Page visit" : "User action"} · {entry.pageLabel}</span>
                      </td>
                      <td className="px-5 py-3.5">{entry.cityName}</td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDateTime(entry.timestamp)}</td>
                      <td className="px-5 py-3.5 text-slate-600"><ArrowRight className="h-4 w-4" aria-hidden="true" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[#70e2d0]/20 bg-[#70e2d0]/10 text-[#70e2d0]">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">
                {!selectedUser && !showAllActivity
                  ? "Select a user to view their activity"
                  : activities.length > 0 ? "No matching activity" : "No user activity recorded yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                {!selectedUser && !showAllActivity
                  ? "User activity details stay hidden until you select a name above. Choose All users to review the combined timeline."
                  : activities.length > 0
                  ? "Try a different search term to find a user, page, or city."
                  : "User visits will appear here as registered accounts explore the simulator in this browser."}
              </p>
            </div>
          )}
        </section>

        <p className="mt-4 max-w-4xl text-[11px] leading-relaxed text-slate-500">
          Activity is stored in this browser only. It is not shared across devices or browsers; site-wide monitoring requires a shared analytics backend.
        </p>
      </div>

      {messagesOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMessagesOpen(false);
          }}
        >
          <div className="w-full max-w-7xl" role="dialog" aria-modal="true" aria-label="Admin messages">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMessagesOpen(false)}
                aria-label="Close messages"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-600 bg-[#0b1713] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-rose-400/60 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70e2d0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Close
              </button>
            </div>
            <MessagesCenter />
          </div>
        </div>
      )}
    </main>
    </MotionConfig>
  );
}
