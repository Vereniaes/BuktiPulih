// Todo:
// -> Show regional summaries, field stories, and portal actions.

// --- Homepage overview ---
"use client";
import { useMemo } from "react";
import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { BnpbSyncData, ForumPost, PlotFeatureCollection } from "@/types";
import type { DataResult } from "@/types/environment";
import { getSortedPosts } from "@/utils/forumDisplay";
import { matchRegion } from "@/utils/plotDisplay";
import { bnpbSourceDate, bnpbStatus } from "@/utils/bnpbFreshness";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { HomeIdentityHero } from "./HomeIdentityHero";
import { HomeActionButton } from "./HomeActionButton";
import { HomeFieldStories } from "./HomeFieldStories";
import { HomeContribution } from "./HomeContribution";
import styles from "./home.module.css";

interface Props {
  plots: DataResult<PlotFeatureCollection>;
  bnpb: DataResult<BnpbSyncData>;
  posts: ForumPost[];
  loading: boolean;
  region: string;
  onSelectRegion: (region: string) => void;
  onRetry: () => void;
  onOpenFire?: () => void;
  onOpenRecovery: () => void;
  onOpenForum: () => void;
  onOpenLocalPost: (post: ForumPost) => void;
  onOpenReport?: () => void;
  language?: "id" | "en";
}

export function HomeOverview(props: Props) {
  const reducedMotion = useReducedMotion();
  const regionalPosts = useMemo(() => getSortedPosts(props.posts, props.region, "latest"), [props.posts, props.region]);
  const fieldUpdates = regionalPosts.filter(post => post.persisted).slice(0, 3);
  const dateFormat = new Intl.DateTimeFormat(props.language === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const en = props.language === "en";
  const numberFormat = new Intl.NumberFormat(en ? "en-GB" : "id-ID", { maximumFractionDigits: 2 });
  const provinces = props.bnpb.data.provinces.filter(province => matchRegion(province.provinsi, props.region));
  const bnpbState = bnpbStatus(props.bnpb.data);
  const hasBnpb = props.bnpb.origin === "service" && bnpbState !== "unavailable" && provinces.length > 0;
  const dates = provinces.map(province => bnpbSourceDate(province.tgl_update)).filter((date): date is string => date !== null).sort();
  const sourceDate = dates.length === provinces.length && dates.length
    ? `${dateFormat.format(new Date(dates[0]))}${dates[0] !== dates.at(-1) ? ` - ${dateFormat.format(new Date(dates.at(-1)!))}` : ""}`
    : en ? "Source date unavailable" : "Tanggal sumber belum tersedia";
  const bnpbMeta = hasBnpb ? `BNPB · ${sourceDate} · ${provinces.length} ${en ? "provinces" : "provinsi"}${bnpbState === "cached" ? en ? " · Cached" : " · Tersimpan" : ""}`
    : en ? "BNPB data unavailable" : "Data BNPB belum tersedia";
  const plots = props.plots.data.features.filter(plot => matchRegion(plot.properties.region, props.region));
  const plotDates = plots.map(plot => plot.properties.last_monitored_at).filter(date => Number.isFinite(Date.parse(date))).sort();
  const visiblePosts = regionalPosts.filter(post => post.persisted);
  const reveal = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 } };
  const revealTransition = { duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <div className={styles.home}>
      {/* 1. Hero Identitas: Headline bernyawa, foto bibit semai gambut Ketapang (sesuai Gambar 2) */}
      <HomeIdentityHero
        onOpenRecovery={props.onOpenRecovery}
        onOpenForum={props.onOpenForum}
        onOpenReport={props.onOpenReport}
        language={props.language}
      />

      {/* 2. Seksi Tentang BuktiPulih (sesuai Gambar 2) */}
      <m.section
        className={styles.aboutSection}
        aria-labelledby="about-title"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.aboutIntro}>
          <h2 id="about-title" className={styles.aboutTitle}>
            {props.language === "en" ? "About BuktiPulih" : "Tentang BuktiPulih"}
          </h2>
          <p className={styles.aboutDesc}>
            {props.language === "en"
              ? "BuktiPulih helps the public follow post-fire peatland recovery openly, clearly, and grounded in authentic field conditions."
              : "BuktiPulih hadir untuk membantu publik memahami proses pemulihan pasca-karhutla secara lebih terbuka, mudah dipahami, dan dekat dengan kondisi nyata di lapangan."}
          </p>
          <HomeActionButton language={props.language}
            type="button"
            className={styles.aboutLink}
            onClick={props.onOpenForum}
          >
            {props.language === "en" ? "Learn more →" : "Pelajari lebih lanjut →"}
          </HomeActionButton>
        </div>

        <div className={styles.aboutCardsGrid}>
          <article className={styles.aboutCard}>
            <div className={styles.aboutCardIconGreen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <h3 className={styles.aboutCardTitle}>
              {props.language === "en" ? "Monitor conditions" : "Pantau kondisi"}
            </h3>
            <p className={styles.aboutCardText}>
              {props.language === "en"
                ? "Explore forest fire summaries and restoration zones from verifiable sources."
                : "Lihat ringkasan karhutla dan wilayah pemulihan dari data yang tersedia."}
            </p>
          </article>

          <article className={styles.aboutCard}>
            <div className={styles.aboutCardIconGreen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
              </svg>
            </div>
            <h3 className={styles.aboutCardTitle}>
              {props.language === "en" ? "Track progress" : "Ikuti perkembangan"}
            </h3>
            <p className={styles.aboutCardText}>
              {props.language === "en"
                ? "Follow ground observations, location updates, and recovery stories over time."
                : "Telusuri bukti lapangan, pembaruan lokasi, dan cerita pemulihan dari waktu ke waktu."}
            </p>
          </article>

          <article className={styles.aboutCard}>
            <div className={styles.aboutCardIconOrange}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className={styles.aboutCardTitle}>
              {props.language === "en" ? "Contribute evidence" : "Ikut berkontribusi"}
            </h3>
            <p className={styles.aboutCardText}>
              {props.language === "en"
                ? "Locals can submit photos, videos, or field notes to enrich ground transparency."
                : "Warga dapat mengirim foto, video, atau catatan lapangan untuk memperkaya informasi."}
            </p>
          </article>
        </div>
      </m.section>

      {/* 3. Ringkasan situasi (4 Kartu Metrik sesuai Gambar 2) */}
      <section className={styles.situationSection} aria-labelledby="situation-title">
        <div className={styles.situationHeader}>
          <div className={styles.situationTitleWrap}>
            <h2 id="situation-title" className={styles.situationTitle}>
              {props.language === "en" ? "Situation Summary" : "Ringkasan situasi"}
            </h2>
          </div>
          <div className={styles.situationMeta}>
            <HomeActionButton language={props.language}
              type="button"
              className={styles.situationMetaLink}
              onClick={props.onOpenFire || props.onOpenRecovery}
            >
              <span>{props.language === "en" ? "View data details →" : "Lihat detail data →"}</span>
            </HomeActionButton>
          </div>
        </div>

        <div className={styles.situationGrid}>
          {/* Kartu 1: Luas karhutla tercatat */}
          <HomeActionButton language={props.language} className={styles.situationCard} onClick={props.onOpenFire || props.onOpenRecovery} data-reveal {...reveal} transition={{ ...revealTransition, delay: 0 }}>
            <span className={styles.situationCardTop}>
              <span className={styles.situationIconFlame}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                </svg>
              </span>
              <span className={styles.situationValueWrap}>
                <span className={styles.situationValue}>{hasBnpb ? numberFormat.format(provinces.reduce((sum, province) => sum + province.today_luas_terbakar_ha, 0)) : "—"}</span>
                <span className={styles.situationUnit}>ha</span>
              </span>
            </span>
            <span className={styles.situationCardLabel}>
              {props.language === "en" ? "Recorded burned area" : "Luas karhutla tercatat"}
            </span>
            <span className={styles.situationCardSub}>
              {bnpbMeta}
            </span>
          </HomeActionButton>

          {/* Kartu 2: Titik panas terpantau */}
          <HomeActionButton language={props.language} className={styles.situationCard} onClick={props.onOpenFire || props.onOpenRecovery} data-reveal {...reveal} transition={{ ...revealTransition, delay: 0.06 }}>
            <span className={styles.situationCardTop}>
              <span className={styles.situationIconHotspot}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="6" r="2"></circle>
                  <circle cx="12" cy="18" r="2"></circle>
                  <circle cx="6" cy="12" r="2"></circle>
                  <circle cx="18" cy="12" r="2"></circle>
                </svg>
              </span>
              <span className={styles.situationValueWrap}>
                <span className={styles.situationValue}>{hasBnpb ? numberFormat.format(provinces.reduce((sum, province) => sum + province.total_hotspot, 0)) : "—"}</span>
              </span>
            </span>
            <span className={styles.situationCardLabel}>
              {en ? "BNPB recorded hotspots" : "Titik panas tercatat BNPB"}
            </span>
            <span className={styles.situationCardSub}>
              {bnpbMeta}
              {hasBnpb && props.bnpb.data.fetched_at && <><br />{en ? "Retrieved" : "Diambil"} · {formatTimeWib(props.bnpb.data.fetched_at)}</>}
              {hasBnpb && props.bnpb.data.checked_at && <><br />{en ? "Last checked" : "Diperiksa"} · {formatTimeWib(props.bnpb.data.checked_at)}</>}
            </span>
          </HomeActionButton>

          {/* Kartu 3: Area pemulihan dipantau */}
          <HomeActionButton language={props.language} className={styles.situationCard} onClick={props.onOpenRecovery} data-reveal {...reveal} transition={{ ...revealTransition, delay: 0.12 }}>
            <span className={styles.situationCardTop}>
              <span className={styles.situationIconLeaf}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
              </span>
              <span className={styles.situationValueWrap}>
                <span className={styles.situationValue}>{props.plots.origin === "service" ? numberFormat.format(plots.length) : "—"}</span>
                <span className={styles.situationUnit}>{props.language === "en" ? "plots" : "petak"}</span>
              </span>
            </span>
            <span className={styles.situationCardLabel}>
              {props.language === "en" ? "Recovery area monitored" : "Area pemulihan dipantau"}
            </span>
            <span className={styles.situationCardSub}>
              {props.plots.origin !== "service" ? en ? "Plot data unavailable" : "Data petak belum tersedia" : plotDates.length
                ? `${en ? "Latest field observation" : "Pengamatan lapangan terakhir"} · ${dateFormat.format(new Date(plotDates.at(-1)!))}`
                : en ? "Field observation date unavailable" : "Tanggal pengamatan belum tersedia"}
            </span>
          </HomeActionButton>

          {/* Kartu 4: Bukti warga masuk */}
          <HomeActionButton language={props.language} className={styles.situationCard} onClick={props.onOpenForum} data-reveal {...reveal} transition={{ ...revealTransition, delay: 0.18 }}>
            <span className={styles.situationCardTop}>
              <span className={styles.situationIconDoc}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <span className={styles.situationValueWrap}>
                <span className={styles.situationValue}>{numberFormat.format(visiblePosts.length)}</span>
                <span className={styles.situationUnit}>{props.language === "en" ? "reports" : "laporan"}</span>
              </span>
            </span>
            <span className={styles.situationCardLabel}>
              {en ? "Citizen evidence shown" : "Bukti warga ditampilkan"}
            </span>
            <span className={styles.situationCardSub}>
              {en ? "From loaded field posts" : "Dari posting lapangan yang dimuat"}
            </span>
          </HomeActionButton>
        </div>
      </section>

      <HomeFieldStories
        posts={fieldUpdates}
        language={props.language}
        onOpenForum={props.onOpenForum}
        onOpenLocalPost={props.onOpenLocalPost}
        onOpenReport={props.onOpenReport}
      />
      <HomeContribution
        language={props.language}
        onOpenReport={props.onOpenReport || props.onOpenForum}
      />
    </div>
    </MotionConfig>
    </LazyMotion>
  );
}
// --- end of Homepage overview ---
