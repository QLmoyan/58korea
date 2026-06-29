import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-400">加载中...</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
