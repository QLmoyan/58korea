/**
 * Read-only merchant account diagnostic.
 * Usage: npx tsx scripts/check-merchant-account.ts ql8604301
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

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

  return env;
}

async function main() {
  const username = process.argv[2]?.trim().toLowerCase();
  if (!username) {
    throw new Error("Usage: npx tsx scripts/check-merchant-account.ts <username>");
  }

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env in .env.local");
  }

  const service = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, username, nickname")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    console.log(`No profile for username=${username}`);
    return;
  }

  console.log("profile:", profile);

  const { data: merchantProfile } = await service
    .from("merchant_profiles")
    .select(
      "id, user_id, business_name, category, is_active, is_verified, phone, address",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  console.log("merchant_profiles:", merchantProfile ?? null);

  const { data: applications } = await service
    .from("merchant_applications")
    .select("id, status, business_name, reviewed_at, reject_reason")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  console.log("merchant_applications:", applications ?? []);

  const { data: anonMerchant, error: anonMerchantError } = await anon
    .from("merchant_profiles")
    .select("id, business_name, is_active, is_verified")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .eq("is_verified", true)
    .maybeSingle();

  console.log(
    "anon_public_merchant_read:",
    anonMerchant ?? null,
    anonMerchantError?.message ?? "ok",
  );

  const ok = Boolean(
    merchantProfile?.is_active &&
      merchantProfile.is_verified &&
      merchantProfile.business_name?.trim(),
  );
  console.log(ok ? "STATUS: verified merchant data OK" : "STATUS: data incomplete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
