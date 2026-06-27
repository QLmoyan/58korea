"use server";

import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

export async function deleteOwnedPostAction(postId: number): Promise<void> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  if (!Number.isFinite(postId)) {
    throw new Error("帖子不存在");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_owned_post", {
    p_post_id: postId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
