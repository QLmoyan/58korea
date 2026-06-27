import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeUsername } from "@/lib/auth/username";
import type { Profile } from "@/lib/types/user";

const PROFILE_SELECT =
  "id, nickname, username, bio, avatar_url, gender, city, created_at, updated_at";

function mapProfile(row: {
  id: string;
  nickname: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  gender: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    city: row.city,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data) : null;
}

export async function fetchPublicProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data) : null;
}
