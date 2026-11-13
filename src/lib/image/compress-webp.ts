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
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

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

  let quality = initialQuality;
  let blob = await canvasToWebP(canvas, quality);

  while (blob.size > maxBytes && quality > 0.25) {
    quality = Math.max(0.25, quality - 0.12);
    blob = await canvasToWebP(canvas, quality);
  }

  if (blob.size > maxBytes) {
    throw new Error(`Imagem excedeu o limite de ${Math.round(maxBytes / 1024)} KB mesmo após compressão.`);
  }

  return blob;
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Falha ao converter imagem para WebP."));
          return;
        }
        resolve(result);
      },
      "image/webp",
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
