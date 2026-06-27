import { splitTextByKeyword } from "../lib/search/highlight-text";
import { isSearchQueryEmpty } from "../lib/search/normalize-query";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function joinedText(segments: ReturnType<typeof splitTextByKeyword>) {
  return segments.map((segment) => segment.text).join("");
}

function highlightedText(segments: ReturnType<typeof splitTextByKeyword>) {
  return segments.filter((segment) => segment.highlight).map((segment) => segment.text);
}

function main() {
  console.log("1) empty keyword does not highlight");
  const emptySegments = splitTextByKeyword("韩国租房", "   ");
  assert(emptySegments.length === 1, "expected single segment");
  assert(!emptySegments[0]?.highlight, "empty query should not highlight");
  assert(isSearchQueryEmpty("   "), "whitespace-only query should be empty");
  console.log("   PASS");

  console.log("2) case-insensitive highlight");
  const caseSegments = splitTextByKeyword("Seoul SEOUL seoul", "seoul");
  assert(
    highlightedText(caseSegments).length === 3,
    "case-insensitive matches should highlight all occurrences",
  );
  console.log("   PASS");

  console.log("3) special characters are matched literally");
  const specialQuery = "100%,测试";
  const specialText = "价格100%,测试优惠";
  const specialSegments = splitTextByKeyword(specialText, specialQuery);
  assert(joinedText(specialSegments) === specialText, "splitting should preserve text");
  assert(
    highlightedText(specialSegments)[0] === specialQuery,
    "special characters should match literally",
  );

  const wildcardText = "50%_\\折扣";
  const wildcardSegments = splitTextByKeyword(wildcardText, "50%_\\");
  assert(
    highlightedText(wildcardSegments)[0] === "50%_\\",
    "percent/underscore/backslash should match literally",
  );
  console.log("   PASS");

  console.log("4) multi-word query respects normalized spaces");
  const spacedSegments = splitTextByKeyword("韩国 租房 攻略", "韩国 租房");
  assert(
    highlightedText(spacedSegments)[0] === "韩国 租房",
    "normalized multi-word query should highlight phrase",
  );
  console.log("   PASS");

  console.log("5) comma in keyword does not break splitting");
  const commaSegments = splitTextByKeyword("A,B,C", ",B,");
  assert(highlightedText(commaSegments)[0] === ",B,", "comma should be part of literal match");
  console.log("   PASS");

  console.log("6) no match returns original text");
  const noMatchSegments = splitTextByKeyword("韩国美食", "租房");
  assert(noMatchSegments.length === 1, "no match should return one segment");
  assert(!noMatchSegments[0]?.highlight, "no match should not highlight");
  assert(joinedText(noMatchSegments) === "韩国美食", "text should remain unchanged");
  console.log("   PASS");

  console.log("\nAll search highlight V1 tests passed.");
}

main();
