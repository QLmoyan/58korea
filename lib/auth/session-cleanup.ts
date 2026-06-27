import { clearOwnedContent } from "@/lib/local/owned-content";
import { clearPublishDraft } from "@/lib/merchant/publish-draft";

/** Clear client-side data tied to the signed-in user on this device. */
export function clearUserSessionLocalData() {
  clearPublishDraft();
  clearOwnedContent();
}
