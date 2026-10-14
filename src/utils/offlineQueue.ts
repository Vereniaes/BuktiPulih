// src/utils/offlineQueue.ts
// -> utilitas manajemen antrean draft laporan offline kader
//      -> penyimpanan lokal berbasis localstorage / browser cache
//      -> sinkronisasi otomatis ketika koneksi internet pulih

import { SubmitReportPayload, submitReportApi } from "../services/api";

const STORAGE_KEY = "buktipulih_offline_reports_queue";

export interface OfflineDraftItem extends SubmitReportPayload {
  localId: string;
  createdAt: string;
}

export const saveOfflineDraft = (report: SubmitReportPayload): OfflineDraftItem => {
  const drafts = getOfflineDrafts();
  const draftItem: OfflineDraftItem = {
    ...report,
    localId: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  drafts.push(draftItem);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.warn("[OfflineQueue] Gagal menyimpan ke localStorage:", err);
  }

  return draftItem;
};

export const getOfflineDrafts = (): OfflineDraftItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const syncAllOfflineDrafts = async (): Promise<{
  syncedCount: number;
  remainingCount: number;
}> => {
  const drafts = getOfflineDrafts();
  if (drafts.length === 0) return { syncedCount: 0, remainingCount: 0 };

  const remaining: OfflineDraftItem[] = [];
  let synced = 0;

  for (const draft of drafts) {
    try {
      const res = await submitReportApi(draft);
      if (res.success) {
        synced += 1;
      } else {
        remaining.push(draft);
      }
    } catch {
      remaining.push(draft);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // noop
  }

  return { syncedCount: synced, remainingCount: remaining.length };
};
