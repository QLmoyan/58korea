"use client";

import { useState } from "react";
import {
  frontendDeleteCommentAction,
  frontendHideCommentAction,
} from "@/lib/actions/admin-frontend-moderation";
import type { AdminPermission } from "@/lib/types/admin-auth";

interface FrontendAdminCommentActionsProps {
  commentId: string;
  permissions: AdminPermission[];
  isReply?: boolean;
  onUpdated?: () => void | Promise<void>;
}

function canPerform(permissions: AdminPermission[], permission: AdminPermission) {
  return permissions.includes(permission);
}

export default function FrontendAdminCommentActions({
  commentId,
  permissions,
  isReply = false,
  onUpdated,
}: FrontendAdminCommentActionsProps) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  const showHide = canPerform(permissions, "content.comment.hide");
  const showDelete = canPerform(permissions, "content.comment.delete");

  if (!showHide && !showDelete) {
    return null;
  }

  async function runAction(action: "hide" | "delete") {
    const confirmMessage =
      action === "hide"
        ? `确认隐藏这条${isReply ? "回复" : "评论"}？`
        : `确认删除这条${isReply ? "回复" : "评论"}？删除后无法恢复。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActing(true);
    setError("");

    try {
      if (action === "hide") {
        await frontendHideCommentAction({ commentId });
      } else {
        await frontendDeleteCommentAction({ commentId });
      }

      await onUpdated?.();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {showHide ? (
        <button
          type="button"
          disabled={acting}
          onClick={() => runAction("hide")}
          className="touch-manipulation text-[11px] font-medium text-amber-600 transition-colors hover:text-amber-700 disabled:opacity-50"
        >
          隐藏
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          disabled={acting}
          onClick={() => runAction("delete")}
          className="touch-manipulation text-[11px] font-medium text-rose-500 transition-colors hover:text-rose-600 disabled:opacity-50"
        >
          删除
        </button>
      ) : null}
      {error ? <span className="text-[11px] text-rose-500">{error}</span> : null}
    </span>
  );
}
