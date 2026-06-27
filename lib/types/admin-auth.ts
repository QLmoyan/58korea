export type AdminRole = "owner" | "admin" | "moderator";

export type AdminPermission =
  | "admin.access"
  | "reviews.read"
  | "reviews.write"
  | "reports.read"
  | "reports.write"
  | "rules.read"
  | "rules.create"
  | "rules.update"
  | "rules.delete"
  | "rules.test"
  | "rules.stats"
  | "content.post.hide"
  | "content.post.delete"
  | "content.post.risk_label"
  | "content.comment.hide"
  | "content.comment.delete"
  | "channel_articles.read"
  | "channel_articles.write"
  | "dashboard.read"
  | "admins.manage";

export type AccountAdminActor = {
  kind: "account";
  userId: string;
  role: AdminRole;
};

/** Legacy ADMIN_PASSWORD cookie auth; treated as owner in assertAdminPermission. */
export type LegacyPasswordAdminActor = {
  kind: "legacy_password";
  role: "owner";
};

export type AdminActor = AccountAdminActor | LegacyPasswordAdminActor;

export type AdminMembership = {
  userId: string;
  role: AdminRole;
  enabled: boolean;
};
