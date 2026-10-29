// Show account settings and private activity in their own page.
"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HeaderNav, type NavPortalTab } from "@/components/HeaderNav";
import { AuthModal } from "@/components/AuthModal";
import { PageMotion } from "@/components/PageMotion";
import { useAccount } from "./AccountSession";
import { ProfileForm } from "./ProfileForm";
import { AccountActions } from "./AccountActions";
import { ActivityHistory } from "./ActivityHistory";
import type { ActivityKind } from "@/types/account";
import styles from "./profile.module.css";
function ProfileActivity({ userId, language }: { userId: string; language: "id" | "en" }) {
  const router = useRouter();
  const search = useSearchParams();
  const kind: ActivityKind = search.get("activity") === "comments" ? "comments" : "posts";
  const rawPage = Number(search.get("page") || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const navigateActivity = (next: ActivityKind, nextPage: number) => {
    const params = new URLSearchParams();
    if (next === "comments") params.set("activity", next);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/profile${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  return <ActivityHistory userId={userId} language={language} kind={kind} page={page} onNavigate={navigateActivity} />;
}

export function ProfileClient() {
  const router = useRouter();
  const { user, status, setUser, refresh } = useAccount();
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [authOpen, setAuthOpen] = useState(false);
  const isEn = language === "en";
  const navigate = (tab: NavPortalTab) => router.push(tab === "home" ? "/" : `/?tab=${tab}`);
  const openReport = () => router.push("/?tab=forum&compose=1");
  return <div className="portal-shell">
    <HeaderNav activeTab="profile" setActiveTab={navigate} currentUser={user}
      onOpenReport={openReport} onOpenAuthModal={() => setAuthOpen(true)}
      offlineDraftsCount={0} onSyncOffline={() => {}} language={language} onToggleLanguage={() => setLanguage(isEn ? "id" : "en")} />
    <PageMotion className={styles.page}>
      <div className={styles.pageHeading}>
        <h1>{isEn ? "Profile" : "Profil"}</h1>
      </div>
      {status === "loading" ? <p role="status" className={styles.message}>{isEn ? "Loading account…" : "Memuat akun…"}</p>
        : status === "error" ? <div className={styles.message}><p role="alert">{isEn ? "Account could not be loaded." : "Akun belum dapat dimuat."}</p><button type="button" className={styles.secondaryButton} onClick={() => void refresh()}>{isEn ? "Try again" : "Coba lagi"}</button></div>
        : !user ? <div className={styles.message}><h2>{isEn ? "Sign in to open your profile" : "Masuk untuk membuka profil"}</h2><button type="button" className={styles.primaryButton} onClick={() => setAuthOpen(true)}>{isEn ? "Sign in" : "Masuk"}</button></div>
        : <><ProfileForm key={`profile:${user.id}`} user={user} language={language} /><Suspense fallback={<p className={styles.message} role="status">{isEn ? "Loading history…" : "Memuat riwayat…"}</p>}><ProfileActivity userId={user.id} language={language} /></Suspense><AccountActions key={`actions:${user.id}`} language={language} /></>}
    </PageMotion>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={(next) => setUser(next)} />
  </div>;
}
