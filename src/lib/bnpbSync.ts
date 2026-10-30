// Todo:
// -> Refresh provincial BNPB totals and retain the last successful snapshot.
// -> Keep source dates, successful retrieval, and checks separate.

// --- BNPB sync ---
import { BnpbSyncData, BnpbProvinceItem } from "@/types";
import { bnpbSourceDate, bnpbStatus } from "@/utils/bnpbFreshness";

let cachedBnpbData: BnpbSyncData = {
  source: "WebGIS BNPB (gis.bnpb.go.id - 2026_karhutla)",
  layer: "mv_prov_karhutla_2026",
  sync_timestamp: null, fetched_at: null, checked_at: null,
  status: "unavailable", sync_status: "UNAVAILABLE", provinces: [],
};
let pending: Promise<BnpbSyncResult> | null = null;
interface BnpbSyncResult { success: boolean; data: BnpbSyncData; error?: string; }
const sourceNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const BNPB_QUERY_URL =
  "https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=objectid>0&outFields=provinsi,tgl_update,today_luas_terbakar,total_hotspot,relawan,kualitas_udara_pm25&returnGeometry=false&f=json";

// Purpose: Share a BNPB refresh while retaining the previous successful snapshot.
// Input: None.
// Output: Snapshot and sync status; failed requests retain the previous snapshot.
export function syncBnpbData(): Promise<BnpbSyncResult> {
  if (!pending) pending = refreshBnpbData().finally(() => { pending = null; });
  return pending;
}

async function refreshBnpbData(): Promise<BnpbSyncResult> {
  const checkedAt = new Date().toISOString();
  try {
    const res = await fetch(BNPB_QUERY_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 BuktiPulih/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`bnpb responded with status ${res.status}`);
    }

    const json = await res.json();
    const features = json?.features;

    if (json.error || !Array.isArray(features) || features.length === 0) {
      throw new Error("empty features from bnpb arcgis");
    }

    const updatedProvinces: BnpbProvinceItem[] = features.map(
      (feat: { attributes: Record<string, unknown> }) => {
        const attr = feat.attributes || {};
        const provName = String(attr.provinsi || "").trim();
        const burnedArea = sourceNumber(attr.today_luas_terbakar), hotspots = sourceNumber(attr.total_hotspot);
        if (!provName || burnedArea === null || hotspots === null) throw new Error("invalid provincial BNPB totals");

        return {
          provinsi: provName,
          tgl_update: bnpbSourceDate(attr.tgl_update),
          today_luas_terbakar_ha: burnedArea,
          total_hotspot: hotspots,
          relawan_lapangan: sourceNumber(attr.relawan),
          kualitas_udara_pm25: typeof attr.kualitas_udara_pm25 === "string" ? attr.kualitas_udara_pm25.trim() || null : null,
        };
      }
    ).filter(province => province.provinsi);
    if (!updatedProvinces.length) throw new Error("empty provinces from bnpb arcgis");

    const fetchedAt = new Date().toISOString();
    cachedBnpbData = {
      ...cachedBnpbData,
      sync_timestamp: fetchedAt, fetched_at: fetchedAt, checked_at: checkedAt,
      status: "ready", sync_status: "SYNCHRONIZED",
      provinces: updatedProvinces,
    };

    return {
      success: true,
      data: cachedBnpbData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown sync error";
    // Keep the last snapshot when BNPB or its WAF rejects the request.
    const available = cachedBnpbData.provinces.length > 0;
    cachedBnpbData = { ...cachedBnpbData, checked_at: checkedAt,
      status: available ? "cached" : "unavailable", sync_status: available ? "CACHED" : "UNAVAILABLE" };
    return {
      success: false,
      data: cachedBnpbData,
      error: message,
    };
  }
}

export function getCachedBnpbData(): BnpbSyncData {
  const status = bnpbStatus(cachedBnpbData);
  return { ...cachedBnpbData, status, sync_status: status === "ready" ? "SYNCHRONIZED" : status === "cached" ? "CACHED" : "UNAVAILABLE" };
}
// --- end of BNPB sync ---
