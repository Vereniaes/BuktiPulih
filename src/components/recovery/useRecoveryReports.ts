// Fetch bounded public evidence and resolve a report opened from a permanent map link.
"use client";
import { useEffect, useState } from "react";
import { getRecoveryReportsApi } from "@/services/recovery";
import { getForumPostApi } from "@/services/account";
import type { ForumPost, RecoveryReport } from "@/types";
import { validCoordinates } from "@/utils/recoveryEvidence";
function isReport(post: ForumPost): post is RecoveryReport {
  return !!post.location && validCoordinates(post.location.coordinates) && !!post.ecosystem_type && !!post.condition && post.verification_status === "unverified";
}
export function useRecoveryReports(bbox: string, region: string, condition: string, ecosystem: string, selectedId: string | null, enabled: boolean) {
  const key = [bbox, region, condition, ecosystem].join("|");
  const [result, setResult] = useState<{ key: string; items: RecoveryReport[]; truncated: boolean; failed: boolean }>({ key: "", items: [], truncated: false, failed: false });
  const [detail, setDetail] = useState<{ id: string; report: RecoveryReport | null }>({ id: "", report: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getRecoveryReportsApi(bbox, region, condition, ecosystem, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult({ key, items: data.items.filter(isReport), truncated: data.truncated, failed: false });
      }).catch(() => {
        if (!controller.signal.aborted) setResult(previous => ({ key, items: previous.key === key ? previous.items : [], truncated: false, failed: true }));
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [bbox, region, condition, ecosystem, key, retry, enabled]);
  const listed = result.items.find(item => item.id === selectedId);
  useEffect(() => {
    if (!selectedId || listed) return;
    const controller = new AbortController();
    getForumPostApi(selectedId, controller.signal).then(post => {
      if (!controller.signal.aborted) setDetail({ id: selectedId, report: isReport(post) ? post : null });
    }).catch(() => { if (!controller.signal.aborted) setDetail({ id: selectedId, report: null }); });
    return () => controller.abort();
  }, [selectedId, listed, retry]);
  return {
    items: result.items, selected: listed ?? (detail.id === selectedId ? detail.report : null),
    loading: enabled && result.key !== key, failed: result.key === key && result.failed, truncated: result.key === key && result.truncated,
    detailLoading: !!selectedId && !listed && detail.id !== selectedId,
    detailFailed: !!selectedId && !listed && detail.id === selectedId && !detail.report,
    refresh: () => setRetry(value => value + 1),
  };
}
