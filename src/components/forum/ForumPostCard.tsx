// Todo:
// -> show a post, its media gallery and available actions
"use client";

// --- Post card ---
import Link from "next/link";
import type { ForumPost } from "@/types";
import styles from "./forum.module.css";
import { ProfileAvatar } from "../account/ProfileAvatar";
import { MediaGallery } from "../evidence/MediaGallery";
import { getPostMedia } from "@/utils/evidenceMedia";

interface ForumPostCardProps {
  post: ForumPost;
  language: "id" | "en";
  published: boolean;
  onOpen?: (post: ForumPost) => void;
  onToggleLike: (postId: string) => void;
}

export function ForumPostCard({ post, language, published, onOpen, onToggleLike }: ForumPostCardProps) {
  const format = (value: number) => new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US").format(value);
  const date = new Date(post.created_at);
  const dateLabel = Number.isNaN(date.getTime()) ? (language === "id" ? "Tanggal tidak tersedia" : "Date unavailable") : new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "numeric", month: "short", timeZone: "Asia/Jakarta",
  }).format(date);
  const author = post.author.username;
  const detailHref = `/forum/${encodeURIComponent(post.id)}`;
  const openLabel = language === "id" ? "Baca catatan lengkap" : "Read full post";

  const open = (label: string, className: string) => published
    ? <Link className={className} href={detailHref}>{label}</Link>
    : <button className={className} type="button" onClick={() => onOpen?.(post)}>{label}</button>;

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

      {post.media?.url && <MediaGallery items={getPostMedia(post)} label={post.location_name} language={language} variant="feed" href={published ? detailHref : undefined} onOpen={published ? undefined : () => onOpen?.(post)} />}

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
// --- end of Post card ---
