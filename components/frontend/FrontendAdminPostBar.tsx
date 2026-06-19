"use client";

import { useState } from "react";
import type { RiskLevel } from "@/lib/moderation/constants";
import {
  frontendAddPostRiskLabelAction,
  frontendDeletePostAction,
  frontendHidePostAction,
  frontendRemovePostRiskLabelAction,
} from "@/lib/actions/admin-frontend-moderation";
import type { AdminPermission } from "@/lib/types/admin-auth";

interface FrontendAdminPostBarProps {
  postId: number;
  permissions: AdminPermission[];
  riskLevel?: RiskLevel;
  onUpdated?: () => void | Promise<void>;
  onHidden?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
}

function canPerform(permissions: AdminPermission[], permission: AdminPermission) {
  return permissions.includes(permission);
}

export default function FrontendAdminPostBar({
  postId,
  permissions,
  riskLevel,
  onUpdated,
  onHidden,
  onDeleted,
}: FrontendAdminPostBarProps) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  const showRiskControls = canPerform(permissions, "content.post.risk_label");
  const showHide = canPerform(permissions, "content.post.hide");
  const showDelete = canPerform(permissions, "content.post.delete");

  if (!showRiskControls && !showHide && !showDelete) {
    return null;
  }

  async function runAction(
    action: "addRisk" | "removeRisk" | "hide" | "delete",
  ) {
    const confirmMessages = {
      addRisk: "确认给该帖子添加前台风险提示？",
      removeRisk: "确认移除该帖子的前台风险提示？",
      hide: "确认隐藏该帖子？隐藏后普通用户将无法看到。",
      delete: "确认删除该帖子？删除后无法恢复。",
    } as const;

    if (!window.confirm(confirmMessages[action])) {
      return;
    }

    setActing(true);
    setError("");

    try {
      switch (action) {
        case "addRisk":
          await frontendAddPostRiskLabelAction({ postId });
          await onUpdated?.();
          break;
        case "removeRisk":
          await frontendRemovePostRiskLabelAction({ postId });
          await onUpdated?.();
          break;
        case "hide":
          await frontendHidePostAction({ postId });
          await onHidden?.();
          break;
        case "delete":
          await frontendDeletePostAction({ postId });
          await onDeleted?.();
          break;
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3">
      <p className="text-xs font-medium text-amber-800">管理员操作</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {showRiskControls ? (
          <>
            <AdminButton
              tone="warning"
              disabled={acting || riskLevel === "medium"}
              onClick={() => runAction("addRisk")}
            >
              添加风险提示
            </AdminButton>
            <AdminButton
              tone="neutral"
              disabled={acting || riskLevel !== "medium"}
              onClick={() => runAction("removeRisk")}
            >
              移除风险提示
            </AdminButton>
          </>
        ) : null}

        {showHide ? (
          <AdminButton
            tone="warning"
            disabled={acting}
            onClick={() => runAction("hide")}
          >
            隐藏帖子
          </AdminButton>
        ) : null}

        {showDelete ? (
          <AdminButton
            tone="danger"
            disabled={acting}
            onClick={() => runAction("delete")}
          >
            删除帖子
          </AdminButton>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function AdminButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone: "warning" | "neutral" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
      : tone === "danger"
        ? "bg-rose-500 text-white hover:bg-rose-600"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`touch-manipulation rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
