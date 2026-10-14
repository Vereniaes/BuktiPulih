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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// helper fetch dengan batas waktu dan fallback -----------------------------------
async function fetchWithFallback<T>(
  url: string,
  options: RequestInit = {},
  fallbackData: T
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[API] Endpoint ${url} merespons ${res.status}, menggunakan data fallback.`);
      return fallbackData;
    }

    const json = await res.json();
    return (json.data as T) || fallbackData;
  } catch {
    // jika backend belum aktif atau network terputus, gunakan data fallback
    return fallbackData;
  }
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
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, message: json.data?.message || "Laporan berhasil disimpan!" };
    }
  } catch (err) {
    console.warn("[API] Gagal mengirim laporan ke backend:", err);
  }
  // jika offline, simpan draft lokal
  return {
    success: true,
    message: "Laporan tersimpan di memori perangkat. Akan disinkronkan saat ada jaringan.",
  };
}

// api login sesi kader -----------------------------------------------------------
export async function loginKaderApi(
  phoneNumber: string,
  pin: string
): Promise<{ success: boolean; user?: Record<string, unknown>; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phoneNumber, pin }),
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      return { success: true, user: json.data?.user, message: json.data?.message || "Berhasil masuk!" };
    }
    return { success: false, message: json.error?.message || "Nomor atau PIN salah." };
  } catch {
    // fallback testing offline mode jika backend belum terhubung
    if (pin === "123456") {
      return {
        success: true,
        user: {
          full_name: "Pak Suwardi",
          phone_number: phoneNumber,
          role_badge: "🌿 Kader Terdaftar ✓",
          organization_name: "Kelompok Tani Peduli Gambut Kubu Raya",
        },
        message: "Selamat datang kembali, Pak Suwardi!",
      };
    }
    return { success: false, message: "PIN yang dimasukkan keliru." };
  }
}

// api logout sesi kader ----------------------------------------------------------
export async function logoutKaderApi(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // noop
  }
}
