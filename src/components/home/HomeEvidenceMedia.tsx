// Show field media with a useful retry when loading fails.
"use client";

import { useCallback, useState } from "react";
import type { ForumPost } from "@/types";
import styles from "./home.module.css";

export function HomeEvidenceMedia({ media, title, language = "id" }: { media: ForumPost["media"]; title: string; language?: "id" | "en" }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const isEn = language === "en";
  const readCachedMedia = useCallback((node: HTMLImageElement | HTMLVideoElement | null) => {
    if (node instanceof HTMLImageElement && node.complete) setStatus(node.naturalWidth > 0 ? "ready" : "failed");
    if (node instanceof HTMLVideoElement && (node.readyState >= 1 || node.error)) setStatus(node.error ? "failed" : "ready");
  }, []);
  return <div className={styles.evidenceMediaWrap} data-state={status}>
    {media.type === "video" ? (
      <video ref={readCachedMedia} key={attempt} src={media.url} className={styles.evidenceImg} controls preload="metadata" aria-label={title}
        onLoadedMetadata={() => setStatus("ready")} onError={() => setStatus("failed")} />
    ) : (
      <img ref={readCachedMedia} key={attempt} src={media.url} alt={title} className={styles.evidenceImg} loading="lazy" decoding="async"
        onLoad={() => setStatus("ready")} onError={() => setStatus("failed")} />
    )}
    {status === "loading" && <span className={styles.mediaLoading} aria-hidden="true"><span className={styles.spinner} /></span>}
    {status === "failed" && <div className={styles.mediaError} role="status">
      <span>{isEn ? "Media could not load" : "Media belum dapat dimuat"}</span>
      <button type="button" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>{isEn ? "Try again" : "Coba lagi"}</button>
    </div>}
  </div>;
}
