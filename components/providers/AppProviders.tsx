"use client";

import { AuthProvider } from "@/lib/store/auth-store";
import { PostStoreProvider } from "@/lib/store/post-store";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PostStoreProvider>{children}</PostStoreProvider>
    </AuthProvider>
  );
}
