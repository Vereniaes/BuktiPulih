// Load public evidence only for the visible restoration area.
import type { RecoveryReport } from "@/types";
import { requestApi } from "./http";
export function getRecoveryReportsApi(bbox: string, region: string, condition: string, ecosystem: string, signal: AbortSignal) {
  return requestApi<{ items: RecoveryReport[]; truncated: boolean }>(`/forum/recovery?${new URLSearchParams({ bbox, region, condition, ecosystem })}`, { signal });
}
