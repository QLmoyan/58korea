const FULLWIDTH_OFFSET = 0xfee0;

export function normalizeModerationText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\uFF01-\uFF5E]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - FULLWIDTH_OFFSET),
    )
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildInspectionText(input: {
  targetType: "post" | "comment";
  title?: string;
  content: string;
  category?: string;
  replyToAuthor?: string | null;
}): string {
  const parts =
    input.targetType === "post"
      ? [input.title, input.content, input.category]
      : [input.content, input.replyToAuthor];

  return normalizeModerationText(parts.filter(Boolean).join("\n"));
}
