// Todo:
// -> Read rain after viewport changes and refresh only while visible.
"use client";

// --- Viewport rain ---
import { useEffect, useState } from "react";
import type { MapBounds } from "@/types/environment";
import type { RainResult } from "@/types/rain";
import { requestApi } from "@/services/http";

/** Purpose: Debounce viewport requests and cancel inactive rain layers.
 * Input: West/south/east/north bounds and layer visibility. Output: Source state and manual refresh.
 */
export function useRain(bounds: MapBounds | null, enabled: boolean) {
  const key = bounds?.map(value => value.toFixed(5)).join(",") ?? "";
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState<{ key: string; data: RainResult | null; loading: boolean; error: boolean }>({ key: "", data: null, loading: false, error: false });
  useEffect(() => {
    if (!enabled || !key) return;
    const controller = new AbortController();
    let inFlight = false, lastAttempt = 0;
    const read = async () => {
      if (controller.signal.aborted || document.hidden || inFlight) return;
      inFlight = true; lastAttempt = Date.now();
      setSource(old => ({ key, data: old.key === key ? old.data : null, loading: true, error: false }));
      try {
        const data = await requestApi<RainResult>(`/external/rain?bbox=${encodeURIComponent(key)}`, { signal: controller.signal });
        if (!controller.signal.aborted) setSource({ key, data, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setSource(old => ({ ...old, loading: false, error: true,
          data: old.data ? { ...old.data, status: "cached", points: old.data.points.map(point => ({ ...point, state: "unknown", current_mm: null, recent_mm: null })) } : null }));
      } finally { inFlight = false; }
    };
    const debounce = window.setTimeout(() => void read(), 400);
    const timer = window.setInterval(() => void read(), 300_000);
    const visibility = () => { if (!document.hidden && Date.now() - lastAttempt >= 300_000) void read(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { controller.abort(); window.clearTimeout(debounce); window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, key, revision]);
  return { data: enabled && source.key === key ? source.data : null, loading: enabled && !!key && (source.key !== key || source.loading),
    error: enabled && source.key === key && source.error, refresh: () => setRevision(value => value + 1) };
}
// --- end of Viewport rain ---
