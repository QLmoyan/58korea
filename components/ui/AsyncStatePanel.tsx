interface AsyncStatePanelProps {
  message: string;
  tone?: "muted" | "error";
  onRetry?: () => void;
  retryLabel?: string;
}

export default function AsyncStatePanel({
  message,
  tone = "muted",
  onRetry,
  retryLabel = "重试",
}: AsyncStatePanelProps) {
  const messageClass =
    tone === "error" ? "text-sm text-rose-500" : "text-sm text-zinc-400";

  return (
    <section className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className={messageClass}>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 touch-manipulation rounded-full bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-100 active:bg-rose-200"
        >
          {retryLabel}
        </button>
      ) : null}
    </section>
  );
}
