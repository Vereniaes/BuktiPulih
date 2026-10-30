// Todo:
// -> show private posting and comment history
// -> navigate pages with accessible arrow controls
"use client";

// --- Activity history ---
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { getAccountActivityApi } from "@/services/account";
import type { ActivityKind, ActivityPage } from "@/types/account";
import styles from "./profile.module.css";
const copy = {
  id: { title: "Riwayat interaksi", posts: "Posting", comments: "Komentar", loading: "Memuat riwayat…", retry: "Coba lagi", emptyPosts: "Belum ada posting dari akun ini.", emptyComments: "Belum ada komentar dari akun ini.", forum: "Buka Ruang Suara Hijau", date: "Tanggal", action: "Tautan", open: "Buka", previous: "Sebelumnya", next: "Berikutnya", page: "Halaman", of: "dari", first: "Halaman pertama", unavailable: "Halaman ini tidak tersedia.", error: "Riwayat belum dapat dimuat." },
  en: { title: "Interaction history", posts: "Posts", comments: "Comments", loading: "Loading history…", retry: "Try again", emptyPosts: "No posts from this account yet.", emptyComments: "No comments from this account yet.", forum: "Open Green Voices", date: "Date", action: "Link", open: "Open", previous: "Previous", next: "Next", page: "Page", of: "of", first: "First page", unavailable: "This page is unavailable.", error: "History could not be loaded." },
};
interface Props { userId: string; language: "id" | "en"; kind: ActivityKind; page: number; onNavigate: (kind: ActivityKind, page: number) => void }
export function ActivityHistory({ userId, language, kind, page, onNavigate }: Props) {
  const t = copy[language];
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: ActivityPage; error?: boolean } | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const requestKey = `${userId}:${kind}:${page}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    getAccountActivityApi(kind, page, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: true }); });
    return () => controller.abort();
  }, [kind, page, requestKey]);
  const current = result?.key === requestKey ? result : null;
  const data = current?.data;
  const loading = !current;
  const unavailable = data && page > Math.max(data.pagination.total_pages, 1);
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" || event.key === "ArrowLeft" ? 1 - index : event.key === "Home" ? 0 : event.key === "End" ? 1 : null;
    if (next !== null) { event.preventDefault(); buttons.current[next]?.focus(); }
  };
  const date = (value: string) => new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
  return <section className={styles.historySection} aria-labelledby="activity-title">
    <header className={styles.sectionHeader}><h2 id="activity-title">{t.title}</h2></header>
    <div className={styles.tabs} role="tablist" aria-label={t.title}>{(["posts", "comments"] as const).map((tab, index) => <button key={tab} ref={element => { buttons.current[index] = element; }} id={`activity-tab-${tab}`} role="tab" type="button" aria-selected={kind === tab} aria-controls="activity-panel" tabIndex={kind === tab ? 0 : -1} className={kind === tab ? styles.activeTab : styles.tab} onClick={() => onNavigate(tab, 1)} onKeyDown={event => keyDown(event, index)}>{t[tab]}</button>)}</div>
    <div id="activity-panel" role="tabpanel" tabIndex={0} aria-labelledby={`activity-tab-${kind}`} className={styles.tablePanel} aria-busy={loading}>
      {loading ? <p className={styles.stateMessage} role="status">{t.loading}</p>
        : current.error ? <div className={styles.stateMessage} role="alert"><p>{t.error}</p><button type="button" className={styles.textButton} onClick={() => setRetry(value => value + 1)}>{t.retry}</button></div>
        : unavailable ? <div className={styles.stateMessage}><p>{t.unavailable}</p><button type="button" className={styles.textButton} onClick={() => onNavigate(kind, 1)}>{t.first}</button></div>
        : !data?.items.length ? <div className={styles.stateMessage}><p>{kind === "posts" ? t.emptyPosts : t.emptyComments}</p><Link className={styles.textButton} href="/?tab=forum">{t.forum}</Link></div>
        : <table className={styles.activityTable}><caption className={styles.visuallyHidden}>{t[kind]}</caption>
          <thead><tr><th scope="col">{t[kind]}</th><th scope="col">{t.date}</th><th scope="col">{t.action}</th></tr></thead>
          <tbody>{data.items.map(item => <tr key={item.id}><td><span className={styles.itemTitle}>{item.title}</span>{(item.is_anonymous || item.verification_status === "unverified") && <span className={styles.unverifiedBadge}>{[item.is_anonymous ? (language === "id" ? "Anonim" : "Anonymous") : "", item.verification_status === "unverified" ? (language === "id" ? "Belum diverifikasi" : "Unverified") : ""].filter(Boolean).join(" · ")}</span>}<span className={styles.itemContent}>{item.content}</span></td>
            <td className={styles.dateCell}><time dateTime={item.created_at}>{date(item.created_at)}</time></td>
            <td><Link className={styles.openLink} href={`/forum/${encodeURIComponent(item.post_id)}${kind === "comments" ? "#comments-section" : ""}`}>{t.open}<span aria-hidden="true"> ↗</span></Link></td></tr>)}</tbody>
        </table>}
      {data && !unavailable && data.pagination.total_items > 0 && <nav className={styles.pagination} aria-label={t.title}><span>{t.page} {data.pagination.page} {t.of} {data.pagination.total_pages}</span><div>
        <button type="button" className={styles.pageButton} aria-label={t.previous} disabled={page <= 1} onClick={() => onNavigate(kind, page - 1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg></button>
        <button type="button" className={styles.pageButton} aria-label={t.next} disabled={page >= data.pagination.total_pages} onClick={() => onNavigate(kind, page + 1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></button>
      </div></nav>}
    </div>
  </section>;
}
// --- end of Activity history ---
