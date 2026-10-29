// Check the account before storing a profile photo or public field evidence.
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { apiUpstreamUrl } from "@/lib/api-upstream";
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };
const reply = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host") || request.headers.get("sec-fetch-site") === "cross-site") return reply(403, "Permintaan tidak dapat diproses.");
    const cookie = request.headers.get("cookie");
    if (!cookie) return reply(401, "Silakan masuk kembali.");
    let session: Response;
    try { session = await fetch(`${apiUpstreamUrl()}/auth/me`, { headers: { Cookie: cookie }, cache: "no-store", signal: AbortSignal.timeout(5000) }); }
    catch { return reply(503, "Sesi belum dapat diperiksa. Coba lagi."); }
    if (!session.ok) return reply(session.status === 401 || session.status === 403 ? 401 : 503, "Sesi belum dapat diperiksa. Coba lagi.");
    const account = (await session.json()).data?.user;
    if (!account?.id || !/^[a-f0-9]{24}$/i.test(account.id)) return reply(401, "Silakan masuk kembali.");
    if (!account.session_context || request.headers.get("x-session-context") !== account.session_context) return reply(409, "Sesi berubah. Muat ulang akun sebelum melanjutkan.");
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) return reply(413, "Ukuran berkas melebihi batas maksimum 10 MB.");
    const form = await request.formData();
    const file = form.get("file"), avatar = form.get("purpose") === "avatar";
    if (!avatar && (!account.username || !account.participation)) return reply(409, "Lengkapi profil sebelum mengirim bukti.");
    if (!(file instanceof File) || !file.size) return reply(400, "Pilih foto atau video dokumentasi.");
    if (!extensions[file.type] || (avatar && !file.type.startsWith("image/"))) return reply(400, "Pilih foto JPG, PNG, WebP atau video MP4, WebM.");
    if (file.size > (avatar ? 2 : 10) * 1024 * 1024) return reply(400, avatar ? "Foto maksimal 2 MB." : "Berkas maksimal 10 MB.");
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const word = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    const valid = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
      : file.type === "image/webp" ? word(0, 4) === "RIFF" && word(8, 12) === "WEBP"
      : file.type === "video/mp4" ? word(4, 8) === "ftyp" : [26, 69, 223, 163].every((n, i) => bytes[i] === n);
    if (!valid) return reply(400, "Berkas tidak valid.");
    const path = avatar ? `profiles/${account.id}/${randomUUID()}.${extensions[file.type]}` : `bukti-lapangan/${randomUUID()}.${extensions[file.type]}`;
    const blob = await put(path, file, { access: "public", addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN });
    return Response.json({ success: true, url: blob.url, contentType: blob.contentType, size: file.size }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return reply(500, "Unggahan belum berhasil. Coba lagi."); }
}
