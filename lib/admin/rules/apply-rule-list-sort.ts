import type { RuleSortBy } from "@/lib/types/admin-rules";

export function applyRuleListSort<
  T extends {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => T;
  },
>(query: T, sortBy: RuleSortBy | undefined): T {
  if (sortBy === "hit_count") {
    return query
      .order("hit_count", { ascending: false })
      .order("created_at", { ascending: false });
  }

  return query
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
}
