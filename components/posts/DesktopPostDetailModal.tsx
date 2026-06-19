"use client";

import PostDetailOverlayContent from "@/components/posts/PostDetailOverlayContent";

interface DesktopPostDetailModalProps {
  postId: number;
  onClose: () => void;
}

export default function DesktopPostDetailModal({
  postId,
  onClose,
}: DesktopPostDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="帖子详情"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="关闭"
      >
        <CloseIcon />
      </button>

      <div
        className="flex h-[86vh] min-h-[640px] max-h-[900px] w-full max-w-[920px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <PostDetailOverlayContent postId={postId} onClose={onClose} />
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
