// Todo:
// -> Invite field evidence through the existing reporting flow.

// --- Contribution ---
"use client";

import { HomeActionButton } from "./HomeActionButton";
import styles from "./home-preview.module.css";

export function HomeContribution({ onOpenReport, language = "id" }: { onOpenReport: () => void; language?: "id" | "en" }) {
  const en = language === "en";
  return <section className={styles.participation} aria-labelledby="home-participation-title" data-home-contribution>
    <div>
      <h2 id="home-participation-title" className={styles.participationTitle}>{en ? <>One small piece of evidence,<br />part of a bigger story.</> : <>Satu bukti kecil,<br />bagian dari cerita yang lebih besar.</>}</h2>
      <p>{en ? "Record the location. Add photos or video. Describe the conditions. Reports show a clear review status." : "Catat lokasinya. Sertakan foto atau video. Ceritakan kondisinya. Laporan akan tampil dengan status pemeriksaan yang jelas."}</p>
    </div>
    <HomeActionButton language={language} className={styles.contributeButton} onClick={onOpenReport}>{en ? "Send field evidence" : "Kirim bukti lapangan"}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7Zm0 0L10 14" /></svg></HomeActionButton>
  </section>;
}
// --- end of Contribution ---
