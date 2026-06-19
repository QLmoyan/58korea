import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-400">加载中...</p>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
