// Todo:
// -> Show the latest real field stories in the approved editorial layout.

// --- Field stories ---
"use client";

import Link from "next/link";
import type { ForumPost } from "@/types";
import { HomeActionButton, HomeStoryLabel } from "./HomeActionButton";
import { HomeEvidenceMedia } from "./HomeEvidenceMedia";
import styles from "./home-preview.module.css";

interface Props {
  posts: ForumPost[];
  language?: "id" | "en";
  onOpenForum: () => void;
  onOpenLocalPost: (post: ForumPost) => void;
  onOpenReport?: () => void;
}

export function HomeFieldStories({ posts, language = "id", onOpenForum, onOpenLocalPost, onOpenReport }: Props) {
  const en = language === "en";
  const date = new Intl.DateTimeFormat(en ? "en-GB" : "id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

  function story(post: ForumPost, featured = false) {
    const place = [post.city, post.province].filter(Boolean).join(", ") || post.location_name;
    const checks = post.field_verifications?.length || 0;
    return <article className={styles.story} data-featured={featured} key={post.id}>
      <div className={styles.storyMedia}><HomeEvidenceMedia media={post.media} title={post.location_name} language={language} /></div>
      <p className={styles.storyMeta}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>{place} · {date.format(new Date(post.created_at))}</p>
      <h3 className={styles.storyTitle}>{post.location_name}</h3>
      <p className={styles.storyCaption}>{post.caption}</p>
      <p className={styles.storyStatus}>{checks ? checks + (en ? " field checks" : " pemeriksaan lapangan") : en ? "Not yet checked" : "Belum diperiksa"}</p>
      {post.persisted ? <Link href={"/forum/" + encodeURIComponent(post.id)} className={styles.readLink} aria-label={(en ? "Read note: " : "Baca catatan: ") + post.location_name}><HomeStoryLabel language={language} label={en ? "Read note →" : "Baca catatan →"} /></Link>
        : <HomeActionButton language={language} className={styles.readLink} onClick={() => onOpenLocalPost(post)}>{en ? "Read note →" : "Baca catatan →"}</HomeActionButton>}
    </article>;
  }

  return <section className={styles.stories} aria-labelledby="latest-evidence-title" data-home-stories>
    <div className={styles.sectionHeading}>
      <div><h2 id="latest-evidence-title" className={styles.sectionTitle}>{en ? <>Recovery stories,<br />directly from the field.</> : <>Cerita pulih,<br />langsung dari lapangan.</>}</h2><p>{en ? "Locations, observations and evidence that can be traced." : "Lokasi, catatan, dan bukti yang dapat ditelusuri."}</p></div>
      <HomeActionButton language={language} className={styles.textLink} onClick={onOpenForum}>{en ? "All stories" : "Semua cerita"}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></HomeActionButton>
    </div>
    {posts.length ? <div className={styles.storyLayout} data-count={posts.length}>{story(posts[0], true)}{posts.length > 1 && <div className={styles.storyAside}>{posts.slice(1).map(post => story(post))}</div>}</div>
      : <div className={styles.emptyStories}><p>{en ? "No field stories in this region yet." : "Belum ada cerita lapangan di wilayah ini."}</p><HomeActionButton language={language} className={styles.textLink} onClick={onOpenReport || onOpenForum}>{en ? "Send field evidence" : "Kirim bukti dari lapangan"}</HomeActionButton></div>}
  </section>;
}
// --- end of Field stories ---
