const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getProfileAtHour = (profile, hour) => {
  const points = profile?.today || [];
  if (points.length === 0) return { congestion: 60, speed: 32, vehicles: 30000 };

  const targetHour = ((hour % 24) + 24) % 24;
  const before = points.reduce((closest, point) => (
    Number(point.time.slice(0, 2)) <= targetHour ? point : closest
  ), points[0]);
  const after = points.find((point) => Number(point.time.slice(0, 2)) > targetHour);
  if (!after) return before;

  const startHour = Number(before.time.slice(0, 2));
  const endHour = Number(after.time.slice(0, 2));
  const ratio = (targetHour - startHour) / (endHour - startHour);
  return {
    congestion: before.congestion + (after.congestion - before.congestion) * ratio,
    speed: before.speed + (after.speed - before.speed) * ratio,
    vehicles: before.vehicles + (after.vehicles - before.vehicles) * ratio,
  };
};

const getStableVariation = (cityId, bucket) => {
  const seed = Array.from(`${cityId}:${bucket}`).reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0,
    7,
  );
  return ((seed % 7) - 3) * 1.5;
};

export const buildTrafficSimulation = (city, profile, now = Date.now()) => {
  const bucketMs = 15 * 1000;
  const currentBucket = Math.floor(now / bucketMs);
  const points = Array.from({ length: 12 }, (_, index) => {
    const bucket = currentBucket - (11 - index);
    const timestamp = bucket * bucketMs;
    const point = getProfileAtHour(profile, new Date(timestamp).getHours());
    const congestion = Math.round(clamp(
      point.congestion + getStableVariation(city.id, bucket),
      0,
      100,
    ));
    const speed = Math.max(5, Math.round(point.speed * (1 - congestion / 250)));

    return {
      time: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      congestion,
      speed,
      vehicles: Math.max(0, Math.round(point.vehicles * (congestion / Math.max(point.congestion, 1)))),
    };
  });

  return {
    points,
    current: points[points.length - 1],
    updatedAt: now,
    source: "Generated local simulation from bundled illustrative traffic profile",
  };
};
