// Todo:
// -> Blend rain samples into a static cloud canvas.
// -> Redraw after map changes and expose pointer and keyboard details.
"use client";

// --- Static rain areas ---
import { useEffect, useRef, useState } from "react";
import type { Map as TerrainMap } from "maplibre-gl";
import type { ExplorerMapApi } from "@/types/explorer-map";
import type { RainResult } from "@/types/rain";
import { projectRainAreas, rainAreaAt, type RainArea } from "./rain-areas";
import { rainCloudStamp } from "./rain-cloud-stamp";
import styles from "./map-rain-layer.module.css";

/** Purpose: Draw coarse model rain without animation or per-sample DOM. Input: map, dated model and graphics budget. Output: one cloud canvas. */
export function MapRainLayer({ api, data, enabled, lowGraphics = false, onSelect, language }: {
  api: ExplorerMapApi | null; data: RainResult | null; enabled: boolean; lowGraphics?: boolean;
  onSelect: (id: string) => void; language: "id" | "en";
}) {
  const canvas = useRef<HTMLCanvasElement>(null), action = useRef<{ cycle(step: number): void; choose(): void } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const visible = enabled && !!api && !!data?.points.some(point => point.state === "now" || point.state === "recent");
  useEffect(() => {
    const node = canvas.current, context = node?.getContext("2d");
    if (!node || !context) return;
    context.clearRect(0, 0, node.width, node.height);
    if (!api || !enabled || !data) return;
    let frame = 0, timer = 0, demTimer = 0, lastDraw = 0, disposed = false, areas: RainArea[] = [], active = -1, previousView = "";
    const draw = () => {
      frame = 0; if (disposed) return;
      lastDraw = performance.now();
      const { width, height } = api.getSize(), dpr = Math.min(devicePixelRatio || 1, lowGraphics ? 1 : 1.25);
      if (node.width !== Math.round(width * dpr) || node.height !== Math.round(height * dpr)) { node.width = Math.round(width * dpr); node.height = Math.round(height * dpr); }
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
      areas = projectRainAreas(api, data);
      for (const area of areas) {
        context.save();
        context.transform(area.east.x, area.east.y, area.north.x, area.north.y, area.center.x, area.center.y);
        context.globalAlpha = area.strength * (area.point.state === "now" ? .9 : .72);
        context.drawImage(rainCloudStamp(area.point.state === "now"), -1.2, -1.2, 2.4, 2.4);
        context.restore();
      }
      if (document.activeElement === node && areas[active]) {
        const target = areas[active]; context.strokeStyle = "#d6f3ee"; context.lineWidth = 2; context.setLineDash([4, 4]);
        context.beginPath(); context.arc(target.center.x, target.center.y, 20, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
      }
    };
    const queue = () => {
      if (disposed || frame || timer) return;
      const delay = Math.max(0, (lowGraphics ? 40 : 25) - (performance.now() - lastDraw));
      if (delay) timer = window.setTimeout(() => { timer = 0; frame = requestAnimationFrame(draw); }, delay);
      else frame = requestAnimationFrame(draw);
    };
    action.current = {
      cycle: step => { if (!areas.length) return; active = (active + step + areas.length) % areas.length; const point = areas[active].point; setAnnouncement(point.state === "now" ? "Rain (Now)" : language === "en" ? "Recent rain, under 12 hours" : "Baru hujan, kurang dari 12 jam"); queue(); },
      choose: () => { if (areas[active]) onSelect(areas[active].point.id); },
    };
    const offClick = api.onClick(({ pixel }) => { const point = rainAreaAt(areas, pixel); if (point) onSelect(point.id); });
    const cameraChanged = () => {
      const view = api.getView(), size = api.getSize();
      const key = [...view.center, view.zoom, view.pitch, view.bearing, size.width, size.height].map(value => value.toFixed(5)).join(",");
      if (key !== previousView) { previousView = key; queue(); }
    };
    const offChange = api.subscribe(cameraChanged);
    const googleIdle=api.engine==="google"?(api.native as google.maps.Map).addListener("idle",queue):null;
    const terrain = api.engine === "terrain" ? api.native as TerrainMap : null;
    const refreshTerrain = (event: { sourceId?: string }) => {
      if (event.sourceId === "elevation" && !demTimer) demTimer = window.setTimeout(() => { demTimer = 0; queue(); }, 200);
    };
    terrain?.on("sourcedata", refreshTerrain);
    node.addEventListener("focus", queue); node.addEventListener("blur", queue); queue();
    return () => {
      disposed = true; cancelAnimationFrame(frame); window.clearTimeout(timer); window.clearTimeout(demTimer); offClick(); offChange();googleIdle?.remove(); terrain?.off("sourcedata", refreshTerrain); action.current = null;
      node.removeEventListener("focus", queue); node.removeEventListener("blur", queue); context.clearRect(0, 0, node.width, node.height);
    };
  }, [api, data, enabled, lowGraphics, onSelect, language]);
  return <><canvas ref={canvas} data-map-rain className={styles.canvas} tabIndex={visible ? 0 : -1} role="group"
    aria-label={language === "en" ? "Rain areas. Arrow keys browse, Enter opens details." : "Area hujan. Tombol panah untuk memilih, Enter untuk rincian."}
    onKeyDown={event => { if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); if (event.key === "Enter" || event.key === " ") action.current?.choose(); else action.current?.cycle(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1); } }} />
    <span className={styles.srOnly} role="status">{announcement}</span></>;
}
// --- end of Static rain areas ---
