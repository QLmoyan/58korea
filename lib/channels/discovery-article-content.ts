const DISCOVERY_META_START = "<!-- hanquan-discovery";
const DISCOVERY_META_END = "-->";

export interface DiscoveryArticleFields {
  summary: string;
  bodyMarkdown: string;
  sourceUrl: string;
}

export function assembleDiscoveryArticleMarkdown(
  input: DiscoveryArticleFields,
): string {
  const metaLines = [DISCOVERY_META_START];

  if (input.summary.trim()) {
    metaLines.push(`summary: ${input.summary.trim()}`);
  }

  if (input.sourceUrl.trim()) {
    metaLines.push(`source: ${input.sourceUrl.trim()}`);
  }

  metaLines.push(DISCOVERY_META_END, "", input.bodyMarkdown.trim());

  return metaLines.join("\n").trim();
}

export function parseDiscoveryArticleMarkdown(
  contentMarkdown: string,
): DiscoveryArticleFields {
  const trimmed = contentMarkdown.trim();
  const metaMatch = trimmed.match(
    /^<!-- hanquan-discovery\n([\s\S]*?)\n-->\n?/,
  );

  if (!metaMatch) {
    return {
      summary: "",
      bodyMarkdown: trimmed,
      sourceUrl: "",
    };
  }

  const metaBlock = metaMatch[1];
  const bodyMarkdown = trimmed.slice(metaMatch[0].length).trim();
  let summary = "";
  let sourceUrl = "";

  for (const line of metaBlock.split("\n")) {
    if (line.startsWith("summary: ")) {
      summary = line.slice("summary: ".length).trim();
    }
    if (line.startsWith("source: ")) {
      sourceUrl = line.slice("source: ".length).trim();
    }
  }

  return {
    summary,
    bodyMarkdown,
    sourceUrl,
  };
}

export function extractDiscoveryArticleSummaryExcerpt(
  contentMarkdown: string,
  maxLength = 80,
): string {
  const parsed = parseDiscoveryArticleMarkdown(contentMarkdown);
  const excerpt = parsed.summary.trim() || parsed.bodyMarkdown.replace(/\s+/g, " ").trim();

  if (!excerpt) {
    return "";
  }

  return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength)}…` : excerpt;
}
