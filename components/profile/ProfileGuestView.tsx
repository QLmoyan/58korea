import Link from "next/link";
import BottomNav from "@/components/home/BottomNav";
import { buildLoginHref, buildRegisterHref } from "@/lib/auth/redirect";

export default function ProfileGuestView() {
  const loginHref = buildLoginHref("/profile");
  const registerHref = buildRegisterHref("/profile");

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-lg bg-zinc-50 pb-24 lg:hidden">
      <main className="px-3 pt-4 pb-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-400">
              🙂
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-900">
              登录后查看我的主页
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              登录或注册后，可管理个人资料、查看我的帖子、收藏和优惠券。
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              href={loginHref}
              className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200"
            >
              登录
            </Link>
            <Link
              href={registerHref}
              className="flex w-full items-center justify-center rounded-full bg-zinc-100 py-3.5 text-sm font-medium text-zinc-700"
            >
              注册新账号
            </Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
