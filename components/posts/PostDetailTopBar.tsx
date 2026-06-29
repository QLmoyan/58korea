"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import PostAuthorLink from "@/components/posts/PostAuthorLink";

interface PostDetailTopBarProps {
  author: string;
  authorHomeHref?: string | null;
  showMerchantBadge?: boolean;
  backHref?: string;
  variant?: "page" | "embedded";
  ownedPost: boolean;
  deleteConfirming: boolean;
  deleting: boolean;
  onReport: () => void;
  onDeleteClick: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}

export default function PostDetailTopBar({
  author,
  authorHomeHref,
  showMerchantBadge = false,
  backHref = "/",
  variant = "page",
  ownedPost,
  deleteConfirming,
  deleting,
  onReport,
  onDeleteClick,
  onDeleteCancel,
  onDeleteConfirm,
}: PostDetailTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className={
        variant === "embedded"
          ? "shrink-0 border-b border-zinc-100 bg-white"
          : "fixed top-0 right-0 left-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md"
      }
    >
      <div
        className={
          variant === "embedded"
            ? "flex h-14 items-center gap-2 px-4"
            : "mx-auto flex h-12 max-w-full items-center gap-2 px-2 sm:max-w-lg sm:px-3"
        }
      >
        {variant === "page" ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
            aria-label="返回"
          >
            <BackIcon />
          </Link>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PostAuthorLink
            author={author}
            href={authorHomeHref}
            className="flex min-w-0 flex-1 items-center gap-2"
            avatarClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white"
            nameClassName="truncate text-sm font-semibold text-zinc-900"
          >
            {showMerchantBadge ? <MerchantVerifiedBadge /> : null}
          </PostAuthorLink>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {deleteConfirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDeleteCancel}
                disabled={deleting}
                className="touch-manipulation rounded-full px-2 py-1 text-[11px] font-medium text-zinc-400 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onDeleteConfirm}
                disabled={deleting}
                className="touch-manipulation rounded-full px-2 py-1 text-[11px] font-medium text-rose-500 disabled:opacity-60"
              >
                {deleting ? "删除中" : "确认"}
              </button>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100"
                aria-label="更多操作"
                aria-expanded={menuOpen}
              >
                <MoreIcon />
              </button>

              {menuOpen ? (
                <div className="absolute top-9 right-0 z-50 min-w-[112px] overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 shadow-lg">
                  {ownedPost ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        onDeleteClick();
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-rose-500 hover:bg-rose-50"
                    >
                      删除帖子
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        onReport();
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      举报
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}
