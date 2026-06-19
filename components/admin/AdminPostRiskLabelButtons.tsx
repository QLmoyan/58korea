"use client";

import { useState } from "react";
import { useAdminPermission } from "@/components/admin/AdminCapabilitiesProvider";
import {
  addManualPostRiskLabelAction,
  removeManualPostRiskLabelAction,
} from "@/lib/actions/admin-post-risk-label";

interface AdminPostRiskLabelButtonsProps {
  postId: number;
  disabled?: boolean;
  onUpdated?: () => void | Promise<void>;
}

export default function AdminPostRiskLabelButtons({
  postId,
  disabled = false,
  onUpdated,
}: AdminPostRiskLabelButtonsProps) {
  const canManageRiskLabel = useAdminPermission("content.post.risk_label");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  if (!canManageRiskLabel) {
    return null;
  }

  async function runAction(action: "add" | "remove") {
    const confirmMessage =
      action === "add"
        ? "确认给该帖子添加前台风险提示？"
        : "确认移除该帖子的前台风险提示？";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActing(true);
    setError("");

    try {
      if (action === "add") {
        await addManualPostRiskLabelAction({ postId });
      } else {
        await removeManualPostRiskLabelAction({ postId });
      }

      await onUpdated?.();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">帖子风险提示</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || acting}
          onClick={() => runAction("add")}
          className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50"
        >
          添加风险提示
        </button>
        <button
          type="button"
          disabled={disabled || acting}
          onClick={() => runAction("remove")}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          移除风险提示
        </button>
      </div>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

export function resolveAdminPostId(input: {
  targetType: "post" | "comment";
  targetId: string;
  postId: number | null;
}): number | null {
  if (input.targetType === "post") {
    const postId = Number(input.targetId);
    return Number.isFinite(postId) && postId > 0 ? postId : null;
  }

  if (input.postId && input.postId > 0) {
    return input.postId;
  }

  return null;
}
