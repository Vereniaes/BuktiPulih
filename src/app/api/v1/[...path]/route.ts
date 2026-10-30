// Todo:
// -> Proxy approved API routes and preserve private cookies.
// -> Allow bounded cold reads for regional weather and satellite history.

// --- API proxy ---
import { apiUpstreamUrl } from "@/lib/api-upstream";
const methods = {
  GET: [ /^locations\/(?:search|reverse)$/, /^forum\/(?:recovery|categories)$/, /^auth\/(?:email\/(?:prepare|flow)|me(?:\/activity)?)$/, /^forum\/posts(?:\/[a-zA-Z0-9_-]+(?:\/comments)?)?$/, /^(?:plots|metrics|external|timeline)(?:\/[a-zA-Z0-9_.-]+)*$/ ],
  POST: [ /^forum\/categories$/, /^forum\/posts\/[a-zA-Z0-9_-]+\/comments\/[a-f0-9]{24}\/vote$/, /^auth\/(?:email\/(?:start|resend|verify|cancel|reset-password)|logout|login)$/, /^forum\/posts(?:\/[a-zA-Z0-9_-]+\/comments)?$/, /^(?:reports|timeline|plots)(?:\/[a-zA-Z0-9_.-]+)*$/ ],
  PATCH: [ /^auth\/me$/ ],
  DELETE: [ /^auth\/me$/ ],
};
const cookieNames = new Set(["bp_session", "bp_auth_proof", "__Host-bp_session", "__Host-bp_auth_proof"]);
const fail = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "private, no-store" } });
async function readBody(request: Request) {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_048_576) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method as keyof typeof methods;
  if (path.some(segment => segment === "." || segment === "..") || !methods[method]?.some(pattern => pattern.test(route))) return fail(404, "NOT_FOUND", "Halaman tidak ditemukan.");
  const incoming = new URL(request.url);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const frontendOrigin = host && /^[a-zA-Z0-9.:[\]-]+$/.test(host) ? `${incoming.protocol}//${host}` : incoming.origin;
  if ((origin && origin !== frontendOrigin) || request.headers.get("sec-fetch-site") === "cross-site") return fail(403, "REQUEST_REJECTED", "Permintaan tidak dapat diproses.");
  if (method !== "GET" && (!origin || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")) return fail(403, "REQUEST_REJECTED", "Permintaan tidak dapat diproses.");
  try {
    const headers = new Headers({ Accept: "application/json" });
    const weatherTag = request.headers.get("if-none-match");
    if (route === "external/weather" && weatherTag && /^W\/"weather-[a-f0-9]{24}"$/.test(weatherTag)) headers.set("If-None-Match", weatherTag);
    if (origin) headers.set("Origin", origin);
    const cookie = request.headers.get("cookie")?.split(";").filter(item => cookieNames.has(item.trim().split("=")[0])).join(";");
    if (cookie) headers.set("Cookie", cookie);
    const session = request.headers.get("x-session-context");
    if (session && /^[a-f0-9-]{36}$/i.test(session)) headers.set("X-Session-Context", session);
    if (method !== "GET") headers.set("Content-Type", "application/json");
    const response = await fetch(`${apiUpstreamUrl()}/${route}${incoming.search}`, {
      method, headers, body: method === "GET" ? undefined : await readBody(request),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(route === "external/weather" ? 55000 : route === "external/hotspots" && incoming.searchParams.has("start") ? 40000 : route === "external/hotspots/availability" ? 25000 : 12000),
    });
    const returned = new Headers({ "Content-Type": "application/json", "Cache-Control": "private, no-store" });
    const returnedTag = response.headers.get("etag");
    if (route === "external/weather" && returnedTag) returned.set("ETag", returnedTag);
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter && /^\d+$/.test(retryAfter)) returned.set("Retry-After", retryAfter);
    for (const item of response.headers.getSetCookie()) if (cookieNames.has(item.split("=")[0])) returned.append("Set-Cookie", item);
    let body = response.body;
    const acceptsGzip = (request.headers.get("accept-encoding") ?? "").split(",").some(item => {
      const [encoding, quality] = item.split(";").map(value => value.trim());
      return encoding === "gzip" && (!quality || Number(quality.split("=")[1]) > 0);
    });
    if (route === "external/weather" && response.status === 200 && body && acceptsGzip) {
      returned.set("Content-Encoding", "gzip"); returned.set("Vary", "Accept-Encoding");
      body = body.pipeThrough(new CompressionStream("gzip"));
    }
    return new Response(body, { status: response.status, headers: returned });
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") return fail(413, "BODY_TOO_LARGE", "Data terlalu besar.");
    return fail(503, "SERVICE_UNAVAILABLE", "Layanan belum tersedia. Coba lagi nanti.");
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
// --- end of API proxy ---
