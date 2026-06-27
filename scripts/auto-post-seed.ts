/**
 * Auto-post seed script with image/title/content consistency checks.
 * Run: npx tsx scripts/auto-post-seed.ts [--dry-run] [--force] [--limit=N]
 *
 * Does NOT push to production — local/staging Supabase only.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logAutoPostSummary } from "../lib/auto-post/logger";
import { runAutoPostSeed } from "../lib/auto-post/runner";
import { AUTO_POST_TEMPLATES } from "../lib/auto-post/templates";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  return {
    dryRun,
    skipExisting: !force,
    limit: Number.isFinite(limit) && (limit as number) > 0 ? (limit as number) : undefined,
  };
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  console.log(
    JSON.stringify({
      event: "auto-post-seed-start",
      dryRun: args.dryRun,
      skipExisting: args.skipExisting,
      limit: args.limit ?? AUTO_POST_TEMPLATES.length,
      templateCount: AUTO_POST_TEMPLATES.length,
    }),
  );

  const entries = await runAutoPostSeed({
    dryRun: args.dryRun,
    skipExisting: args.skipExisting,
    limit: args.limit,
  });

  logAutoPostSummary(entries);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
