import Link from "next/link";
import { MESSAGE_LOGIN_PROMPT } from "@/lib/messages/constants";

export default function MessageLoginPrompt() {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl">
        💬
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-600">
        {MESSAGE_LOGIN_PROMPT}
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/login"
          className="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white shadow-sm"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-zinc-100 py-3 text-sm font-medium text-zinc-700"
        >
          注册
        </Link>
      </div>
    </section>
  );
}
