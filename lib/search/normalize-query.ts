export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function isSearchQueryEmpty(query: string): boolean {
  return normalizeSearchQuery(query).length === 0;
}
