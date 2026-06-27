"use server";

import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

export async function recordPostViewAction(postId: number): Promise<void> {
  const user = await getServerAuthUser();
  if (!user) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const viewedAt = new Date().toISOString();

  const { error } = await supabase.from("post_views").upsert(
    {
      user_id: user.id,
      post_id: postId,
      viewed_at: viewedAt,
    },
    { onConflict: "user_id,post_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
