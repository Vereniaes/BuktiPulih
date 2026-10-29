// Load a persisted Forum post at its permanent URL.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getForumPostApi, ApiError } from "@/services/account";
import { ForumPostDetailClient } from "../ForumPostDetailClient";
import type { ForumPost } from "@/types";
export function ForumRemotePost({ id }: { id: string }) {
  const [result, setResult] = useState<{ post?: ForumPost; missing?: boolean; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getForumPostApi(id, controller.signal).then(post => { if (!controller.signal.aborted) setResult({ post }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ missing: error instanceof ApiError && error.status === 404, error: true }); });
    return () => controller.abort();
  }, [id, retry]);
  if (result?.post) return <ForumPostDetailClient post={result.post} />;
  return <section style={{ padding: "40px 0" }}><Link href="/?tab=forum">Kembali ke Ruang Suara Hijau</Link>
    {!result ? <p role="status">Memuat posting…</p> : <><h1>{result.missing ? "Posting tidak ditemukan" : "Posting belum dapat dimuat"}</h1>
      {!result.missing && <button type="button" className="btn-report-primary" onClick={() => { setResult(null); setRetry(value => value + 1); }}>Coba lagi</button>}</>}
  </section>;
}
