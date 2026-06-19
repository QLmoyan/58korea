interface DesktopHomeSearchProps {
  className?: string;
}

export default function DesktopHomeSearch({
  className = "",
}: DesktopHomeSearchProps) {
  return (
    <div className={`hidden min-w-0 flex-1 lg:block ${className}`}>
      <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2">
        <SearchIcon />
        <input
          type="search"
          placeholder="搜索租房、攻略、二手..."
          readOnly
          aria-label="搜索"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}
