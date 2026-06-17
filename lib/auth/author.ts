import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchProfileByUserId } from "@/lib/supabase/profile";
import { ANONYMOUS_NAMES } from "@/lib/types/community";

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function resolveAuthorName(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (user) {
    try {
      const profile = await fetchProfileByUserId(user.id);
      if (profile?.nickname) {
        return profile.nickname;
      }
    } catch {
      // Fall through to default logged-in label.
    }

    return "社区用户";
  }

  return randomItem(ANONYMOUS_NAMES);
}
