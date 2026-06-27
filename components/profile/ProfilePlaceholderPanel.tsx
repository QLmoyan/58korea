interface ProfilePlaceholderPanelProps {
  title: string;
  description: string;
}

export default function ProfilePlaceholderPanel({
  title,
  description,
}: ProfilePlaceholderPanelProps) {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">
        📂
      </div>
      <h2 className="mt-4 text-sm font-semibold text-zinc-800">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
        {description}
      </p>
      <span className="mt-4 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
        功能开发中
      </span>
    </section>
  );
}
