"use client";

import { AuthProvider } from "@/lib/store/auth-store";
import { ImageViewerProvider } from "@/lib/store/image-viewer-store";
import { MerchantStoreProvider } from "@/lib/store/merchant-store";
import { PostStoreProvider } from "@/lib/store/post-store";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ImageViewerProvider>
      <AuthProvider>
        <MerchantStoreProvider>
          <PostStoreProvider>{children}</PostStoreProvider>
        </MerchantStoreProvider>
      </AuthProvider>
    </ImageViewerProvider>
  );
}
