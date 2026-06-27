"use client";

import Link from "next/link";

interface PostAuthorLinkProps {
  author: string;
  href?: string | null;
  avatarClassName?: string;
  nameClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function PostAuthorLink({
  author,
  href,
  avatarClassName = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white",
  nameClassName = "truncate text-xs text-zinc-500",
  className = "flex min-w-0 items-center gap-1.5",
  children,
}: PostAuthorLinkProps) {
  const content = (
    <>
      <div className={avatarClassName}>{author.slice(0, 1)}</div>
      <span className={nameClassName}>{author}</span>
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(event) => event.stopPropagation()}
        className={`${className} transition-opacity hover:opacity-80`}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
