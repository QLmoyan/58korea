import type { User } from "@supabase/supabase-js";

const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;
const INTERNAL_EMAIL_DOMAIN = "@users.58korea.com";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function toInternalEmail(username: string) {
  return `${normalizeUsername(username)}${INTERNAL_EMAIL_DOMAIN}`;
}

export function getDisplayUsername(user: User | null | undefined) {
  if (!user) {
    return "";
  }

  const metadataUsername = user.user_metadata?.username;
  if (typeof metadataUsername === "string" && metadataUsername.trim()) {
    return normalizeUsername(metadataUsername);
  }

  const email = user.email ?? "";
  if (email.endsWith(INTERNAL_EMAIL_DOMAIN)) {
    return email.slice(0, -INTERNAL_EMAIL_DOMAIN.length);
  }

  return "";
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return "请填写账号";
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return "账号需为 4-20 位字母、数字或下划线";
  }

  return null;
}
