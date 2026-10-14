// src/components/RestorationMap.tsx
// -> komponen peta interaktif restorasi berbasis leaflet.js & openstreetmap
//      -> inisialisasi peta ramah perangkat ringan (low-render client)
//      -> penanda marker status pohon (hijau subur vs kuning perlu rawat)
//      -> interaksi klik untuk membuka bottom sheet detail petak

"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { PlotFeature, PlotFeatureCollection } from "@/types";
import { matchRegion } from "@/utils/plotDisplay";

interface RestorationMapProps {
  plots: PlotFeatureCollection;
  selectedPlot: PlotFeature | null;
  onSelectPlot: (plot: PlotFeature) => void;
  selectedRegion: string;
}

export const RestorationMap: React.FC<RestorationMapProps> = ({
  plots,
  selectedPlot,
  onSelectPlot,
  selectedRegion,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // inisialisasi peta -------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // inisialisasi instance peta jika belum ada
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-1.5, 110.5], // sentral kepulauan indonesia / kalimantan
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false, // cegah scroll fatigue di ponsel
      });

      // tile layer openstreetmap (zero cost & bebas kuota api)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // cleanup instance saat unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);
  // end of inisialisasi peta -------------------------------------------------------

  // sinkronisasi markers data -----------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const filteredFeatures = plots.features.filter((feature) =>
      matchRegion(feature.properties.region, selectedRegion)
    );

    const bounds = L.latLngBounds([]);

    filteredFeatures.forEach((plot) => {
      const [lng, lat] = plot.geometry.coordinates;
      const isSelected = selectedPlot?.id === plot.id;
      const isSubur = plot.properties.latest_status === "subur";

      const pinColor = isSubur ? "#0E753B" : "#D97706";
      const iconHtml = `
        <div style="
          background-color: ${pinColor};
          color: #ffffff;
          width: ${isSelected ? "34px" : "28px"};
          height: ${isSelected ? "34px" : "28px"};
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(11, 13, 59, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
          transition: transform 0.2s ease;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on("click", () => {
        onSelectPlot(plot);
      });

      marker.addTo(markersGroup);
      bounds.extend([lat, lng]);
    });

    if (filteredFeatures.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    }
  }, [plots, selectedPlot, selectedRegion, onSelectPlot]);
  // end of sinkronisasi markers data -----------------------------------------------

  return (
    <div className="leaflet-map-wrapper">
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      />
    </div>
  );
};
