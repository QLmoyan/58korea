import type { Comment, CommentImage } from "@/lib/types/community";
import type { Database } from "@/lib/supabase/database.types";

type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type DbCommentImage = Database["public"]["Tables"]["comment_images"]["Row"];

export type DbCommentWithImages = DbComment & {
  comment_images?: DbCommentImage[] | null;
};

export const COMMENT_SELECT_WITH_IMAGES =
  "*, comment_images(id, image_url, sort_order)";

function mapCommentImage(row: DbCommentImage): CommentImage {
  return {
    id: row.id,
    url: row.image_url,
    sortOrder: row.sort_order,
  };
}

export function mapCommentRow(row: DbCommentWithImages): Comment {
  let images = (row.comment_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapCommentImage);

  if (images.length === 0 && row.image_url) {
    images = [
      {
        id: `${row.id}-legacy-image`,
        url: row.image_url,
        sortOrder: 0,
      },
    ];
  }

  return {
    id: row.id,
    postId: row.post_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
    parentId: row.parent_id || null,
    replyToAuthor: row.reply_to_author,
    imageUrl: images[0]?.url ?? row.image_url,
    images,
  };
}
