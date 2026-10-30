// Todo:
// -> Resize photos in the browser and encode WebP; output size depends on the image.

// --- Image compression ---
export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
}

/** Input: a photo and size limits. Output: a resized WebP blob without a base64 copy. */
export async function resizeImageBlob(file: File, maxWidth = 1600, quality = .82, maxHeight = 1600) {
  const url = URL.createObjectURL(file), image = new Image(), canvas = document.createElement("canvas");
  try {
    image.src = url; await image.decode();
    const scale = Math.min(1,maxWidth/image.naturalWidth,maxHeight/image.naturalHeight);
    const width = Math.max(1,Math.round(image.naturalWidth*scale)), height = Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gagal menyiapkan foto.");
    context.drawImage(image,0,0,width,height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,"image/webp",quality));
    if (!blob) throw new Error("Gagal menyiapkan foto.");
    return {blob,width,height};
  } finally { image.removeAttribute("src"); URL.revokeObjectURL(url); canvas.width = 1; canvas.height = 1; }
}

export const compressImageClient = (
  file: File,
  maxWidth = 1280,
  quality = 0.82,
  maxHeight = Infinity
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", quality);

        // Estimate decoded bytes from the base64 payload.
        const head = "data:image/webp;base64,";
        const base64Length = dataUrl.length - head.length;
        const compressedBytes = Math.round((base64Length * 3) / 4);

        const originalBytes = file.size;
        const reduction = Math.max(
          0,
          Math.round(((originalBytes - compressedBytes) / originalBytes) * 100)
        );

        resolve({
          dataUrl,
          originalSizeBytes: originalBytes,
          compressedSizeBytes: compressedBytes,
          originalSizeKb: Math.round(originalBytes / 1024),
          compressedSizeKb: Math.round(compressedBytes / 1024),
          reductionPercentage: reduction,
        });
      };

      img.onerror = () => reject(new Error("Gagal membaca file citra"));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
};
// --- end of Image compression ---
