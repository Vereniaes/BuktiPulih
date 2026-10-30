// Todo:
// -> Explore recovery plots and public reports on the shared map.
// -> Keep filters, permanent selection links, and field history.

// --- Recovery map ---
"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { PlotFeatureCollection, TimelineItem, TreeStatus, RecoveryReport } from "@/types";
import { REGION_TABS, REGION_COORDINATES, matchRegion, type RegionKey } from "@/utils/plotDisplay";
import { getRecoveryHistoryApi } from "@/services/api";
import { MapIcon } from "./hazards/MapIcon";
import { ExplorerMap } from "./maps/ExplorerMap";
import { MapMarkerLayer, type ExplorerMarker } from "./maps/MapMarkerLayer";
import { MapViewControls } from "./maps/MapViewControls";
import { readDeviceHints,useLowGraphics } from "./hazards/map-display";
import type { ExplorerBounds, ExplorerMapApi, ExplorerMode, ExplorerPoint } from "@/types/explorer-map";
import { useRecoveryReports } from "./recovery/useRecoveryReports";
import { RecoveryReportDetail } from "./recovery/RecoveryReportDetail";
import { CONDITION_LABELS } from "@/utils/recoveryEvidence";
import { useCategories } from "./evidence/useCategories";
import { RecoveryDetail } from "./recovery/RecoveryDetail";
import styles from "./recovery/recovery-map.module.css";

interface RecoveryMapProps {
  plots: PlotFeatureCollection;
  loading: boolean;
  sample: boolean;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  selectedPlotId: string | null;
  onSelectPlot: (id: string | null) => void;
  selectedReportId: string | null;
  onSelectReport: (id: string | null) => void;
  language: "id" | "en";
}
const COLORS: Record<TreeStatus, string> = { subur: "#2d6548", perlu_rawat: "#ad6818", kritis: "#bb412d", mati: "#69706a" };
const STATUS = Object.fromEntries(Object.keys(COLORS).map(key=>[key,CONDITION_LABELS[key]]));
const coordinates = (point: number[]): ExplorerPoint => [point[0], point[1]];

/** Purpose: Explore recovery evidence. Input: plots, selection, and filters. Output: map and selected details. */
export function RecoveryMap({ plots, loading, sample, selectedRegion, onSelectRegion, selectedPlotId, onSelectPlot, selectedReportId, onSelectReport, language }: RecoveryMapProps) {
  const en = language === "en", t = (id: string, english: string) => en ? english : id;
  const categories = useCategories(language);
  const shell = useRef<HTMLElement>(null), panel = useRef<HTMLElement>(null), filterButton = useRef<HTMLButtonElement>(null);
  const fittedRegion = useRef<string | null>(null), focusedLocation = useRef("");
  const boundsTimer = useRef(0);
  const [api, setApi] = useState<ExplorerMapApi | null>(null), [mode, setMode] = useState<ExplorerMode>("roadmap");
  const [device]=useState(readDeviceHints),lowGraphics=useLowGraphics("auto",device);
  const [bounds, setBounds] = useState("95,-11,141,6"), [layer, setLayer] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false), [query, setQuery] = useState("");
  const [status, setStatus] = useState("all"), [ecosystem, setEcosystem] = useState("all");
  const [fullscreen, setFullscreen] = useState(false);
  const [history, setHistory] = useState<{ code: string; items: TimelineItem[]; hasMore: boolean; failed: boolean } | null>(null);
  const [historyRequest, setHistoryRequest] = useState({ code: "", page: 1 }), [historyPending, setHistoryPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const filtered = useMemo(() => layer === "reports" ? [] : plots.features.filter(plot => {
    const p = plot.properties;
    return matchRegion(p.region, selectedRegion) && (status === "all" || p.latest_status === status)
      && (ecosystem === "all" || p.ecosystem_type === ecosystem)
      && (p.name + " " + p.plot_code + " " + p.region + " " + p.community_name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [plots, selectedRegion, status, ecosystem, query, layer]);
  const reports = useRecoveryReports(bounds, selectedRegion, status, ecosystem, selectedReportId, layer !== "plots");
  const matchesReport = useCallback((report: RecoveryReport) => layer !== "plots" && (selectedRegion === "all" || report.region_key === selectedRegion)
    && (status === "all" || report.condition === status) && (ecosystem === "all" || report.ecosystem_type === ecosystem)
    && (report.location_name + " " + report.caption).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()), [layer, selectedRegion, status, ecosystem, query]);
  const filteredReports = useMemo(() => reports.items.filter(matchesReport), [reports.items, matchesReport]);
  const selectedReport = reports.selected && matchesReport(reports.selected) ? reports.selected : null;
  const selected = selectedReportId ? null : filtered.find(plot => plot.id === selectedPlotId) ?? null;
  const hasDetail = !!selected || !!selectedReport;
  const selectedId = selected?.id, selectedCode = selected?.properties.plot_code;
  const historyPage = historyRequest.code === selectedCode ? historyRequest.page : 1;
  const selectMarker = useCallback((id: string) => {
    setFiltersOpen(false);
    if (id.startsWith("plot:")) onSelectPlot(id.slice(5));
    else if (id.startsWith("report:")) onSelectReport(id.slice(7));
  }, [onSelectPlot, onSelectReport]);
  const filterCount = Number(layer !== "all") + Number(selectedRegion !== "all") + Number(status !== "all") + Number(ecosystem !== "all") + Number(!!query.trim());

  const receiveBounds = useCallback((next: ExplorerBounds) => {
    window.clearTimeout(boundsTimer.current);
    boundsTimer.current = window.setTimeout(() => {
      const [west, south, east, north] = next;
      if (west < east && south < north) setBounds([
        Math.max(-180, west), Math.max(-90, south), Math.min(180, east), Math.min(90, north),
      ].map(value => value.toFixed(5)).join(","));
    }, 150);
  }, []);
  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.clearTimeout(boundsTimer.current); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  const markers = useMemo<ExplorerMarker[]>(() => {
    const items = selectedReport && !filteredReports.some(report => report.id === selectedReport.id) ? [...filteredReports, selectedReport] : filteredReports;
    return [
      ...filtered.map(plot => ({
        id: "plot:" + plot.id, point: coordinates(plot.geometry.coordinates), kind: "pin" as const,
        label: plot.properties.name + " · " + STATUS[plot.properties.latest_status][en ? 1 : 0],
        color: COLORS[plot.properties.latest_status], selected: plot.id === selectedId, cluster: "plots",
      })),
      ...items.map(report => ({
        id: "report:" + report.id, point: coordinates(report.location.coordinates), kind: "report" as const,
        label: (en ? "Citizen report" : "Laporan warga") + " · " + report.location_name + " · " + (en ? "Unverified" : "Belum diverifikasi"),
        color: "#ad5a24", selected: report.id === selectedReport?.id, cluster: "reports",
      })),
    ];
  }, [filtered, filteredReports, selectedReport, selectedId, en]);

  // Purpose: Fit matching points while leaving room for map controls. Input: current filters. Output: camera change.
  function fitPlots() {
    if (!api) return;
    const points = [...filtered.map(plot => plot.geometry.coordinates), ...filteredReports.map(report => report.location.coordinates)];
    if (points.length) {
      const longitude = points.map(point => point[0]), latitude = points.map(point => point[1]);
      api.fitBounds([Math.min(...longitude), Math.min(...latitude), Math.max(...longitude), Math.max(...latitude)],
        { top: 110, right: 85, bottom: 85, left: 65 }, 11);
    } else {
      const region = REGION_COORDINATES[selectedRegion as RegionKey] ?? REGION_COORDINATES.all;
      api.moveTo([region.center[1], region.center[0]], region.zoom);
    }
  }
  const fitRegion = useEffectEvent(fitPlots);
  useEffect(() => {
    if (!api || loading || fittedRegion.current === selectedRegion) return;
    fittedRegion.current = selectedRegion;
    fitRegion();
  }, [api, selectedRegion, loading]);

  useEffect(() => {
    const point = selected?.geometry.coordinates ?? selectedReport?.location.coordinates;
    const key = selected ? "plot:" + selected.id : selectedReport ? "report:" + selectedReport.id : "";
    if (!key) { focusedLocation.current = ""; return; }
    if (!api || !point || focusedLocation.current === key) return;
    const frame = requestAnimationFrame(() => {
      focusedLocation.current = key;
      api.moveTo(coordinates(point), Math.max(12, api.getView().zoom), window.innerWidth > 700 ? [175, 0] : [0, -18]);
      panel.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [api, selected, selectedReport]);

  useEffect(() => {
    if (!selectedCode) return;
    const controller = new AbortController();
    getRecoveryHistoryApi(selectedCode, controller.signal, historyPage).then(result => {
      if (controller.signal.aborted) return;
      setHistory(previous => {
        const items = [...(historyPage > 1 && previous?.code === selectedCode ? previous.items : []), ...result.items.filter(item => item.plot_code === selectedCode)];
        return { code: selectedCode, items: Array.from(new Map(items.map(item => [item.id, item])).values()).sort((a, b) => b.monitoring_date.localeCompare(a.monitoring_date)), hasMore: result.hasMore, failed: false };
      });
      setHistoryPending(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setHistory(previous => ({ code: selectedCode, items: previous?.code === selectedCode ? previous.items : [], hasMore: historyPage > 1, failed: true }));
      setHistoryPending(false);
    });
    return () => controller.abort();
  }, [selectedCode, historyPage, retry]);

  function closeDetail() {
    setExpanded(false);
    if (selectedReportId) onSelectReport(null); else onSelectPlot(null);
    (shell.current?.querySelector<HTMLCanvasElement>("canvas[data-map-markers]") ?? filterButton.current)?.focus({ preventScroll: true });
  }
  function resetFilters() { setLayer("all"); setQuery(""); setStatus("all"); setEcosystem("all"); onSelectRegion("all"); }

  return <section ref={shell} className={styles.shell} data-detail={hasDetail} data-expanded={expanded} aria-label={t("Peta kawasan pemulihan", "Restoration map")}
    onKeyDown={event => { if (event.key === "Escape" && !(event.target instanceof Element && event.target.closest("dialog"))) { if (hasDetail) closeDetail(); else { setFiltersOpen(false); filterButton.current?.focus(); } } }}>
    <div className={styles.stage}>
      <div className={styles.map}>
        <ExplorerMap mode={mode} language={language} lowGraphics={lowGraphics} onReady={setApi} onBoundsChange={receiveBounds} onModeChange={setMode} />
        <MapMarkerLayer api={api} markers={markers} onSelect={selectMarker} language={language} lowGraphics={lowGraphics} cluster />
        <div className={styles.viewControls}>
          <MapViewControls onOpenWeather={()=>{setFiltersOpen(false);if(window.innerWidth<=700&&hasDetail)closeDetail();}} api={api} mode={mode} onModeChange={setMode} language={language} lowGraphics={lowGraphics} />
        </div>
      </div>
      <div className={styles.topbar}>
        <div className={styles.heading}><h1>{t("Kawasan pemulihan", "Restoration areas")}</h1><span role="status">{loading ? t("Memuat petak…", "Loading plots…") : filtered.length + " " + t("petak", "plots") + (sample ? t(" contoh", " sample") : "") + " · " + filteredReports.length + " " + t("laporan warga", "reports")}</span></div>
        <button ref={filterButton} className={styles.filterButton} aria-expanded={filtersOpen} aria-controls="recovery-filters" onClick={() => { if (hasDetail) closeDetail(); setFiltersOpen(!filtersOpen); }}><MapIcon name="layers" />Filter{filterCount > 0 && <span>{filterCount}</span>}</button>
      </div>
      <div className={styles.tools}>
        <button title={t("Lihat semua petak", "Show all plots")} aria-label={t("Lihat semua petak", "Show all plots")} onClick={() => fitPlots()}><MapIcon name="extent" /></button>
        <button title={t("Layar penuh", "Fullscreen")} aria-label={fullscreen ? t("Keluar layar penuh", "Exit fullscreen") : t("Layar penuh", "Fullscreen")} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shell.current?.requestFullscreen().catch(() => {}); }}><MapIcon name="expand" /></button>
      </div>
      {filtersOpen && <div id="recovery-filters" className={styles.filters}>
        <label>{t("Tampilkan", "Show")}<select aria-label={t("Tampilkan", "Show")} value={layer} onChange={event => { setLayer(event.target.value); }}><option value="all">{t("Petak dan laporan warga", "Plots and citizen reports")}</option><option value="plots">{t("Petak terverifikasi", "Verified plots")}</option><option value="reports">{t("Laporan warga", "Citizen reports")}</option></select></label>
        <label>{t("Cari lokasi", "Find a location")}<input type="search" value={query} placeholder={t("Nama, kode, atau catatan", "Name, code, or notes")} onChange={event => setQuery(event.target.value)} /></label>
        <label>{t("Wilayah", "Region")}<select aria-label={t("Wilayah", "Region")} value={selectedRegion} onChange={event => onSelectRegion(event.target.value)}>{REGION_TABS.map(region => <option key={region.key} value={region.key}>{region.key === "all" ? t("Semua wilayah", "All regions") : region.key === "lainnya" ? t("Wilayah lain", "Other region") : region.province}</option>)}</select></label>
        <div className={styles.filterRow}>
          <label>{t("Kondisi", "Condition")}<select aria-label={t("Kondisi", "Condition")} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t("Semua kondisi", "All conditions")}</option>{categories.options("condition").map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label>{t("Ekosistem", "Ecosystem")}<select aria-label={t("Ekosistem", "Ecosystem")} value={ecosystem} onChange={event => setEcosystem(event.target.value)}><option value="all">{t("Semua", "All")}</option>{categories.options("ecosystem").map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        </div>
        {categories.failed && <p role="status">{t("Kategori bersama belum dapat dimuat.","Shared categories are unavailable.")} <button type="button" onClick={categories.refresh}>{t("Coba lagi","Try again")}</button></p>}
        <div className={styles.filterActions}><button onClick={resetFilters}>{t("Reset filter", "Reset filters")}</button><button onClick={() => { setFiltersOpen(false); fitPlots(); }}>{t("Lihat hasil", "View results")}</button></div>
      </div>}
      {!loading && !reports.loading && !reports.failed && !hasDetail && !selectedReportId && !filtersOpen && !filtered.length && !filteredReports.length && <div className={styles.empty} role="status"><strong>{t("Tidak ada lokasi", "No locations found")}</strong><span>{t("Coba wilayah atau filter lain.", "Try another region or filter.")}</span><button onClick={resetFilters}>{t("Reset filter", "Reset filters")}</button></div>}
      {(reports.loading || reports.failed || reports.truncated) && <div className={styles.reportNotice} role="status">{reports.loading ? t("Memuat laporan di area peta…", "Loading reports in this area…") : reports.failed ? <>{t("Laporan belum dapat dimuat.", "Reports are unavailable.")} <button onClick={reports.refresh}>{t("Coba lagi", "Try again")}</button></> : t("500 laporan ditampilkan. Perbesar peta untuk melihat area lebih rinci.", "Showing 500 reports. Zoom in to explore a smaller area.")}</div>}
      {selectedReportId && (reports.detailLoading || reports.detailFailed) && <div className={styles.reportNotice} role="status">{reports.detailLoading ? t("Memuat rincian laporan…", "Loading report details…") : <>{t("Laporan tidak ditemukan atau belum dapat dimuat.", "Report not found or unavailable.")} <button onClick={() => onSelectReport(null)}>{t("Tutup", "Close")}</button><button onClick={reports.refresh}>{t("Coba lagi", "Try again")}</button></>}</div>}
      <div className={styles.legend} aria-label={t("Legenda peta", "Map legend")}><strong>{t("Petak", "Plots")}</strong>{Object.entries(STATUS).map(([key, label]) => <span key={key}><i style={{ background: COLORS[key as TreeStatus] }} />{label[en ? 1 : 0]}</span>)}<span><i className={styles.reportLegend} />{t("Laporan warga · belum diverifikasi", "Citizen report · unverified")}</span></div>
    </div>
    {selectedReport && <aside ref={panel} tabIndex={-1} className={styles.detail} aria-label={t("Rincian laporan warga", "Citizen report details")}><RecoveryReportDetail report={selectedReport} language={language} onClose={closeDetail} expanded={expanded} onToggleExpand={() => setExpanded(value => !value)} /></aside>}
    {selected && <aside ref={panel} tabIndex={-1} className={styles.detail} aria-label={t("Rincian petak", "Plot details")}>
      <RecoveryDetail key={selected.id} plot={selected} language={language} onClose={closeDetail} expanded={expanded} onToggleExpand={() => setExpanded(value => !value)}
        items={history?.code === selectedCode ? (history?.items ?? []) : []}
        historyLoading={history?.code !== selectedCode}
        historyFailed={history?.code === selectedCode && !!history?.failed}
        historyHasMore={history?.code === selectedCode && !!history?.hasMore}
        historyPending={historyPending}
        onLoadMore={() => { setHistoryPending(true); setHistoryRequest({ code: selectedCode!, page: historyPage + 1 }); }}
        onRetryHistory={() => { setHistoryPending(true); setRetry(value => value + 1); }} />
    </aside>}
  </section>;
}

// --- end of Recovery map ---
