function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/** Structured client-side error logging for mobile/LAN debugging. */
export function logClientError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[韩圈:${scope}]`, {
    message: formatError(error),
    href: typeof window !== "undefined" ? window.location.href : undefined,
    ...extra,
  });
}
