import {
  compareSearchRank,
  scoreMerchantMatch,
  scorePostMatch,
  scoreSearchFields,
  scoreTextMatch,
  scoreUserMatch,
  sortBySearchRank,
} from "../lib/search/match-score";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOrder<T>(
  items: T[],
  scoreOf: (item: T) => number,
  message: string,
) {
  for (let index = 1; index < items.length; index += 1) {
    assert(
      scoreOf(items[index - 1]) >= scoreOf(items[index]),
      `${message} at index ${index}`,
    );
  }
}

function main() {
  const keyword = "租房";

  console.log("1) exact match ranks highest");
  const exact = scoreTextMatch(keyword, keyword, "primary");
  const prefix = scoreTextMatch(`${keyword}攻略`, keyword, "primary");
  const contains = scoreTextMatch(`韩国${keyword}信息`, keyword, "primary");
  assert(exact > prefix, "exact should beat prefix");
  assert(prefix > contains, "prefix should beat contains");
  console.log("   PASS");

  console.log("2) primary field beats secondary field at same match tier");
  const titleContains = scorePostMatch(
    { title: `韩国${keyword}`, content: null, author: "作者" },
    keyword,
  );
  const contentContains = scorePostMatch(
    { title: "其他标题", content: `韩国${keyword}`, author: "作者" },
    keyword,
  );
  assert(titleContains > contentContains, "title contains should beat content contains");
  const contentExact = scorePostMatch(
    { title: "其他标题", content: keyword, author: "作者" },
    keyword,
  );
  assert(contentExact > titleContains, "content exact should beat title contains");
  console.log("   PASS");

  console.log("3) post ranking prefers title over content");
  const posts = sortBySearchRank(
    [
      { id: 1, title: "普通标题", content: `${keyword}正文`, author: "作者", createdAt: "2026-01-03T00:00:00.000Z" },
      { id: 2, title: keyword, content: "正文", author: "作者", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: 3, title: `${keyword}攻略`, content: "正文", author: "作者", createdAt: "2026-01-02T00:00:00.000Z" },
    ],
    {
      scoreOf: (post) => scorePostMatch(post, keyword),
      timestampOf: (post) => post.createdAt,
    },
  );
  assert(posts[0]?.title === keyword, "exact title should be first");
  assert(posts[1]?.title === `${keyword}攻略`, "prefix title should be second");
  assert(posts[2]?.content?.includes(keyword), "content match should be last");
  console.log("   PASS");

  console.log("4) user ranking prefers username over bio");
  const users = sortBySearchRank(
    [
      {
        result: { username: "user_bio", nickname: "昵称", bio: `${keyword}简介` },
        row: { updated_at: "2026-01-03T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      },
      {
        result: { username: keyword, nickname: "昵称", bio: "简介" },
        row: { updated_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      },
    ],
    {
      scoreOf: ({ result }) => scoreUserMatch(result, keyword),
      timestampOf: ({ row }) => row.updated_at,
    },
  );
  assert(users[0]?.result.username === keyword, "exact username should rank first");
  console.log("   PASS");

  console.log("5) merchant ranking prefers business name over address");
  const merchants = sortBySearchRank(
    [
      {
        result: { businessName: "其他店", description: null, address: `${keyword}地址` },
        merchant: { updated_at: "2026-01-03T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      },
      {
        result: { businessName: keyword, description: null, address: null },
        merchant: { updated_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      },
    ],
    {
      scoreOf: ({ result }) => scoreMerchantMatch(result, keyword),
      timestampOf: ({ merchant }) => merchant.updated_at,
    },
  );
  assert(
    merchants[0]?.result.businessName === keyword,
    "exact business name should rank first",
  );
  console.log("   PASS");

  console.log("6) equal score falls back to newer timestamp");
  const tieBreak = sortBySearchRank(
    [
      { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", createdAt: "2026-01-05T00:00:00.000Z" },
    ],
    {
      scoreOf: () => scoreSearchFields([{ value: keyword, weight: "primary" }], keyword),
      timestampOf: (item) => item.createdAt,
    },
  );
  assert(tieBreak[0]?.id === "new", "newer item should win tie-break");
  assert(
    compareSearchRank(
      { score: 100, at: "2026-01-01T00:00:00.000Z" },
      { score: 100, at: "2026-01-05T00:00:00.000Z" },
      {
        scoreOf: (item) => item.score,
        timestampOf: (item) => item.at,
      },
    ) > 0,
    "compareSearchRank should prefer newer timestamp",
  );
  console.log("   PASS");

  console.log("7) score aggregation across multiple fields");
  const multiField = scorePostMatch(
    {
      title: `${keyword}标题`,
      content: `${keyword}正文`,
      author: "作者",
    },
    keyword,
  );
  const singleField = scorePostMatch(
    {
      title: `${keyword}标题`,
      content: null,
      author: "作者",
    },
    keyword,
  );
  assert(multiField > singleField, "multiple matches should increase score");
  assertOrder(
    [
      { label: "exact", score: scoreTextMatch(keyword, keyword, "primary") },
      { label: "prefix", score: scoreTextMatch(`${keyword}A`, keyword, "primary") },
      { label: "contains", score: scoreTextMatch(`A${keyword}B`, keyword, "primary") },
      { label: "secondary", score: scoreTextMatch(`A${keyword}B`, keyword, "secondary") },
    ],
    (item) => item.score,
    "match priority order",
  );
  console.log("   PASS");

  console.log("\nAll search match score V1 tests passed.");
}

main();
