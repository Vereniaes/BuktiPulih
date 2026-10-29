// src/services/api.ts
// -> klien komunikasi antarmuka api backend buktipulih
//      -> memanggil endpoint http://localhost:5000/api/v1
//      -> fallback mulus ke dataset lokal jika backend sedang proses startup

import {
  PlotFeatureCollection,
  ImpactLedgerData,
  TimelineItem,
  BnpbSyncData,
} from "@/types";
import { mockPlotsData } from "@/data/plotsData";
import { mockImpactData } from "@/data/impactData";
import { mockTimelineData } from "@/data/timelineData";
import { mockBnpbData } from "@/data/bnpbData";
import type { DataResult, HotspotResult, HotspotAvailability, HotspotTimeRange, MapBounds } from "@/types/environment";

import { API_BASE_URL, requestApi, ApiError } from "./http";

// helper fetch dengan batas waktu dan fallback -----------------------------------
async function readWithFallback<T>(
  url: string,
  options: RequestInit = {},
  fallbackData: T
): Promise<DataResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(4000),
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error("Data unavailable");
    }

    const json = await res.json();
    if (json.data == null) throw new Error("Data unavailable");
    return { data: json.data as T, origin: "service", fetched_at: new Date().toISOString(), failed: false };
  } catch {
    // jika backend belum aktif atau network terputus, gunakan data fallback
    return { data: fallbackData, origin: "sample", fetched_at: null, failed: true };
  }
}

async function fetchWithFallback<T>(url: string, options: RequestInit, fallbackData: T): Promise<T> {
  return (await readWithFallback(url, options, fallbackData)).data;
}

export async function getHomepageDataApi() {
  const [plots, bnpb] = await Promise.all([
    readWithFallback(`${API_BASE_URL}/plots`, {}, mockPlotsData),
    readWithFallback(`${API_BASE_URL}/external/bnpb-karhutla`, {}, mockBnpbData),
  ]);
  return { plots, bnpb };
}

export async function getHotspotsApi(bounds: MapBounds, signal: AbortSignal, hours: 6 | 12 | 24 | 72 = 24, range?:HotspotTimeRange|null): Promise<HotspotResult> {
  const params=new URLSearchParams({bbox:bounds.join(",")});
  if(range) { params.set("start",new Date(range.start).toISOString());params.set("end",new Date(range.end).toISOString()); }
  else params.set("hours",String(hours));
  const response = await fetch(`${API_BASE_URL}/external/hotspots?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(range?45000:15000)]),
  });
  const json = await response.json();
  if (!response.ok) throw new ApiError(response.status,json.error?.code||"FIRMS_UNAVAILABLE",json.error?.message||"Data titik panas belum tersedia.");
  if (!Array.isArray(json.data?.observations)) throw new Error("Data titik panas belum tersedia.");
  return json.data;
}

export async function getHotspotAvailabilityApi(signal:AbortSignal):Promise<HotspotAvailability> {
  const response=await fetch(`${API_BASE_URL}/external/hotspots/availability`,{signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
  if(!response.ok)throw new Error("Tanggal data NASA belum tersedia.");
  const json=await response.json();
  if(!Array.isArray(json.data?.sources)||!json.data.sources.length)throw new Error("Tanggal data NASA belum tersedia.");
  return json.data;
}

// end of helper fetch -------------------------------------------------------------

// api petak spasial ---------------------------------------------------------------
export async function getPlotsApi(region = "all", status = "all"): Promise<PlotFeatureCollection> {
  const params = new URLSearchParams();
  if (region !== "all") params.append("region", region);
  if (status !== "all") params.append("status", status);

  const url = `${API_BASE_URL}/plots?${params.toString()}`;
  return fetchWithFallback<PlotFeatureCollection>(url, {}, mockPlotsData);
}

// The existing timeline endpoint expects a plot code in its plot_id parameter.
export async function getRecoveryHistoryApi(plotCode: string, signal: AbortSignal, page = 1): Promise<{ items: TimelineItem[]; hasMore: boolean }> {
  const response = await fetch(`${API_BASE_URL}/timeline?${new URLSearchParams({ plot_id: plotCode, page: String(page), limit: "20" })}`, {
    credentials: "include",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("History unavailable");
  const json = await response.json();
  if (!Array.isArray(json.data?.items)) throw new Error("History unavailable");
  return { items: json.data.items, hasMore: json.data.pagination?.has_next === true };
}

// api metrik impact ledger --------------------------------------------------------
export async function getImpactLedgerApi(): Promise<ImpactLedgerData> {
  const url = `${API_BASE_URL}/metrics/impact-ledger`;
  return fetchWithFallback<ImpactLedgerData>(url, {}, mockImpactData);
}

// api bnpb karhutla ---------------------------------------------------------------
export async function getBnpbKarhutlaApi(): Promise<BnpbSyncData> {
  const url = `${API_BASE_URL}/external/bnpb-karhutla`;
  return fetchWithFallback<BnpbSyncData>(url, {}, mockBnpbData);
}

// api linimasa relawan ------------------------------------------------------------
export async function getTimelineApi(plotId = "all"): Promise<TimelineItem[]> {
  const params = new URLSearchParams();
  if (plotId !== "all") params.append("plot_id", plotId);

  const url = `${API_BASE_URL}/timeline?${params.toString()}`;
  const result = await fetchWithFallback<{ items: TimelineItem[] }>(
    url,
    {},
    { items: mockTimelineData }
  );
  return result.items || mockTimelineData;
}

// api upvote verifikasi warga ----------------------------------------------------
export async function verifyTimelineApi(
  logId: string,
  type: "subur" | "dispute" = "subur"
): Promise<{ confirmed_subur_count: number; user_has_verified: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/timeline/${logId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn("[API] Gagal verifikasi online:", err);
  }
  return { confirmed_subur_count: 43, user_has_verified: true };
}

// api tambah komentar warga ------------------------------------------------------
export async function addCommentApi(
  logId: string,
  authorName: string,
  content: string,
  authorBadge = "warga_lokal"
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/timeline/${logId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: authorName, content, author_badge: authorBadge }),
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// api pengiriman laporan pohon ----------------------------------------------------
export interface SubmitReportPayload {
  plot_id: string;
  tree_condition: "subur" | "perlu_rawat" | "mati";
  height_cm: number;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  notes?: string;
  photo_url?: string;
}

export async function submitReportApi(payload: SubmitReportPayload): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const result = await requestApi<{ message: string }>("/reports", { method: "POST", body: JSON.stringify(payload) });
    return { success: true, message: result.message };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Laporan belum tersimpan. Coba lagi." };
  }
}

export interface WindPoint { id:string; coordinates:[number,number]; speed_kmh:number; direction_deg:number; observed_at:string }
export interface WindResult { points:WindPoint[]; fetched_at:string; source:string; status:"ready"|"cached" }
export async function getWindApi(signal:AbortSignal):Promise<WindResult> {
  const response=await fetch(`${API_BASE_URL}/external/wind`,{signal});
  if (!response.ok) throw new Error("Wind unavailable");
  const json=await response.json();
  if (!Array.isArray(json.data?.points)) throw new Error("Wind unavailable");
  return json.data;
}

// Read official station data through the backend; upstream authorization stays private.
export async function getIspuApi(signal:AbortSignal):Promise<import("@/types/air-quality").IspuResult> {
  const response=await fetch(`${API_BASE_URL}/external/ispu`,{signal});
  if(!response.ok)throw new Error("ISPU unavailable");
  const json=await response.json();
  if(!Array.isArray(json.data?.stations))throw new Error("ISPU unavailable");
  return json.data;
}
export async function getIspuDetailApi(id:string,signal:AbortSignal):Promise<import("@/types/air-quality").IspuDetail> {
  const response=await fetch(`${API_BASE_URL}/external/ispu/${encodeURIComponent(id)}`,{signal});
  if(!response.ok)throw new Error("ISPU unavailable");
  const json=await response.json();
  if(json.data?.station?.id!==id||!Array.isArray(json.data?.pollutants))throw new Error("ISPU unavailable");
  return json.data;
}
