import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

async function main() {
  loadEnv();
  const baseUrl = process.env.REGRESSION_BASE_URL ?? "http://localhost:3000";

  console.log("1) /square uses channel modules");
  const response = await fetch(`${baseUrl}/square`, {
    headers: { Accept: "text/html" },
  });
  const html = await response.text();
  assert(response.ok, `/square status=${response.status}`);
  assert(!html.includes("广场功能开发中"), "square page still shows placeholder");
  assert(!html.includes("暂无动态，去发布第一条吧"), "square should not show post feed");
  assert(html.includes("韩国新闻") || html.includes("官方公告"), "square should show channels");
  assert(html.includes("进入频道"), "square should link to channel pages");

  console.log("2) square banners are database-backed");
  assert(
    !html.includes("picsum.photos/seed/square-banner"),
    "square page must not use hardcoded picsum banners",
  );

  console.log("\nAll square V1 tests passed.");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
