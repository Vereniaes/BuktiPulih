// src/app/api/upload/route.ts
// -> route handler api app router untuk upload berkas dokumentasi warga ke vercel blob
//      -> validasi tipe mime (gambar: jpeg, png, webp; video: mp4, webm)
//      -> penyimpanan publik di cdn vercel blob (region sin1)
//      -> pengembalian url permanen cdn untuk disimpan ke basis data

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// helper --------------------------------------------------------------------------
// daftar tipe berkas yang diizinkan untuk dokumentasi lapangan
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

// batasan ukuran berkas maksimum (10 mb untuk free tier vercel)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// end of helper ------------------------------------------------------------------

// handler method post untuk upload berkas -----------------------------------------
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan dalam formulir unggahan." },
        { status: 400 }
      );
    }

    // validasi format berkas ------------------------------------------------------
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Format berkas tidak didukung. Harap unggah foto (JPEG, PNG, WebP) atau video (MP4, WebM).",
        },
        { status: 400 }
      );
    }

    // validasi batas ukuran berkas ------------------------------------------------
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "Ukuran berkas melebihi batas maksimum 10 MB.",
        },
        { status: 400 }
      );
    }

    // sanitasi nama berkas unik dengan stempel waktu ------------------------------
    const fileExtension = file.name.split(".").pop() || "jpg";
    const sanitizedBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniquePath = `bukti-lapangan/${Date.now()}-${sanitizedBase}.${fileExtension}`;

    // eksekusi penyimpanan ke vercel blob storage ---------------------------------
    const blob = await put(uniquePath, file, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error("[API Upload] Gagal mengunggah ke Vercel Blob:", error);
    return NextResponse.json(
      {
        error:
          "Terjadi kegagalan saat mengunggah berkas ke Vercel Blob. Pastikan BLOB_READ_WRITE_TOKEN telah terpasang.",
      },
      { status: 500 }
    );
  }
}
