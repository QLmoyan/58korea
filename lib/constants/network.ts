/** Max posts loaded for the home/profile feeds (client-side Supabase query). */
export const FEED_PAGE_SIZE = 50;

/** Auth session init should not block the UI indefinitely on slow mobile networks. */
export const AUTH_INIT_TIMEOUT_MS = 8_000;

/** Client-side Supabase / server-action calls should fail fast instead of hanging. */
export const CLIENT_FETCH_TIMEOUT_MS = 15_000;

/** UI-level loading deadline (store timeout + small buffer). */
export const LOADING_UI_DEADLINE_MS = AUTH_INIT_TIMEOUT_MS + 3_000;

/** Feed UI deadline (client fetch timeout + buffer). */
export const FEED_UI_DEADLINE_MS = CLIENT_FETCH_TIMEOUT_MS + 3_000;
