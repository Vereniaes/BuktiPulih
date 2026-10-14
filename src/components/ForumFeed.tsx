// src/components/ForumFeed.tsx
// -> komponen feed forum partisipasi publik bergaya tumblr (tumblr-style masonry feed)
//      -> kartu postingan dengan skala rasio foto alami (square, portrait, landscape)
//      -> filter bar: terbaru, paling disukai, terbanyak komentar, paling banyak dilihat
//      -> tombol interaksi suka (like) cepat, metrik views, dan tombol '+' buat posting baru

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ForumPost } from "@/types";
import { formatId, REGION_TABS, RegionKey } from "@/utils/plotDisplay";

interface ForumFeedProps {
  posts: ForumPost[];
  onOpenPostDetail?: (post: ForumPost) => void;
  onOpenCreatePost: () => void;
  onToggleLike: (postId: string) => void;
  selectedPlotFilter?: string;
  selectedRegionFilter?: string;
  onSelectRegionFilter?: (region: string) => void;
}

type SortCriteria = "latest" | "likes" | "comments" | "views";

// helper --------------------------------------------------------------------------
// function buat menyaring dan mengurutkan postingan forum
// input param : list posts, filterWilayah, filterKondisi, sortKey
// output : ForumPost[] yang sudah diurutkan
function getSortedPosts(
  posts: ForumPost[],
  regionFilter: string,
  sortKey: SortCriteria
): ForumPost[] {
  let result = [...posts];

  if (regionFilter !== "all") {
    const tab = REGION_TABS.find((t) => t.key === regionFilter);
    const targetProvince = tab ? tab.province.toLowerCase() : regionFilter.toLowerCase();
    result = result.filter(
      (p) =>
        p.region_key === regionFilter ||
        (targetProvince && p.location_name.toLowerCase().includes(targetProvince)) ||
        p.location_name.toLowerCase().includes(regionFilter.toLowerCase())
    );
  }

  if (sortKey === "latest") {
    result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else if (sortKey === "likes") {
    result.sort((a, b) => b.metrics.likes - a.metrics.likes);
  } else if (sortKey === "comments") {
    result.sort((a, b) => b.metrics.comments_count - a.metrics.comments_count);
  } else if (sortKey === "views") {
    result.sort((a, b) => b.metrics.views - a.metrics.views);
  }

  return result;
}
// end of helper ------------------------------------------------------------------

export const ForumFeed: React.FC<ForumFeedProps> = ({
  posts,
  onOpenPostDetail,
  onOpenCreatePost,
  onToggleLike,
  selectedRegionFilter,
  onSelectRegionFilter,
}) => {
  const [currentSort, setCurrentSort] = useState<SortCriteria>("latest");
  const [localRegionFilter, setLocalRegionFilter] = useState<string>("all");

  const activeRegion = selectedRegionFilter !== undefined ? selectedRegionFilter : localRegionFilter;

  const handleRegionChange = (newRegion: string) => {
    setLocalRegionFilter(newRegion);
    if (onSelectRegionFilter) {
      onSelectRegionFilter(newRegion);
    }
  };

  // hitung jumlah postingan per wilayah secara dinamis
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    REGION_TABS.forEach((tab) => {
      if (tab.key === "all") return;
      const provLower = tab.province.toLowerCase();
      counts[tab.key] = posts.filter(
        (p) =>
          p.region_key === tab.key ||
          (provLower && p.location_name.toLowerCase().includes(provLower))
      ).length;
    });
    return counts;
  }, [posts]);

  const displayPosts = getSortedPosts(posts, activeRegion, currentSort);
  const currentRegionTab = REGION_TABS.find((t) => t.key === activeRegion);

  const totalVerificationsInRegion = useMemo(() => {
    return displayPosts.reduce((acc, p) => acc + (p.field_verifications?.length || 0), 0);
  }, [displayPosts]);

  return (
    <section className="forum-pulih-section" aria-labelledby="forum-pulih-title">
      {/* baris judul & tombol tambah kiriman ----------------------------------- */}
      <div className="forum-header-bar">
        <div>
          <span className="live-status-pill purple">
            <span className="pulse-dot purple"></span>
            jurnal kiriman warga & relawan
          </span>
          <h2 id="forum-pulih-title" className="section-title-large">
            Forum Pulih: Catatan Partisipasi Lapangan
          </h2>
          <p className="section-subtitle-text">
            Dokumentasi foto dan catatan langsung dari warga desa dan relawan di lapangan (rumah warga, jembatan, fasilitas umum, kebun, maupun lahan gambut). Laporkan perkembangan atau periksa pemulihan di wilayah Anda.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn-create-post"
            onClick={onOpenCreatePost}
          >
            <span className="btn-plus-icon">+</span>
            <span>Posting Bukti Baru</span>
          </button>
        </div>
      </div>

      {/* filter bar ringkas & terpadu (anti-slop control bar) ---------------- */}
      <div className="forum-control-bar">
        <div className="control-bar-filters">
          {/* filter dropdown wilayah */}
          <div className="control-select-group">
            <label htmlFor="forum-region-select" className="control-label">Wilayah</label>
            <select
              id="forum-region-select"
              className="control-select"
              value={activeRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <option value="all">Semua Wilayah ({posts.length})</option>
              {REGION_TABS.filter((t) => t.key !== "all").map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label} ({regionCounts[tab.key] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* segmented sort toggle */}
        <div className="control-sort-group" role="tablist" aria-label="Kriteria Urutan">
          <span className="control-label">Urutan</span>
          <div className="control-sort-segmented">
            <button
              type="button"
              className={`sort-seg-btn ${currentSort === "latest" ? "active" : ""}`}
              onClick={() => setCurrentSort("latest")}
            >
              Terbaru
            </button>
            <button
              type="button"
              className={`sort-seg-btn ${currentSort === "likes" ? "active" : ""}`}
              onClick={() => setCurrentSort("likes")}
            >
              Terpopuler
            </button>
            <button
              type="button"
              className={`sort-seg-btn ${currentSort === "comments" ? "active" : ""}`}
              onClick={() => setCurrentSort("comments")}
            >
              Komentar
            </button>
          </div>
        </div>
      </div>

      {/* strip informasi kontekstual wilayah terpilih --------------------------- */}
      {activeRegion !== "all" && (
        <div className="forum-region-banner">
          <div className="forum-region-banner-info">
            <span className="forum-region-banner-badge">
              {currentRegionTab
                ? `FOKUS WILAYAH: ${currentRegionTab.label.toUpperCase()}`
                : "SEMUA WILAYAH"}
            </span>
            <p className="forum-region-banner-desc">
              Menampilkan {displayPosts.length} catatan partisipasi warga
              {currentRegionTab ? ` dan ${totalVerificationsInRegion} log verifikasi fisik di ${currentRegionTab.province}` : ""}.
            </p>
          </div>
          <div className="forum-banner-actions">
            <button
              type="button"
              className="btn-region-reset"
              onClick={() => handleRegionChange("all")}
              aria-label="Kembali ke semua wilayah"
            >
              Semua Wilayah ✕
            </button>
          </div>
        </div>
      )}

      {/* kotak pesan jika nihil hasil filter ----------------------------------- */}
      {displayPosts.length === 0 ? (
        <div className="forum-empty-box">
          <p className="forum-empty-title">Belum ada catatan yang sesuai dengan filter ini</p>
          <p className="forum-empty-desc">
            Coba pilih wilayah lain atau kembali ke seluruh wilayah untuk melihat bukti pemulihan warga.
          </p>
          <button
            type="button"
            className="btn-region-reset"
            onClick={() => handleRegionChange("all")}
          >
            Tampilkan Semua Wilayah
          </button>
        </div>
      ) : (
        <div className="tumblr-masonry-grid">
          {displayPosts.map((post) => {
            const initials =
              post.author.username
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "W";

            return (
              <article key={post.id} className="tumblr-card">
                {/* 1. header warga (tumblr style di bagian paling atas) */}
                <div className="tumblr-card-header">
                  <div className="tumblr-author-box">
                    <div className="tumblr-avatar">{initials}</div>
                    <div className="tumblr-author-meta">
                      <div className="tumblr-author-name-row">
                        <span className="tumblr-author-name">{post.author.username}</span>
                        <span className="tumblr-post-time">{post.time_ago}</span>
                      </div>
                      <span className="tumblr-author-sub">
                        {post.author.age} th · {post.author.city}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/forum/${post.id}`}
                    className="tumblr-more-btn"
                    aria-label={`Buka detail catatan ${post.author.username}`}
                  >
                    ···
                  </Link>
                </div>

                {/* 2. baris lokasi objek pemulihan */}
                <div className="tumblr-location-row">
                  <span className="tumblr-location-pin">📍</span>
                  <span className="tumblr-location-name">{post.location_name}</span>
                </div>

                {/* 3. media foto skala alami tanpa crop dan tanpa badge teknis */}
                {post.media?.url && (
                  <Link
                    href={`/forum/${post.id}`}
                    className="tumblr-media-link"
                    aria-label={`Buka foto penuh dokumentasi ${post.author.username}`}
                  >
                    <img
                      src={post.media.url}
                      alt={`Dokumentasi lapangan oleh ${post.author.username}`}
                      className="tumblr-media-img"
                      loading="lazy"
                    />
                  </Link>
                )}

                {/* 4. catatan lapangan warga (fleksibel mengikuti panjang teks) */}
                <div className="tumblr-card-body">
                  <Link href={`/forum/${post.id}`} className="tumblr-caption-link">
                    <p className="tumblr-caption-text">{post.caption}</p>
                  </Link>
                </div>

                {/* 5. footer aksi interaksi tumblr */}
                <div className="tumblr-card-footer">
                  <div className="interaction-left">
                    <button
                      type="button"
                      className={`btn-like-pill ${post.metrics.user_has_liked ? "liked" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onToggleLike(post.id);
                      }}
                      aria-label="Sukai catatan ini"
                    >
                      <span className="like-icon">♥</span>
                      <span>{formatId(post.metrics.likes)}</span>
                    </button>

                    <Link
                      href={`/forum/${post.id}#comments-section`}
                      className="btn-comment-indicator"
                      aria-label="Lihat komentar warga"
                    >
                      <span className="comment-icon">💬</span>
                      <span>{post.metrics.comments_count}</span>
                    </Link>
                  </div>

                  <span className="views-count-text">
                    {formatId(post.metrics.views)} tayangan
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
