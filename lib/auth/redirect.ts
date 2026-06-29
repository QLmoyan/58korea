const DEFAULT_REDIRECT = "/profile";

/** Accept only same-origin relative paths; block auth pages and open redirects. */
export function resolveRedirectTarget(
  raw: string | null | undefined,
  fallback = DEFAULT_REDIRECT,
): string {
  if (!raw) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  const path = trimmed.split("?")[0] ?? trimmed;
  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/register" ||
    path.startsWith("/register/")
  ) {
    return fallback;
  }

  return trimmed;
}

/** Join pathname + search for login redirect (caller passes raw search, no double-encoding). */
export function buildLoginHrefFromPath(
  pathname: string,
  search = "",
): string {
  const query =
    search.startsWith("?") ? search : search ? `?${search}` : "";
  return buildLoginHref(`${pathname}${query}`);
}

export function buildLoginHref(redirectTo?: string | null): string {
  if (redirectTo == null || redirectTo === "") {
    return "/login";
  }

  const target = resolveRedirectTarget(redirectTo);
  return `/login?redirect=${encodeURIComponent(target)}`;
}

export function buildRegisterHref(redirectTo?: string | null): string {
  if (redirectTo == null || redirectTo === "") {
    return "/register";
  }

  const target = resolveRedirectTarget(redirectTo);
  return `/register?redirect=${encodeURIComponent(target)}`;
}
