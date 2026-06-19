"use server";

import {
  normalizeUsername,
  toInternalEmail,
  validateUsername,
} from "@/lib/auth/username";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RegisterUserInput {
  username: string;
  password: string;
  nickname: string;
  bio?: string;
}

function mapRegisterError(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("email_exists") ||
    lower.includes("user already registered")
  ) {
    return "账号已存在";
  }

  if (message.includes("profiles_username_unique")) {
    return "账号已存在";
  }

  if (message.includes("profiles_nickname_unique")) {
    return "该昵称已被占用，请换一个";
  }

  return message;
}

export async function registerUserAction(input: RegisterUserInput) {
  const usernameError = validateUsername(input.username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const password = input.password;
  if (password.length < 6) {
    throw new Error("密码至少 6 位");
  }

  const nickname = input.nickname.trim();
  if (nickname.length < 2) {
    throw new Error("昵称至少 2 个字符");
  }

  const bio = (input.bio ?? "").trim();
  if (bio.length > 200) {
    throw new Error("个人介绍最多 200 字");
  }

  const username = normalizeUsername(input.username);
  const email = toInternalEmail(username);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      nickname,
      bio,
    },
  });

  if (error) {
    throw new Error(mapRegisterError(error.message));
  }

  if (!data.user) {
    throw new Error("注册失败，请稍后重试");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      username,
      nickname,
      bio: bio || null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(mapRegisterError(profileError.message));
  }

  return { userId: data.user.id };
}
