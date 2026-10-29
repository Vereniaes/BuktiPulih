// Share a post through the device or a short list of social links.
"use client";

import { useRef, useState } from "react";
import actionStyles from "./post-detail.module.css";
import styles from "./share-post.module.css";

export function SharePostButton({ title, language }: { title: string; language: "id" | "en" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const label = language === "id" ? "Bagikan" : "Share";
  const links = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`],
    ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ["X", `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`],
  ];

  const share = async () => {
    if (sharing) return;
    const postUrl = `${window.location.origin}${window.location.pathname}`;
    setUrl(postUrl); setMessage("");
    if (navigator.share) {
      setSharing(true);
      try {
        await navigator.share({ title, url: postUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally { setSharing(false); }
    }
    dialog.current?.showModal();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(language === "id" ? "Tautan disalin." : "Link copied.");
    } catch {
      setMessage(language === "id" ? "Pilih dan salin tautan di bawah." : "Select and copy the link below.");
    }
  };

  return <>
    <button ref={trigger} type="button" onClick={share} className={actionStyles.actionButton}
      aria-label={label} title={label} aria-haspopup="dialog" disabled={sharing}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg>
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-label={label} onClose={() => trigger.current?.focus()}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close();
      }}>
      <div className={styles.header}>
        <h2>{label}</h2>
        <button type="button" className={styles.close} aria-label={language === "id" ? "Tutup bagikan" : "Close sharing"} onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className={styles.options}>
        {links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer">{name}<span aria-hidden="true">↗</span></a>)}
        <button type="button" onClick={copy}>{language === "id" ? "Salin tautan" : "Copy link"}
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
        </button>
      </div>
      <input className={styles.url} aria-label={language === "id" ? "Tautan posting" : "Post link"} value={url} readOnly onFocus={event => event.currentTarget.select()} />
      <p className={styles.status} role="status">{message}</p>
    </dialog>
  </>;
}
