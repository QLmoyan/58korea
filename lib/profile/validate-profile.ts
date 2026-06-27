import { PROFILE_GENDERS, type ProfileGender } from "@/lib/profile/constants";

export function validateNickname(nickname: string) {
  const trimmed = nickname.trim();
  if (trimmed.length < 2) {
    return "昵称至少 2 个字符";
  }

  if (trimmed.length > 30) {
    return "昵称最多 30 个字符";
  }

  return null;
}

export function validateBio(bio: string | null | undefined) {
  const trimmed = (bio ?? "").trim();
  if (trimmed.length > 200) {
    return "个人介绍最多 200 字";
  }

  return null;
}

export function validateGender(gender: string | null | undefined) {
  if (gender == null || gender === "") {
    return null;
  }

  if (!(PROFILE_GENDERS as readonly string[]).includes(gender)) {
    return "性别选项无效";
  }

  return null;
}

export function validateCity(city: string | null | undefined) {
  const trimmed = (city ?? "").trim();
  if (trimmed.length > 50) {
    return "所在城市最多 50 个字符";
  }

  return null;
}

export function normalizeGender(
  gender: string | null | undefined,
): ProfileGender | null {
  if (gender == null || gender === "") {
    return null;
  }

  if ((PROFILE_GENDERS as readonly string[]).includes(gender)) {
    return gender as ProfileGender;
  }

  return null;
}

export function validateMerchantBusinessName(businessName: string) {
  const trimmed = businessName.trim();
  if (trimmed.length < 2) {
    return "商家名称至少 2 个字符";
  }

  if (trimmed.length > 50) {
    return "商家名称最多 50 个字符";
  }

  return null;
}

export function validateMerchantDescription(description: string | null | undefined) {
  const trimmed = (description ?? "").trim();
  if (trimmed.length > 500) {
    return "商家简介最多 500 字";
  }

  return null;
}

export function validateMerchantField(
  value: string | null | undefined,
  label: string,
  maxLength: number,
) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length > maxLength) {
    return `${label}最多 ${maxLength} 个字符`;
  }

  return null;
}
