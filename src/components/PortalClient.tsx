// Todo:
// -> Connect navigation, data, account dialogs, and report actions.

// --- Portal ---
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGION_TABS } from "@/utils/plotDisplay";
import type { DataResult } from "@/types/environment";
import dynamic from "next/dynamic";
import { HeaderNav, NavPortalTab } from "@/components/HeaderNav";
import { CreatePostModal } from "@/components/CreatePostModal";
import { AuthModal } from "@/components/AuthModal";
import { PageMotion } from "@/components/PageMotion";
import { hasCompleteProfile } from "@/types/account";
import { useAccount } from "@/components/account/AccountSession";
import { useForumPosts } from "./forum/useForumPosts";
import { cacheForumPosts } from "@/utils/forumStorage";

import {
  getHomepageDataApi,
} from "@/services/api";
import {
  getOfflineDrafts,
  syncAllOfflineDrafts,
} from "@/utils/offlineQueue";

import { mockPlotsData } from "@/data/plotsData";
import { mockBnpbData } from "@/data/bnpbData";
import {
  PlotFeatureCollection,
  BnpbSyncData,
  RecoveryReport,
} from "@/types";

const HomeOverview = dynamic(() => import("@/components/home/HomeOverview").then(mod => mod.HomeOverview));
const ForumFeed = dynamic(() => import("@/components/ForumFeed").then(mod => mod.ForumFeed));

const FireHazeMap = dynamic(
  () => import("@/components/FireHazeMap").then((mod) => mod.FireHazeMap),
  { ssr: false, loading: () => <div className="hazard-map-loading" role="status">Memuat peta…</div> }
);

const RecoveryMap = dynamic(
  () => import("@/components/RecoveryMap").then((mod) => mod.RecoveryMap),
  { ssr: false, loading: () => <div className="hazard-map-loading" role="status">Memuat peta…</div> }
);

export default function PortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const validTabs: NavPortalTab[] = ["home", "fire", "recovery", "forum"];
  const activePortalTab: NavPortalTab = (tab === "citizen" || tab === "articles") ? "forum" : validTabs.includes(tab as NavPortalTab) ? (tab as NavPortalTab) : "home";
  const region = searchParams.get("region") ?? "all";
  const selectedRegion = REGION_TABS.some(item => item.key === region) ? region : "all";
  const navigate = useCallback((changes: { tab?: NavPortalTab; region?: string; plot?: string | null; report?: string | null }, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compose");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "home" || value === "all") params.delete(key);
      else params.set(key, value);
    }
    const url = params.size ? `/?${params}` : "/";
    if (replace) window.history.replaceState(null, "", `${url}${window.location.hash}`);
    else router.push(url, { scroll: false });
  }, [router, searchParams]);
  useEffect(() => {
    if (tab !== "citizen" && tab !== "articles") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "forum");
    router.replace(`/?${params.toString()}${window.location.hash}`, { scroll: false });
  }, [router, searchParams, tab]);
  const setActivePortalTab = (value: NavPortalTab) => navigate({ tab: value, plot: null, report: null });
  const setSelectedRegion = (value: string) => navigate({ region: value, plot: null, report: null });
  const previousTab = useRef(activePortalTab);
  useEffect(() => {
    if (previousTab.current === activePortalTab) return;
    previousTab.current = activePortalTab;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  }, [activePortalTab]);

  const forumSource = useForumPosts(activePortalTab === "home" ? 2 : 1);
  const { posts: forumPosts, setPosts: setForumPosts } = forumSource;

  const [plotSource, setPlotSource] = useState<DataResult<PlotFeatureCollection>>({ data: mockPlotsData, origin: "sample", fetched_at: null, failed: false });
  const [bnpbSource, setBnpbSource] = useState<DataResult<BnpbSyncData>>({ data: mockBnpbData, origin: "sample", fetched_at: null, failed: false });
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const reportRequested = isReportOpen || searchParams.get("compose") === "1";
  const resumedReport = useRef(false);
  const closeReport = useCallback(() => {
    setIsReportOpen(false);
    if (searchParams.has("compose")) {
      const params = new URLSearchParams(searchParams.toString()); params.delete("compose");
      router.replace(params.size ? `/?${params}` : "/", { scroll: false });
    }
  }, [router, searchParams]);
  const openReport = () => { resumedReport.current = false; setIsReportOpen(true); };
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user: currentUser, status: accountStatus, setUser: setCurrentUser } = useAccount();
  const [offlineDraftsCount, setOfflineDraftsCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [language, setLanguage] = useState<"id" | "en">("id");
  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "id" ? "en" : "id";
      try { localStorage.setItem("buktipulih_language", next); } catch {}
      return next;
    });
  };

  const refreshAllData = useCallback(async () => {
    try {
      const overview = await getHomepageDataApi();

      setPlotSource(overview.plots);
      setBnpbSource(overview.bnpb);
    } catch (err) {
      console.warn("[App] menggunakan fallback lokal:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const overviewRequested = useRef(false);
  useEffect(() => {
    if (activePortalTab === "fire" || overviewRequested.current) return;
    overviewRequested.current = true;
    void refreshAllData();
  }, [activePortalTab, refreshAllData]);

  useEffect(() => {
    setIsMounted(true);
    setOfflineDraftsCount(getOfflineDrafts().length);

    try { localStorage.removeItem("buktipulih_theme"); } catch {}

  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

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
      cacheForumPosts(updated);
      return updated;
    });
  };

  const handleCreatePost = (newPost: RecoveryReport) => {
    setForumPosts((prev) => {
      const updated = [newPost, ...prev];
      cacheForumPosts(updated);
      return updated;
    });
    setIsReportOpen(false);
    showToast(language === "en" ? "Evidence saved. Status: unverified." : "Bukti tersimpan. Status: belum diverifikasi.");
    navigate({ tab: "recovery", region: "all", plot: null, report: newPost.id });
  };

  const handleSyncOffline = async () => {
    if (!currentUser) { setIsAuthModalOpen(true); return; }
    if (!["GOVERNMENT_VERIFIER", "ADMIN_SUPER"].includes(currentUser.role)) {
      showToast("Draft lama tetap tersimpan. Gunakan Kirim bukti untuk membuat laporan warga."); return;
    }
    showToast("Menyinkronkan draft luring ke server...");
    const result = await syncAllOfflineDrafts();
    setOfflineDraftsCount(result.remainingCount);
    if (result.syncedCount > 0) {
      showToast(`${result.syncedCount} laporan luring berhasil disinkronkan!`);
      await refreshAllData();
    }
    if (result.remainingCount > 0) showToast(`${result.remainingCount} draft belum tersinkron dan tetap tersimpan di perangkat.`);
  };

  const isMapPage = activePortalTab === "fire" || activePortalTab === "recovery";

  return (
    <div className={`portal-shell ${activePortalTab === "home" ? "portal-home" : isMapPage ? "portal-fire" : ""}`} style={{ minHeight: isMapPage ? 0 : "100vh", display: "flex", flexDirection: "column", overflowAnchor: activePortalTab === "forum" ? "none" : undefined }}>
      {toastMessage && (
        <div role="status"
          style={{
            position: "fixed",
            pointerEvents: "none",
            maxWidth: "calc(100vw - 48px)",
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

      <HeaderNav
        activeTab={activePortalTab}
        setActiveTab={setActivePortalTab}
        onOpenReport={openReport}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        offlineDraftsCount={offlineDraftsCount}
        onSyncOffline={handleSyncOffline}
        language={language}
        onToggleLanguage={toggleLanguage}
      />

      <PageMotion key={activePortalTab} tabIndex={-1} className={isMapPage ? "portal-map-main" : "container"} style={{ flex: 1, paddingTop: activePortalTab === "home" || isMapPage ? 0 : "24px" }}>
        {activePortalTab === "home" && (
          <HomeOverview
            plots={plotSource}
            bnpb={bnpbSource}
            posts={forumPosts}
            loading={isDataLoading}
            region={selectedRegion}
            onSelectRegion={setSelectedRegion}
            onRetry={() => {
              setIsDataLoading(true);
              void refreshAllData();
            }}
            onOpenFire={() => setActivePortalTab("fire")}
            onOpenRecovery={() => setActivePortalTab("recovery")}
            onOpenForum={() => setActivePortalTab("forum")}
            onOpenLocalPost={(post) => router.push(`/forum/${encodeURIComponent(post.id)}`)}
            onOpenReport={openReport}
            language={language}
          />
        )}

        {activePortalTab === "fire" && isMounted && <FireHazeMap language={language} />}

        {activePortalTab === "recovery" && isMounted && (
          <RecoveryMap
            plots={plotSource.data}
            loading={isDataLoading}
            sample={plotSource.origin === "sample"}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            selectedPlotId={searchParams.get("plot")}
            onSelectPlot={(plot) => navigate({ plot, report: null })}
            selectedReportId={searchParams.get("report")}
            onSelectReport={report => navigate({ report, plot: null })}
            language={language}
          />
        )}

        {activePortalTab === "forum" && (
          <div>
            <ForumFeed
              language={language}
              posts={forumPosts}
              source={forumSource}
              selectedRegionFilter={region}
              onSelectRegionFilter={value => navigate({ region: value, plot: null, report: null }, true)}
              onOpenPostDetail={(post) => router.push(`/forum/${encodeURIComponent(post.id)}`)}
              onToggleLike={handleToggleLike}
            />
          </div>
        )}

      </PageMotion>

      <CreatePostModal
        isOpen={reportRequested}
        onClose={closeReport}
        onSubmitPost={handleCreatePost}
        language={language}
      />

      <AuthModal
        isOpen={isAuthModalOpen || (reportRequested && !currentUser && accountStatus !== "loading")}
        onClose={() => {
          setIsAuthModalOpen(false);
          if (!resumedReport.current && reportRequested) closeReport();
          resumedReport.current = false;
        }}
        onLoginSuccess={(user, msg) => {
          setCurrentUser(user);
          showToast(msg);
          if (reportRequested && hasCompleteProfile(user)) {
            resumedReport.current = true; setIsReportOpen(true);
          } else {
            if (reportRequested) closeReport();
            router.push("/profile");
          }
        }}
      />

      {!isMapPage && <footer className="global-footer-stage">
        <div className="footer-backdrop-canvas" aria-hidden="true">
          <img
            src="/footer-panoramic-backdrop.jpg"
            alt=""
            className="footer-backdrop-img"
          />
          <div className="footer-top-blend" />
        </div>

        <div className="footer-content-layer">
          <div className="footer-fluid-wrapper">
            <div className="footer-campaign-hero">
              <h2 className="footer-campaign-title">Pulihkan Lahan, Rawat Masa Depan</h2>
              <p className="footer-campaign-desc">
                Bersama warga merawat sekat kanal dan memantau pemulihan ekosistem gambut Nusantara.
              </p>
            </div>
          </div>

          <div className="footer-base-panel">
            <div className="footer-fluid-wrapper">
              <div className="footer-inner">
                <div>
                  <div className="footer-brand-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src="/brand-logogram.png" alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                    <span>BuktiPulih</span>
                  </div>
                  <p style={{ margin: "4px 0 8px 0", fontSize: "12.5px", fontWeight: 700, color: "#F59E0B", letterSpacing: "0.2px" }}>
                    {language === "en" ? "Trace the Tracks, Safeguard Restoration." : "Pantau Jejak, Kawal Pemulihan."}
                  </p>
                  <p style={{ lineHeight: 1.6, maxWidth: "380px", color: "rgba(244, 241, 233, 0.82)", fontSize: "13px" }}>
                    {language === "en"
                      ? "Participatory grassroots platform for open wildfire monitoring and documented peatland recovery."
                      : "Platform partisipatif warga untuk pemantauan karhutla terbuka dan dokumentasi nyata pemulihan lahan pasca-bencana."}
                  </p>
                </div>

                <div>
                  <div style={{ color: "#F4F1E9", fontWeight: 700, marginBottom: "8px" }}>
                    Navigasi Portal
                  </div>
                  <ul style={{ listStyle: "none", lineHeight: 1.8, padding: 0 }}>
                    <li>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "rgba(244, 241, 233, 0.85)", cursor: "pointer", padding: 0 }}
                        onClick={() => setActivePortalTab("fire")}
                      >
                        · Pantau Karhutla & Asap (BNPB)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "rgba(244, 241, 233, 0.85)", cursor: "pointer", padding: 0 }}
                        onClick={() => setActivePortalTab("recovery")}
                      >
                        · Peta Kawasan Bukti Pulih
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "rgba(244, 241, 233, 0.85)", cursor: "pointer", padding: 0 }}
                        onClick={() => setActivePortalTab("forum")}
                      >
                        · Ruang Suara Hijau (Kiriman Warga)
                      </button>
                    </li>
                  </ul>
                </div>

                <div>
                  <div style={{ color: "#F4F1E9", fontWeight: 700, marginBottom: "8px" }}>
                    {language === "en" ? "Contact & Inquiries" : "Kontak"}
                  </div>
                  <p style={{ lineHeight: 1.6, color: "rgba(244, 241, 233, 0.82)", marginBottom: "12px", fontSize: "13px", maxWidth: "320px" }}>
                    {language === "en"
                      ? "Field coordination, volunteer network, and restoration inquiries:"
                      : "Informasi kegiatan, narahubung relawan, dan publikasi posko pemulihan:"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                    <a
                      href="mailto:kontak@buktipulih.id"
                      className="footer-instagram-link"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#F4F1E9",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "13px",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        background: "rgba(244, 241, 233, 0.1)",
                        border: "1px solid rgba(244, 241, 233, 0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <span>kontak@buktipulih.id</span>
                    </a>

                    <a
                      href="https://instagram.com/uinicyogyakarta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-instagram-link"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#F4F1E9",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "13px",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        background: "rgba(244, 241, 233, 0.1)",
                        border: "1px solid rgba(244, 241, 233, 0.2)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                      <span>@uinicyogyakarta</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom">
                <div>© 2026 BuktiPulih · Pantau Jejak, Kawal Pemulihan · All Rights Reserved</div>
                <div style={{ color: "rgba(244, 241, 233, 0.72)" }}>
                  bukti pulih datang dari mereka yang merawat di lapangan
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>}
    </div>
  );
}
// --- end of Portal ---
