// Leaflet map for restoration plots and satellite observations. One instance survives expansion.
"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { PlotFeature, PlotFeatureCollection } from "@/types";
import type { HotspotObservation, MapBounds } from "@/types/environment";
import { matchRegion, REGION_COORDINATES, RegionKey, STATUS_DISPLAY } from "@/utils/plotDisplay";

interface RestorationMapProps {
  plots: PlotFeatureCollection;
  selectedPlot: PlotFeature | null;
  onSelectPlot: (plot: PlotFeature) => void;
  selectedRegion: string;
  hotspots?: HotspotObservation[];
  showPlots?: boolean;
  onSelectHotspot?: (point: HotspotObservation) => void;
  onSelectLocation?: (coordinates: [number, number]) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onTileError?: () => void;
}
export function RestorationMap(props: RestorationMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<L.Map | null>(null);
  const plotsLayer = useRef<L.LayerGroup | null>(null);
  const hotspotLayer = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef(props);
  useEffect(() => { callbacks.current = props; });

  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current, {
      center: [-1.5, 112], zoom: 5, minZoom: 3, maxZoom: 18,
      scrollWheelZoom: false, preferCanvas: true,
      maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1,
    });
    instance.current = map;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19, noWrap: true,
    }).addTo(map);
    tiles.on("tileerror", () => callbacks.current.onTileError?.());
    plotsLayer.current = L.layerGroup().addTo(map);
    hotspotLayer.current = L.layerGroup().addTo(map);
    const reportBounds = () => {
      const b = map.getBounds();
      callbacks.current.onBoundsChange?.([
        Math.max(-180, b.getWest()), Math.max(-90, b.getSouth()),
        Math.min(180, b.getEast()), Math.min(90, b.getNorth()),
      ].map(n => Number(n.toFixed(4))) as MapBounds);
    };
    map.on("moveend", reportBounds);
    map.on("click", (event: L.LeafletMouseEvent) => callbacks.current.onSelectLocation?.([event.latlng.lat, event.latlng.lng]));
    reportBounds();
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(element.current);
    return () => { observer.disconnect(); map.remove(); instance.current = null; };
  }, []);

  useEffect(() => {
    const target = REGION_COORDINATES[props.selectedRegion as RegionKey] ?? REGION_COORDINATES.all;
    if (props.selectedRegion === "all") {
      const centers = Object.entries(REGION_COORDINATES).filter(([key]) => key !== "all").map(([, value]) => value.center);
      instance.current?.fitBounds(L.latLngBounds(centers), { padding: [32, 32], maxZoom: target.zoom });
    } else instance.current?.setView(target.center, target.zoom);
  }, [props.selectedRegion]);

  useEffect(() => {
    const layer = plotsLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (props.showPlots === false) return;
    for (const plot of props.plots.features.filter(p => matchRegion(p.properties.region, props.selectedRegion))) {
      const [lon, lat] = plot.geometry.coordinates;
      const marker = L.marker([lat, lon], {
        title: plot.properties.name, alt: plot.properties.name, bubblingMouseEvents: false,
        icon: L.divIcon({ className: "overview-plot-pin", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] }),
      });
      marker.on("click", () => callbacks.current.onSelectPlot(plot));
      const label = document.createElement("span");
      label.textContent = `${plot.properties.plot_code} - ${STATUS_DISPLAY[plot.properties.latest_status].label}`;
      marker.bindTooltip(label);
      marker.addTo(layer);
    }
  }, [props.plots, props.selectedRegion, props.showPlots]);

  useEffect(() => {
    const layer = hotspotLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const point of props.hotspots ?? []) {
      L.circleMarker(point.coordinates, {
        radius: point.confidence === "high" ? 6 : 4, color: "#a23716", weight: 1,
        fillColor: "#e66b32", fillOpacity: 0.8, bubblingMouseEvents: false,
      }).on("click", () => callbacks.current.onSelectHotspot?.(point)).addTo(layer);
    }
  }, [props.hotspots]);

  return <div ref={element} className="overview-leaflet" aria-label="Peta titik panas dan petak pemulihan" />;
}
