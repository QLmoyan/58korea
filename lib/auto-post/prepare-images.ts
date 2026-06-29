import type { AutoPostImageCandidate, AutoPostTemplate } from "./types";

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "hanquan-auto-post/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

export interface PreparedPostImage {
  candidate: AutoPostImageCandidate;
  buffer: Buffer;
  contentType: string;
}

export async function preparePostImages(
  template: AutoPostTemplate,
  candidates: AutoPostImageCandidate[],
): Promise<PreparedPostImage[]> {
  const target = template.imageCount;
  const prepared: PreparedPostImage[] = [];

  for (const candidate of candidates) {
    if (prepared.length >= target) {
      break;
    }

    try {
      const downloaded = await downloadImage(candidate.url);
      prepared.push({
        candidate,
        buffer: downloaded.buffer,
        contentType: downloaded.contentType,
      });
    } catch {
      continue;
    }
  }

  return prepared;
}
