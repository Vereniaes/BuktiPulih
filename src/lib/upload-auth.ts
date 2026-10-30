// Todo:
// -> authorize upload requests against the active account session

// --- Upload authorization ---
import { apiUpstreamUrl } from "./api-upstream";

export class UploadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function uploadFailure(error: unknown) {
  return Response.json({error:error instanceof UploadError ? error.message : error instanceof SyntaxError ? "Data tidak valid." : "Unggahan belum berhasil. Coba lagi."}, {status:error instanceof UploadError ? error.status : error instanceof SyntaxError ? 400 : 500,headers:{"Cache-Control":"private, no-store"}});
}

/** Input: same-origin request. Output: the current account authorized to upload. */
export async function requireUploadAccount(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host") || request.headers.get("sec-fetch-site") === "cross-site") throw new UploadError(403,"Permintaan tidak dapat diproses.");
  const cookie = request.headers.get("cookie");
  if (!cookie) throw new UploadError(401,"Silakan masuk kembali.");
  let session: Response;
  try { session = await fetch(`${apiUpstreamUrl()}/auth/me`,{headers:{Cookie:cookie},cache:"no-store",signal:AbortSignal.timeout(5000)}); }
  catch { throw new UploadError(503,"Sesi belum dapat diperiksa. Coba lagi."); }
  if (!session.ok) throw new UploadError(session.status === 401 || session.status === 403 ? 401 : 503,"Sesi belum dapat diperiksa. Coba lagi.");
  const account = (await session.json()).data?.user as {id:string;session_context?:string;username?:string;participation?:string} | undefined;
  if (!account?.id || !/^[a-f0-9]{24}$/i.test(account.id)) throw new UploadError(401,"Silakan masuk kembali.");
  if (!account.session_context || request.headers.get("x-session-context") !== account.session_context) throw new UploadError(409,"Sesi berubah. Muat ulang akun sebelum melanjutkan.");
  return account;
}
// --- end of Upload authorization ---
