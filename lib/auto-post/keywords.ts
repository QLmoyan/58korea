const STOP_WORDS = new Set([
  "的",
  "了",
  "在",
  "是",
  "和",
  "有",
  "我",
  "你",
  "他",
  "她",
  "它",
  "们",
  "这",
  "那",
  "一个",
  "可以",
  "需要",
  "欢迎",
  "附近",
  "韩国",
  "首尔",
]);

export function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function extractKeywords(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const tokens = new Set<string>();

  for (const chunk of normalized.split(/[\s,，。！？；：、/|]+/)) {
    const token = chunk.trim();
    if (token.length >= 2 && !STOP_WORDS.has(token)) {
      tokens.add(normalizeKeyword(token));
    }
  }

  for (const english of normalized.match(/[a-zA-Z][a-zA-Z0-9+\-.]*/g) ?? []) {
    if (english.length >= 2) {
      tokens.add(normalizeKeyword(english));
    }
  }

  return [...tokens];
}

export function keywordMatches(needle: string, haystack: string): boolean {
  const a = normalizeKeyword(needle);
  const b = normalizeKeyword(haystack);
  return a === b || a.includes(b) || b.includes(a);
}

export function keywordsOverlap(a: string[], b: string[]): boolean {
  return a.some((left) => b.some((right) => keywordMatches(left, right)));
}

export function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const lowered = normalizeKeyword(text);
  return keywords.some((keyword) => lowered.includes(normalizeKeyword(keyword)));
}
