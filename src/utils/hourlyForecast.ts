// Read hourly model data. Missing values stay empty; no synthetic fallback.
import type { HourlyForecast } from "@/types/environment";

const cache = new Map<string, { data: HourlyForecast; expires: number }>();
const pending = new Map<string, Promise<HourlyForecast>>();

export function parseHourlyForecast(input: unknown, fields: string[], now = Date.now()): HourlyForecast {
  const hourly = (input as { hourly?: Record<string, unknown> })?.hourly;
  if (!hourly || !Array.isArray(hourly.time) || !fields.every(f => Array.isArray(hourly[f]))) {
    throw new Error("Forecast unavailable");
  }
  const points = hourly.time.flatMap((time: unknown, index: number) => {
    if (typeof time !== "number" || !Number.isFinite(time)) return [];
    return [{ time: time * 1000, values: Object.fromEntries(fields.map(field => {
      const value = (hourly[field] as unknown[])[index];
      return [field, typeof value === "number" && Number.isFinite(value) ? value : null];
    })) }];
  });
  return { points, fetched_at: new Date(now).toISOString(), status: "ready" };
}

export async function fetchHourlyForecast(
  endpoint: string, lat: number, lon: number, fields: string[], extra: Record<string, string> = {},
): Promise<HourlyForecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lon.toFixed(3), hourly: fields.join(","),
    forecast_days: "5", timeformat: "unixtime", timezone: "Asia/Jakarta", ...extra,
  });
  const url = `${endpoint}?${params}`;
  const saved = cache.get(url);
  if (saved && saved.expires > Date.now()) return saved.data;
  if (pending.has(url)) return pending.get(url)!;
  const job = (async (): Promise<HourlyForecast> => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Forecast unavailable");
      const data = parseHourlyForecast(await response.json(), fields);
      if (cache.size >= 64) cache.delete(cache.keys().next().value!);
      cache.set(url, { data, expires: Date.now() + 15 * 60 * 1000 });
      return data;
    } catch {
      if (saved) return { ...saved.data, status: "cached" };
      return { points: [], fetched_at: null, status: "unavailable" };
    }
  })();
  pending.set(url, job);
  try { return await job; } finally { pending.delete(url); }
}

const wibTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});
export function formatTimeWib(value: string | number): string {
  return wibTime.format(new Date(value)) + " WIB";
}
