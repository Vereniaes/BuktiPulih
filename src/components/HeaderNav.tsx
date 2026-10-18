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
          {props.theme === "dark" ? "Terang" : "Gelap"}
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
