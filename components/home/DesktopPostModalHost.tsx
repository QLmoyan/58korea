"use client";

import DesktopPostDetailModal from "@/components/posts/DesktopPostDetailModal";
import { useDesktopPostModal } from "@/lib/store/desktop-post-modal-store";

export default function DesktopPostModalHost() {
  const { openPostId, closePostModal } = useDesktopPostModal();

  if (openPostId === null) {
    return null;
  }

  return (
    <DesktopPostDetailModal postId={openPostId} onClose={closePostModal} />
  );
}
