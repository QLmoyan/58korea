export const PROFILE_GENDERS = ["男", "女", "保密"] as const;

export type ProfileGender = (typeof PROFILE_GENDERS)[number];
