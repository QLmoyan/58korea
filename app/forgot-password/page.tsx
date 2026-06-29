import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { buildLoginHref } from "@/lib/auth/redirect";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-safe">
      <PageHeader title="忘记密码" backHref={buildLoginHref()} />

      <main className="px-4 pt-20">
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <h1 className="text-base font-semibold text-zinc-900">如何找回密码</h1>

          <p className="text-sm leading-6 text-zinc-600">
            韩圈使用<strong className="font-medium text-zinc-800">用户名</strong>
            登录，不是邮箱登录。当前版本暂不支持自助邮件重置密码。
          </p>

          <p className="text-sm leading-6 text-zinc-600">
            如果你仍记得当前密码，可在
            <Link href="/profile/edit" className="mx-1 font-medium text-rose-500">
              编辑资料
            </Link>
            页面修改密码。
          </p>

          <p className="text-sm leading-6 text-zinc-600">
            如果已忘记密码，请联系站长或客服，提供你的注册用户名，核实身份后由人工重置。
          </p>

          <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-100">
            <p className="font-medium text-zinc-800">联系时请准备</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-600">
              <li>注册用户名</li>
              <li>常用昵称或近期发帖信息（便于核实）</li>
            </ul>
          </div>

          <p className="text-xs leading-5 text-zinc-400">
            本站不会通过私信索要完整密码，重置后请尽快登录并修改为新密码。
          </p>
        </section>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href={buildLoginHref()} className="font-medium text-rose-500">
            返回登录
          </Link>
        </p>
      </main>
    </div>
  );
}
