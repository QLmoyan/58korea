"use client";

import { AuthProvider } from "@/lib/store/auth-store";
import { ImageViewerProvider } from "@/lib/store/image-viewer-store";
import { PostStoreProvider } from "@/lib/store/post-store";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ImageViewerProvider>
      <AuthProvider>
        <PostStoreProvider>{children}</PostStoreProvider>
      </AuthProvider>
    </ImageViewerProvider>
  );
}
