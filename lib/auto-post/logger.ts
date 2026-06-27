import type { AutoPostLogEntry } from "./types";

export function logAutoPostEntry(entry: AutoPostLogEntry): void {
  const payload = {
    title: entry.title,
    imageKeyword: entry.imageKeyword,
    imageSource: entry.imageSource,
    status: entry.status,
    seedId: entry.seedId,
    imageCount: entry.imageCount ?? 0,
    reason: entry.reason ?? null,
  };

  console.log(JSON.stringify(payload));
}

export function logAutoPostSummary(entries: AutoPostLogEntry[]): void {
  const published = entries.filter((entry) => entry.status === "published").length;
  const skipped = entries.filter((entry) => entry.status === "skipped").length;
  const exists = entries.filter((entry) => entry.status === "exists").length;
  const dryRun = entries.filter((entry) => entry.status === "dry-run").length;

  console.log(
    JSON.stringify({
      summary: true,
      total: entries.length,
      published,
      skipped,
      exists,
      dryRun,
    }),
  );
}
