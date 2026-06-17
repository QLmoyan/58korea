import type { Comment } from "@/lib/types/community";

export interface CommentThread {
  root: Comment;
  replies: Comment[];
}

export interface ReplyTarget {
  parentId: string;
  replyToAuthor: string;
}

function normalizeParentId(parentId: string | null | undefined): string | null {
  if (!parentId || parentId === "null" || parentId === "undefined") {
    return null;
  }

  return parentId;
}

function sortByCreatedAt(a: Comment, b: Comment) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function getRootId(
  comment: Comment,
  commentById: Map<string, Comment>,
): string | null {
  const parentId = normalizeParentId(comment.parentId);
  if (!parentId) {
    return comment.id;
  }

  const parent = commentById.get(parentId);
  if (!parent) {
    return null;
  }

  const parentParentId = normalizeParentId(parent.parentId);
  return parentParentId ?? parent.id;
}

export function resolveReplyTarget(target: Comment): ReplyTarget {
  if (!normalizeParentId(target.parentId)) {
    return { parentId: target.id, replyToAuthor: target.author };
  }

  return {
    parentId: normalizeParentId(target.parentId) ?? target.id,
    replyToAuthor: target.author,
  };
}

export function buildCommentThreads(comments: Comment[]): CommentThread[] {
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const roots = comments
    .filter((comment) => !normalizeParentId(comment.parentId))
    .sort(sortByCreatedAt);
  const repliesByRoot = new Map<string, Comment[]>();

  for (const comment of comments) {
    if (!normalizeParentId(comment.parentId)) {
      continue;
    }

    const rootId = getRootId(comment, commentById);
    if (!rootId || rootId === comment.id) {
      continue;
    }

    const replies = repliesByRoot.get(rootId) ?? [];
    replies.push(comment);
    repliesByRoot.set(rootId, replies);
  }

  return roots.map((root) => ({
    root,
    replies: (repliesByRoot.get(root.id) ?? []).sort(sortByCreatedAt),
  }));
}
