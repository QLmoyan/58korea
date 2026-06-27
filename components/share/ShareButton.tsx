"use client";

import { useState } from "react";
import ShareIcon from "@/components/share/ShareIcon";
import { SHARE_COPY_SUCCESS_MESSAGE } from "@/lib/share/constants";
import { shareContent, type SharePayload } from "@/lib/share/share-content";

type ShareButtonVariant = "toolbar" | "pill" | "inline";

interface ShareButtonProps extends SharePayload {
  variant?: ShareButtonVariant;
  className?: string;
  label?: string;
}

export default function ShareButton({
  path,
  title,
  text,
  variant = "toolbar",
  className = "",
  label = "分享",
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleShare() {
    if (busy) {
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const result = await shareContent({ path, title, text });
      if (result === "copied") {
        setNotice(SHARE_COPY_SUCCESS_MESSAGE);
        window.setTimeout(() => {
          setNotice("");
        }, 2500);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setNotice(error instanceof Error ? error.message : "分享失败，请稍后重试");
      window.setTimeout(() => {
        setNotice("");
      }, 2500);
    } finally {
      setBusy(false);
    }
  }

  if (variant === "pill") {
    return (
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-60"
          aria-label={label}
        >
          <ShareIcon className="h-4 w-4" />
          {label}
        </button>
        {notice ? <span className="text-[11px] text-amber-700">{notice}</span> : null}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex flex-col items-stretch gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className="min-h-11 touch-manipulation rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-60"
          aria-label={label}
        >
          {busy ? "处理中..." : label}
        </button>
        {notice ? (
          <span className="text-center text-[11px] text-amber-700">{notice}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 flex-col items-center gap-0.5 px-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={busy}
        className="flex flex-col items-center gap-0.5 text-zinc-500 transition-colors hover:text-rose-500 disabled:opacity-60"
        aria-label={label}
      >
        <ShareIcon className="h-5 w-5" />
        <span className="text-[10px] leading-none">{busy ? "..." : label}</span>
      </button>
      {notice ? (
        <span className="max-w-20 text-center text-[10px] leading-4 text-amber-700">
          {notice}
        </span>
      ) : null}
    </div>
  );
}
