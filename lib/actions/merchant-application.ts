"use server";

import { isMerchantCategory } from "@/lib/merchant/categories";
import { mapMerchantApplication } from "@/lib/merchant/map-application";
import type {
  MerchantApplyUiState,
  SubmitMerchantApplicationInput,
} from "@/lib/types/merchant-application";
import { createSupabaseServerClient, getServerAuthUser } from "@/lib/supabase/server";

function trimRequired(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`请填写${label}`);
  }
  return trimmed;
}

export async function getMerchantApplyUiStateAction(): Promise<MerchantApplyUiState> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("merchant_profiles")
    .select("business_name, is_verified, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.is_verified && profile.is_active) {
    return {
      kind: "verified",
      businessName: profile.business_name,
    };
  }

  const { data: application, error: applicationError } = await supabase
    .from("merchant_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  if (application?.status === "pending") {
    return {
      kind: "pending",
      application: mapMerchantApplication(application),
    };
  }

  if (application?.status === "rejected") {
    return {
      kind: "rejected",
      application: mapMerchantApplication(application),
    };
  }

  return { kind: "eligible" };
}

export async function submitMerchantApplicationAction(
  input: SubmitMerchantApplicationInput,
) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const businessName = trimRequired(input.businessName, "店铺名称");
  const category = trimRequired(input.category, "行业分类");
  const address = trimRequired(input.address, "店铺地址");
  const contact = trimRequired(input.contact, "联系方式");
  const proofNote = input.proofNote?.trim() || null;

  if (!isMerchantCategory(category)) {
    throw new Error("请选择有效的行业分类");
  }

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("merchant_profiles")
    .select("is_verified, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.is_verified && profile.is_active) {
    throw new Error("你已是认证商家，无需重复申请");
  }

  const { data: pending, error: pendingError } = await supabase
    .from("merchant_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) {
    throw new Error(pendingError.message);
  }

  if (pending) {
    throw new Error("你已有审核中的申请，请耐心等待");
  }

  const { error } = await supabase.from("merchant_applications").insert({
    user_id: user.id,
    business_name: businessName,
    category,
    address,
    contact,
    proof_note: proofNote,
    status: "pending",
  });

  if (error) {
    if (/merchant_applications_one_pending_per_user/i.test(error.message)) {
      throw new Error("你已有审核中的申请，请耐心等待");
    }
    throw new Error(error.message);
  }

  return { ok: true as const };
}
