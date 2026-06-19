"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import {
  applyManualPostRiskLabel,
  clearManualPostRiskLabel,
} from "@/lib/admin/manual-post-risk-actions";

export async function addManualPostRiskLabelAction(input: { postId: number }) {
  await assertAdminPermission("content.post.risk_label");
  await applyManualPostRiskLabel(input.postId);
}

export async function removeManualPostRiskLabelAction(input: { postId: number }) {
  await assertAdminPermission("content.post.risk_label");
  await clearManualPostRiskLabel(input.postId);
}
