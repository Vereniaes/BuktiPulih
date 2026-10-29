// Read API responses through the same-origin proxy and guard stale account mutations.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
let sessionContext: string | null = null;
export const setApiSessionContext = (context: string | null) => { sessionContext = context; };
export const getApiSessionContext = () => sessionContext;
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) { super(message); }
}
export async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!["GET", "HEAD"].includes(options.method ?? "GET")) {
    headers.set("Content-Type", "application/json");
    if (sessionContext) headers.set("X-Session-Context", sessionContext);
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options, credentials: "same-origin", cache: "no-store", headers,
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi belum tersedia. Coba lagi.");
  }
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    if (typeof window !== "undefined") {
      if (response.status === 401 && path !== "/auth/me" && !path.startsWith("/auth/email/")) window.dispatchEvent(new Event("buktipulih-session-expired"));
      if (json?.error?.code === "SESSION_CHANGED") window.dispatchEvent(new Event("buktipulih-session-changed"));
    }
    const retry = Number(response.headers.get("retry-after"));
    throw new ApiError(response.status, json?.error?.code || "REQUEST_FAILED", json?.error?.message || "Permintaan belum berhasil. Coba lagi.", Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  if (json?.data == null) throw new ApiError(502, "INVALID_RESPONSE", "Data belum dapat dimuat.");
  return json.data as T;
}
