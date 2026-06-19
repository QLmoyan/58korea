import { createClientId } from "@/lib/utils/create-client-id";

const STORAGE_KEY = "58korea_reporter_key";

export function getReporterKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextKey = createClientId();
    localStorage.setItem(STORAGE_KEY, nextKey);
    return nextKey;
  } catch {
    return createClientId();
  }
}
