// Explore recovery plots and load history only when a plot is selected.
"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { PlotFeatureCollection, TimelineItem, TreeStatus, RecoveryReport } from "@/types";
import { REGION_TABS, REGION_COORDINATES, matchRegion, type RegionKey } from "@/utils/plotDisplay";
import { getRecoveryHistoryApi } from "@/services/api";
import { MapIcon } from "./hazards/MapIcon";
import { useRecoveryReports } from "./recovery/useRecoveryReports";
import { RecoveryReportDetail } from "./recovery/RecoveryReportDetail";
import { CONDITION_LABELS } from "@/utils/recoveryEvidence";
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
const STATUS = CONDITION_LABELS;
function clusterIcon(cluster: L.MarkerCluster, en = false, reports = false) {
  const count = cluster.getChildCount();
  cluster.options.title = count + " " + (reports ? (en ? "reports" : "laporan warga") : (en ? "plots" : "petak"));
  return L.divIcon({ className: styles.cluster + (reports ? " " + styles.reportCluster : ""), html: "<span>" + count + "</span>", iconSize: [48, 48] });
}
const position = (coordinates: number[]): L.LatLngTuple => [coordinates[1], coordinates[0]];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pinIcon(status: TreeStatus, selected: boolean) {
  return L.divIcon({
    className: styles.pin + (selected ? " " + styles.selected : ""),
    html: '<svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 38C12 32 2 23 2 15a14 14 0 0 1 28 0c0 8-10 17-14 23Z" fill="' + COLORS[status] + '" stroke="#fffdf7" stroke-width="2.5"/><circle cx="16" cy="15" r="4.5" fill="#fffdf7"/></svg>',
    iconSize: [44, 48], iconAnchor: [22, 44],
  });
}

function reportIcon(selected: boolean) {
  return L.divIcon({ className: styles.reportPin + (selected ? " " + styles.selectedReport : ""),
    html: '<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#fff9ef" stroke="#ad5a24" stroke-width="3" stroke-dasharray="3 2"/><path d="M11 10h10v12H11zM14 14h4m-4 4h4" fill="none" stroke="#ad5a24" stroke-width="1.6"/></svg>',
    iconSize: [44, 44], iconAnchor: [22, 22],
  });
}

export function RecoveryMap({ plots, loading, sample, selectedRegion, onSelectRegion, selectedPlotId, onSelectPlot, selectedReportId, onSelectReport, language }: RecoveryMapProps) {
  const en = language === "en", t = (id: string, english: string) => en ? english : id;
  const shell = useRef<HTMLElement>(null), canvas = useRef<HTMLDivElement>(null), panel = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null), clustersRef = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>()), filterButton = useRef<HTMLButtonElement>(null);
  const reportClusters = useRef<L.MarkerClusterGroup | null>(null), reportMarkers = useRef(new Map<string, L.Marker>());
  const [bounds, setBounds] = useState("95,-11,141,6"), [layer, setLayer] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false), [query, setQuery] = useState("");
  const [status, setStatus] = useState("all"), [ecosystem, setEcosystem] = useState("all");
  const [fullscreen, setFullscreen] = useState(false), [mapError, setMapError] = useState(false);
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
  const select = useEffectEvent((id: string) => { setFiltersOpen(false); onSelectPlot(id); });
  const selectReport = useEffectEvent((id: string) => { setFiltersOpen(false); onSelectReport(id); });
  const filterCount = Number(layer !== "all") + Number(selectedRegion !== "all") + Number(status !== "all") + Number(ecosystem !== "all") + Number(!!query.trim());

  useEffect(() => {
    if (!canvas.current) return;
    const markerIndex = markers.current;
    const map = L.map(canvas.current, { zoomControl: false, minZoom: 3, maxZoom: 18, preferCanvas: true, maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1,
      zoomAnimation: !reducedMotion(), fadeAnimation: false, markerZoomAnimation: false }).setView([-2, 113], 5);
    mapRef.current = map;
    const tiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri", maxZoom: 18, noWrap: true, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1,
    }).addTo(map);
    tiles.on("tileerror", () => setMapError(true));
    tiles.on("tileload", () => setMapError(false));
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomright", imperial: false }).addTo(map);
    clustersRef.current = L.markerClusterGroup({
      maxClusterRadius: 60, showCoverageOnHover: false, animate: false, chunkedLoading: true,
      chunkInterval: 8, chunkDelay: 16, spiderfyOnMaxZoom: true,
      iconCreateFunction: cluster => clusterIcon(cluster),
    }).addTo(map);
    reportClusters.current = L.markerClusterGroup({ maxClusterRadius: 60, showCoverageOnHover: false, animate: false,
      chunkedLoading: true, chunkInterval: 8, chunkDelay: 16, iconCreateFunction: cluster => clusterIcon(cluster, false, true),
    }).addTo(map);
    let boundsTimer = 0;
    const updateBounds = () => {
      const box = map.getBounds();
      const coordinates = [Math.max(-180, box.getWest()), Math.max(-90, box.getSouth()), Math.min(180, box.getEast()), Math.min(90, box.getNorth())];
      if (coordinates[0] < coordinates[2] && coordinates[1] < coordinates[3]) setBounds(coordinates.map(value => value.toFixed(5)).join(","));
    };
    map.on("moveend", () => { clearTimeout(boundsTimer); boundsTimer = window.setTimeout(updateBounds, 150); });
    const frame = requestAnimationFrame(updateBounds);
    const reportIndex = reportMarkers.current;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(canvas.current);
    const onFullscreen = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      cancelAnimationFrame(frame); reportIndex.clear(); reportClusters.current = null;
      observer.disconnect(); document.removeEventListener("fullscreenchange", onFullscreen);
      // Leaflet 1.9.4 leaves a zoom completion timer alive after removal.
      (map as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      map.remove(); mapRef.current = null; clustersRef.current = null; markerIndex.clear();
      // Removing an animated map can emit moveend and schedule one last update.
      clearTimeout(boundsTimer);
    };
  }, []);

  useEffect(() => {
    const group = clustersRef.current;
    if (!group) return;
    group.clearLayers(); markers.current.clear();
    (group.options as L.MarkerClusterGroupOptions).iconCreateFunction = cluster => clusterIcon(cluster, en);
    group.addLayers(filtered.map(plot => {
      const label = plot.properties.name + " · " + STATUS[plot.properties.latest_status][en ? 1 : 0];
      const marker = L.marker(position(plot.geometry.coordinates), {
        icon: pinIcon(plot.properties.latest_status, false), title: label, alt: label, riseOnHover: true,
      }).on("click", () => select(plot.id));
      markers.current.set(plot.id, marker);
      return marker;
    }));
  }, [filtered, en]);

  useEffect(() => {
    const group = reportClusters.current;
    if (!group) return;
    group.clearLayers(); reportMarkers.current.clear();
    (group.options as L.MarkerClusterGroupOptions).iconCreateFunction = cluster => clusterIcon(cluster, en, true);
    const items = selectedReport && !filteredReports.some(report => report.id === selectedReport.id) ? [...filteredReports, selectedReport] : filteredReports;
    group.addLayers(items.map(report => {
      const label = (en ? "Citizen report" : "Laporan warga") + " · " + report.location_name + " · " + (en ? "Unverified" : "Belum diverifikasi");
      const marker = L.marker(position(report.location.coordinates), { icon: reportIcon(report.id === selectedReport?.id), title: label, alt: label, riseOnHover: true })
        .on("click", () => selectReport(report.id));
      reportMarkers.current.set(report.id, marker); return marker;
    }));
  }, [filteredReports, selectedReport, en]);

  // Region changes fit the map; selecting a marker must not reset the region camera.
  function fitPlots() {
    const map = mapRef.current;
    if (!map) return;
    const points = [...filtered.map(p => position(p.geometry.coordinates)), ...filteredReports.map(report => position(report.location.coordinates))];
    if (points.length) map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [65, 100], paddingBottomRight: [65, 65], maxZoom: 11, animate: !reducedMotion(),
    });
    else {
      const region = REGION_COORDINATES[selectedRegion as RegionKey] ?? REGION_COORDINATES.all;
      map.setView(region.center, region.zoom, { animate: !reducedMotion() });
    }
  }
  const fitRegion = useEffectEvent(fitPlots);
  useEffect(() => { if (!loading) fitRegion(); }, [selectedRegion, loading]);

  useEffect(() => {
    for (const plot of filtered) markers.current.get(plot.id)?.setIcon(pinIcon(plot.properties.latest_status, plot.id === selectedId));
    const activeId = selectedId ?? selectedReport?.id;
    const coordinates = selected?.geometry.coordinates ?? selectedReport?.location.coordinates;
    if (!activeId || !coordinates) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      const map = mapRef.current, marker = (selected ? markers : reportMarkers).current.get(activeId);
      if (!map || !marker) return;
      map.invalidateSize({ pan: false });
      if (selectedReport && map.getZoom() < 12) map.setView(position(coordinates), 12, { animate: false });
      (selected ? clustersRef : reportClusters).current?.zoomToShowLayer(marker, () => {
        if (!active || mapRef.current !== map) return;
        const coords = L.latLng(position(coordinates));
        const offset = window.innerWidth > 700 ? L.point(-175, 0) : L.point(0, -18);
        map.panTo(map.unproject(map.project(coords).add(offset)), { animate: !reducedMotion() });
        panel.current?.focus({ preventScroll: true });
      });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [selectedId, selected, selectedReport, filtered, en]);

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
    const marker = selectedId ? markers.current.get(selectedId) : selectedReport ? reportMarkers.current.get(selectedReport.id) : null;
    if (selectedReportId) onSelectReport(null); else onSelectPlot(null);
    (marker?.getElement() || filterButton.current)?.focus({ preventScroll: true });
  }
  function resetFilters() { setLayer("all"); setQuery(""); setStatus("all"); setEcosystem("all"); onSelectRegion("all"); }

  return <section ref={shell} className={styles.shell} data-detail={hasDetail} data-expanded={expanded} aria-label={t("Peta kawasan pemulihan", "Restoration map")}
    onKeyDown={event => { if (event.key === "Escape") { if (hasDetail) closeDetail(); else { setFiltersOpen(false); filterButton.current?.focus(); } } }}>
    <div className={styles.stage}>
      <div ref={canvas} className={styles.map} />
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
          <label>{t("Kondisi", "Condition")}<select aria-label={t("Kondisi", "Condition")} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t("Semua kondisi", "All conditions")}</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label[en ? 1 : 0]}</option>)}</select></label>
          <label>{t("Ekosistem", "Ecosystem")}<select aria-label={t("Ekosistem", "Ecosystem")} value={ecosystem} onChange={event => setEcosystem(event.target.value)}><option value="all">{t("Semua", "All")}</option><option value="gambut">{t("Gambut", "Peatland")}</option><option value="hutan_kota">{t("Hutan kota", "Urban forest")}</option><option value="mineral">{t("Mineral", "Mineral soil")}</option></select></label>
        </div>
        <div className={styles.filterActions}><button onClick={resetFilters}>{t("Reset filter", "Reset filters")}</button><button onClick={() => { setFiltersOpen(false); fitPlots(); }}>{t("Lihat hasil", "View results")}</button></div>
      </div>}
      {!loading && !reports.loading && !reports.failed && !hasDetail && !selectedReportId && !filtersOpen && !filtered.length && !filteredReports.length && <div className={styles.empty} role="status"><strong>{t("Tidak ada lokasi", "No locations found")}</strong><span>{t("Coba wilayah atau filter lain.", "Try another region or filter.")}</span><button onClick={resetFilters}>{t("Reset filter", "Reset filters")}</button></div>}
      {(reports.loading || reports.failed || reports.truncated) && <div className={styles.reportNotice} role="status">{reports.loading ? t("Memuat laporan di area peta…", "Loading reports in this area…") : reports.failed ? <>{t("Laporan belum dapat dimuat.", "Reports are unavailable.")} <button onClick={reports.refresh}>{t("Coba lagi", "Try again")}</button></> : t("500 laporan ditampilkan. Perbesar peta untuk melihat area lebih rinci.", "Showing 500 reports. Zoom in to explore a smaller area.")}</div>}
      {selectedReportId && (reports.detailLoading || reports.detailFailed) && <div className={styles.reportNotice} role="status">{reports.detailLoading ? t("Memuat rincian laporan…", "Loading report details…") : <>{t("Laporan tidak ditemukan atau belum dapat dimuat.", "Report not found or unavailable.")} <button onClick={() => onSelectReport(null)}>{t("Tutup", "Close")}</button><button onClick={reports.refresh}>{t("Coba lagi", "Try again")}</button></>}</div>}
      {mapError && <p className={styles.notice} role="status">{t("Sebagian peta belum termuat.", "Some map tiles are unavailable.")}</p>}
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
