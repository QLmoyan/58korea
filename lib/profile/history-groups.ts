export type HistoryTimeGroupId = "today" | "yesterday" | "thisWeek" | "earlier";

export const HISTORY_GROUP_ORDER: HistoryTimeGroupId[] = [
  "today",
  "yesterday",
  "thisWeek",
  "earlier",
];

export const HISTORY_GROUP_LABELS: Record<HistoryTimeGroupId, string> = {
  today: "今天",
  yesterday: "昨天",
  thisWeek: "本周",
  earlier: "更早",
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function toSeoulDateKey(date: string | Date): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function getSeoulWeekStartKey(reference: Date): string {
  const todayKey = toSeoulDateKey(reference);
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(reference);
  const dayOfWeek = WEEKDAY_MAP[weekdayShort] ?? 0;
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const [year, month, day] = todayKey.split("-").map(Number);
  const mondayUtc = Date.UTC(year, month - 1, day - daysFromMonday, 12);
  return toSeoulDateKey(new Date(mondayUtc));
}

export function classifyHistoryGroup(
  viewedAt: string,
  now = new Date(),
): HistoryTimeGroupId {
  const viewedKey = toSeoulDateKey(viewedAt);
  const todayKey = toSeoulDateKey(now);

  if (viewedKey === todayKey) {
    return "today";
  }

  const yesterdayKey = toSeoulDateKey(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );
  if (viewedKey === yesterdayKey) {
    return "yesterday";
  }

  const weekStartKey = getSeoulWeekStartKey(now);
  if (viewedKey >= weekStartKey && viewedKey < yesterdayKey) {
    return "thisWeek";
  }

  return "earlier";
}

export interface HistoryGroup<T> {
  id: HistoryTimeGroupId;
  label: string;
  items: T[];
}

export function groupHistoryEntries<T extends { viewedAt: string }>(
  entries: T[],
  now = new Date(),
): HistoryGroup<T>[] {
  const buckets = new Map<HistoryTimeGroupId, T[]>(
    HISTORY_GROUP_ORDER.map((id) => [id, []]),
  );

  for (const entry of entries) {
    const groupId = classifyHistoryGroup(entry.viewedAt, now);
    buckets.get(groupId)?.push(entry);
  }

  return HISTORY_GROUP_ORDER.filter(
    (id) => (buckets.get(id)?.length ?? 0) > 0,
  ).map((id) => ({
    id,
    label: HISTORY_GROUP_LABELS[id],
    items: buckets.get(id) ?? [],
  }));
}
