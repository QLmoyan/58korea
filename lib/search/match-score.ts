export type SearchFieldWeight = "primary" | "secondary";

const TIER_EXACT = 1_000_000;
const TIER_PREFIX = 100_000;
const TIER_CONTAINS = 10_000;
const WEIGHT_PRIMARY = 100;
const WEIGHT_SECONDARY = 1;

function matchTier(
  haystack: string,
  needle: string,
): typeof TIER_EXACT | typeof TIER_PREFIX | typeof TIER_CONTAINS | 0 {
  if (haystack === needle) {
    return TIER_EXACT;
  }

  if (haystack.startsWith(needle)) {
    return TIER_PREFIX;
  }

  if (haystack.includes(needle)) {
    return TIER_CONTAINS;
  }

  return 0;
}

export function scoreTextMatch(
  value: string | null | undefined,
  query: string,
  weight: SearchFieldWeight,
): number {
  if (!value?.trim()) {
    return 0;
  }

  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return 0;
  }

  const tier = matchTier(haystack, needle);
  if (tier === 0) {
    return 0;
  }

  const fieldWeight = weight === "primary" ? WEIGHT_PRIMARY : WEIGHT_SECONDARY;
  return tier + fieldWeight;
}

export function scoreSearchFields(
  fields: Array<{ value: string | null | undefined; weight: SearchFieldWeight }>,
  query: string,
): number {
  return fields.reduce(
    (total, field) => total + scoreTextMatch(field.value, query, field.weight),
    0,
  );
}

export function toSearchTimestamp(
  value: string | number | null | undefined,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export function compareSearchRank<T>(
  left: T,
  right: T,
  options: {
    scoreOf: (item: T) => number;
    timestampOf: (item: T) => string | number | null | undefined;
  },
): number {
  const scoreDelta = options.scoreOf(right) - options.scoreOf(left);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return (
    toSearchTimestamp(options.timestampOf(right)) -
    toSearchTimestamp(options.timestampOf(left))
  );
}

export function sortBySearchRank<T>(
  items: T[],
  options: {
    scoreOf: (item: T) => number;
    timestampOf: (item: T) => string | number | null | undefined;
  },
): T[] {
  return items.slice().sort((left, right) => compareSearchRank(left, right, options));
}

export function scorePostMatch(
  post: { title: string; content?: string | null; author: string },
  query: string,
): number {
  return scoreSearchFields(
    [
      { value: post.title, weight: "primary" },
      { value: post.author, weight: "primary" },
      { value: post.content, weight: "secondary" },
    ],
    query,
  );
}

export function scoreUserMatch(
  user: { username: string; nickname: string; bio?: string | null },
  query: string,
): number {
  return scoreSearchFields(
    [
      { value: user.username, weight: "primary" },
      { value: user.nickname, weight: "primary" },
      { value: user.bio, weight: "secondary" },
    ],
    query,
  );
}

export function scoreMerchantMatch(
  merchant: {
    businessName: string;
    description?: string | null;
    address?: string | null;
  },
  query: string,
): number {
  return scoreSearchFields(
    [
      { value: merchant.businessName, weight: "primary" },
      { value: merchant.description, weight: "secondary" },
      { value: merchant.address, weight: "secondary" },
    ],
    query,
  );
}
