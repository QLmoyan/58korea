export default function InlineRefreshBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="h-0.5 w-full overflow-hidden bg-rose-100"
      aria-hidden="true"
      data-testid="inline-refresh-bar"
    >
      <div className="h-full w-1/3 animate-pulse bg-rose-500" />
    </div>
  );
}
