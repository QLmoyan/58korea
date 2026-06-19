import type { AdminPermission, AdminRole } from "@/lib/types/admin-auth";

const ALL_PERMISSIONS = [
  "admin.access",
  "reviews.read",
  "reviews.write",
  "reports.read",
  "reports.write",
  "rules.read",
  "rules.create",
  "rules.update",
  "rules.delete",
  "rules.test",
  "rules.stats",
  "content.post.hide",
  "content.post.delete",
  "content.post.risk_label",
  "content.comment.hide",
  "content.comment.delete",
  "admins.manage",
] as const satisfies readonly AdminPermission[];

const MODERATOR_PERMISSIONS = [
  "admin.access",
  "reviews.read",
  "reports.read",
  "reports.write",
  "content.post.hide",
  "content.post.risk_label",
  "content.comment.hide",
  "content.comment.delete",
] as const satisfies readonly AdminPermission[];

const ADMIN_PERMISSIONS = [
  ...MODERATOR_PERMISSIONS,
  "reviews.write",
  "rules.read",
  "rules.create",
  "rules.update",
  "rules.test",
  "rules.stats",
  "content.post.delete",
] as const satisfies readonly AdminPermission[];

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  moderator: MODERATOR_PERMISSIONS,
};

export function hasPermission(role: AdminRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function listPermissions(role: AdminRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function isAdminRole(value: string): value is AdminRole {
  return value === "owner" || value === "admin" || value === "moderator";
}
