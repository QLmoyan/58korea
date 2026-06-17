import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};

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

  return env;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const stamp = Date.now();
  const email = `58korea.auth.${stamp}@gmail.com`;
  const password = "test123456";
  const nickname = `测试用户${String(stamp).slice(-4)}`;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  assert(!signUpError, `Sign up failed: ${signUpError?.message}`);
  assert(signUpData.user?.id, "Sign up did not return a user id");

  const userId = signUpData.user.id;

  if (!signUpData.session) {
    const { error: signInAfterSignUpError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    assert(
      !signInAfterSignUpError,
      `Sign in after sign up failed: ${signInAfterSignUpError?.message}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", userId)
    .maybeSingle();

  assert(!profileError, `Profile fetch failed: ${profileError?.message}`);
  assert(profile?.id === userId, "Profile id mismatch");
  assert(profile?.nickname === nickname, "Profile nickname mismatch");

  if (signUpData.session) {
    await supabase.auth.signOut();
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  assert(!signInError, `Sign in failed: ${signInError?.message}`);
  assert(signInData.user?.id === userId, "Sign in user id mismatch");

  const { data: profileAfterLogin, error: profileAfterLoginError } =
    await supabase
      .from("profiles")
      .select("id, nickname")
      .eq("id", userId)
      .maybeSingle();

  assert(
    !profileAfterLoginError,
    `Profile fetch after login failed: ${profileAfterLoginError?.message}`,
  );
  assert(
    profileAfterLogin?.nickname === nickname,
    "Profile nickname mismatch after login",
  );

  const { error: signOutError } = await supabase.auth.signOut();
  assert(!signOutError, `Sign out failed: ${signOutError?.message}`);

  console.log("Auth shell integration test passed");
  console.log(`email=${email}, nickname=${nickname}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
