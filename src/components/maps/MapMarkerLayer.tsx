// Todo:
// -> draw map markers and clusters on a bounded canvas
// -> support pointer and keyboard selection
"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as TerrainMap } from "maplibre-gl";
import type { ExplorerMapApi } from "@/types/explorer-map";
import { paintMarker, projectMarkers, type ExplorerMarker, type ScreenMarker } from "./map-markers";
export type { ExplorerMarker } from "./map-markers";

// --- Marker interaction ---
export function MapMarkerLayer({ api, markers, onSelect, language, cluster = false, lowGraphics = false }: {
  api: ExplorerMapApi | null; markers: ExplorerMarker[]; onSelect: (id: string) => void; language: "id" | "en"; cluster?: boolean; lowGraphics?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), [announcement, setAnnouncement] = useState("");
  const actions = useRef<{ cycle: (step: number) => void; choose: () => void } | null>(null);
  useEffect(() => {
    const node = canvas.current, context = node?.getContext("2d"); if (!node || !context) return;
    context.clearRect(0,0,node.width,node.height); if(!api)return;
    let frame = 0, disposed = false, targets: ScreenMarker[] = [], active: string | null = null, expanded: string | null = null;
    let lastView="",force=true,lastDraw=0;
    const draw = () => {
      frame = 0; if (disposed) return;
      const { width, height } = api.getSize(), view=api.getView(), viewKey=JSON.stringify([view,width,height]);
      if(!force&&viewKey===lastView)return;
      if(!force&&performance.now()-lastDraw<(lowGraphics?40:16)){frame=requestAnimationFrame(draw);return;}
      force=false;lastView=viewKey;lastDraw=performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, lowGraphics?1:2);
      if (node.width !== Math.round(width * dpr) || node.height !== Math.round(height * dpr)) { node.width = Math.round(width * dpr); node.height = Math.round(height * dpr); }
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
      targets = projectMarkers(api, markers, cluster, expanded);
      for (const item of targets) paintMarker(context, item, view.bearing, document.activeElement === node && active === item.marker.id);
    };
    const queue = () => { if (!frame && !disposed) frame = requestAnimationFrame(draw); };
    const focusChanged=()=>{force=true;queue();};
    const choose = (item: ScreenMarker) => {
      if (!item.members) { onSelect(item.marker.id); return; }
      if (api.getView().zoom < 19) api.moveTo(item.marker.point, Math.min(api.engine === "terrain" ? 19 : 20, api.getView().zoom + 2));
      else { expanded = expanded === item.marker.id ? null : item.marker.id; force=true;queue(); }
    };
    actions.current = {
      cycle: step => {
        if (!targets.length) return;
        const index = targets.findIndex(item => item.marker.id === active), item = targets[(index + step + targets.length) % targets.length];
        active = item.marker.id; setAnnouncement(item.marker.label); force=true;queue();
      },
      choose: () => { const item = targets.find(item => item.marker.id === active); if (item) choose(item); },
    };
    const offClick = api.onClick(({ pixel }) => {
      const hit = [...targets].reverse().find(item => Math.hypot(item.x - pixel.x, item.y - (item.marker.kind === "pin" || item.marker.kind === "report" ? pixel.y + 16 : pixel.y)) < (item.marker.kind === "dot" ? 13 : 24));
      if (hit) {choose(hit);return true;}
    },10);
    const surface=api.engine==="terrain"?api.native as TerrainMap:null;
    const googleIdle=api.engine==="google"?(api.native as google.maps.Map).addListener("idle",focusChanged):null;
    const surfaceChanged=(event:{sourceId?:string})=>{if(event.sourceId==="elevation"){force=true;queue();}};
    surface?.on("sourcedata",surfaceChanged);
    const offChange = api.subscribe(queue); node.addEventListener("focus", focusChanged); node.addEventListener("blur", focusChanged); queue();
    return () => { disposed = true; cancelAnimationFrame(frame); offClick(); offChange();googleIdle?.remove();surface?.off("sourcedata",surfaceChanged); node.removeEventListener("focus", focusChanged); node.removeEventListener("blur", focusChanged); actions.current = null;context.clearRect(0,0,node.width,node.height); };
  }, [api, markers, cluster, onSelect,lowGraphics]);
  return <><canvas ref={canvas} data-map-markers tabIndex={markers.length ? 0 : -1} role="group"
    aria-label={language === "en" ? "Map markers. Use arrow keys to browse, Enter to select." : "Penanda peta. Gunakan tombol panah untuk menjelajah, Enter untuk memilih."}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
    onKeyDown={event => { if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); if (event.key === "Enter" || event.key === " ") actions.current?.choose(); else actions.current?.cycle(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1); } }} />
    <span role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{announcement}</span></>;
}
// --- end of Marker interaction ---
