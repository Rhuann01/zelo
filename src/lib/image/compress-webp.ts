/**
 * Compressor client-side de imagens para WebP usando <canvas>.
 * Mantém avatares <= 40 KB (256x256) e logos/capas <= 100 KB para economizar Storage Free Tier.
 */
export interface CompressOptions {
  maxDimension: number;
  maxBytes: number;
  initialQuality?: number;
}

export async function compressImageToWebP(
  file: File,
  { maxDimension, maxBytes, initialQuality = 0.82 }: CompressOptions
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  const bitmap = await createImageBitmap(file);
  if (
    file.type === "image/webp" &&
    file.size <= maxBytes &&
    bitmap.width <= maxDimension &&
    bitmap.height <= maxDimension
  ) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Não foi possível inicializar o canvas para compressão.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // iOS Safari não suporta encoding image/webp no <canvas> e devolve image/png sem compressão.
  let targetMime: "image/webp" | "image/jpeg" = "image/webp";
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, targetMime, quality);

  if (blob.type !== "image/webp") {
    targetMime = "image/jpeg";
    blob = await canvasToBlob(canvas, targetMime, quality);
  }

  while (blob.size > maxBytes && quality > 0.25) {
    quality = Math.max(0.25, quality - 0.12);
    blob = await canvasToBlob(canvas, targetMime, quality);
  }

  if (blob.size > maxBytes) {
    const downscaled = document.createElement("canvas");
    width = Math.max(1, Math.round(width * 0.6));
    height = Math.max(1, Math.round(height * 0.6));
    downscaled.width = width;
    downscaled.height = height;
    const dCtx = downscaled.getContext("2d");
    if (dCtx) {
      dCtx.drawImage(canvas, 0, 0, width, height);
      quality = 0.72;
      blob = await canvasToBlob(downscaled, targetMime, quality);
      while (blob.size > maxBytes && quality > 0.25) {
        quality = Math.max(0.25, quality - 0.12);
        blob = await canvasToBlob(downscaled, targetMime, quality);
      }
    }
  }

  if (blob.size > maxBytes) {
    throw new Error(`Imagem excedeu o limite de ${Math.round(maxBytes / 1024)} KB mesmo após compressão.`);
  }

  return blob;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Falha ao comprimir imagem."));
          return;
        }
        resolve(result);
      },
      mimeType,
      quality
    );
  });
}

export const AVATAR_COMPRESS_CONFIG: CompressOptions = {
  maxDimension: 256,
  maxBytes: 40 * 1024,
};

export const STORE_MEDIA_COMPRESS_CONFIG: CompressOptions = {
  maxDimension: 1200,
  maxBytes: 100 * 1024,
};
