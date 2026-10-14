// src/components/HeaderNav.tsx
// -> navigasi atas multi-tab portal buktipulih
//      -> 3 tab utama: pantau karhutla (darurat bnpb), bukti pulih (peta pemulihan), forum pulih (tumblr feed)
//      -> tombol aksi '+ posting bukti' untuk kontribusi warga & relawan
//      -> menu laci mobile responsif bebas tumpang tindih

"use client";

import React, { useState } from "react";

export type NavPortalTab = "fire" | "recovery" | "forum";

interface HeaderNavProps {
  activeTab: NavPortalTab;
  setActiveTab: (tab: NavPortalTab) => void;
  onOpenCreatePostModal: () => void;
  onOpenAuthModal: () => void;
  currentUser: Record<string, unknown> | null;
  onLogout: () => void;
  offlineDraftsCount: number;
  onSyncOffline: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreatePostModal,
  onOpenAuthModal,
  currentUser,
  onLogout,
  offlineDraftsCount,
  onSyncOffline,
  theme,
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavPortalTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="global-header">
      <div className="container header-inner">
        {/* logo brand ------------------------------------------------------------ */}
        <div className="logo-brand" onClick={() => handleSelectTab("fire")} style={{ cursor: "pointer" }}>
          <span className="logo-text">buktipulih</span>
          <span className="logo-tag-badge">portal pasca-karhutla</span>
        </div>
        {/* end of logo brand ------------------------------------------------------ */}

        {/* navigasi 3 tab portal desktop ------------------------------------------ */}
        <nav className="nav-links desktop-only" aria-label="navigasi utama portal">
          <button
            type="button"
            className={`nav-link-item ${activeTab === "fire" ? "active" : ""}`}
            onClick={() => handleSelectTab("fire")}
          >
            pantau karhutla & asap
          </button>
          <button
            type="button"
            className={`nav-link-item ${activeTab === "recovery" ? "active" : ""}`}
            onClick={() => handleSelectTab("recovery")}
          >
            bukti pulih (peta)
          </button>
          <button
            type="button"
            className={`nav-link-item ${activeTab === "forum" ? "active" : ""}`}
            onClick={() => handleSelectTab("forum")}
          >
            forum pulih warga
          </button>
        </nav>
        {/* end of navigasi desktop ------------------------------------------------- */}

        {/* aksi header desktop & mobile ------------------------------------------- */}
        <div className="header-actions">
          {offlineDraftsCount > 0 && (
            <button
              type="button"
              onClick={onSyncOffline}
              className="btn-offline-sync"
              title="sinkronkan draft luring ke server"
            >
              <span>{offlineDraftsCount} draft luring</span>
            </button>
          )}

          {/* tombol sakelar tema light (ijo-krem) vs dark (item-ijo-orange) -------- */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-theme-toggle"
            title={theme === "dark" ? "Ganti ke mode terang (Ijo-Krem)" : "Ganti ke mode gelap (Item-Ijo-Orange)"}
            aria-label="Ganti mode tampilan tema"
          >
            <span className="theme-toggle-content">
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="theme-text">{theme === "dark" ? "krem" : "gelap"}</span>
            </span>
          </button>

          {/* tombol aksi utama '+ posting bukti' --------------------------------- */}
          <button
            type="button"
            onClick={onOpenCreatePostModal}
            className="btn-report-primary"
          >
            + posting bukti
          </button>

          {/* hamburger button di ponsel ------------------------------------------ */}
          <button
            type="button"
            className="btn-hamburger mobile-only"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="buka menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
        {/* end of aksi header ----------------------------------------------------- */}
      </div>

      {/* laci menu mobile dropdown ---------------------------------------------- */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer" role="menu">
          <div className="container mobile-drawer-inner">
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === "fire" ? "active" : ""}`}
              onClick={() => handleSelectTab("fire")}
            >
              pantau karhutla & asap (live bnpb)
            </button>
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === "recovery" ? "active" : ""}`}
              onClick={() => handleSelectTab("recovery")}
            >
              bukti pulih (peta pemulihan pasca-padam)
            </button>
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === "forum" ? "active" : ""}`}
              onClick={() => handleSelectTab("forum")}
            >
              forum pulih (kiriman warga tumblr)
            </button>

            <div className="mobile-drawer-footer">
              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                  setIsMobileMenuOpen(false);
                }}
                className="btn-theme-toggle mobile-full-btn"
                style={{ marginBottom: "10px", justifyContent: "center" }}
              >
                <span className="theme-toggle-content">
                  {theme === "dark" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                  <span className="theme-text">mode {theme === "dark" ? "terang (ijo-krem)" : "gelap (item-ijo-orange)"}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCreatePostModal();
                }}
                className="btn-report-primary mobile-full-btn"
              >
                + posting bukti pemulihan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* end of laci menu mobile ------------------------------------------------ */}
    </header>
  );
};
