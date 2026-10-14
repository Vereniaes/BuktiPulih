// src/app/page.tsx
// -> halaman utama portal multi-tab buktipulih (platform partisipasi warga)
//      -> tab 1: pantau karhutla & sebaran asap (webgis bnpb live)
//      -> tab 2: bukti pulih (peta pemulihan kawasan pasca-padam & sekat kanal)
//      -> tab 3: forum pulih (feed partisipatif warga tumblr-style)

"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { HeaderNav, NavPortalTab } from "@/components/HeaderNav";
import { BnpbSyncBanner } from "@/components/BnpbSyncBanner";
import { ForumFeed } from "@/components/ForumFeed";
import { PostDetailModal } from "@/components/PostDetailModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { GrowthCalendar } from "@/components/GrowthCalendar";
import { ImpactLedger } from "@/components/ImpactLedger";
import { AuthModal } from "@/components/AuthModal";

import {
  getPlotsApi,
  getImpactLedgerApi,
  getBnpbKarhutlaApi,
  getTimelineApi,
  logoutKaderApi,
} from "@/services/api";
import {
  getOfflineDrafts,
  syncAllOfflineDrafts,
} from "@/utils/offlineQueue";

import { mockPlotsData } from "@/data/plotsData";
import { mockImpactData } from "@/data/impactData";
import { mockTimelineData } from "@/data/timelineData";
import { mockBnpbData } from "@/data/bnpbData";
import { initialForumPosts } from "@/data/forumPostsData";
import {
  PlotFeatureCollection,
  ImpactLedgerData,
  TimelineItem,
  BnpbSyncData,
  ForumPost,
  ForumComment,
} from "@/types";

// dynamic import peta leaflet untuk mencegah isu render sisi server (ssr) -------
const FireHazeMap = dynamic(
  () => import("@/components/FireHazeMap").then((mod) => mod.FireHazeMap),
  {
    loading: () => (
      <div
        className="leaflet-map-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1F5F9",
          color: "#64748B",
          fontWeight: 700,
        }}
      >
        <span>Memuat Peta Sebaran Titik Api & Kabut Asap BNPB...</span>
      </div>
    ),
  }
);

const RecoveryMap = dynamic(
  () => import("@/components/RecoveryMap").then((mod) => mod.RecoveryMap),
  {
    loading: () => (
      <div
        className="leaflet-map-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1F5F9",
          color: "#64748B",
          fontWeight: 700,
        }}
      >
        <span>Memuat Peta Kawasan Pemulihan...</span>
      </div>
    ),
  }
);
// end of dynamic import peta ------------------------------------------------------

const STORAGE_KEY_POSTS = "buktipulih_forum_posts_v1";

export default function Home() {
  // state portal navigasi 3 tab ---------------------------------------------------
  const [activePortalTab, setActivePortalTab] = useState<NavPortalTab>("fire");

  // state data aplikasi -----------------------------------------------------------
  const [plotsData, setPlotsData] = useState<PlotFeatureCollection>(mockPlotsData);
  const [impactData, setImpactData] = useState<ImpactLedgerData>(mockImpactData);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(mockTimelineData);
  const [bnpbData, setBnpbData] = useState<BnpbSyncData>(mockBnpbData);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(initialForumPosts);

  // state filter wilayah peta pemulihan -------------------------------------------
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  // state modal interaksi ---------------------------------------------------------
  const [selectedPostDetail, setSelectedPostDetail] = useState<ForumPost | null>(null);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(null);
  const [offlineDraftsCount, setOfflineDraftsCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // state tema antarmuka: 'light' (Ijo-Krem) vs 'dark' (Item-Ijo-Orange) ----------
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // ambil data dari backend & localstorage saat pertama kali dimuat ---------------
  const refreshAllData = async () => {
    try {
      const [plotsRes, impactRes, bnpbRes, timelineRes] = await Promise.all([
        getPlotsApi(selectedRegion),
        getImpactLedgerApi(),
        getBnpbKarhutlaApi(),
        getTimelineApi(),
      ]);

      if (plotsRes?.features?.length > 0) setPlotsData(plotsRes);
      if (impactRes?.total_planted_trees > 0) setImpactData(impactRes);
      if (bnpbRes?.provinces?.length > 0) setBnpbData(bnpbRes);
      if (timelineRes?.length > 0) setTimelineItems(timelineRes);
    } catch (err) {
      console.warn("[App] menggunakan fallback lokal:", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    refreshAllData();
    setOfflineDraftsCount(getOfflineDrafts().length);

    // baca parameter tab dan region dari url jika ada
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");
      if (tab === "forum" || tab === "recovery" || tab === "fire") {
        setActivePortalTab(tab as NavPortalTab);
      }
      const region = urlParams.get("region");
      if (region) {
        setSelectedRegion(region);
      }
    }

    // baca tema tersimpan
    try {
      const savedTheme = localStorage.getItem("buktipulih_theme") as "light" | "dark" | null;
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch (e) {
      console.warn("Gagal membaca tema:", e);
    }

    // baca postingan warga yang disimpan lokal jika ada
    try {
      const savedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setForumPosts(parsed);
        }
      }
    } catch (e) {
      console.warn("Gagal membaca cache forum:", e);
    }
  }, []);

  // handler sakelar tema light vs dark --------------------------------------------
  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("buktipulih_theme", nextTheme);
    showToast(
      `Tema diganti ke mode ${nextTheme === "dark" ? "Gelap (Item-Ijo-Orange)" : "Terang (Ijo-Krem)"}`
    );
  };
  // end of ambil data -------------------------------------------------------------

  // helper notifikasi toast -------------------------------------------------------
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // handler suka / like postingan -------------------------------------------------
  const handleToggleLike = (postId: string) => {
    setForumPosts((prev) => {
      const updated = prev.map((post) => {
        if (post.id === postId) {
          const currentlyLiked = !!post.metrics.user_has_liked;
          return {
            ...post,
            metrics: {
              ...post.metrics,
              likes: currentlyLiked ? post.metrics.likes - 1 : post.metrics.likes + 1,
              user_has_liked: !currentlyLiked,
            },
          };
        }
        return post;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      return updated;
    });

    if (selectedPostDetail && selectedPostDetail.id === postId) {
      setSelectedPostDetail((prev) => {
        if (!prev) return null;
        const currentlyLiked = !!prev.metrics.user_has_liked;
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            likes: currentlyLiked ? prev.metrics.likes - 1 : prev.metrics.likes + 1,
            user_has_liked: !currentlyLiked,
          },
        };
      });
    }
  };

  // handler tambah komentar warga -------------------------------------------------
  const handleAddComment = (postId: string, comment: ForumComment) => {
    setForumPosts((prev) => {
      const updated = prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            metrics: {
              ...post.metrics,
              comments_count: post.metrics.comments_count + 1,
            },
            comments: [comment, ...post.comments],
          };
        }
        return post;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      return updated;
    });

    if (selectedPostDetail && selectedPostDetail.id === postId) {
      setSelectedPostDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            comments_count: prev.metrics.comments_count + 1,
          },
          comments: [comment, ...prev.comments],
        };
      });
    }

    showToast("Komentar Anda berhasil dikirim ke forum!");
  };

  // handler kirim postingan baru oleh warga ---------------------------------------
  const handleCreatePost = (newPost: ForumPost) => {
    setForumPosts((prev) => {
      const updated = [newPost, ...prev];
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
      return updated;
    });
    showToast("Bukti pemulihan Anda berhasil dipublikasikan di Forum Pulih!");
    setActivePortalTab("forum");
  };

  // handler sinkronisasi draft offline --------------------------------------------
  const handleSyncOffline = async () => {
    showToast("Menyinkronkan draft luring ke server...");
    const result = await syncAllOfflineDrafts();
    setOfflineDraftsCount(result.remainingCount);
    if (result.syncedCount > 0) {
      showToast(`${result.syncedCount} laporan luring berhasil disinkronkan!`);
      await refreshAllData();
    }
  };

  // handler logout kader ----------------------------------------------------------
  const handleLogout = async () => {
    await logoutKaderApi();
    setCurrentUser(null);
    showToast("Sesi kader telah keluar.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* toast notifikasi mengambang -------------------------------------------- */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 3000,
            backgroundColor: "var(--stamp)",
            color: "#FFFFFF",
            padding: "12px 20px",
            borderRadius: "var(--radius-pill)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            fontSize: "14px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slide-up 0.3s ease",
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* header global navigasi 3 tab ------------------------------------------- */}
      <HeaderNav
        activeTab={activePortalTab}
        setActiveTab={setActivePortalTab}
        onOpenCreatePostModal={() => setIsCreatePostOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        offlineDraftsCount={offlineDraftsCount}
        onSyncOffline={handleSyncOffline}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* ticker sinkronisasi live bnpb ------------------------------------------ */}
      <div className="container" style={{ paddingTop: "20px" }}>
        <BnpbSyncBanner data={bnpbData} />
      </div>

      {/* konten utama portal dinamis berdasarkan tab aktif ---------------------- */}
      <main className="container" style={{ flex: 1, paddingTop: "24px" }}>
        {/* TAB 1: PANTAU KARHUTLA & KABUT ASAP (LIVE BNPB) ----------------------- */}
        {activePortalTab === "fire" && (
          <div>
            {isMounted && (
              <FireHazeMap
                bnpbData={bnpbData}
                onNavigateToRecovery={(regionKey) => {
                  if (regionKey) {
                    setSelectedRegion(regionKey);
                  }
                  setActivePortalTab("recovery");
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: BUKTI PULIH (PETA PEMULIHAN PASCA-PADAM) ------------------------ */}
        {activePortalTab === "recovery" && (
          <div>
            {isMounted && (
              <RecoveryMap
                plots={plotsData}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                onNavigateToForumWithPlot={() => {
                  setActivePortalTab("forum");
                }}
              />
            )}

            {/* ringkasan metrik pemulihan ---------------------------------------- */}
            <div style={{ marginTop: "28px" }}>
              <ImpactLedger data={impactData} />
            </div>

            {/* kalender pertumbuhan bibit per bulan ------------------------------- */}
            <div style={{ marginTop: "32px", marginBottom: "40px" }}>
              <GrowthCalendar
                plots={plotsData}
                items={timelineItems}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>
          </div>
        )}

        {/* TAB 3: FORUM PULIH (TUMBLR-STYLE MASONRY FEED) ------------------------ */}
        {activePortalTab === "forum" && (
          <div>
            <ForumFeed
              posts={forumPosts}
              selectedRegionFilter={selectedRegion}
              onSelectRegionFilter={setSelectedRegion}
              onOpenPostDetail={(post) => {
                setSelectedPostDetail(post);
                setIsPostDetailOpen(true);
              }}
              onOpenCreatePost={() => setIsCreatePostOpen(true)}
              onToggleLike={handleToggleLike}
            />
          </div>
        )}
      </main>

      {/* modal detail postingan & utas komentar warga --------------------------- */}
      <PostDetailModal
        post={selectedPostDetail}
        isOpen={isPostDetailOpen}
        onClose={() => {
          setIsPostDetailOpen(false);
          setSelectedPostDetail(null);
        }}
        onAddComment={handleAddComment}
        onToggleLike={handleToggleLike}
      />

      {/* modal buat postingan bukti warga baru (+) ------------------------------ */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmitPost={handleCreatePost}
      />

      {/* modal autentikasi login kader jika diperlukan -------------------------- */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user, msg) => {
          setCurrentUser(user);
          showToast(msg);
        }}
      />

      {/* footer bersih buktipulih ------------------------------------------------ */}
      <footer className="global-footer">
        <div className="container">
          <div className="footer-inner">
            <div>
              <div className="footer-brand-title">buktipulih</div>
              <p style={{ lineHeight: 1.6, maxWidth: "340px" }}>
                Platform partisipatif warga untuk pemantauan karhutla terbuka dan dokumentasi nyata
                pemulihan lahan pasca-bencana.
              </p>
            </div>

            <div>
              <div style={{ color: "var(--brand-navy-900)", fontWeight: 700, marginBottom: "8px" }}>
                Navigasi Portal
              </div>
              <ul style={{ listStyle: "none", lineHeight: 1.8, padding: 0 }}>
                <li>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", padding: 0 }}
                    onClick={() => setActivePortalTab("fire")}
                  >
                    · Pantau Karhutla & Asap (BNPB)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", padding: 0 }}
                    onClick={() => setActivePortalTab("recovery")}
                  >
                    · Peta Kawasan Bukti Pulih
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", padding: 0 }}
                    onClick={() => setActivePortalTab("forum")}
                  >
                    · Forum Pulih (Kiriman Warga)
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div style={{ color: "var(--brand-navy-900)", fontWeight: 700, marginBottom: "8px" }}>
                Karakteristik Sistem
              </div>
              <ul style={{ listStyle: "none", lineHeight: 1.8, padding: 0 }}>
                <li>· Transparansi data resmi WebGIS BNPB</li>
                <li>· Partisipasi foto & video langsung dari warga</li>
                <li>· Otentikasi identitas komentar ringan</li>
                <li>· Zero-Cost OpenStreetMap & Cloud Architecture</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>buktipulih · platform partisipasi pemulihan pasca-karhutla 2026</div>
            <div style={{ color: "#718096" }}>
              bukti pulih datang dari mereka yang merawat di lapangan
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
