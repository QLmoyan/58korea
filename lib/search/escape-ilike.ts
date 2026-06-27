export const SEARCH_RESULT_LIMIT = 50;

export function escapeIlikePattern(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export function buildIlikePattern(query: string) {
  const normalized = query.trim();
  if (!normalized) {
    return null;
  }

  return `%${escapeIlikePattern(normalized)}%`;
}

/** Quote ilike value for PostgREST `.or()` filters (commas/dots must not break parsing). */
export function quotePostgrestIlikeValue(pattern: string) {
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildIlikeOrFilter(columns: string[], query: string) {
  const pattern = buildIlikePattern(query);
  if (!pattern) {
    return null;
  }

  const quoted = quotePostgrestIlikeValue(pattern);
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}
