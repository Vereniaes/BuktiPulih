// Todo:
// -> Show coordinates, island and subdistrict for only the selected hotspot.
// -> Ignore old lookups when the selection or language changes.
"use client";

// --- Hotspot location row ---
import { useEffect, useState } from "react";
import { reverseAddress } from "@/services/locations";
import { islandAt, subdistrictFrom } from "./hotspot-place";
import styles from "./hazard-map.module.css";

const cache = new Map<string, { district: string | null; expires: number }>();

export function HotspotCoordinates({ coordinates: [lat, lng], en }: { coordinates: [number, number]; en: boolean }) {
  const key = `${lng},${lat}:${en}`, [state, setState] = useState<{ key: string; island: string | null; district: string | null }>({ key, island: null, district: null });
  useEffect(() => {
    const controller = new AbortController(), signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]);
    const update = (value: Partial<typeof state>) => {
      if (!signal.aborted) setState(previous => ({ ...(previous.key === key ? previous : { key, island: null, district: null }), ...value }));
    };
    void import("@/data/islandLabels").then(({ islandLabels }) => update({ island: islandAt([lng, lat], islandLabels, en) })).catch(() => {});
    const hit = cache.get(key);
    const district = hit && hit.expires > Date.now() ? Promise.resolve(hit.district) : reverseAddress([lng, lat], signal, en ? "en" : "id").then(results => {
      const district = subdistrictFrom(results);
      if (cache.size >= 64) cache.delete(cache.keys().next().value!);
      cache.set(key, { district, expires: Date.now() + 10 * 60_000 }); return district;
    });
    void district.then(district => update({ district })).catch(() => update({ district: null }));
    return () => controller.abort();
  }, [key, lat, lng, en]);
  const value = state.key === key ? state : { island: null, district: null };
  const island = value.island?.replace(/^(?:Pulau\s+|Island\s+)/i, "").replace(/\s+Island$/i, "");
  const district = value.district?.replace(/^(?:Kecamatan|Kec\.?|Distrik)\s+/i, "");
  return <p className={`${styles.coordinates} ${styles.locationRow}`} data-hotspot-location>
    <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
    <span>{en ? "Island" : "Pulau"} {island || "—"}</span>
    <span>{en ? "Subdistrict" : "Kec."} {district || "—"}</span>
  </p>;
}
// --- end of Hotspot location row ---
