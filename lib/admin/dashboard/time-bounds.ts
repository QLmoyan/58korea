const SEOUL = "Asia/Seoul";

function seoulDateKey(reference: Date): string {
  return reference.toLocaleDateString("en-CA", { timeZone: SEOUL });
}

/** Start of calendar day in Asia/Seoul (UTC+9, no DST). */
export function startOfSeoulDayIso(reference = new Date()): string {
  const dateKey = seoulDateKey(reference);
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString();
}

/** Inclusive rolling window ending today in Seoul, e.g. 7 → last 7 calendar days. */
export function daysAgoSeoulStartIso(days: number, reference = new Date()): string {
  const startTodayMs = new Date(startOfSeoulDayIso(reference)).getTime();
  const startMs = startTodayMs - (days - 1) * 24 * 60 * 60 * 1000;
  return new Date(startMs).toISOString();
}

export const DASHBOARD_TIMEZONE = SEOUL;
