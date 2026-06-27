import { isSearchQueryEmpty, normalizeSearchQuery } from "./normalize-query";

export type HighlightTextSegment = {
  text: string;
  highlight: boolean;
};

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitTextByKeyword(
  text: string,
  query: string,
): HighlightTextSegment[] {
  if (!text) {
    return [{ text: "", highlight: false }];
  }

  const normalizedQuery = normalizeSearchQuery(query);
  if (isSearchQueryEmpty(normalizedQuery)) {
    return [{ text, highlight: false }];
  }

  const regex = new RegExp(escapeRegExp(normalizedQuery), "gi");
  const segments: HighlightTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        highlight: false,
      });
    }

    segments.push({
      text: match[0],
      highlight: true,
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      highlight: false,
    });
  }

  if (segments.length === 0) {
    return [{ text, highlight: false }];
  }

  return segments;
}
