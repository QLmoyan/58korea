import { validatePublishCouponInput } from "@/lib/merchant/validate-publish-coupon";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PostCouponBindingInput,
  PublishPostNewCouponInput,
} from "@/lib/types/community";

function validateNewCouponInput(input: PublishPostNewCouponInput) {
  return validatePublishCouponInput(input);
}

async function getActiveMerchantProfile(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("merchant_profiles")
    .select("id, user_id, is_active, is_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.is_active || !data.is_verified) {
    return null;
  }

  return data;
}

export async function prepareLinkedCouponForPublish(
  userId: string | null | undefined,
  binding: PostCouponBindingInput | undefined,
): Promise<string | null> {
  if (!binding || binding.mode === "none") {
    return null;
  }

  if (!userId) {
    throw new Error("请先登录后再添加优惠券");
  }

  const merchantProfile = await getActiveMerchantProfile(userId);
  if (!merchantProfile) {
    throw new Error("普通用户不能添加优惠券");
  }

  const validated = validateNewCouponInput(binding.coupon);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: validated.title,
      discount_amount_krw: validated.discountAmountKrw,
      total_quantity: validated.totalQuantity,
      per_user_limit: 1,
      starts_at: validated.startsAt,
      ends_at: validated.endsAt,
      usage_note: validated.usageNote,
      is_active: true,
    })
    .select("id, title, discount_amount_krw")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "创建优惠券失败");
  }

  return data.id;
}
