import { toAbsoluteUrl } from "@/lib/share/site-url";

export type SharePayload = {
  path: string;
  title: string;
  text?: string;
};

export type ShareResult = "shared" | "copied";

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("当前环境不支持复制链接");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("复制链接失败，请手动复制");
  }
}

export async function shareContent(payload: SharePayload): Promise<ShareResult> {
  const url = toAbsoluteUrl(payload.path);
  const shareText = payload.text?.trim() || payload.title;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: shareText,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
    }
  }

  await copyTextToClipboard(url);
  return "copied";
}
