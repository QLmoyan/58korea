"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getOrCreateConversationAction } from "@/lib/actions/chat";
import { buildLoginHref } from "@/lib/auth/redirect";
import { useAuthStore } from "@/lib/store/auth-store";

interface StartChatButtonProps {
  targetUserId: string;
  profilePath: string;
  className?: string;
}

export default function StartChatButton({
  targetUserId,
  profilePath,
  className = "",
}: StartChatButtonProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!targetUserId) {
    return null;
  }

  if (user?.id === targetUserId) {
    return null;
  }

  async function handleStartChat() {
    setLoading(true);
    setError("");

    try {
      const { conversationId } = await getOrCreateConversationAction(targetUserId);
      router.push(`/messages/chat/${conversationId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "发起私信失败",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <Link
        href={buildLoginHref(profilePath)}
        className={`inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 ${className}`}
      >
        发消息
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => void handleStartChat()}
        disabled={loading}
        className={`inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 ${className}`}
      >
        {loading ? "打开中..." : "发消息"}
      </button>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
