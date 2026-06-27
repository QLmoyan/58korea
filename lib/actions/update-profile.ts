"use server";

import {
  extractAvatarStoragePathFromPublicUrl,
  isValidAvatarStoragePath,
} from "@/lib/profile/avatar";
import {
  extractMerchantLogoStoragePathFromPublicUrl,
  isValidMerchantLogoStoragePath,
} from "@/lib/profile/merchant-logo";
import {
  normalizeGender,
  validateBio,
  validateCity,
  validateGender,
  validateMerchantBusinessName,
  validateMerchantDescription,
  validateMerchantField,
  validateNickname,
} from "@/lib/profile/validate-profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";
import { COMMUNITY_MEDIA_BUCKET } from "@/lib/supabase/storage";
import type { MerchantProfile } from "@/lib/types/merchant";
import type { Profile } from "@/lib/types/user";

export interface UpdateMerchantProfileInput {
  businessName: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  businessHours?: string | null;
  logoStoragePath?: string | null;
}

export interface UpdateProfileInput {
  nickname: string;
  bio?: string | null;
  gender?: string | null;
  city?: string | null;
  avatarStoragePath?: string | null;
  merchant?: UpdateMerchantProfileInput | null;
}

export interface UpdateProfileResult {
  profile: Profile;
  merchantProfile: MerchantProfile | null;
  previousAuthorDisplay: string;
  authorDisplay: string;
}

function mapProfileRow(row: {
  id: string;
  nickname: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  gender: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    city: row.city,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMerchantProfileRow(row: {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  navigation_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { username: string | null } | null;
}): MerchantProfile {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.profiles?.username ?? null,
    businessName: row.business_name,
    logoUrl: row.logo_url,
    description: row.description,
    address: row.address,
    phone: row.phone,
    businessHours: row.business_hours,
    navigationUrl: row.navigation_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfileError(message: string) {
  if (message.includes("profiles_nickname_unique")) {
    return "该昵称已被占用，请换一个";
  }

  return message;
}

function resolveAuthorDisplay(
  nickname: string,
  merchantProfile: MerchantProfile | null,
) {
  if (merchantProfile?.businessName?.trim()) {
    return merchantProfile.businessName.trim();
  }

  return nickname.trim();
}

async function syncAuthorDisplay(userId: string, authorDisplay: string) {
  const admin = getSupabaseAdminClient();

  const { error: postsError } = await admin
    .from("posts")
    .update({ author: authorDisplay })
    .eq("author_id", userId);

  if (postsError) {
    throw new Error(`Failed to sync post authors: ${postsError.message}`);
  }

  const { error: commentsError } = await admin
    .from("comments")
    .update({ author: authorDisplay })
    .eq("user_id", userId);

  if (commentsError) {
    throw new Error(`Failed to sync comment authors: ${commentsError.message}`);
  }
}

async function removeAvatarStoragePath(storagePath: string | null | undefined) {
  if (!storagePath?.trim()) {
    return;
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("Failed to remove old avatar:", error.message);
  }
}

async function removeMerchantLogoStoragePath(storagePath: string | null | undefined) {
  if (!storagePath?.trim()) {
    return;
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("Failed to remove old merchant logo:", error.message);
  }
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const nicknameError = validateNickname(input.nickname);
  if (nicknameError) {
    throw new Error(nicknameError);
  }

  const bioError = validateBio(input.bio);
  if (bioError) {
    throw new Error(bioError);
  }

  const genderError = validateGender(input.gender);
  if (genderError) {
    throw new Error(genderError);
  }

  const cityError = validateCity(input.city);
  if (cityError) {
    throw new Error(cityError);
  }

  if (input.merchant) {
    const businessNameError = validateMerchantBusinessName(input.merchant.businessName);
    if (businessNameError) {
      throw new Error(businessNameError);
    }

    const descriptionError = validateMerchantDescription(input.merchant.description);
    if (descriptionError) {
      throw new Error(descriptionError);
    }

    for (const [value, label, max] of [
      [input.merchant.address, "地址", 120],
      [input.merchant.phone, "电话", 30],
      [input.merchant.businessHours, "营业时间", 120],
    ] as const) {
      const fieldError = validateMerchantField(value, label, max);
      if (fieldError) {
        throw new Error(fieldError);
      }
    }
  }

  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select(
      "id, nickname, username, bio, avatar_url, gender, city, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError || !existingProfile) {
    throw new Error(existingProfileError?.message ?? "资料不存在");
  }

  const { data: existingMerchant } = await supabase
    .from("merchant_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (input.merchant && !existingMerchant) {
    throw new Error("当前账号不是商家，无法编辑商家资料");
  }

  const previousAuthorDisplay = resolveAuthorDisplay(
    existingProfile.nickname,
    existingMerchant
      ? mapMerchantProfileRow({
          ...existingMerchant,
          profiles: { username: existingProfile.username },
        })
      : null,
  );

  let nextAvatarUrl = existingProfile.avatar_url;
  let oldAvatarPath =
    existingProfile.avatar_url != null
      ? extractAvatarStoragePathFromPublicUrl(existingProfile.avatar_url)
      : null;

  if (input.avatarStoragePath) {
    if (!isValidAvatarStoragePath(user.id, input.avatarStoragePath)) {
      throw new Error("头像路径无效");
    }

    const { data: publicUrlData } = admin.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .getPublicUrl(input.avatarStoragePath);

    nextAvatarUrl = publicUrlData.publicUrl;
  }

  const nickname = input.nickname.trim();
  const bio = (input.bio ?? "").trim() || null;
  const gender = normalizeGender(input.gender);
  const city = (input.city ?? "").trim() || null;

  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      nickname,
      bio,
      gender,
      city,
      avatar_url: nextAvatarUrl,
    })
    .eq("id", user.id)
    .select(
      "id, nickname, username, bio, avatar_url, gender, city, created_at, updated_at",
    )
    .single();

  if (profileUpdateError || !updatedProfile) {
    throw new Error(mapProfileError(profileUpdateError?.message ?? "资料保存失败"));
  }

  let merchantProfile: MerchantProfile | null = existingMerchant
    ? mapMerchantProfileRow({
        ...existingMerchant,
        profiles: { username: existingProfile.username },
      })
    : null;

  if (input.merchant && existingMerchant) {
    let nextLogoUrl = existingMerchant.logo_url;
    let oldLogoPath =
      existingMerchant.logo_url != null
        ? extractMerchantLogoStoragePathFromPublicUrl(existingMerchant.logo_url)
        : null;

    if (input.merchant.logoStoragePath) {
      if (!isValidMerchantLogoStoragePath(user.id, input.merchant.logoStoragePath)) {
        throw new Error("商家 Logo 路径无效");
      }

      const { data: publicUrlData } = admin.storage
        .from(COMMUNITY_MEDIA_BUCKET)
        .getPublicUrl(input.merchant.logoStoragePath);

      nextLogoUrl = publicUrlData.publicUrl;
    }

    const merchantUpdatePayload = {
      business_name: input.merchant.businessName.trim(),
      description: (input.merchant.description ?? "").trim() || null,
      address: (input.merchant.address ?? "").trim() || null,
      phone: (input.merchant.phone ?? "").trim() || null,
      business_hours: (input.merchant.businessHours ?? "").trim() || null,
      logo_url: nextLogoUrl,
    };

    const { data: updatedMerchant, error: merchantUpdateError } = await supabase
      .from("merchant_profiles")
      .update(merchantUpdatePayload)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (merchantUpdateError || !updatedMerchant) {
      throw new Error(merchantUpdateError?.message ?? "商家资料保存失败");
    }

    merchantProfile = mapMerchantProfileRow({
      ...updatedMerchant,
      profiles: { username: updatedProfile.username },
    });

    if (
      input.merchant.logoStoragePath &&
      oldLogoPath &&
      oldLogoPath !== input.merchant.logoStoragePath
    ) {
      await removeMerchantLogoStoragePath(oldLogoPath);
    }
  }

  const authorDisplay = resolveAuthorDisplay(nickname, merchantProfile);

  if (authorDisplay !== previousAuthorDisplay) {
    await syncAuthorDisplay(user.id, authorDisplay);
  }

  if (
    input.avatarStoragePath &&
    oldAvatarPath &&
    oldAvatarPath !== input.avatarStoragePath
  ) {
    await removeAvatarStoragePath(oldAvatarPath);
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      nickname,
      bio,
    },
  });

  return {
    profile: mapProfileRow(updatedProfile),
    merchantProfile,
    previousAuthorDisplay,
    authorDisplay,
  };
}
