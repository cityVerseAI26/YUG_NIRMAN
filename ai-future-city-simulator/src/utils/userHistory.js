const HISTORY_LIMIT = 500;
const HISTORY_EVENT = "city-user-history-updated";
const USER_ACCOUNTS_EVENT = "city-user-accounts-updated";
const REGISTERED_USERS_KEY = "city_registered_users";
const PAGE_LABELS = {
  "/login": "Sign in",
  "/register": "Account registration",
  "/select-city": "City selection",
  "/dashboard": "Dashboard",
  "/digital-twin": "City Digital Twin",
  "/future-predictions": "Future Predictions",
  "/what-if-simulator": "What-If Simulator",
  "/scenario-comparison": "Scenario Comparison",
  "/transportation": "Transportation",
  "/environment": "Environment",
  "/climate-risks": "Climate & Risks",
  "/ai-recommendations": "AI Recommendations",
  "/sustainability": "Sustainability",
  "/city-3d": "3D City",
  "/settings": "Settings",
  "/messages": "Messages & Chat",
  "/admin-chat": "Admin Messages",
};

const getHistoryKey = (user) => {
  const email = user?.email?.trim().toLowerCase();
  return email ? `city-user-history:${encodeURIComponent(email)}` : "";
};

const readHistory = (key) => {
  if (!key) return [];
  try {
    const entries = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
};

const notifyHistoryChanged = (key) => {
  if (key && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT, { detail: { key } }));
  }
};

export const getUserHistoryKey = getHistoryKey;
export const getUserHistory = (user) => readHistory(getHistoryKey(user));

const getPageLabel = (pathname) => PAGE_LABELS[pathname] || pathname.slice(1).replaceAll("-", " ") || "Home";

const appendHistoryEntry = (user, pathname, city, type, actionLabel) => {
  const key = getHistoryKey(user);
  if (!key || !pathname || pathname === "/history" || pathname === "/admin-dashboard") return;

  const entries = readHistory(key);
  const lastEntry = entries[0];
  const now = Date.now();
  if (type === "visit" && lastEntry?.path === pathname && lastEntry?.type === "visit" && lastEntry?.cityId === city?.id && now - lastEntry.timestamp < 1000) return;

  const nextEntry = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    path: pathname,
    pageLabel: getPageLabel(pathname),
    cityId: city?.id || "",
    cityName: city?.name || "Unknown city",
    type,
    actionLabel: String(actionLabel || "").replace(/\s+/g, " ").trim().slice(0, 120),
  };

  try {
    window.localStorage.setItem(key, JSON.stringify([nextEntry, ...entries].slice(0, HISTORY_LIMIT)));
    notifyHistoryChanged(key);
  } catch {
    // History remains unavailable when browser storage is disabled or full.
  }
};

export const recordUserHistory = (user, pathname, city) => {
  appendHistoryEntry(user, pathname, city, "visit", `Viewed ${getPageLabel(pathname)}`);
};

export const recordUserAction = (user, pathname, city, actionLabel) => {
  if (!actionLabel) return;
  appendHistoryEntry(user, pathname, city, "action", actionLabel);
};

export const clearUserHistory = (user) => {
  const key = getHistoryKey(user);
  if (!key) return false;
  try {
    window.localStorage.removeItem(key);
    notifyHistoryChanged(key);
    return true;
  } catch {
    return false;
  }
};

export const USER_HISTORY_EVENT = HISTORY_EVENT;
export const USER_ACCOUNTS_UPDATED_EVENT = USER_ACCOUNTS_EVENT;

export const notifyUserAccountsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_ACCOUNTS_EVENT));
  }
};

export const getLocalRegisteredUsers = () => {
  try {
    const users = JSON.parse(window.localStorage.getItem(REGISTERED_USERS_KEY) || "[]");
    if (!Array.isArray(users)) return [];
    return users
      .filter((user) => user?.authType === "user" && user.email)
      .map(({ id, name, email, role, avatar, loginCount, lastLoginAt, createdAt }) => ({
        id,
        name,
        email,
        role,
        avatar,
        loginCount: Number(loginCount) || 0,
        lastLoginAt: Number(lastLoginAt) || null,
        createdAt: Number(createdAt) || null,
      }));
  } catch {
    return [];
  }
};

export const getAllUserHistory = () => getLocalRegisteredUsers()
  .flatMap((user) => getUserHistory(user).map((entry) => ({
    ...entry,
    userName: user.name || user.email,
    userEmail: user.email,
  })))
  .sort((left, right) => right.timestamp - left.timestamp);
