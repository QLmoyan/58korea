import sharp from "sharp";

const MAX_LONG_EDGE = 1440;
const QUALITY = 85;
const MAX_BYTES = 1024 * 1024;

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function compressBuffer(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdge = Math.max(width, height);
  const resize =
    longEdge > MAX_LONG_EDGE
      ? {
          width: width >= height ? MAX_LONG_EDGE : undefined,
          height: height > width ? MAX_LONG_EDGE : undefined,
          fit: "inside",
        }
      : {};

  let quality = QUALITY;
  let output = null;

  while (quality >= 65) {
    output = await sharp(inputBuffer)
      .rotate()
      .resize(resize)
      .webp({ quality })
      .toBuffer();

    if (output.length <= MAX_BYTES) {
      break;
    }

    quality -= 5;
  }

  const outMeta = await sharp(output).metadata();

  return {
    beforeBytes: inputBuffer.length,
    afterBytes: output.length,
    beforeWidth: width,
    beforeHeight: height,
    afterWidth: outMeta.width ?? 0,
    afterHeight: outMeta.height ?? 0,
    quality,
  };
}

async function main() {
  const samples = [
    ["iPhone 4032x3024", "https://picsum.photos/seed/iphone/4032/3024"],
    ["Android 1080x2400", "https://picsum.photos/seed/android/1080/2400"],
    ["Desktop 2560x1440", "https://picsum.photos/seed/desktop/2560/1440"],
  ];

  console.log("=== 真实照片样本压缩测试（参数同 compress-image.ts）===\n");

  const compressedSizes = [];

  for (const [label, url] of samples) {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await compressBuffer(buffer);
    compressedSizes.push(result.afterBytes);
    const ratio = ((1 - result.afterBytes / result.beforeBytes) * 100).toFixed(1);

    console.log(`[${label}]`);
    console.log(`  压缩前: ${formatBytes(result.beforeBytes)}`);
    console.log(`  压缩后: ${formatBytes(result.afterBytes)} (${ratio}% ↓)`);
    console.log(
      `  尺寸: ${result.beforeWidth}x${result.beforeHeight} -> ${result.afterWidth}x${result.afterHeight}`,
    );
    console.log(`  质量档位: ${result.quality}`);
    console.log(`  ≤1MB: ${result.afterBytes <= MAX_BYTES ? "是" : "否"}\n`);
  }

  const commentUrl = "https://picsum.photos/seed/comment/4032/3024";
  const commentBuffer = Buffer.from(await (await fetch(commentUrl)).arrayBuffer());
  const comment = await compressBuffer(commentBuffer);
  const commentRatio = ((1 - comment.afterBytes / comment.beforeBytes) * 100).toFixed(1);

  console.log("[评论 1 张图]");
  console.log(`  压缩前: ${formatBytes(comment.beforeBytes)}`);
  console.log(`  压缩后: ${formatBytes(comment.afterBytes)} (${commentRatio}% ↓)`);
  console.log(`  ≤1MB: ${comment.afterBytes <= MAX_BYTES ? "是" : "否"}\n`);

  const nineBefore = [];
  const nineAfter = [];
  for (let index = 0; index < 9; index += 1) {
    const [, url] = samples[index % samples.length];
    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    const result = await compressBuffer(buffer);
    nineBefore.push(result.beforeBytes);
    nineAfter.push(result.afterBytes);
  }

  const beforeTotal = nineBefore.reduce((sum, size) => sum + size, 0);
  const afterTotal = nineAfter.reduce((sum, size) => sum + size, 0);
  const nineRatio = ((1 - afterTotal / beforeTotal) * 100).toFixed(1);

  console.log("[发帖 9 张图合计]");
  console.log(`  压缩前: ${formatBytes(beforeTotal)}`);
  console.log(`  压缩后: ${formatBytes(afterTotal)} (${nineRatio}% ↓)`);
  console.log(`  单张最大: ${formatBytes(Math.max(...nineAfter))}`);
  console.log(
    `  全部 ≤1MB: ${nineAfter.every((size) => size <= MAX_BYTES) ? "是" : "否"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
