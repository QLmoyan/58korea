"use client";

import { canDeleteContentTarget } from "@/lib/admin/admin-panel-ui";
import { useAdminCapabilities } from "@/components/admin/AdminCapabilitiesProvider";

interface AdminActionButtonsProps {
  targetType: "post" | "comment";
  disabled?: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  onHide: () => void;
  onDelete: () => void;
  approveLabel?: string;
}

export default function AdminActionButtons({
  targetType,
  disabled = false,
  onApprove,
  onDismiss,
  onHide,
  onDelete,
  approveLabel = "标记已处理",
}: AdminActionButtonsProps) {
  const { permissions } = useAdminCapabilities();
  const showDelete = canDeleteContentTarget(permissions, targetType);

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton tone="primary" disabled={disabled} onClick={onApprove}>
        {approveLabel}
      </ActionButton>
      <ActionButton tone="neutral" disabled={disabled} onClick={onDismiss}>
        忽略
      </ActionButton>
      <ActionButton tone="warning" disabled={disabled} onClick={onHide}>
        隐藏内容
      </ActionButton>
      {showDelete ? (
        <ActionButton tone="danger" disabled={disabled} onClick={onDelete}>
          删除内容
        </ActionButton>
      ) : null}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone: "primary" | "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-rose-500 text-white hover:bg-rose-600"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
        : tone === "danger"
          ? "bg-zinc-900 text-white hover:bg-zinc-800"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
