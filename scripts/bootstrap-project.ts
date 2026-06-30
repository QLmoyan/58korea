/**
 * Project bootstrap V1 — one command to migrate, build, and regression-check.
 * Run: npx tsx scripts/bootstrap-project.ts
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import {
  checkRequiredEnvVars,
  loadEnvFromFile,
  resolveWorkingDatabaseUrl,
  testSupabaseApi,
} from "./lib/bootstrap-env";

const REGRESSION_BASE_URL =
  process.env.REGRESSION_BASE_URL ?? "http://localhost:3000";
const DEV_SERVER_READY_TIMEOUT_MS = 120_000;
const DEV_SERVER_POLL_MS = 2_000;

/** Idempotent apply scripts in dependency order (RLS → features → coupons → extras). */
const APPLY_SCRIPTS: string[] = [
  "scripts/apply-profiles-rls.ts",
  "scripts/apply-posts-rls.ts",
  "scripts/apply-comments-rls.ts",
  "scripts/apply-admin-users-v1.ts",
  "scripts/apply-content-safety-v1.2-rules.ts",
  "scripts/apply-post-engagement-v1.ts",
  "scripts/apply-post-views-v1.ts",
  "scripts/apply-notifications-v1.ts",
  "scripts/apply-user-home-v1.ts",
  "scripts/apply-profile-edit-v1.ts",
  "scripts/apply-search-users-merchants-v1.ts",
  "scripts/apply-channel-articles-v1.ts",
  "scripts/apply-square-banners-v1.ts",
  "scripts/apply-merchant-profiles-v1.ts",
  "scripts/apply-merchant-applications-v1.ts",
  "scripts/apply-merchant-coupons-v1.ts",
  "scripts/apply-post-linked-coupon-v1.ts",
  "scripts/apply-coupon-redemption-v1.ts",
  "scripts/apply-coupon-lifecycle-v1.ts",
  "scripts/apply-coupon-bugfix-v1.ts",
  "scripts/apply-comment-images-v1.ts",
  "scripts/apply-ai-category-v1.ts",
];

const MANUAL_STEPS = [
  "新建 Supabase 项目：在 Dashboard 创建项目并记录 URL、anon key、service_role key、数据库密码。",
  "配置 `.env.local`：从 `.env.local.example` 复制并填写所有密钥（bootstrap 不会替你创建 Supabase 项目）。",
  "首次建站账号：若尚无 admin 用户，运行 `npx tsx scripts/create-admin-user.ts`（regression 依赖已存在的管理员）。",
  "生产部署：配置 DNS、HTTPS、进程守护（如 pm2 / systemd）并运行 `npm run build && npm run start`。",
  "定时任务：配置 cron 定期运行 `npx tsx scripts/process-expiring-coupons.ts`（优惠券到期提醒）。",
  "类型同步：Schema 变更后手动更新 `lib/supabase/database.types.ts`（仓库暂无 supabase gen types 脚本）。",
  "可选：配置 PEXELS_API_KEY / UNSPLASH_ACCESS_KEY / PIXABAY_API_KEY 用于 `scripts/auto-post-seed.ts`。",
];

function logStep(title: string) {
  console.log(`\n=== ${title} ===`);
}

function fail(step: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[Bootstrap FAILED] ${step}`);
  console.error(message);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}

let workingDatabaseUrl: string | null = null;

async function runTsxScript(scriptPath: string): Promise<void> {
  const absolutePath = resolve(process.cwd(), scriptPath);
  console.log(`  → ${scriptPath}`);

  const childEnv = { ...process.env };
  if (workingDatabaseUrl) {
    childEnv.SUPABASE_DB_URL = workingDatabaseUrl;
  }

  const result = spawnSync("npx", ["tsx", absolutePath], {
    cwd: process.cwd(),
    shell: true,
    encoding: "utf8",
    env: childEnv,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(
      `${scriptPath} exited with code ${result.status ?? "unknown"}`,
    );
  }
}

async function runNpmScript(scriptName: string): Promise<void> {
  console.log(`  → npm run ${scriptName}`);

  const result = spawnSync("npm", ["run", scriptName], {
    cwd: process.cwd(),
    shell: true,
    encoding: "utf8",
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(
      `npm run ${scriptName} exited with code ${result.status ?? "unknown"}`,
    );
  }
}

async function isHttpReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForHttpReady(
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHttpReady(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, DEV_SERVER_POLL_MS));
  }
  return false;
}

async function ensureDevServer(): Promise<{
  startedByBootstrap: boolean;
  child: ChildProcess | null;
}> {
  if (await isHttpReady(REGRESSION_BASE_URL)) {
    console.log(`  Dev server already reachable at ${REGRESSION_BASE_URL}`);
    return { startedByBootstrap: false, child: null };
  }

  console.log(
    `  Starting dev server for regression-check (${REGRESSION_BASE_URL})...`,
  );

  const child = spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
    env: process.env,
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  const ready = await waitForHttpReady(
    REGRESSION_BASE_URL,
    DEV_SERVER_READY_TIMEOUT_MS,
  );

  if (!ready) {
    child.kill();
    throw new Error(
      `Dev server did not become ready within ${DEV_SERVER_READY_TIMEOUT_MS / 1000}s at ${REGRESSION_BASE_URL}`,
    );
  }

  console.log(`  Dev server ready at ${REGRESSION_BASE_URL}`);
  return { startedByBootstrap: true, child };
}

function stopDevServer(child: ChildProcess | null) {
  if (!child || child.killed) return;
  child.kill();
}

function printManualSteps(warnings: string[]) {
  logStep("Remaining manual steps (cannot be fully automated)");
  for (const step of MANUAL_STEPS) {
    console.log(`  • ${step}`);
  }
  if (warnings.length > 0) {
    console.log("\n  Env warnings:");
    for (const warning of warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }
  console.log("\n  Cursor / bootstrap automates:");
  console.log("  • All idempotent scripts/apply-*.ts migrations");
  console.log("  • npm run build");
  console.log("  • npm run regression-check (starts dev server if needed)");
  console.log("  • On request: npx tsx scripts/create-admin-user.ts");
}

async function main() {
  console.log("韩圈 project bootstrap V1");
  console.log(`Working directory: ${process.cwd()}`);

  logStep("1. Load and validate environment");
  let env: ReturnType<typeof loadEnvFromFile>;
  try {
    env = loadEnvFromFile();
  } catch (error) {
    fail("Load .env.local", error);
  }

  const envCheck = checkRequiredEnvVars(env);
  if (!envCheck.ok) {
    fail(
      "Required environment variables",
      `Missing or empty:\n  - ${envCheck.missing.join("\n  - ")}`,
    );
  }
  console.log("  Required env vars: OK");
  if (envCheck.warnings.length > 0) {
    for (const warning of envCheck.warnings) {
      console.log(`  Warning: ${warning}`);
    }
  }

  logStep("2. Test Supabase connectivity");
  try {
    await testSupabaseApi(env);
    console.log("  Supabase API (anon + service): OK");
    const resolvedDbUrl = await resolveWorkingDatabaseUrl(env);
    workingDatabaseUrl = resolvedDbUrl;
    process.env.SUPABASE_DB_URL = resolvedDbUrl;
    console.log("  PostgreSQL: OK (working connection resolved for migrations)");
  } catch (error) {
    fail("Supabase connectivity", error);
  }

  logStep(`3. Apply migrations (${APPLY_SCRIPTS.length} scripts)`);
  for (const script of APPLY_SCRIPTS) {
    try {
      await runTsxScript(script);
    } catch (error) {
      fail(`Migration ${script}`, error);
    }
  }
  console.log("  All apply scripts: OK");

  logStep("4. Build");
  try {
    await runNpmScript("build");
  } catch (error) {
    fail("npm run build", error);
  }

  logStep("5. Regression check");
  let devChild: ChildProcess | null = null;
  let startedDev = false;
  try {
    const dev = await ensureDevServer();
    devChild = dev.child;
    startedDev = dev.startedByBootstrap;
    await runNpmScript("regression-check");
  } catch (error) {
    if (startedDev) stopDevServer(devChild);
    fail("regression-check", error);
  }
  if (startedDev) stopDevServer(devChild);

  logStep("Bootstrap complete");
  console.log("  Migrations: applied");
  console.log("  Build: passed");
  console.log("  Regression: passed");
  printManualSteps(envCheck.warnings);
}

main().catch((error) => fail("Unexpected error", error));
