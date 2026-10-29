// Todo:
// -> Render fixed example markers on an Esri imagery map.

// --- Regional map example ---
"use client";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import styles from "./home.module.css";
import { REGION_TABS } from "@/utils/plotDisplay";

interface Props {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  onOpenRecovery: () => void;
  onOpenFire?: () => void;
  language?: "id" | "en";
}

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "hotspot" | "recovery" | "citizen";
  meta: string;
}

const SAMPLE_POINTS: MapPoint[] = [
  { id: "p1", name: "Ketapang, Kalimantan Barat", lat: -1.83, lng: 110.05, type: "hotspot", meta: "12 titik · 24 jam terakhir" },
  { id: "p2", name: "Parit Tokaya, Kubu Raya", lat: -0.15, lng: 109.40, type: "recovery", meta: "Sekat kanal basah aktif" },
  { id: "p3", name: "Kanal Sekat 9, Ketapang", lat: -1.72, lng: 110.25, type: "citizen", meta: "Laporan TMAT -48cm" },
  { id: "p4", name: "Pelalawan, Riau", lat: 0.45, lng: 101.90, type: "hotspot", meta: "7 titik · 24 jam terakhir" },
  { id: "p5", name: "Teluk Meranti, Riau", lat: 0.32, lng: 102.50, type: "recovery", meta: "Zona restorasi ramin" },
  { id: "p6", name: "Muaro Jambi, Jambi", lat: -1.58, lng: 103.70, type: "hotspot", meta: "4 titik · 24 jam terakhir" },
  { id: "p7", name: "Kecamatan Air Hitam, Jambi", lat: -1.95, lng: 103.45, type: "recovery", meta: "Pengecekan muka air stabil" },
  { id: "p8", name: "Ogan Ilir, Sumatera Selatan", lat: -3.42, lng: 104.75, type: "hotspot", meta: "9 titik · 24 jam terakhir" },
  { id: "p9", name: "Pulang Pisau, Kalimantan Tengah", lat: -2.75, lng: 114.15, type: "hotspot", meta: "15 titik · 24 jam terakhir" },
  { id: "p10", name: "Sebangau, Kalimantan Tengah", lat: -2.35, lng: 113.80, type: "recovery", meta: "Restorasi gambut belangeran" },
  { id: "p11", name: "Banjarbaru, Kalimantan Selatan", lat: -3.45, lng: 114.85, type: "hotspot", meta: "5 titik · 24 jam terakhir" },
  { id: "p12", name: "Rasau Jaya, Kalimantan Barat", lat: -0.22, lng: 109.35, type: "citizen", meta: "Bibit jelutung tumbuh segar" },
];

export function HomeRegionalMap({ selectedRegion, onSelectRegion, onOpenRecovery, onOpenFire, language = "id" }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapLayerFilter, setMapLayerFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("24h");
  const [selectedPreview, setSelectedPreview] = useState<MapPoint>(SAMPLE_POINTS[0]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-1.2, 114.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
      scrollWheelZoom: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: "topleft" }).addTo(map);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics',
      maxZoom: 18,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = SAMPLE_POINTS.filter((p) => {
      if (mapLayerFilter === "hotspot" && p.type !== "hotspot") return false;
      if (mapLayerFilter === "recovery" && p.type !== "recovery") return false;
      if (mapLayerFilter === "citizen" && p.type !== "citizen") return false;
      return true;
    });

    filtered.forEach((pt) => {
      const color =
        pt.type === "hotspot" ? "#EF4444" : pt.type === "recovery" ? "#22C55E" : "#F59E0B";

      const pulseHtml = `
        <div style="position:relative; width:22px; height:22px; display:grid; place-items:center;">
          <div style="position:absolute; width:18px; height:18px; border-radius:50%; background:${color}; opacity:0.35; animation: pulse 2s infinite ease-out;"></div>
          <div style="width:10px; height:10px; border-radius:50%; background:${color}; border:2px solid #FFFFFF; box-shadow: 0 0 8px ${color};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pulseHtml,
        className: "custom-map-pin",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });
      marker.on("click", () => {
        setSelectedPreview(pt);
      });
      marker.addTo(markersLayerRef.current!);
    });
  }, [mapLayerFilter]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedRegion === "kalbar") mapInstanceRef.current.setView([-0.1, 110.5], 7);
    else if (selectedRegion === "riau") mapInstanceRef.current.setView([0.5, 101.7], 7);
    else if (selectedRegion === "kalteng") mapInstanceRef.current.setView([-1.8, 113.5], 7);
    else if (selectedRegion === "sumsel") mapInstanceRef.current.setView([-3.2, 104.5], 7);
    else if (selectedRegion === "jambi") mapInstanceRef.current.setView([-1.6, 103.5], 7);
    else if (selectedRegion === "kalsel") mapInstanceRef.current.setView([-3.1, 115.3], 7);
    else if (selectedRegion === "all") mapInstanceRef.current.setView([-1.2, 114.5], 5);
  }, [selectedRegion]);

  const isEn = language === "en";

  return (
    <section className={styles.darkRegionalMapCard} aria-labelledby="regional-map-title">
      <div className={styles.darkMapHeader}>
        <div className={styles.darkMapHeaderLeft}>
          <h2 id="regional-map-title" className={styles.darkMapTitle}>
            {isEn ? "Regional Monitoring Map" : "Peta pemantauan wilayah"}
          </h2>
          <p className={styles.darkMapSubtitle}>
            {isEn
              ? "Track affected regions, thermal hotspots, and community recovery plots for a comprehensive territorial overview."
              : "Telusuri wilayah terdampak, titik panas, dan petak pemulihan untuk memahami kondisi setiap area secara lebih utuh."}
          </p>
        </div>

        <div className={styles.darkMapControls}>
          <label className={styles.darkSelectWrap}>
            <span className={styles.darkSelectLabel}>{isEn ? "Region" : "Wilayah"}</span>
            <select
              className={styles.darkSelect}
              value={selectedRegion}
              onChange={(e) => onSelectRegion(e.target.value)}
              aria-label="Wilayah"
            >
              {REGION_TABS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.key === "all" ? (isEn ? "All regions" : "Semua wilayah") : r.province}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.darkSelectWrap}>
            <span className={styles.darkSelectLabel}>{isEn ? "Map layer" : "Tampilan peta"}</span>
            <select
              className={styles.darkSelect}
              value={mapLayerFilter}
              onChange={(e) => setMapLayerFilter(e.target.value)}
              aria-label="Tampilan peta"
            >
              <option value="all">{isEn ? "All layers" : "Semua lapisan"}</option>
              <option value="hotspot">{isEn ? "Hotspots" : "Titik panas"}</option>
              <option value="recovery">{isEn ? "Recovery plots" : "Petak pemulihan"}</option>
              <option value="citizen">{isEn ? "Citizen reports" : "Laporan warga"}</option>
            </select>
          </label>

          <label className={styles.darkSelectWrap}>
            <span className={styles.darkSelectLabel}>{isEn ? "Period" : "Periode"}</span>
            <select
              className={styles.darkSelect}
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              aria-label="Periode"
            >
              <option value="24h">{isEn ? "Last 24 hours" : "24 jam terakhir"}</option>
              <option value="3d">{isEn ? "Last 3 days" : "3 hari terakhir"}</option>
              <option value="7d">{isEn ? "Last 7 days" : "7 hari terakhir"}</option>
            </select>
          </label>

          <button
            type="button"
            className={styles.btnExpandMap}
            onClick={onOpenFire || onOpenRecovery}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span>{isEn ? "Enlarge map" : "Perbesar peta"}</span>
          </button>
        </div>
      </div>

      <div className={styles.darkMapCanvasWrap}>
        <div ref={mapContainerRef} className={styles.darkMapCanvas} />

        <div className={styles.darkMapLegend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotHotspot}`} />
            <span>{isEn ? "Hotspots" : "Titik panas"}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotRecovery}`} />
            <span>{isEn ? "Recovery plots" : "Petak pemulihan"}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotCitizen}`} />
            <span>{isEn ? "Citizen reports" : "Laporan warga"}</span>
          </div>
        </div>

        <div className={styles.darkMapFloatingCard}>
          <img
            src="/hero-peat-seedling.jpg"
            alt="Preview Titik Terpilih"
            className={styles.floatingCardImg}
          />
          <div className={styles.floatingCardBody}>
            <h4 className={styles.floatingCardTitle}>{selectedPreview.name}</h4>
            <p className={styles.floatingCardMeta}>
              <span
                style={{
                  color:
                    selectedPreview.type === "hotspot"
                      ? "#EF4444"
                      : selectedPreview.type === "recovery"
                      ? "#22C55E"
                      : "#F59E0B",
                }}
              >
                ●{" "}
              </span>
              {selectedPreview.type === "hotspot"
                ? isEn ? "Hotspot" : "Titik panas"
                : selectedPreview.type === "recovery"
                ? isEn ? "Recovery Plot" : "Petak pemulihan"
                : isEn ? "Citizen Report" : "Laporan warga"}
              {" · "}
              {selectedPreview.meta}
            </p>
            <button
              type="button"
              className={styles.floatingCardLink}
              onClick={selectedPreview.type === "hotspot" ? onOpenFire : onOpenRecovery}
            >
              {isEn ? "View details →" : "Lihat detail →"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
// --- end of Regional map example ---
