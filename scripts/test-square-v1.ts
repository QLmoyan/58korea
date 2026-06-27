import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SQUARE_BANNERS } from "../lib/square/banners";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchSquarePage(baseUrl: string) {
  const response = await fetch(`${baseUrl}/square`, {
    signal: AbortSignal.timeout(8000),
  });
  const html = await response.text();
  return { response, html };
}

async function main() {
  loadEnv();
  const baseUrl = process.env.REGRESSION_BASE_URL ?? "http://localhost:3000";

  console.log("1) /square uses channel modules");
  const { response, html } = await fetchSquarePage(baseUrl);
  assert(response.ok, `/square status=${response.status}`);
  assert(!html.includes("广场功能开发中"), "square page still shows placeholder");
  assert(!html.includes("暂无动态，去发布第一条吧"), "square should not show post feed");
  assert(html.includes("韩国新闻") || html.includes("官方公告"), "square should show channels");
  assert(html.includes("进入频道"), "square should link to channel pages");
  console.log("   PASS");

  console.log("2) banner mock data exists");
  assert(SQUARE_BANNERS.length > 0, "banner mock data should not be empty");
  console.log("   PASS");

  console.log("\nAll square V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
