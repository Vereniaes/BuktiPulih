// Todo:
// -> authorize direct evidence uploads without proxying large files

// --- Direct uploads ---
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUploadAccount, UploadError, uploadFailure } from "@/lib/upload-auth";
import { EVIDENCE_MAX_BYTES, EVIDENCE_TYPES } from "@/utils/evidenceMedia";

export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new UploadError(400,"Data tidak valid.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new UploadError(413,"Data terlalu besar."); }
      chunks.push(chunk.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString()) as HandleUploadBody;
    if (body?.type !== "blob.generate-client-token" || typeof body.payload?.pathname !== "string" || typeof body.payload.clientPayload !== "string" || typeof body.payload.multipart !== "boolean") throw new UploadError(400,"Data tidak valid.");
    const result = await handleUpload({request,body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const account = await requireUploadAccount(request);
        if (!account.username || !account.participation) throw new UploadError(409,"Lengkapi profil sebelum mengirim bukti.");
        const payload = JSON.parse(clientPayload || "{}") as {size?:number;contentType?:string};
        const extension = payload.contentType && EVIDENCE_TYPES[payload.contentType];
        const prefix = "bukti-lapangan/";
        if (!extension || !Number.isInteger(payload.size) || payload.size! <= 0 || payload.size! > EVIDENCE_MAX_BYTES || !pathname.startsWith(prefix) || !/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(pathname.slice(prefix.length)) || !pathname.endsWith(`.${extension}`)) throw new UploadError(400,"Berkas tidak valid.");
        return {allowedContentTypes:[payload.contentType!],maximumSizeInBytes:EVIDENCE_MAX_BYTES,validUntil:Date.now()+10*60_000,addRandomSuffix:true,allowOverwrite:false,cacheControlMaxAge:31536000};
      },
    });
    return Response.json(result,{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) { return uploadFailure(error); }
}
// --- end of Direct uploads ---
