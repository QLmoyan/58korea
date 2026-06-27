import { buildPostSharePath, buildProfileSharePath } from "../lib/share/paths";
import { buildShareMetadata, truncateDescription } from "../lib/share/metadata";
import { toAbsoluteUrl } from "../lib/share/site-url";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  assert(buildPostSharePath(603) === "/posts/603", "post share path");
  assert(
    buildProfileSharePath("QL860430") === "/profile/ql860430",
    "profile share path normalization",
  );

  const metadata = buildShareMetadata({
    title: "测试帖子 - 58韩国",
    description: "这是一段测试描述",
    path: "/posts/603",
  });

  assert(
    metadata.openGraph?.title === "测试帖子 - 58韩国",
    "openGraph title",
  );
  assert(
    metadata.twitter?.title === "测试帖子 - 58韩国",
    "twitter title",
  );
  assert(Boolean(metadata.openGraph?.images), "openGraph images");
  assert(Boolean(metadata.twitter?.images), "twitter images");

  assert(
    truncateDescription("  hello   world  ", 8) === "hello wo…",
    "truncateDescription",
  );

  assert(
    toAbsoluteUrl("/posts/1").endsWith("/posts/1"),
    "absolute url path",
  );

  console.log("PASS: scripts/test-share-v1.ts");
}

run();
