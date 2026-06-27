import { loadImageApiConfig, resolveAutoPostImages } from "./fetch-images";
import { logAutoPostEntry } from "./logger";
import { findExistingSeedPost, publishAutoPost } from "./publish";
import { AUTO_POST_SEED_MARKER, AUTO_POST_TEMPLATES } from "./templates";
import type { AutoPostLogEntry } from "./types";
import { validateAutoPostConsistency } from "./validate-consistency";

export interface RunAutoPostSeedOptions {
  dryRun?: boolean;
  skipExisting?: boolean;
  limit?: number;
}

export async function runAutoPostSeed(
  options: RunAutoPostSeedOptions = {},
): Promise<AutoPostLogEntry[]> {
  const dryRun = options.dryRun ?? false;
  const skipExisting = options.skipExisting ?? true;
  const imageConfig = loadImageApiConfig();
  const templates = options.limit
    ? AUTO_POST_TEMPLATES.slice(0, options.limit)
    : AUTO_POST_TEMPLATES;

  const entries: AutoPostLogEntry[] = [];

  for (const template of templates) {
    const baseEntry: AutoPostLogEntry = {
      seedId: template.seedId,
      title: template.title,
      imageKeyword: null,
      imageSource: "none",
      status: "skipped",
    };

    if (skipExisting) {
      const existingId = await findExistingSeedPost(template, AUTO_POST_SEED_MARKER);
      if (existingId) {
        entries.push({
          ...baseEntry,
          status: "exists",
          reason: `already seeded post id=${existingId}`,
        });
        logAutoPostEntry(entries[entries.length - 1]);
        continue;
      }
    }

    const resolvedImages = await resolveAutoPostImages(template, imageConfig);
    const imageKeyword = resolvedImages?.primaryKeyword ?? null;
    const imageSource = resolvedImages?.primarySource ?? "none";

    if ((template.requireImages ?? template.imageFirst) && !resolvedImages?.images.length) {
      entries.push({
        ...baseEntry,
        status: "skipped",
        reason: "先找图失败：没有可用配图",
      });
      logAutoPostEntry(entries[entries.length - 1]);
      continue;
    }

    const consistency = validateAutoPostConsistency(template, imageKeyword);
    if (!consistency.ok) {
      entries.push({
        ...baseEntry,
        imageKeyword,
        imageSource: imageKeyword ? imageSource : "skipped",
        status: "skipped",
        reason: consistency.reason,
      });
      logAutoPostEntry(entries[entries.length - 1]);
      continue;
    }

    const images = resolvedImages?.images ?? [];

    if (dryRun) {
      entries.push({
        seedId: template.seedId,
        title: template.title,
        imageKeyword,
        imageSource: imageKeyword ? imageSource : "none",
        status: "dry-run",
        imageCount: images.length,
      });
      logAutoPostEntry(entries[entries.length - 1]);
      continue;
    }

    try {
      const result = await publishAutoPost(template, images, AUTO_POST_SEED_MARKER);
      entries.push({
        seedId: template.seedId,
        title: template.title,
        imageKeyword,
        imageSource: imageKeyword ? imageSource : "none",
        status: "published",
        imageCount: result.imageCount,
        reason: `post id=${result.postId}`,
      });
      logAutoPostEntry(entries[entries.length - 1]);
    } catch (error) {
      entries.push({
        ...baseEntry,
        imageKeyword,
        imageSource: imageKeyword ? imageSource : "none",
        status: "skipped",
        reason: error instanceof Error ? error.message : String(error),
      });
      logAutoPostEntry(entries[entries.length - 1]);
    }
  }

  return entries;
}
