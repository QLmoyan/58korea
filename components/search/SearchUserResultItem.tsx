import Image from "next/image";
import Link from "next/link";
import SearchHighlightText from "@/components/search/SearchHighlightText";
import type { SearchUserResult } from "@/lib/search/types";

interface SearchUserResultItemProps {
  user: SearchUserResult;
  highlightQuery?: string;
}

export default function SearchUserResultItem({
  user,
  highlightQuery = "",
}: SearchUserResultItemProps) {
  const avatarLabel = user.nickname.slice(0, 1) || user.username.slice(0, 1);

  return (
    <Link
      href={user.profileHref}
      className="flex items-start gap-3 border-b border-zinc-100 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 lg:px-0"
    >
      {user.avatarUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100">
          <Image
            src={user.avatarUrl}
            alt={user.nickname}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-sm font-semibold text-white">
          {avatarLabel}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            <SearchHighlightText text={user.nickname} query={highlightQuery} />
          </h3>
          <span className="truncate text-xs text-zinc-400">
            @
            <SearchHighlightText text={user.username} query={highlightQuery} />
          </span>
        </div>
        {user.bio?.trim() ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
            <SearchHighlightText text={user.bio} query={highlightQuery} />
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">暂无简介</p>
        )}
      </div>
    </Link>
  );
}
