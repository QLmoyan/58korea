"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ProfileGuestView from "@/components/profile/ProfileGuestView";
import ProfileLoggedInView from "@/components/profile/ProfileLoggedInView";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { LOADING_UI_DEADLINE_MS } from "@/lib/constants/network";
import { buildLoginHref, buildRegisterHref } from "@/lib/auth/redirect";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { useAuthStore } from "@/lib/store/auth-store";

function ProfileSavedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (searchParams.get("saved") !== "1") {
      return;
    }

    setToast("资料保存成功");
    router.replace("/profile");

    const timer = window.setTimeout(() => {
      setToast("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [searchParams, router]);

  if (!toast) {
    return null;
  }

  return (
    <p className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
      {toast}
    </p>
  );
}

export default function ProfileContent() {
  const { user, loading, initError, retryInit, signOut } = useAuthStore();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loadingOverdue = useLoadingDeadline(loading, LOADING_UI_DEADLINE_MS);
  const authError =
    initError ??
    (loadingOverdue ? "登录状态加载超时，请检查网络后重试" : null);

  async function handleSignOut() {
    setSubmitting(true);
    setError("");

    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "退出失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !authError) {
    return (
      <>
        <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-zinc-50 pb-24 lg:hidden">
          <AsyncStatePanel message="加载中..." />
        </div>
        <div className="hidden min-h-screen items-center justify-center bg-zinc-50 pl-[220px] lg:flex">
          <AsyncStatePanel message="加载中..." />
        </div>
      </>
    );
  }

  if (authError && !user) {
    return (
      <>
        <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-zinc-50 pb-24 lg:hidden">
          <AsyncStatePanel
            message={authError}
            tone="error"
            onRetry={retryInit}
          />
        </div>
        <div className="hidden min-h-screen items-center justify-center bg-zinc-50 pl-[220px] lg:flex">
          <AsyncStatePanel
            message={authError}
            tone="error"
            onRetry={retryInit}
          />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <ProfileGuestView />
        <div className="hidden min-h-screen bg-zinc-50 pl-[220px] lg:block">
          <DesktopHomeSidebar />
          <div className="flex min-h-screen items-center justify-center px-8">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-100">
              <h1 className="text-lg font-semibold text-zinc-900">我的主页</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                登录后可管理个人资料，查看我的帖子、收藏和优惠券。
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={buildLoginHref("/profile")}
                  className="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white"
                >
                  登录
                </Link>
                <Link
                  href={buildRegisterHref("/profile")}
                  className="rounded-full bg-zinc-100 py-3 text-sm font-medium text-zinc-700"
                >
                  注册新账号
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <ProfileSavedToast />
      </Suspense>

      <div className="relative mx-auto min-h-screen w-full max-w-lg bg-zinc-50 pb-24 lg:hidden">
        <main>
          <ProfileLoggedInView
            layout="mobile"
            onSignOut={handleSignOut}
            signingOut={submitting}
            signOutError={error}
          />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 lg:block">
        <DesktopHomeSidebar />
        <div className="pl-[220px]">
          <ProfileLoggedInView
            layout="desktop"
            onSignOut={handleSignOut}
            signingOut={submitting}
            signOutError={error}
          />
        </div>
      </div>
    </>
  );
}
