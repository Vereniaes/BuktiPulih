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
