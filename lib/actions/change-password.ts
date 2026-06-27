"use server";

import { createSupabaseServerClient, getServerAuthUser } from "@/lib/supabase/server";

function mapChangePasswordError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "当前密码错误";
  }

  return message;
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const email = user.email?.trim();
  if (!email) {
    throw new Error("账号信息异常，请重新登录后再试");
  }

  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;

  if (!currentPassword) {
    throw new Error("请填写当前密码");
  }

  if (newPassword.length < 6) {
    throw new Error("密码至少 6 位");
  }

  if (currentPassword === newPassword) {
    throw new Error("新密码不能与当前密码相同");
  }

  const supabase = await createSupabaseServerClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error(mapChangePasswordError(verifyError.message));
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new Error(mapChangePasswordError(updateError.message));
  }

  return { success: true as const };
}
