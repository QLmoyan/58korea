import type {
  PostCouponBindingInput,
  PublishCategorySelection,
} from "@/lib/types/community";

const DRAFT_KEY = "58korea:publish-draft-v1";

export type PublishDraft = {
  title: string;
  content: string;
  categorySelection: PublishCategorySelection;
  couponBinding: PostCouponBindingInput;
  savedAt: string;
};

export function loadPublishDraft(): PublishDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PublishDraft;
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.content !== "string" ||
      typeof parsed.categorySelection !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function savePublishDraft(draft: Omit<PublishDraft, "savedAt">) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PublishDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearPublishDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(DRAFT_KEY);
}
