import type { User } from "@supabase/supabase-js";
import { normalizeUsername } from "@/lib/auth/username";
import type { Profile } from "@/lib/types/user";
import { ANONYMOUS_NAMES } from "@/lib/types/community";

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function resolveAuthorNameFromAuth(
  user: User | null | undefined,
  profile: Profile | null | undefined,
): string {
  if (!user) {
    return randomItem(ANONYMOUS_NAMES);
  }

  if (profile?.nickname?.trim()) {
    return profile.nickname.trim();
  }

  const metadataNickname = user.user_metadata?.nickname;
  if (typeof metadataNickname === "string" && metadataNickname.trim()) {
    return metadataNickname.trim();
  }

  const metadataUsername = user.user_metadata?.username;
  if (typeof metadataUsername === "string" && metadataUsername.trim()) {
    return normalizeUsername(metadataUsername);
  }

  return "社区用户";
}
