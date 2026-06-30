"use server";

import { revalidatePath } from "next/cache";
import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { mapMerchantApplication } from "@/lib/merchant/map-application";
import { notifySystemMessage } from "@/lib/notifications/create-notification";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  MerchantApplication,
  MerchantApplicationStatus,
} from "@/lib/types/merchant-application";

type ApplicationRow = Database["public"]["Tables"]["merchant_applications"]["Row"];

export interface AdminMerchantApplicationItem extends MerchantApplication {
  applicantUsername: string | null;
  applicantNickname: string | null;
}

function mapAdminItem(
  row: ApplicationRow,
  profile: { username: string | null; nickname: string | null } | null,
): AdminMerchantApplicationItem {
  return {
    ...mapMerchantApplication(row),
    applicantUsername: profile?.username ?? null,
    applicantNickname: profile?.nickname ?? null,
  };
}

export async function listMerchantApplicationsAction(input?: {
  status?: MerchantApplicationStatus | "all";
}): Promise<AdminMerchantApplicationItem[]> {
  await assertAdminPermission("reviews.read");

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("merchant_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (input?.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return [];
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, nickname")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return rows.map((row) => mapAdminItem(row, profileById.get(row.user_id) ?? null));
}

export async function approveMerchantApplicationAction(applicationId: string) {
  const actor = await assertAdminPermission("reviews.write");
  const reviewerId = actor.kind === "account" ? actor.userId : null;

  const supabase = getSupabaseAdminClient();

  const { data: application, error } = await supabase
    .from("merchant_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!application) {
    throw new Error("申请不存在");
  }

  if (application.status !== "pending") {
    throw new Error("该申请已处理");
  }

  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from("merchant_profiles").upsert(
    {
      user_id: application.user_id,
      business_name: application.business_name,
      category: application.category,
      address: application.address,
      phone: application.contact,
      description: application.proof_note,
      is_active: true,
      is_verified: true,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: verifiedProfile, error: verifyError } = await supabase
    .from("merchant_profiles")
    .select("id, user_id, is_active, is_verified, business_name")
    .eq("user_id", application.user_id)
    .maybeSingle();

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  if (
    !verifiedProfile?.is_verified ||
    !verifiedProfile.is_active ||
    !verifiedProfile.business_name?.trim()
  ) {
    throw new Error("商家资料写入失败，请重试审核");
  }

  const { error: updateError } = await supabase
    .from("merchant_applications")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: now,
      reject_reason: null,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (updateError) {
    throw new Error(updateError.message);
  }

  await notifySystemMessage({
    userId: application.user_id,
    title: "商家认证已通过",
    body: `你的商家认证申请已通过审核。店铺「${application.business_name}」现已开通认证商家身份。`,
  });

  revalidatePath("/profile");
  revalidatePath("/publish");
  revalidatePath("/merchant/apply");

  return { ok: true as const };
}

export async function rejectMerchantApplicationAction(input: {
  applicationId: string;
  rejectReason: string;
}) {
  const actor = await assertAdminPermission("reviews.write");
  const reviewerId = actor.kind === "account" ? actor.userId : null;

  const rejectReason = input.rejectReason.trim();
  if (!rejectReason) {
    throw new Error("请填写拒绝原因");
  }

  const supabase = getSupabaseAdminClient();

  const { data: application, error } = await supabase
    .from("merchant_applications")
    .select("*")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!application) {
    throw new Error("申请不存在");
  }

  if (application.status !== "pending") {
    throw new Error("该申请已处理");
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("merchant_applications")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: now,
      reject_reason: rejectReason,
      updated_at: now,
    })
    .eq("id", input.applicationId)
    .eq("status", "pending");

  if (updateError) {
    throw new Error(updateError.message);
  }

  await notifySystemMessage({
    userId: application.user_id,
    title: "商家认证未通过",
    body: `你的商家认证申请未通过审核。原因：${rejectReason}。你可以修改资料后重新提交申请。`,
  });

  return { ok: true as const };
}
