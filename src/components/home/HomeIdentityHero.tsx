// Todo:
// -> Show the approved seedling intro, mission and homepage actions.

// --- Seedling hero ---
"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { HomeActionButton } from "./HomeActionButton";
import { attachSeedlingIntro } from "./seedlingIntro";
import styles from "./home-preview.module.css";

interface Props {
  onOpenRecovery: () => void;
  onOpenForum: () => void;
  onOpenReport?: () => void;
  language?: "id" | "en";
}

export function HomeIdentityHero({ onOpenRecovery, onOpenForum, onOpenReport, language = "id" }: Props) {
  const root = useRef<HTMLElement>(null);
  const en = language === "en";
  useLayoutEffect(() => {
    if (root.current) return attachSeedlingIntro(root.current);
  }, [language]);

  function explore() {
    const target = document.getElementById("about-title")?.closest("section");
    if (!target) return;
    const header = document.querySelector("header.portal-header")?.getBoundingClientRect().height ?? 73;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header - 16, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section ref={root} className={styles.hero} data-home-hero data-phase="pending" data-opening="true" aria-labelledby="home-mission-title">
      <div className={styles.media} data-scene aria-hidden="true">
        <Image data-still className={styles.still} src="/home/seedling-final.jpg" width={1280} height={720} alt="" fetchPriority="high" loading="eager" unoptimized />
        <video data-video className={styles.video} poster="/home/seedling-first.jpg" width="1280" height="720" muted playsInline preload="none" disablePictureInPicture />
      </div>
      <div className={styles.tone} data-tone aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.kicker} data-kicker>{en ? "FOREST FIRES AND RECOVERY, MONITORED TOGETHER" : "KARHUTLA DAN PEMULIHAN, DIPANTAU BERSAMA"}</p>
        <h1 id="home-mission-title" className={styles.title} aria-label={en ? "Seeing forests recover, through data and human voices." : "Melihat hutan pulih, lewat data dan suara manusia."}>
          <span className={styles.first}>
            <span className={styles.word} data-word>{en ? "Seeing" : "Melihat"}</span>{" "}
            <span className={styles.word} data-word>{en ? "forests recover," : "hutan pulih,"}</span>
          </span>
          <span className={styles.second}>
            <span className={styles.word} data-word>{en ? "through data and" : "lewat data dan"}</span>
            <span className={styles.word} data-word>{en ? "human voices." : "suara manusia."}</span>
          </span>
        </h1>
        <div className={styles.actions}>
          <div className={styles.actionEntry} data-intro-action>
            <HomeActionButton language={language} className={styles.primary} onClick={onOpenRecovery} aria-label={en ? "View restoration map" : "Lihat peta pemulihan"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5C8 2 4 3 2 3v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-4-1-7 0-10 2Zm0 0v16" /></svg>
              <span className={styles.desktopLabel}>{en ? "View restoration map" : "Lihat peta pemulihan"}</span><span className={styles.mobileLabel}>{en ? "Recovery map" : "Peta pemulihan"}</span>
            </HomeActionButton>
          </div>
          <div className={styles.actionEntry} data-intro-action>
            <HomeActionButton language={language} className={styles.secondary} onClick={onOpenReport || onOpenForum} aria-label={en ? "Send field evidence" : "Kirim bukti dari lapangan"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7Zm0 0L10 14" /></svg>
              <span className={styles.desktopLabel}>{en ? "Send field evidence" : "Kirim bukti dari lapangan"}</span><span className={styles.mobileLabel}>{en ? "Send evidence" : "Kirim bukti"}</span>
            </HomeActionButton>
          </div>
        </div>
      </div>
      <button className={styles.scrollCue} data-cue onClick={explore}>{en ? "About BuktiPulih" : "Tentang BuktiPulih"}<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14m-5-5 5 5 5-5" /></svg></button>
    </section>
  );
}
// --- end of Seedling hero ---
