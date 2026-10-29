// Show one post, its media, and its available actions.
"use client";

import { useState } from "react";
import Link from "next/link";
import type { ForumPost } from "@/types";
import styles from "./forum.module.css";
import { ProfileAvatar } from "../account/ProfileAvatar";

interface ForumPostCardProps {
  post: ForumPost;
  language: "id" | "en";
  published: boolean;
  onOpen?: (post: ForumPost) => void;
  onToggleLike: (postId: string) => void;
}

export function ForumPostCard({ post, language, published, onOpen, onToggleLike }: ForumPostCardProps) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const format = (value: number) => new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US").format(value);
  const date = new Date(post.created_at);
  const dateLabel = Number.isNaN(date.getTime()) ? (language === "id" ? "Tanggal tidak tersedia" : "Date unavailable") : new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "numeric", month: "short", timeZone: "Asia/Jakarta",
  }).format(date);
  const author = post.author.username;
  const detailHref = `/forum/${encodeURIComponent(post.id)}`;
  const openLabel = language === "id" ? "Baca catatan lengkap" : "Read full post";
  const imageAlt = language === "id" ? `Dokumentasi lapangan oleh ${author}` : `Field documentation by ${author}`;

  const open = (label: string, className: string) => published
    ? <Link className={className} href={detailHref}>{label}</Link>
    : <button className={className} type="button" onClick={() => onOpen?.(post)}>{label}</button>;

  const image = <img className={styles.media} src={post.media.thumbnail_url || post.media.url}
    alt={imageAlt}
    loading="lazy" decoding="async" onError={() => setMediaFailed(true)}
    ref={node => { if (node?.complete && !node.naturalWidth) setMediaFailed(true); }} />;

  return (
    <article className={styles.card} aria-label={language === "id" ? `Catatan dari ${author}` : `Post by ${author}`}>
      <header className={styles.author}>
        <ProfileAvatar key={post.author.avatar_url || author} className={styles.avatar} username={author} src={post.author.avatar_url} />
        <div className={styles.authorInfo}>
          <strong>{author}</strong>
          <span>{post.author.city ? `${post.author.city} / ` : ""}<time dateTime={post.created_at}>{dateLabel}</time></span>
        </div>
      </header>

      <p className={styles.location}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        <span>{post.location_name}</span>
      </p>

      {post.media?.url && !mediaFailed && (
        post.media.type === "video" ? (
          <video className={styles.media} controls preload="metadata" src={post.media.url} poster={post.media.thumbnail_url}
            ref={node => { if (node?.error) setMediaFailed(true); }} onError={() => setMediaFailed(true)}
            aria-label={language === "id" ? `Video dari ${author}` : `Video by ${author}`} />
        ) : published ? (
          <Link className={styles.mediaLink} href={detailHref} aria-label={language === "id" ? `Lihat foto dari ${author}` : `View photo by ${author}`}>
            {image}
          </Link>
        ) : (
          <button className={styles.mediaLink} type="button" onClick={() => onOpen?.(post)} aria-label={language === "id" ? `Lihat foto dari ${author}` : `View photo by ${author}`}>
            {image}
          </button>
        )
      )}
      {mediaFailed && <p className={styles.mediaFallback}>{language === "id" ? "Media tidak dapat dimuat." : "Media could not be loaded."}</p>}

      <p className={styles.caption}>{post.caption}</p>
      {open(openLabel, styles.readMore)}

      <footer className={styles.actions}>
        <button className={post.metrics.user_has_liked ? styles.liked : styles.action}
          type="button" onClick={() => onToggleLike(post.id)}
          aria-label={language === "id" ? `Sukai catatan oleh ${author}` : `Like post by ${author}`}
          aria-pressed={Boolean(post.metrics.user_has_liked)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.4-8.8 11-8.8 11s-8.8-5.6-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" /></svg>
          <span>{format(post.metrics.likes)}</span>
        </button>
        {published ? (
          <Link className={styles.action} href={`${detailHref}#comments-section`}
            aria-label={language === "id" ? `Buka komentar pada catatan ${author}` : `Read comments on the post by ${author}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-4-.9L3 20l1.8-4A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 2.9 8 7Z" /></svg>
            <span>{format(post.metrics.comments_count)}</span>
          </Link>
        ) : (
          <button className={styles.action} type="button" onClick={() => onOpen?.(post)}
            aria-label={language === "id" ? `Buka komentar pada catatan ${author}` : `Read comments on the post by ${author}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-4-.9L3 20l1.8-4A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 2.9 8 7Z" /></svg>
            <span>{format(post.metrics.comments_count)}</span>
          </button>
        )}
        <span className={styles.views}>
          {format(post.metrics.views)} {language === "id" ? "Dilihat" : "views"}
        </span>
      </footer>
    </article>
  );
}
