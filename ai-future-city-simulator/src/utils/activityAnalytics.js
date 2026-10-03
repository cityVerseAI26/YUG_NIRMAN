const getLocalDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const getPeriodStart = (period, now) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") start.setDate(start.getDate() - 6);
  if (period === "monthly") start.setDate(start.getDate() - 29);
  return start;
};

export const getActivitySeries = (activities, period = "daily", now = new Date()) => {
  if (period === "daily") {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      key: hour,
      label: new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: true })
        .format(new Date(2000, 0, 1, hour)),
      visits: 0,
      actions: 0,
    }));
    const todayKey = getLocalDateKey(now);

    activities.forEach((activity) => {
      const date = new Date(activity.timestamp);
      if (Number.isNaN(date.getTime()) || getLocalDateKey(date) !== todayKey || date > now) return;
      const hour = hours[date.getHours()];
      if (activity.type === "visit") hour.visits += 1;
      else hour.actions += 1;
    });

    return hours;
  }

  const dayCount = period === "monthly" ? 30 : 7;
  const start = getPeriodStart(period, now);
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      key: getLocalDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
      visits: 0,
      actions: 0,
    };
  });
  const daysByKey = new Map(days.map((day) => [day.key, day]));

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    if (Number.isNaN(date.getTime()) || date < start || date > now) return;
    const day = daysByKey.get(getLocalDateKey(date));
    if (!day) return;
    if (activity.type === "visit") day.visits += 1;
    else day.actions += 1;
  });

  return days;
};

export const getTopActiveUsers = (activities, users, period = "daily", now = new Date(), limit = 5) => {
  const start = getPeriodStart(period, now);
  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const activityByEmail = new Map();

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const email = String(activity.userEmail || "").trim().toLowerCase();
    if (!email || Number.isNaN(date.getTime()) || date < start || date > now) return;

    const user = userByEmail.get(email);
    const entry = activityByEmail.get(email) || {
      email,
      name: user?.name || activity.userName || email,
      eventCount: 0,
      visits: 0,
      actions: 0,
      activeDays: new Set(),
      lastActiveAt: 0,
    };
    entry.eventCount += 1;
    if (activity.type === "visit") entry.visits += 1;
    else entry.actions += 1;
    entry.activeDays.add(getLocalDateKey(date));
    entry.lastActiveAt = Math.max(entry.lastActiveAt, date.getTime());
    activityByEmail.set(email, entry);
  });

  return [...activityByEmail.values()]
    .map(({ activeDays, ...user }) => ({ ...user, activeDays: activeDays.size }))
    .sort((left, right) => right.eventCount - left.eventCount || right.lastActiveAt - left.lastActiveAt)
    .slice(0, limit);
};
