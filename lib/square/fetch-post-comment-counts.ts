import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function fetchPostCommentCounts(
  postIds: number[],
): Promise<Record<number, number>> {
  const counts = Object.fromEntries(postIds.map((id) => [id, 0])) as Record<
    number,
    number
  >;

  if (postIds.length === 0 || !isSupabaseConfigured()) {
    return counts;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds)
    .eq("moderation_status", "published");

  if (error) {
    return counts;
  }

  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
  }

  return counts;
}
