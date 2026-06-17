import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/user";

function mapProfile(row: {
  id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data) : null;
}
