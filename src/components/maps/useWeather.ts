// Todo:
// -> Share the current regional weather grid and pause polling in hidden pages.

// --- Current weather loading ---
"use client";
import { useEffect, useState } from "react";
import type { WeatherGrid } from "./weather-grid";

let saved: WeatherGrid | null = null, pending: Promise<WeatherGrid> | null = null, checked = 0;
let tag: string | null = null;
const valid = (data: WeatherGrid | null) => !!data && Date.now() - Date.parse(data.valid_at) < 2 * 3600_000;
const current = () => valid(saved) ? saved : null;

function readWeather(force: boolean): Promise<WeatherGrid> {
  if (!force && valid(saved) && Date.now() - checked < 5 * 60_000 && Math.floor(Date.parse(saved!.valid_at) / 3600_000) === Math.floor(Date.now() / 3600_000)) return Promise.resolve(saved!);
  if (!pending) pending = (async () => {
    const response = await fetch("/api/v1/external/weather", { signal: AbortSignal.timeout(60_000), cache: "no-store", headers: tag && saved ? { "If-None-Match": tag } : undefined });
    if (response.status === 304 && valid(saved)) { checked = Date.now(); return saved!; }
    const json = await response.json();
    const data = json?.data as WeatherGrid;
    if (!response.ok || !data?.fields || !data.grid || !valid(data) || Date.parse(data.valid_at) > Date.now()) throw new Error("WEATHER_UNAVAILABLE");
    const count = data.grid.columns * data.grid.rows;
    if (count < 4 || count > 500_000 || ["rain", "wind", "gust", "temperature", "feels_like", "u", "v"].some(key => !Array.isArray(data.fields[key as keyof WeatherGrid["fields"]]) || data.fields[key as keyof WeatherGrid["fields"]].length !== count)) throw new Error("WEATHER_UNAVAILABLE");
    saved = data; tag = response.headers.get("etag"); checked = Date.now(); return data;
  })().finally(() => { pending = null; });
  return pending;
}

export function useWeather(enabled: boolean) {
  const [state, setState] = useState<{ data: WeatherGrid | null; loading: boolean; error: boolean }>({ data: current(), loading: enabled, error: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, busy = false;
    const load = async (force = false) => {
      if (document.hidden || busy) return;
      busy = true; setState(s => ({ ...s, data: valid(s.data) ? s.data : null, loading: true }));
      try {
        const data = await readWeather(force);
        if (!disposed) setState({ data, loading: false, error: false });
      } catch {
        if (!disposed) setState(s => ({ data: valid(s.data) ? { ...s.data!, status: "cached" } : null, loading: false, error: true }));
      } finally { busy = false; }
    };
    const visible = () => { if (!document.hidden) void load(); };
    void load(revision > 0);
    const timer = window.setInterval(() => void load(), 5 * 60_000);
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, revision]);
  return { ...state, data: valid(state.data) ? state.data : null, refresh: () => setRevision(value => value + 1) };
}
// --- end of Current weather loading ---
