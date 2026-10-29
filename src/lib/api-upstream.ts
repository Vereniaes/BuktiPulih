// Resolve only the configured backend prefix for server-side API requests.
import "server-only";
export function apiUpstreamUrl() {
  const configured = process.env.API_UPSTREAM_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:5000/api/v1" : "");
  const url = new URL(configured);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/api/v1") throw new Error("API_UPSTREAM_UNAVAILABLE");
  return url.toString().replace(/\/$/, "");
}
