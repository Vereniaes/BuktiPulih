// Todo:
// -> browse ordered report photos and videos
// -> load one media item at a time
/* eslint-disable @next/next/no-img-element -- Uploaded formats keep their native dimensions. */
"use client";

// --- Media gallery ---
import { useState } from "react";
import Link from "next/link";
import type { PostMedia } from "@/types";
import styles from "./media-gallery.module.css";

interface Props {
  items: PostMedia[]; label: string; language: "id" | "en";
  variant?: "feed" | "detail" | "panel";
  href?: string; onOpen?: () => void;
}

/** Input: ordered media. Output: a gallery that mounts only the selected file. */
export function MediaGallery({ items, label, language, variant = "detail", href, onOpen }: Props) {
  const [position, setPosition] = useState(0), [failed, setFailed] = useState<string[]>([]);
  const index = Math.min(position, items.length - 1), item = items[index], en = language === "en";
  if (!item) return null;
  const fail = () => setFailed(previous => previous.includes(item.url) ? previous : [...previous, item.url]);
  const image = <img key={item.url} src={item.url} alt={`${label} - ${index + 1}`} loading="lazy" decoding="async" onError={fail}
    ref={node => { if (node?.currentSrc && node.complete && !node.naturalWidth) fail(); }} />;
  return <div className={`${styles.gallery} ${styles[variant]}`} role="group" aria-label={en ? `Media: ${label}` : `Dokumentasi: ${label}`}
    onKeyDown={event => {
      if ((event.target as HTMLElement).closest("video")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setPosition(Math.max(0, Math.min(items.length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)))); }
    }}>
    <div className={styles.frame}>
      {failed.includes(item.url) ? <p className={styles.unavailable}>{en ? "Preview unavailable." : "Pratinjau belum tersedia."} <a href={item.url} target="_blank" rel="noopener noreferrer">{en ? "Open file" : "Buka berkas"}</a></p>
        : item.type === "video" ? <video key={item.url} src={item.url} poster={item.thumbnail_url} controls playsInline preload="metadata" aria-label={`${label} - ${index + 1}`} onError={fail} />
        : href ? <Link href={href} aria-label={en ? `Open ${label}` : `Buka ${label}`}>{image}</Link>
        : onOpen ? <button className={styles.open} type="button" onClick={onOpen} aria-label={en ? `Open ${label}` : `Buka ${label}`}>{image}</button> : image}
    </div>
    {items.length > 1 && <div className={styles.controls}>
      <button type="button" aria-label={en ? "Previous media" : "Media sebelumnya"} disabled={index === 0} onClick={() => setPosition(index - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg></button>
      <span role="status" aria-live="polite">{index + 1} / {items.length}</span>
      <button type="button" aria-label={en ? "Next media" : "Media berikutnya"} disabled={index === items.length - 1} onClick={() => setPosition(index + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></button>
    </div>}
  </div>;
}
// --- end of Media gallery ---
