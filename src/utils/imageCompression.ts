// src/utils/imageCompression.ts
// -> utilitas kompresi citra berbasis html5 canvas di sisi klien
//      -> mengubah foto kamera hp (5-12mb) menjadi webp (~150kb)
//      -> resolusi proporsional maksimal 1280px lebar
//      -> mencegah kegagalan unggah di jaringan 3g/edge pedalaman gambut

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
  quality = 0.82
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // kalkulasi rasio aspek ---------------------------------------------------
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // ekspor ke format webp hemat kuota --------------------------------------
        const dataUrl = canvas.toDataURL("image/webp", quality);

        // estimasi ukuran file hasil kompresi base64
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
