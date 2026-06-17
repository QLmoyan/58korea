export const COMPRESS_MAX_LONG_EDGE = 1440;
export const COMPRESS_QUALITY = 0.85;
export const COMPRESS_MAX_BYTES = 1024 * 1024;

export interface CompressImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  mimeType: string;
}

export function calculateTargetDimensions(
  width: number,
  height: number,
  maxLongEdge = COMPRESS_MAX_LONG_EDGE,
) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

let webpSupported: boolean | null = null;

function detectWebpSupport() {
  if (webpSupported !== null) {
    return webpSupported;
  }

  if (typeof document === "undefined") {
    webpSupported = false;
    return webpSupported;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupported;
}

function buildOutputName(original: File, mimeType: string) {
  const baseName = original.name.replace(/\.[^.]+$/, "") || "image";
  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  return `${baseName}.${extension}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("图片压缩失败"));
      },
      mimeType,
      quality,
    );
  });
}

async function loadBitmap(file: File) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("当前浏览器不支持图片压缩");
  }

  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function shouldPassthrough(
  file: File,
  width: number,
  height: number,
): boolean {
  if (file.type === "image/gif") {
    return true;
  }

  const withinSize = file.size <= COMPRESS_MAX_BYTES;
  const withinDimensions =
    Math.max(width, height) <= COMPRESS_MAX_LONG_EDGE;
  const alreadyOptimized =
    file.type === "image/jpeg" || file.type === "image/webp";

  return withinSize && withinDimensions && alreadyOptimized;
}

async function encodeCanvas(canvas: HTMLCanvasElement) {
  const mimeTypes = detectWebpSupport()
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];

  let workingCanvas = canvas;
  let scale = 1;

  while (scale >= 0.5) {
    for (const mimeType of mimeTypes) {
      let quality = COMPRESS_QUALITY;

      while (quality >= 0.65) {
        const blob = await canvasToBlob(workingCanvas, mimeType, quality);
        if (blob.size <= COMPRESS_MAX_BYTES) {
          return { blob, mimeType };
        }

        quality -= 0.05;
      }

      const blob = await canvasToBlob(workingCanvas, mimeType, 0.65);
      if (blob.size <= COMPRESS_MAX_BYTES) {
        return { blob, mimeType };
      }
    }

    scale *= 0.9;
    const nextWidth = Math.max(1, Math.round(workingCanvas.width * scale));
    const nextHeight = Math.max(1, Math.round(workingCanvas.height * scale));

    if (nextWidth === workingCanvas.width && nextHeight === workingCanvas.height) {
      break;
    }

    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = nextWidth;
    scaledCanvas.height = nextHeight;

    const context = scaledCanvas.getContext("2d");
    if (!context) {
      throw new Error("图片压缩失败");
    }

    context.drawImage(workingCanvas, 0, 0, nextWidth, nextHeight);
    workingCanvas = scaledCanvas;
  }

  const fallbackType = mimeTypes[0];
  const fallbackBlob = await canvasToBlob(workingCanvas, fallbackType, 0.65);
  return { blob: fallbackBlob, mimeType: fallbackType };
}

export async function compressImageWithStats(
  file: File,
): Promise<CompressImageResult> {
  if (typeof document === "undefined") {
    throw new Error("compressImage 只能在浏览器中使用");
  }

  if (file.type === "image/gif") {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
      mimeType: file.type,
    };
  }

  const bitmap = await loadBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  if (shouldPassthrough(file, originalWidth, originalHeight)) {
    bitmap.close();
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      originalWidth,
      originalHeight,
      width: originalWidth,
      height: originalHeight,
      mimeType: file.type,
    };
  }

  const { width, height } = calculateTargetDimensions(
    originalWidth,
    originalHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("图片压缩失败");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { blob, mimeType } = await encodeCanvas(canvas);
  const outputName = buildOutputName(file, mimeType);
  const compressedFile = new File([blob], outputName, {
    type: mimeType,
    lastModified: file.lastModified,
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    originalWidth,
    originalHeight,
    width,
    height,
    mimeType,
  };
}

export async function compressImage(file: File): Promise<File> {
  return (await compressImageWithStats(file)).file;
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file)));
}
