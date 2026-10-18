// Regional overview: recorded conditions, map, model forecast, and recent evidence.
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BnpbSyncData, ForumPost, PlotFeatureCollection } from "@/types";
import type { DataResult, ForecastLocation } from "@/types/environment";
import { REGION_TABS, REGION_COORDINATES, RegionKey, matchRegion, formatId, formatDateId } from "@/utils/plotDisplay";
import { getSortedPosts } from "@/utils/forumDisplay";
import { initialForumPosts } from "@/data/forumPostsData";
import { OverviewMapPanel } from "./OverviewMapPanel";
import { ForecastPanel } from "./ForecastPanel";
import styles from "./home.module.css";

interface Props {
  plots: DataResult<PlotFeatureCollection>;
  bnpb: DataResult<BnpbSyncData>;
  posts: ForumPost[];
  loading: boolean;
  region: string;
  onSelectRegion: (region: string) => void;
  onRetry: () => void;
  onOpenForum: () => void;
  onOpenLocalPost: (post: ForumPost) => void;
  onOpenRecovery: () => void;
}
const publishedIds = new Set(initialForumPosts.map(post => post.id));

export function HomeOverview(props: Props) {
  const { plots, bnpb, region, loading } = props;
  const [location, setLocation] = useState<ForecastLocation | null>(null);
  const currentRegion = REGION_TABS.find(r => r.key === region)!;
  useEffect(() => {
    setLocation(region === "all" ? null : {
      coordinates: REGION_COORDINATES[region as RegionKey].center,
      label: `Pusat wilayah ${currentRegion.province === "Jawa Barat" ? "Bekasi" : currentRegion.province}`,
    });
  }, [region, currentRegion.province]);
  const filteredPlots = useMemo(() => plots.data.features.filter(p => matchRegion(p.properties.region, region)), [plots.data, region]);
  const provinces = bnpb.data.provinces.filter(p => matchRegion(p.provinsi, region));
  const recent = getSortedPosts(props.posts, region, "latest").slice(0, 3);
  const plotDates = filteredPlots.map(p => p.properties.last_monitored_at).filter(Boolean).sort();
  const bnpbDates = [...new Set(provinces.map(p => p.tgl_update).filter(Boolean))].sort();
  const dateLabel = bnpbDates.length ? `${formatDateId(bnpbDates[0])}${bnpbDates.length > 1 ? ` - ${formatDateId(bnpbDates.at(-1)!)}` : ""}` : "Tanggal belum tersedia";
  const plotSource = plots.origin === "sample" ? "Data contoh" : "Catatan BuktiPulih";

  return <div className={styles.home}>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>Karhutla dan pemulihan</p><h1>Ringkasan wilayah</h1></div>
      <label className={styles.regionLabel}>Wilayah<select aria-label="Wilayah" value={region} onChange={e => props.onSelectRegion(e.target.value)}>
        {REGION_TABS.map(r => <option key={r.key} value={r.key}>{r.key === "all" ? "Semua wilayah" : r.key === "bekasi" ? "Bekasi" : r.province}</option>)}
      </select></label>
    </div>
    <div className={styles.summary} aria-busy={loading}>
      <section><h2>Karhutla tercatat</h2><p className={styles.number}>{loading ? "…" : provinces.length ? <>{formatId(provinces.reduce((sum, p) => sum + p.today_luas_terbakar_ha, 0), 2)} <small>ha</small></> : "Belum tersedia"}</p>
        <p className={styles.source}>{bnpb.origin === "sample" ? "Data contoh" : "Catatan BNPB"} · {dateLabel}</p>
        <p className={styles.source}>{region === "all" ? `${provinces.length} provinsi tercakup` : `Cakupan provinsi ${currentRegion.province}`}</p>
      </section>
      <section><h2>Pemulihan</h2><p className={styles.number}>{loading ? "…" : <>{formatId(filteredPlots.length)} <small>petak dipantau</small></>}</p>
        <p className={styles.source}>{plotSource}{plotDates.length > 0 && ` · pemeriksaan terakhir ${formatDateId(plotDates.at(-1)!)}`}</p>
        <p className={styles.source}>{filteredPlots.filter(p => ["perlu_rawat", "kritis", "mati"].includes(p.properties.latest_status)).length} petak perlu perhatian</p>
      </section>
    </div>
    {!loading && (plots.failed || bnpb.failed) && <p className={styles.notice} role="status">Sebagian sumber belum tersedia. Data contoh diberi label. <button onClick={props.onRetry}>Coba lagi</button></p>}
    <OverviewMapPanel plots={plots.data} region={region} plotSource={plotSource}
      onSelectPlot={plot => setLocation({ coordinates: [plot.geometry.coordinates[1], plot.geometry.coordinates[0]], label: plot.properties.name })}
      onSelectLocation={setLocation} onOpenRecovery={props.onOpenRecovery} />
    <ForecastPanel location={location} />
    <section aria-labelledby="latest-evidence-title">
      <div className={styles.sectionHead}><h2 id="latest-evidence-title">Bukti terbaru</h2><button className={styles.textLink} onClick={props.onOpenForum}>Semua bukti →</button></div>
      {recent.length === 0 ? <p className={styles.empty}>Belum ada bukti di wilayah ini.</p> : <div className={styles.evidenceList}>{recent.map(post => {
        const local = !publishedIds.has(post.id);
        const verified = post.field_verifications?.some(v => v.created_at && v.verifier_name && v.notes);
        return <article className={styles.evidence} key={post.id}>
          {/* Existing media keeps its natural aspect ratio; video uses its thumbnail. */}
          {post.media.type === "image" || post.media.thumbnail_url ? <img src={post.media.thumbnail_url || post.media.url} alt={`Catatan ${post.location_name}`} loading="lazy" /> : <div className={styles.videoPlaceholder}>Video lapangan</div>}
          <div><p className={styles.source}>{formatDateId(post.created_at)} · {local ? "Tersimpan di perangkat" : "Data contoh"}</p>
            <h3>{post.location_name}</h3><p className={styles.muted}>{local && verified ? "Catatan pemeriksaan tersedia" : "Belum diperiksa"}</p>
            <p className={styles.caption}>{post.caption}</p>
            {local ? <button className={styles.textLink} onClick={() => props.onOpenLocalPost(post)}>Lihat bukti →</button> : <Link className={styles.textLink} href={`/forum/${post.id}`}>Lihat bukti →</Link>}
          </div>
        </article>;
      })}</div>}
    </section>
    <details className={styles.sources}><summary>Sumber data</summary>
      <p>Karhutla: catatan BNPB sesuai tanggal dan cakupan yang ditampilkan. Petak serta bukti: catatan BuktiPulih; dataset lokal ditandai sebagai data contoh.</p>
      <p><a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a>: deteksi panas VIIRS NOAA-20/21. Titik panas tidak otomatis menunjukkan luas kebakaran atau verifikasi lapangan.</p>
      <p><a href="https://open-meteo.com/">Open-Meteo</a> dan <a href="https://atmosphere.copernicus.eu/">Copernicus CAMS</a>: prakiraan model PM2.5, angin, dan hujan pada koordinat pilihan. PM2.5 bukan pembacaan sensor atau ukuran asap kebakaran saja.</p>
    </details>
  </div>;
}
