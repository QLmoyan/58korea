interface NotificationDotProps {
  className?: string;
}

export default function NotificationDot({ className = "" }: NotificationDotProps) {
  return (
    <span
      className={`absolute h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white ${className}`}
      aria-hidden="true"
    />
  );
}
