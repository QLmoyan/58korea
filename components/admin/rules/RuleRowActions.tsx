"use client";

import { useAdminPermission } from "@/components/admin/AdminCapabilitiesProvider";

export function RuleStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {enabled ? "已启用" : "已停用"}
    </span>
  );
}

export function RuleRowActions({
  disabled,
  enabled,
  onEdit,
  onToggle,
  onDelete,
}: {
  disabled?: boolean;
  enabled: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const showDelete = useAdminPermission("rules.delete");

  return (
    <div className="flex flex-wrap gap-2">
      <RuleActionButton disabled={disabled} onClick={onEdit}>
        编辑
      </RuleActionButton>
      <RuleActionButton disabled={disabled} onClick={onToggle}>
        {enabled ? "停用" : "启用"}
      </RuleActionButton>
      {showDelete ? (
        <RuleActionButton disabled={disabled} tone="danger" onClick={onDelete}>
          删除
        </RuleActionButton>
      ) : null}
    </div>
  );
}

function RuleActionButton({
  children,
  disabled,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        tone === "danger"
          ? "bg-zinc-900 text-white hover:bg-zinc-800"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
