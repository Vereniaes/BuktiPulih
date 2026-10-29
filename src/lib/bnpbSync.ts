// Todo:
// -> Refresh provincial BNPB totals and keep a process-local fallback.

// --- BNPB sync ---
import { BnpbSyncData, BnpbProvinceItem } from "@/types";
import { mockBnpbData } from "@/data/bnpbData";

let cachedBnpbData: BnpbSyncData = { ...mockBnpbData };

const BNPB_QUERY_URL =
  "https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=objectid>0&outFields=provinsi,tgl_update,today_luas_terbakar,total_hotspot,relawan,kualitas_udara_pm25&returnGeometry=false&f=json";

// Purpose: Refresh BNPB totals while keeping the existing restoration fallback.
// Input: None.
// Output: Snapshot and sync status; failed requests retain the previous snapshot.
export async function syncBnpbData(): Promise<{
  success: boolean;
  data: BnpbSyncData;
  error?: string;
}> {
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

    if (!Array.isArray(features) || features.length === 0) {
      throw new Error("empty features from bnpb arcgis");
    }

    const updatedProvinces: BnpbProvinceItem[] = features.map(
      (feat: { attributes: Record<string, unknown> }) => {
        const attr = feat.attributes || {};
        const provName = String(attr.provinsi || "").trim();

        const existingProv = mockBnpbData.provinces.find(
          (p) => p.provinsi.toLowerCase() === provName.toLowerCase()
        );

        return {
          provinsi: provName,
          tgl_update: String(attr.tgl_update || new Date().toISOString().split("T")[0]),
          today_luas_terbakar_ha: Number(attr.today_luas_terbakar) || 0,
          total_hotspot: Number(attr.total_hotspot) || 0,
          relawan_lapangan: Number(attr.relawan) || 0,
          kualitas_udara_pm25: String(attr.kualitas_udara_pm25 || "Sedang"),
          buktipulih_coverage: existingProv?.buktipulih_coverage || {
            active_plots: 1,
            restored_area_ha: 1.0,
            alive_trees: 500,
          },
          weather_summary: existingProv?.weather_summary,
        };
      }
    );

    cachedBnpbData = {
      source: "WebGIS BNPB (gis.bnpb.go.id - 2026_karhutla)",
      layer: "mv_prov_karhutla_2026",
      sync_timestamp: new Date().toISOString(),
      provinces: updatedProvinces,
    };

    return {
      success: true,
      data: cachedBnpbData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown sync error";
    // Keep the last snapshot when BNPB or its WAF rejects the request.
    return {
      success: false,
      data: cachedBnpbData,
      error: message,
    };
  }
}

export function getCachedBnpbData(): BnpbSyncData {
  return cachedBnpbData;
}
// --- end of BNPB sync ---
