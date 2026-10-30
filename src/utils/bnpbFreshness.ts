// Todo:
// -> Keep BNPB source dates separate from retrieval and check times.

// --- BNPB freshness ---
import type { BnpbSyncData } from "@/types";

/** Purpose: Validate a BNPB date-only value. Input: Source value. Output: Date or null. */
export function bnpbSourceDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : null;
}

/** Purpose: Read retrieval status without changing the source date. Input: Snapshot and clock. Output: Status. */
export function bnpbStatus(data: BnpbSyncData, now = Date.now()): "ready" | "cached" | "unavailable" {
  const fetched = Date.parse(data.fetched_at ?? data.sync_timestamp ?? "");
  if (data.status === "unavailable" || !Number.isFinite(fetched) || !data.provinces.length) return "unavailable";
  return data.status === "cached" || data.sync_status === "CACHED" || now - fetched > 12 * 3600000 ? "cached" : "ready";
}
// --- end of BNPB freshness ---
