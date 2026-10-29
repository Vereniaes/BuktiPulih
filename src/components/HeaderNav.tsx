// Show portal navigation and its responsive disclosure panel.
"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import styles from "./HeaderNav.module.css";
import Link from "next/link";
import type { AccountUser } from "@/types/account";
import { ProfileAvatar } from "./account/ProfileAvatar";

export type NavPortalTab = "home" | "fire" | "recovery" | "forum";

interface HeaderNavProps {
  activeTab: NavPortalTab | "profile";
  setActiveTab: (tab: NavPortalTab) => void;
  onOpenReport: () => void;
  onOpenAuthModal: () => void;
  currentUser: AccountUser | null;
  offlineDraftsCount: number;
  onSyncOffline: () => void;
  language?: "id" | "en";
  onToggleLanguage?: () => void;
}

export function HeaderNav(props: HeaderNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const isEn = props.language === "en";

  const tabs: { key: NavPortalTab; label: string; labelEn: string }[] = [
    { key: "home", label: "Beranda", labelEn: "Home" },
    { key: "fire", label: "Karhutla", labelEn: "Wildfires" },
    { key: "recovery", label: "Pemulihan", labelEn: "Restoration" },
    { key: "forum", label: "Ruang Suara Hijau", labelEn: "Green Voices" },
  ];

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus && isOpen) toggleRef.current?.focus();
  };
  const activateTab = (tab: NavPortalTab) => {
    closeMenu(true);
    props.setActiveTab(tab);
  };
  const runAction = (action: () => void, restoreMenuFocus = true) => {
    closeMenu(restoreMenuFocus);
    action();
  };
  const reportAction = props.onOpenReport;
  const handleReportClick = () => runAction(reportAction);
  const handleMobileReportClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    runAction(reportAction, false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) close();
    };
    const onHistory = () => close();
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };
    const desktop = window.matchMedia("(min-width: 1101px)");
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("popstate", onHistory);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("popstate", onHistory);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [isOpen]);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
  };

  return (
    <header ref={headerRef} className={`global-header portal-header ${styles.header}`} data-active-tab={props.activeTab}
      onBlurCapture={handleBlur} onKeyDownCapture={handleKeyDown}>
      <div className="container portal-header-inner">
        <button className="logo-brand" onClick={() => activateTab("home")} aria-label="BuktiPulih - Beranda">
          <span className="logo-text">buktipulih</span>
        </button>

        <button ref={toggleRef} className={styles.menuToggle} type="button"
          aria-expanded={isOpen} aria-controls="portal-mobile-panel"
          aria-label={isOpen ? (isEn ? "Close navigation" : "Tutup navigasi") : (isEn ? "Open navigation" : "Buka navigasi")}
          onClick={() => setIsOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>

        <div id="portal-mobile-panel" className={styles.menuPanel} data-open={isOpen}>
          <nav className="portal-tabs" aria-label={isEn ? "Main navigation" : "Navigasi utama"}>
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => activateTab(tab.key)}
                aria-current={props.activeTab === tab.key ? "page" : undefined}>
                {isEn ? tab.labelEn : tab.label}
              </button>
            ))}
          </nav>

          <div className="portal-actions">
            {props.onToggleLanguage && (
              <button type="button" className="btn-lang-toggle" onClick={props.onToggleLanguage}
                aria-label="Pilih bahasa"
                title={isEn ? "Ganti ke Bahasa Indonesia" : "Switch to English"}>
                <span style={{ color: !isEn ? "var(--stamp)" : "var(--text-muted)", fontWeight: !isEn ? 800 : 600 }}>ID</span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span style={{ color: isEn ? "var(--stamp)" : "var(--text-muted)", fontWeight: isEn ? 800 : 600 }}>EN</span>
              </button>
            )}

            {props.currentUser ? (
              <Link href="/profile" className={`portal-account ${styles.accountLink}`} onClick={() => closeMenu(true)}
                aria-current={props.activeTab === "profile" ? "page" : undefined}>
                <ProfileAvatar key={props.currentUser.avatar_url || "initials"} username={props.currentUser.username} src={props.currentUser.avatar_url} className={styles.accountAvatar} />
                <span>{isEn ? "Profile" : "Profil"}</span>
              </Link>
            ) : (
              <button type="button" className="portal-account" onClick={() => runAction(props.onOpenAuthModal)}>{isEn ? "Sign In" : "Masuk"}</button>
            )}

            <button type="button" className={`btn-report-primary ${styles.desktopReport}`} onClick={handleReportClick}>
              <span>{isEn ? "Submit evidence" : "Kirim bukti"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          {props.offlineDraftsCount > 0 && (
            <button type="button" className="portal-sync"
              onClick={() => runAction(props.onSyncOffline)}>
              {isEn ? `Sync ${props.offlineDraftsCount} offline drafts` : `Sinkronkan ${props.offlineDraftsCount} draft luring`}
            </button>
          )}
        </div>
      </div>

      <button type="button" className={styles.mobileReport} onFocus={() => closeMenu()}
        onClick={handleMobileReportClick}>
        <span>{isEn ? "Submit evidence" : "Kirim bukti"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </header>
  );
}
