// src/components/RecoveryMap.tsx
// -> komponen peta kawasan pemulihan pasca-karhutla (menu bukti pulih)
//      -> petak pemulihan gambut & hutan kota di 6 provinsi prioritas bnpb & bekasi
//      -> visualisasi tingkat hidup bibit (survival rate) dan sekat kanal pembasahan gambut
//      -> integrasi filter geospasial lintas provinsi dengan flyTo presisi
//      -> bottom sheet interaktif untuk melihat progres revegetasi fisik

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import { PlotFeature, PlotFeatureCollection } from "@/types";
import {
  RegionKey,
  REGION_TABS,
  REGION_COORDINATES,
  matchRegion,
  formatId,
} from "@/utils/plotDisplay";
import {
  peatHydrologicalUnitsData,
  PeatHydrologicalUnitProperties,
} from "@/data/peatHydrologicalUnitsData";
import { PlotBottomSheet } from "./PlotBottomSheet";

interface RecoveryMapProps {
  plots: PlotFeatureCollection;
  selectedRegion: string;
  onSelectRegion: (key: string) => void;
  onNavigateToForumWithPlot?: (plotCode: string) => void;
}

// helper --------------------------------------------------------------------------
// function penentu warna pin status pemulihan pohon
function getRecoveryMarkerColor(status: string): string {
  if (status === "subur") return "#0E753B"; // hijau stempel subur
  if (status === "perlu_rawat") return "#D97706"; // kuning perhatian
  return "#DC2626"; // merah kritis
}

// function uji titik berada di dalam poligon (ray-casting algorithm)
// input param : point [lat, lng], polygon [[lat, lng], ...]
// output : boolean (true jika titik berada di dalam kawasan khg)
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
// end of helper ------------------------------------------------------------------

export const RecoveryMap: React.FC<RecoveryMapProps> = ({
  plots,
  selectedRegion,
  onSelectRegion,
  onNavigateToForumWithPlot,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const khgLayersRef = useRef<L.LayerGroup | null>(null);

  const [selectedPlot, setSelectedPlot] = useState<PlotFeature | null>(
    plots.features[0] || null
  );
  const [showKhgLayer, setShowKhgLayer] = useState<boolean>(true);

  // deteksi apakah petak yang dipilih berada di dalam zona khg brgm
  const selectedPlotKhg = useMemo<PeatHydrologicalUnitProperties | null>(() => {
    if (!selectedPlot) return null;
    const [lng, lat] = selectedPlot.geometry.coordinates;
    for (const feat of peatHydrologicalUnitsData.features) {
      const poly = feat.geometry.coordinates[0];
      if (isPointInPolygon([lat, lng], poly)) {
        return feat.properties;
      }
    }
    return null;
  }, [selectedPlot]);

  // penyaringan daftar petak berdasarkan wilayah yang dipilih
  const filteredPlots = useMemo(() => {
    return plots.features.filter((p) => matchRegion(p.properties.region, selectedRegion));
  }, [plots, selectedRegion]);

  // kalkulasi metrik ringkasan wilayah pemulihan aktif
  const regionStats = useMemo(() => {
    const totalPlots = filteredPlots.length;
    const totalPlanted = filteredPlots.reduce((sum, p) => sum + p.properties.total_planted, 0);
    const totalAlive = filteredPlots.reduce((sum, p) => sum + p.properties.current_alive, 0);
    const avgSurvival =
      totalPlanted > 0 ? ((totalAlive / totalPlanted) * 100).toFixed(1) : "0.0";
    const suburCount = filteredPlots.filter((p) => p.properties.latest_status === "subur").length;

    const currentTab = REGION_TABS.find((t) => t.key === selectedRegion) || REGION_TABS[0];

    return {
      totalPlots,
      totalPlanted,
      totalAlive,
      avgSurvival,
      suburCount,
      provinceLabel: currentTab.label,
      isGambut: selectedRegion !== "bekasi",
    };
  }, [filteredPlots, selectedRegion]);

  // inisialisasi peta leaflet -----------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-1.5, 112.0],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // layer group untuk poligon khg brgm
      const khgGroup = L.layerGroup().addTo(map);
      khgLayersRef.current = khgGroup;

      // layer group untuk marker petak pemulihan
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // render layer poligon kesatuan hidrologis gambut (khg) brgm -------------------
  useEffect(() => {
    const khgGroup = khgLayersRef.current;
    if (!khgGroup) return;

    khgGroup.clearLayers();
    if (!showKhgLayer) return;

    peatHydrologicalUnitsData.features.forEach((feature) => {
      const isLindung = feature.properties.fungsi_ekosistem.includes("Fungsi Lindung");
      const latLngs: [number, number][] = feature.geometry.coordinates[0].map((coord) => [
        coord[1],
        coord[0],
      ]);

      const polygon = L.polygon(latLngs, {
        color: isLindung ? "#0D9488" : "#D97706",
        weight: 2,
        dashArray: isLindung ? undefined : "4, 4",
        fillColor: isLindung ? "#14B8A6" : "#F59E0B",
        fillOpacity: 0.16,
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #1E293B; min-width: 230px; line-height: 1.45;">
          <div style="font-weight: 800; font-size: 13px; color: ${isLindung ? "#0D9488" : "#D97706"}; margin-bottom: 3px;">
            ${feature.properties.nama_khg}
          </div>
          <div style="font-size: 10.5px; color: #64748B; margin-bottom: 8px;">
            SK MenLHK: ${feature.properties.sk_menlhk}
          </div>
          <div style="background: rgba(14, 117, 59, 0.08); padding: 5px 8px; border-radius: 4px; margin-bottom: 6px;">
            <strong>Fungsi:</strong> ${feature.properties.fungsi_ekosistem}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
            <div>Kedalaman: <strong>${feature.properties.kedalaman_rata_m}m</strong></div>
            <div>Luas: <strong>${feature.properties.luas_ha.toLocaleString("id-ID")} Ha</strong></div>
          </div>
          <div style="margin-top: 6px; font-size: 10.5px; color: #475569; border-top: 1px solid #E2E8F0; padding-top: 5px;">
            Ambang Kritis BRGM: <strong>${feature.properties.ambang_muka_air_cm} cm</strong>
          </div>
        </div>
      `;

      polygon.bindPopup(popupContent);
      khgGroup.addLayer(polygon);
    });
  }, [showKhgLayer]);

  // render pin marker petak pemulihan saat filter atau data berubah ---------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    filteredPlots.forEach((plot) => {
      const coords: [number, number] = [
        plot.geometry.coordinates[1],
        plot.geometry.coordinates[0],
      ];
      const isSelected = selectedPlot?.id === plot.id;
      const color = getRecoveryMarkerColor(plot.properties.latest_status);

      const pinIcon = L.divIcon({
        className: "recovery-pin-wrapper",
        html: `
          <div class="recovery-marker-dot ${isSelected ? "selected" : ""}" style="background-color: ${color};" title="${plot.properties.name} (${plot.properties.survival_rate}%)">
            <span class="dot-inner"></span>
            ${isSelected ? '<span class="recovery-ping-ring" style="border-color: ' + color + ';"></span>' : ""}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(coords, { icon: pinIcon });
      marker.on("click", () => {
        setSelectedPlot(plot);
        map.panTo(coords, { animate: true });
      });

      markersGroup.addLayer(marker);
    });

    // animasi terbang (flyTo) halus saat wilayah filter dipilih
    const targetConfig = REGION_COORDINATES[selectedRegion as RegionKey];
    if (targetConfig) {
      map.flyTo(targetConfig.center, targetConfig.zoom, { duration: 1.2 });
    } else if (filteredPlots.length > 0 && selectedRegion !== "all") {
      const firstCoord: [number, number] = [
        filteredPlots[0].geometry.coordinates[1],
        filteredPlots[0].geometry.coordinates[0],
      ];
      map.flyTo(firstCoord, 9, { duration: 1.2 });
    }

    // sinkronisasi petak aktif pertama bila petak sebelumnya keluar dari filter
    if (filteredPlots.length > 0) {
      const stillInList = filteredPlots.some((p) => p.id === selectedPlot?.id);
      if (!stillInList) {
        setSelectedPlot(filteredPlots[0]);
      }
    }
  }, [filteredPlots, selectedRegion, selectedPlot?.id]);

  return (
    <section className="recovery-section" aria-labelledby="recovery-map-title">
      {/* 1. header pengantar menu bukti pulih ---------------------------------- */}
      <div className="section-head-card">
        <div>
          <span className="live-status-pill green">
            <span className="pulse-dot green"></span>
            lahan pasca-karhutla dalam rehabilitasi terverifikasi
          </span>
          <h2 id="recovery-map-title" className="section-title-large">
            Peta Kawasan Pemulihan & Sekat Kanal Gambut
          </h2>
          <p className="section-subtitle-text">
            Pantau sebaran petak tanah yang telah padam dan kini sedang ditanami bibit serta dibasahi
            melalui sekat kanal di 6 provinsi rawan karhutla BNPB. Klik titik petak untuk melihat rincian kelompok tani pengelola dan rasio hidup bibit.
          </p>
        </div>
      </div>

      {/* 2. bilah filter horizontal multi-provinsi ------------------------------ */}
      <div className="recovery-filter-container">
        <div className="recovery-filter-label-row">
          <span className="filter-label-text">
            PILIH PROVINSI PEMULIHAN:
          </span>
          <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
            Menampilkan {filteredPlots.length} dari {plots.features.length} Petak Nasional
          </span>
        </div>

        <div className="recovery-region-scroll-pills" role="tablist" aria-label="Filter Wilayah Restorasi">
          {REGION_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? plots.features.length
                : plots.features.filter((p) => matchRegion(p.properties.region, tab.key)).length;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selectedRegion === tab.key}
                className={`recovery-region-pill ${selectedRegion === tab.key ? "active" : ""}`}
                onClick={() => onSelectRegion(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="pill-count-badge">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. banner ringkasan metrik provinsi terpilih ---------------------------- */}
      <div className="recovery-prov-summary-card">
        <div className="prov-summary-main">
          <div>
            <span className="prov-summary-eyebrow">RINGKASAN WILAYAH AKTIF</span>
            <h3 className="prov-summary-title">{regionStats.provinceLabel}</h3>
          </div>
          <span className={`prov-wetland-badge ${regionStats.isGambut ? "gambut" : "mineral"}`}>
            {regionStats.isGambut ? "Kubah Gambut & Sekat Kanal" : "Hutan Kota & Koridor Hijau"}
          </span>
        </div>

        <div className="prov-metrics-strip">
          <div className="prov-metric-item">
            <span className="prov-metric-lbl">Petak Terdaftar</span>
            <span className="prov-metric-val">{regionStats.totalPlots} <span style={{ fontSize: "11px" }}>Zona</span></span>
          </div>
          <div className="prov-metric-item">
            <span className="prov-metric-lbl">Pohon Hidup</span>
            <span className="prov-metric-val" style={{ color: "var(--stamp)" }}>
              {formatId(regionStats.totalAlive)} <span style={{ fontSize: "11px" }}>Pohon</span>
            </span>
          </div>
          <div className="prov-metric-item">
            <span className="prov-metric-lbl">Survival Rate Rata-rata</span>
            <span className="prov-metric-val" style={{ color: Number(regionStats.avgSurvival) >= 80 ? "var(--stamp)" : "#D97706" }}>
              {regionStats.avgSurvival}%
            </span>
          </div>
          <div className="prov-metric-item">
            <span className="prov-metric-lbl">Kondisi Dominan</span>
            <span className="prov-metric-val" style={{ fontSize: "13px" }}>
              {regionStats.suburCount} Petak Subur
            </span>
          </div>
        </div>
      </div>

      {/* 4. kanvas peta pemulihan & bottom sheet -------------------------------- */}
      <div className="map-container-card">
        <div className="card-header-clean">
          <div className="card-title-text">
            <span>Koordinat Petak Restorasi Terverifikasi (OpenStreetMap)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn-toggle-khg ${showKhgLayer ? "active" : ""}`}
              onClick={() => setShowKhgLayer(!showKhgLayer)}
              title="Tampilkan atau sembunyikan batas poligon Kesatuan Hidrologis Gambut (KHG) BRGM"
            >
              <span className="khg-dot-indicator" />
              <span>Kubah Gambut BRGM {showKhgLayer ? "Aktif" : "Nonaktif"}</span>
            </button>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "rgba(14, 117, 59, 0.1)",
                color: "var(--stamp)",
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              Bebas Kuota API • Ramah Bandwidth Rendah
            </span>
          </div>
        </div>

        {/* penanda jika petak terpilih berada tepat di dalam zona khg brgm */}
        {selectedPlot && selectedPlotKhg && (
          <div className="khg-spot-indicator-box">
            <span className="khg-spot-icon">🛡️</span>
            <div className="khg-spot-text">
              <span>
                Petak <strong>{selectedPlot.properties.name}</strong> berada di zona{" "}
                <strong>{selectedPlotKhg.nama_khg}</strong> ({selectedPlotKhg.fungsi_ekosistem}).
              </span>
              <span className="khg-spot-sub">
                SK MenLHK: {selectedPlotKhg.sk_menlhk} • Ambang batas kering kritis BRGM:{" "}
                <strong>{selectedPlotKhg.ambang_muka_air_cm} cm</strong>
              </span>
            </div>
          </div>
        )}

        <div className="leaflet-map-wrapper">
          <div ref={mapContainerRef} style={{ width: "100%", height: "480px" }} />
        </div>

        {/* bottom sheet rincian petak terpilih ---------------------------------- */}
        <PlotBottomSheet
          plot={selectedPlot}
          onClose={() => setSelectedPlot(null)}
          onFilterTimelineByPlot={(code) => {
            if (onNavigateToForumWithPlot) {
              onNavigateToForumWithPlot(code);
            }
          }}
        />
      </div>
    </section>
  );
};
