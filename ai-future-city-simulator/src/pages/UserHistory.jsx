import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Clock3, History, MapPin, Search, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/common/PageHeader";
import {
  clearUserHistory,
  getUserHistory,
  getUserHistoryKey,
  USER_HISTORY_EVENT,
} from "../utils/userHistory";

const formatVisitTime = (timestamp) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(timestamp));

export default function UserHistory() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState(() => getUserHistory(currentUser));
  const [searchText, setSearchText] = useState("");
  const historyKey = getUserHistoryKey(currentUser);

  useEffect(() => {
    const refreshHistory = (event) => {
      if (!event.detail?.key || event.detail.key === historyKey) {
        setEntries(getUserHistory(currentUser));
      }
    };
    const refreshFromStorage = (event) => {
      if (event.key === historyKey || event.key === null) {
        setEntries(getUserHistory(currentUser));
      }
    };

    window.addEventListener(USER_HISTORY_EVENT, refreshHistory);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener(USER_HISTORY_EVENT, refreshHistory);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, [currentUser, historyKey]);

  const filteredEntries = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      `${entry.pageLabel} ${entry.cityName}`.toLowerCase().includes(query)
    );
  }, [entries, searchText]);

  const handleClearHistory = () => {
    clearUserHistory(currentUser);
    setEntries([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MY HISTORY"
        subtitle="Review the city tools and locations you have visited"
        icon={History}
        badge="Private to this account"
        actions={entries.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:border-rose-400/60 hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Clear history
          </button>
        )}
      />

      <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/60">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Recent activity</h2>
            <p className="mt-1 text-xs text-slate-400">
              Your latest {entries.length} visited {entries.length === 1 ? "page" : "pages"}, saved in this browser.
            </p>
          </div>
          {entries.length > 0 && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-400 focus-within:border-cyan-500/50">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Filter pages or cities"
                aria-label="Filter history by page or city"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500 sm:w-52"
              />
            </label>
          )}
        </div>

        {filteredEntries.length > 0 ? (
          <ol className="divide-y divide-slate-800/80">
            {filteredEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => navigate(entry.path)}
                  className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-cyan-500/[0.04] sm:gap-4 sm:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100 group-hover:text-cyan-200">
                      {entry.pageLabel}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-cyan-400" />{entry.cityName}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatVisitTime(entry.timestamp)}</span>
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-cyan-300" />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
              <History className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-bold text-white">
              {entries.length ? "No matching history" : "Your history will appear here"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
              {entries.length
                ? "Try another page name or city, or clear the filter to see your activity."
                : "As you explore simulator pages, your recent visits will be saved privately in this browser for your account."}
            </p>
          </div>
        )}
      </section>
      <p className="text-[11px] text-slate-500">
        History is stored only in this browser and is not synced to other devices.
      </p>
    </div>
  );
}
