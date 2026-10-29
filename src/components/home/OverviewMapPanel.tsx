// Map controls, source states, and expansion. Keep the map mounted when enlarged.
"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlotFeature, PlotFeatureCollection } from "@/types";
import type { ForecastLocation, HotspotObservation, HotspotResult, MapBounds } from "@/types/environment";
import { getHotspotsApi } from "@/services/api";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { formatId } from "@/utils/plotDisplay";
import { PlotBottomSheet } from "@/components/PlotBottomSheet";
import styles from "./home.module.css";

const RestorationMap = dynamic(() => import("@/components/RestorationMap").then(m => m.RestorationMap), {
  ssr: false, loading: () => <div className={styles.mapLoading}>Memuat peta…</div>,
});
interface Props {
  plots: PlotFeatureCollection;
  region: string;
  plotSource: string;
  onSelectPlot: (plot: PlotFeature) => void;
  onSelectLocation: (location: ForecastLocation) => void;
  onOpenRecovery: () => void;
}
const confidenceLabels = { low: "Rendah", nominal: "Nominal", high: "Tinggi" };

export function OverviewMapPanel({ plots, region, plotSource, onSelectPlot, onSelectLocation, onOpenRecovery }: Props) {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [result, setResult] = useState<HotspotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hours, setHours] = useState(24);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPlots, setShowPlots] = useState(true);
  const [selected, setSelected] = useState<HotspotObservation | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<PlotFeature | null>(null);
  const [tileError, setTileError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const receiveBounds = useCallback((next: MapBounds) => {
    setBounds(prev => prev?.join(",") === next.join(",") ? prev : next);
  }, []);

  useEffect(() => { setSelectedPlot(null); setSelected(null); }, [region]);

  useEffect(() => {
    if (!bounds) return;
    const controller = new AbortController();
    setResult(null); setLoading(true); setFailed(false);
    setSelected(point => point && point.coordinates[1] >= bounds[0] && point.coordinates[1] <= bounds[2] &&
      point.coordinates[0] >= bounds[1] && point.coordinates[0] <= bounds[3] ? point : null);
    const timer = setTimeout(() => {
      void getHotspotsApi(bounds, controller.signal).then(data => {
        if (!controller.signal.aborted) { setResult(data); setLoading(false); }
      }).catch(() => {
        if (!controller.signal.aborted) { setFailed(true); setLoading(false); }
      });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [bounds, retry]);

  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) setRetry(n => n + 1); }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const scroll = window.scrollY;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
      window.scrollTo(0, scroll);
    };
  }, [expanded]);

  const observations = useMemo(() => (result?.observations ?? []).filter(p =>
    Date.parse(p.observed_at) >= Date.now() - hours * 3600000), [result, hours]);
  const visibleHotspots = useMemo(() => showHotspots ? observations : [], [observations, showHotspots]);
  const selectHotspot = (point: HotspotObservation) => {
    setSelected(point); setSelectedPlot(null);
    onSelectLocation({ coordinates: point.coordinates, label: "Lokasi titik panas" });
  };

  return <section ref={panel} className={`${styles.mapSection} ${expanded ? styles.expanded : ""}`}
    role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-labelledby="overview-map-title"
    onKeyDown={event => {
      if (!expanded) return;
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key === "Tab") {
        const elements = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, summary, [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <div className={styles.sectionHead}>
      <div><h2 id="overview-map-title">Peta wilayah</h2><p className={styles.muted}>Pilih titik untuk melihat rincian dan prakiraan lokasi.</p></div>
      <button ref={closeButton} className={styles.outlineButton} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Tutup peta besar" : "Perbesar peta"}</button>
    </div>
    <div className={styles.mapToolbar}>
      <div className={styles.segment} role="group" aria-label="Lapisan peta">
        <button aria-pressed={showHotspots} onClick={() => setShowHotspots(v => !v)}><span className={styles.fireDot} />Titik panas</button>
        <button aria-pressed={showPlots} onClick={() => setShowPlots(v => !v)}><span className={styles.plotDot} />Petak pemulihan</button>
      </div>
      <label className={styles.period}>Observasi <select aria-label="Jendela observasi" value={hours} onChange={event => { setHours(Number(event.target.value)); setSelected(null); }}>
        {[6, 12, 24].map(h => <option key={h} value={h}>{h} jam terakhir</option>)}
      </select></label>
    </div>
    <div className={styles.mapCanvas}>
      <RestorationMap plots={plots} selectedPlot={selectedPlot} selectedRegion={region} showPlots={showPlots}
        hotspots={visibleHotspots} onBoundsChange={receiveBounds} onTileError={() => setTileError(true)}
        onSelectPlot={plot => { setSelected(null); setSelectedPlot(plot); onSelectPlot(plot); }} onSelectHotspot={selectHotspot}
        onSelectLocation={coordinates => { setSelected(null); setSelectedPlot(null); onSelectLocation({ coordinates, label: "Titik pilihan" }); }} />
      {selected && <div className={styles.mapDetail} role="region" aria-label="Rincian titik panas">
        <button className={styles.detailClose} aria-label="Tutup rincian titik panas" onClick={() => setSelected(null)}>×</button>
        <h3>Titik panas</h3><p>{formatTimeWib(selected.observed_at)}</p>
        <p>{selected.satellite === "VIIRS_NOAA20_NRT" ? "VIIRS NOAA-20" : "VIIRS NOAA-21"} · Confidence {confidenceLabels[selected.confidence]}</p>
        <p>FRP {selected.frp_mw === null ? "belum tersedia" : `${formatId(selected.frp_mw, 1)} MW`}</p>
        <small>Deteksi satelit; belum merupakan verifikasi lapangan.</small>
      </div>}
    </div>
    {selectedPlot && <div className={styles.plotDetail}>
      <p className={styles.source}>{plotSource}</p>
      <PlotBottomSheet plot={selectedPlot} onClose={() => setSelectedPlot(null)}
        onFilterTimelineByPlot={() => { setExpanded(false); onOpenRecovery(); }} actionLabel="Buka pemulihan" />
    </div>}
    <div className={styles.mapStatus} aria-live="polite">
      {loading ? <p>Memuat titik panas…</p> : failed ? <p>Data titik panas belum tersedia. <button onClick={() => setRetry(n => n + 1)}>Coba lagi</button></p> : <p>
        <strong>{formatId(observations.length)}</strong> titik panas di area peta · {hours} jam
        {result?.status === "partial" && " · Data sebagian"}{result?.status === "cached" && " · Data tersimpan, pembaruan gagal"}
      </p>}
      <p className={styles.source}>NASA FIRMS{result && ` · diambil ${formatTimeWib(result.fetched_at)}`}{result?.observed_at && ` · observasi terbaru ${formatTimeWib(result.observed_at)}`} · Petak: {plotSource}</p>
      {result?.status === "partial" && <p className={styles.source}>Sumber belum tersedia: {result.sources.filter(s => !s.available).map(s => s.name.replace("VIIRS_", "VIIRS ").replace("_NRT", "")).join(", ")}</p>}
      {tileError && <p className={styles.notice}>Sebagian peta dasar gagal dimuat. Daftar titik dan ringkasan tetap tersedia.</p>}
    </div>
    {observations.length > 0 && <details className={styles.pointList}>
      <summary>Pilih titik panas dari daftar</summary>
      <p className={styles.source}>20 observasi terbaru di area peta. Perbesar area untuk mempersempit hasil.</p>
      {[...observations].sort((a, b) => b.observed_at.localeCompare(a.observed_at)).slice(0, 20).map(point =>
        <button key={point.id} onClick={() => selectHotspot(point)}>{point.coordinates.map(n => n.toFixed(3)).join(", ")} · {formatTimeWib(point.observed_at)}</button>)}
    </details>}
  </section>;
}
