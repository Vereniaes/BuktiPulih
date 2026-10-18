// Shared portal navigation. Main destinations stay visible on small screens.
"use client";
export type NavPortalTab = "home" | "fire" | "recovery" | "forum";
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
const tabs: { key: NavPortalTab; label: string }[] = [
  { key: "home", label: "Beranda" }, { key: "fire", label: "Karhutla" },
  { key: "recovery", label: "Pemulihan" }, { key: "forum", label: "Forum" },
];
export function HeaderNav(props: HeaderNavProps) {
  return <header className="global-header portal-header">
    <div className="container portal-header-inner">
      <button className="logo-brand" onClick={() => props.setActiveTab("home")} aria-label="BuktiPulih - Beranda">
        <span className="logo-text">buktipulih</span>
      </button>
      <nav className="portal-tabs" aria-label="Navigasi utama">
        {tabs.map(tab => <button key={tab.key} onClick={() => props.setActiveTab(tab.key)}
          aria-current={props.activeTab === tab.key ? "page" : undefined}>{tab.label}</button>)}
      </nav>
      <div className="portal-actions">
        <button onClick={props.onToggleTheme} aria-label={props.theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}>
          <span className="theme-toggle-content">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              {props.theme === "dark" ? <>
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />}
            </svg>
            <span>{props.theme === "dark" ? "Terang" : "Gelap"}</span>
          </span>
        </button>
        <button className="portal-account" onClick={props.currentUser ? props.onLogout : props.onOpenAuthModal}>
          {props.currentUser ? "Keluar" : "Masuk"}
        </button>
        <button className="btn-report-primary" onClick={props.onOpenCreatePostModal}>Kirim bukti</button>
      </div>
      {props.offlineDraftsCount > 0 && <button className="portal-sync" onClick={props.onSyncOffline}>
        Sinkronkan {props.offlineDraftsCount} draft luring
      </button>}
    </div>
  </header>;
}
