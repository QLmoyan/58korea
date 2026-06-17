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

async function createSampleBuffer(spec) {
  const svg = `
    <svg width="${spec.width}" height="${spec.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185"/>
          <stop offset="50%" stop-color="#fdba74"/>
          <stop offset="100%" stop-color="#60a5fa"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `;

  let pipeline = sharp(Buffer.from(svg)).resize(spec.width, spec.height);

  if (spec.format === "png") {
    return pipeline.png().toBuffer();
  }

  return pipeline.jpeg({ quality: 92 }).toBuffer();
}

async function compressLikeBrowser(inputBuffer, formatHint) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
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
  let outputFormat = formatHint === "png" ? "webp" : "webp";

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

  if (output && output.length > MAX_BYTES) {
    output = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: Math.round((metadata.width ?? MAX_LONG_EDGE) * 0.81),
        height: Math.round((metadata.height ?? MAX_LONG_EDGE) * 0.81),
        fit: "inside",
      })
      .webp({ quality: 65 })
      .toBuffer();
    outputFormat = "webp";
  }

  return {
    output,
    outputFormat,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

async function runCase(label, spec) {
  const original = await createSampleBuffer(spec);
  const compressed = await compressLikeBrowser(original, spec.format);
  const meta = await sharp(compressed.output).metadata();

  return {
    label,
    beforeBytes: original.length,
    afterBytes: compressed.output.length,
    beforeLabel: formatBytes(original.length),
    afterLabel: formatBytes(compressed.output.length),
    dimensions: `${spec.width}x${spec.height} -> ${meta.width}x${meta.height}`,
    mimeType: "image/webp",
  };
}

async function main() {
  const samples = [
    {
      label: "iPhone 风格 JPEG",
      width: 4032,
      height: 3024,
      format: "jpeg",
    },
    {
      label: "Android 风格 PNG",
      width: 1080,
      height: 2400,
      format: "png",
    },
    {
      label: "电脑风格 JPEG",
      width: 2560,
      height: 1440,
      format: "jpeg",
    },
  ];

  const results = [];
  for (const sample of samples) {
    results.push(await runCase(sample.label, sample));
  }

  const nineBefore = [];
  const nineAfter = [];
  for (let index = 0; index < 9; index += 1) {
    const spec = samples[index % samples.length];
    const original = await createSampleBuffer(spec);
    const compressed = await compressLikeBrowser(original, spec.format);
    nineBefore.push(original.length);
    nineAfter.push(compressed.output.length);
  }

  const commentOriginal = await createSampleBuffer(samples[0]);
  const commentCompressed = await compressLikeBrowser(commentOriginal, "jpeg");

  console.log("=== 图片压缩 V1 基准测试（sharp 模拟浏览器参数）===");
  console.log(`最长边: ${MAX_LONG_EDGE}px, 质量: 0.85, 单张上限: 1MB\n`);

  for (const result of results) {
    const ratio = ((1 - result.afterBytes / result.beforeBytes) * 100).toFixed(1);
    console.log(`[${result.label}]`);
    console.log(`  压缩前: ${result.beforeLabel}`);
    console.log(`  压缩后: ${result.afterLabel} (${ratio}% ↓)`);
    console.log(`  尺寸: ${result.dimensions}`);
    console.log(`  格式: ${result.mimeType}`);
    console.log(`  ≤1MB: ${result.afterBytes <= MAX_BYTES ? "是" : "否"}`);
    console.log("");
  }

  const commentRatio = (
    (1 - commentCompressed.output.length / commentOriginal.length) *
    100
  ).toFixed(1);
  console.log("[评论 1 张图]");
  console.log(`  压缩前: ${formatBytes(commentOriginal.length)}`);
  console.log(`  压缩后: ${formatBytes(commentCompressed.output.length)} (${commentRatio}% ↓)`);
  console.log(
    `  ≤1MB: ${commentCompressed.output.length <= MAX_BYTES ? "是" : "否"}\n`,
  );

  const nineBeforeTotal = nineBefore.reduce((sum, size) => sum + size, 0);
  const nineAfterTotal = nineAfter.reduce((sum, size) => sum + size, 0);
  const nineRatio = ((1 - nineAfterTotal / nineBeforeTotal) * 100).toFixed(1);

  console.log("[发帖 9 张图合计]");
  console.log(`  压缩前: ${formatBytes(nineBeforeTotal)}`);
  console.log(`  压缩后: ${formatBytes(nineAfterTotal)} (${nineRatio}% ↓)`);
  console.log(
    `  单张最大: ${formatBytes(Math.max(...nineAfter))}, 全部 ≤1MB: ${
      Math.max(...nineAfter) <= MAX_BYTES ? "是" : "否"
    }`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
