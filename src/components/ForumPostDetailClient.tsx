// Read the post and join its account-based discussion.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ForumPost } from "@/types";
import { cacheForumPost, readCachedPosts } from "@/utils/forumStorage";
import { SharePostButton } from "./forum/SharePostButton";
import { REGION_TABS } from "@/utils/plotDisplay";
import { ProfileAvatar } from "./account/ProfileAvatar";
import { ForumComments } from "./forum/ForumComments";
import styles from "./forum/post-detail.module.css";

interface ForumPostDetailClientProps {
  post: ForumPost;
}

function formatPostDate(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function ForumPostDetailClient({ post }: ForumPostDetailClientProps) {
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [liked, setLiked] = useState(Boolean(post.metrics.user_has_liked));
  const [likes, setLikes] = useState(post.metrics.likes);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    try {
      const language = localStorage.getItem("buktipulih_language") === "en" ? "en" : "id";
      const cached = readCachedPosts().find(item => item.id === post.id);
      const frame = requestAnimationFrame(() => {
        setLanguage(language);
        if (cached) {
          setLiked(Boolean(cached.metrics.user_has_liked));
          setLikes(cached.metrics.likes);
        }
      });
      return () => cancelAnimationFrame(frame);
    } catch {
      // Use the default language if storage is unavailable.
    }
  }, [post.id]);

  const toggleLike = () => {
    const nextLiked = !liked;
    const nextLikes = Math.max(0, likes + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikes(nextLikes);
    const cached = readCachedPosts().find(item => item.id === post.id) || post;
    cacheForumPost({ ...cached, metrics: { ...cached.metrics, likes: nextLikes, user_has_liked: nextLiked } });
  };

  const conditions = language === "id" ? { subur: "Tumbuh subur", perlu_rawat: "Perlu rawat", kritis: "Kritis", mati: "Mati" } : { subur: "Thriving", perlu_rawat: "Needs care", kritis: "Critical", mati: "Dead" };
  const condition = post.status_condition || (post.condition ? conditions[post.condition] : "");
  const waterTable = post.water_table_depth_cm;
  const province = REGION_TABS.find(region => region.key === post.region_key)?.province;
  const authorName = post.author.username || (language === "id" ? "Warga" : "Community member");

  return (
    <div className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.backLink} href="/?tab=forum">
          {language === "id" ? "Kembali ke Ruang Suara Hijau" : "Back to Green Voices"}
        </Link>

        <header className={styles.header}>
          <div className={styles.author}>
            <ProfileAvatar username={authorName} src={post.author.avatar_url} className={styles.avatar} />
            <div className={styles.authorMeta}>
              <strong>{authorName === "Deleted Account" ? authorName : post.is_anonymous ? (language === "id" ? "Warga anonim" : "Anonymous resident") : `@${authorName}`}</strong>
              <span>{[post.author.city, province].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <time className={styles.date} dateTime={post.created_at}>{formatPostDate(post.created_at, language)}</time>
        </header>

        <h1 className={styles.title}>{post.location_name}</h1>
        {(post.province || post.city || post.place_detail) && <div className={styles.placeDetails}>
          {(post.city || post.province) && <p>{[post.city, post.province].filter(Boolean).join(" · ")}</p>}
          {post.place_detail && <p>{post.place_detail}</p>}
        </div>}
        <div className={styles.badges}>
          {post.verification_status === "unverified" && (
            <span className={styles.unverified}>{language === "id" ? "Belum diverifikasi" : "Unverified"}</span>
          )}
          {!post.persisted && <span className={styles.sample}>{language === "id" ? "Contoh catatan" : "Sample post"}</span>}
        </div>

        {post.comparative_media ? (
          <div className={styles.comparison}>
            {([post.comparative_media.before_url, post.comparative_media.after_url]).map((src, index) => (
              <figure key={`${src}-${index}`}>
                <img src={src} alt={index === 0 ? post.comparative_media!.before_label : post.comparative_media!.after_label} onError={(event) => { event.currentTarget.hidden = true; }} />
                <figcaption>{index === 0 ? post.comparative_media!.before_label : post.comparative_media!.after_label}</figcaption>
              </figure>
            ))}
          </div>
        ) : post.media.url && !mediaFailed ? (
          <figure className={styles.media}>
            {post.media.type === "video" ? (
              <video src={post.media.url} poster={post.media.thumbnail_url} controls preload="metadata" onError={() => setMediaFailed(true)} aria-label={post.location_name} />
            ) : (
              <img src={post.media.url} alt={`${language === "id" ? "Dokumentasi" : "Report media"}: ${post.location_name}`} onError={() => setMediaFailed(true)} />
            )}
          </figure>
        ) : (
          <div className={styles.mediaFallback} role="img" aria-label={language === "id" ? "Media tidak dapat dimuat" : "Media unavailable"}>
            {language === "id" ? "Media tidak dapat dimuat" : "Media unavailable"}
          </div>
        )}

        <p className={styles.caption}>{post.caption}</p>

        {(condition || waterTable !== undefined) && (
          <section className={styles.observation} aria-label={language === "id" ? "Ringkasan pengukuran" : "Measurement summary"}>
            <h2>{language === "id" ? "Catatan kondisi" : "Condition notes"}</h2>
            <dl>
              {condition && <div><dt>{language === "id" ? "Kondisi" : "Condition"}</dt><dd>{condition}</dd></div>}
              {waterTable !== undefined && <div><dt>{language === "id" ? "Kedalaman muka air" : "Water table depth"}</dt><dd>{waterTable} cm{post.water_table_status ? ` · ${post.water_table_status}` : ""}</dd></div>}
            </dl>
          </section>
        )}

        {post.verification_status === "unverified" && (
          <Link className={styles.recoveryLink} href={post.location ? `/?tab=recovery&report=${encodeURIComponent(post.id)}` : "/?tab=recovery"}>
            {language === "id" ? "Lihat di Peta Pemulihan" : "View on the Recovery Map"}
          </Link>
        )}

        <div className={styles.actions}>
          <button type="button" onClick={toggleLike} aria-pressed={liked} className={styles.actionButton}
            aria-label={language === "id" ? "Sukai posting" : "Like post"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.4-8.8 11-8.8 11s-8.8-5.6-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" /></svg>
            <span>{likes.toLocaleString(language === "id" ? "id-ID" : "en-GB")}</span>
          </button>
          <SharePostButton title={post.location_name} language={language} />
        </div>

        <ForumComments key={post.id} postId={post.id} title={post.location_name} language={language} />
      </article>
    </div>
  );
}
