// Todo:
// -> search, filter and paginate resident field notes
"use client";

// --- Forum feed ---
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForumPost } from "@/types";
import { initialForumPosts } from "@/data/forumPostsData";
import { FORUM_PAGE_SIZE, getForumRegions, getSortedPosts, type SortCriteria } from "@/utils/forumDisplay";
import { ForumPostCard } from "./forum/ForumPostCard";
import { ForumRegionFilter } from "./forum/ForumRegionFilter";
import { useDoubleSwipe } from "./forum/useDoubleSwipe";
import type { useForumPosts } from "./forum/useForumPosts";
import { useMasonry } from "./forum/useMasonry";
import styles from "./forum/forum.module.css";

interface ForumFeedProps {
  posts: ForumPost[];
  source: ReturnType<typeof useForumPosts>;
  onOpenPostDetail?: (post: ForumPost) => void;
  onToggleLike: (postId: string) => void;
  selectedRegionFilter?: string;
  selectedPlotFilter?: string;
  onSelectRegionFilter?: (region: string) => void;
  language?: "id" | "en";
}

const publishedIds = new Set(initialForumPosts.map((post) => post.id));

export const ForumFeed: React.FC<ForumFeedProps> = ({
  posts, source, onOpenPostDetail, onToggleLike,
  selectedRegionFilter, onSelectRegionFilter, language = "id",
}) => {
  const [currentSort, setCurrentSort] = useState<SortCriteria>("latest");
  const [localRegion, setLocalRegion] = useState("all");
  const [query, setQuery] = useState("");
  const region = selectedRegionFilter ?? localRegion;
  const copy = language === "id" ? {
    title: "Ruang Suara Hijau",
    search: "Cari pemulihan",
    searchLabel: "Cari pemulihan",
    latest: "Terbaru",
    likes: "Disukai",
    comments: "Komentar",
    views: "Dilihat",
    sort: "Urutan",
    reset: "Hapus filter",
    emptyTitle: "Belum ada catatan yang cocok",
    emptyText: "Coba kata kunci atau wilayah lain.",
  } : {
    title: "Green Voices",
    search: "Search restoration",
    searchLabel: "Search restoration",
    latest: "Latest",
    likes: "Most liked",
    comments: "Comments",
    views: "Views",
    sort: "Sort by",
    reset: "Clear filters",
    emptyTitle: "No posts match these filters",
    emptyText: "Try another search or region.",
  };
  const changeRegion = (value: string) => {
    setLocalRegion(value);
    onSelectRegionFilter?.(value);
  };
  const displayPosts = useMemo(() => getSortedPosts(posts, region, currentSort, query), [posts, region, currentSort, query]);
  const regions = useMemo(() => getForumRegions(posts), [posts]);
  const hasFilters = region !== "all" || Boolean(query.trim());
  const clearFilters = () => { changeRegion("all"); setQuery(""); };

  return (
    <section className={styles.section} aria-labelledby="forum-pulih-title">
      <header className={styles.header}>
        <h2 className={styles.title} id="forum-pulih-title">{copy.title}</h2>
      </header>

      <div className={styles.filters}>
        <label className={styles.inputWrap}>
          <span className={styles.visuallyHidden}>{copy.searchLabel}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
          <input className={styles.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search} aria-label={copy.searchLabel} />
        </label>
        <ForumRegionFilter value={region} regions={regions} onChange={changeRegion} language={language} />
        <label>
          <span className={styles.visuallyHidden}>{copy.sort}</span>
          <select className={styles.select} value={currentSort} onChange={(event) => setCurrentSort(event.target.value as SortCriteria)} aria-label={copy.sort}>
            <option value="latest">{copy.latest}</option>
            <option value="likes">{copy.likes}</option>
            <option value="comments">{copy.comments}</option>
            <option value="views">{copy.views}</option>
          </select>
        </label>
      </div>

      {hasFilters && <div className={styles.filterActions}>
        <button type="button" className={styles.reset} onClick={clearFilters}>{copy.reset}</button>
      </div>}

      <PagedPosts key={`${region}:${currentSort}:${query.trim().toLocaleLowerCase("id-ID")}`}
        posts={displayPosts} source={source} complete={region !== "all" || currentSort !== "latest" || Boolean(query.trim())}
        language={language} onOpenPostDetail={onOpenPostDetail} onToggleLike={onToggleLike} emptyTitle={copy.emptyTitle} emptyText={copy.emptyText} />

    </section>
  );
};

// Keep already shown cards in the DOM; each action extends the visible batch.
function PagedPosts({ posts, source, complete, language, onOpenPostDetail, onToggleLike, emptyTitle, emptyText }:
  Pick<ForumFeedProps, "posts" | "source" | "onOpenPostDetail" | "onToggleLike"> & { complete: boolean; language: "id" | "en"; emptyTitle: string; emptyText: string }) {
  const [limit, setLimit] = useState(FORUM_PAGE_SIZE);
  const marker = useRef<HTMLDivElement>(null);
  const focusIndex = useRef<number | null>(null);
  const { loading, error, hasMore, boundary, loadMore } = source;
  // Older local examples must not appear ahead of unread server pages.
  const eligible = hasMore && !complete && boundary ? posts.filter(post => post.created_at >= boundary) : posts;
  const visible = eligible.slice(0, limit);
  const masonryRef = useMasonry(visible.map(post => post.id));
  const more = hasMore || eligible.length > limit;
  const busy = loading || (complete && hasMore && !error);
  const advance = useCallback(() => setLimit(value => value + FORUM_PAGE_SIZE), []);
  const gestures = useDoubleSwipe(marker, more && !busy && !error, advance);

  useEffect(() => {
    if (!loading && !error && hasMore && (complete || eligible.length < limit)) void loadMore(complete);
  }, [loading, error, hasMore, complete, eligible.length, limit, loadMore]);
  useEffect(() => {
    if (focusIndex.current === null || visible.length <= focusIndex.current) return;
    const card = masonryRef.current?.children[focusIndex.current];
    card?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    focusIndex.current = null;
  }, [visible.length, masonryRef]);

  return <>
    {visible.length === 0 && !busy && !error && !hasMore ? <div className={styles.empty}><strong>{emptyTitle}</strong><p>{emptyText}</p></div> : null}
    <div ref={masonryRef} className={styles.grid} aria-busy={busy}>
      {visible.map(post => <ForumPostCard key={post.id} post={post} language={language} published={publishedIds.has(post.id) || post.persisted === true}
        onOpen={onOpenPostDetail} onToggleLike={onToggleLike} />)}
    </div>
    {(more || busy || error) && <div ref={marker} className={styles.pagination}>
      {error ? <><p role="alert">{language === "id" ? "Posting belum dapat dimuat." : "Could not load posts."}</p>
        <button className={styles.loadMore} type="button" onClick={() => { gestures.reset(); void loadMore(complete); }}>{language === "id" ? "Coba lagi" : "Try again"}</button></>
        : <>
          <p className={styles.swipeHint} role="status">{busy ? (language === "id" ? "Memuat..." : "Loading...") : language === "id"
            ? gestures.swipes ? "Gulir sekali lagi untuk memuat posting." : "Gulir 2 kali untuk memuat posting."
            : gestures.swipes ? "Scroll once more to load posts." : "Scroll twice to load posts."}</p>
          <button className={`${styles.loadMore} ${styles.desktopLoad}`} type="button" disabled={busy}
            onClick={() => { focusIndex.current = visible.length; gestures.reset(); advance(); }}>
            {busy ? (language === "id" ? "Memuat..." : "Loading...") : "Load more"}
          </button>
        </>}
    </div>}
    <span className={styles.visuallyHidden} role="status">{visible.length} {language === "id" ? "posting ditampilkan" : "posts shown"}</span>
  </>;
}
// --- end of Forum feed ---
