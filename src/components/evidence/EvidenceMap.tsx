// Explore Google Maps and keep the report pin separate from Street View browsing.
"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { googleLibrary, GOOGLE_MAPS_AUTH_ERROR } from "@/lib/google-maps";
import { validCoordinates } from "@/utils/recoveryEvidence";
import { MapIcon } from "../hazards/MapIcon";
import { StreetViewDialog } from "./StreetViewDialog";
import styles from "./evidence-form.module.css";
interface Props { value: [number, number] | null; onChange: (point: [number, number]) => void; onLocate: () => void; locating: boolean; language: "id" | "en"; }
export function EvidenceMap({ value, onChange, onLocate, locating, language }: Props) {
  const en = language === "en";
  const canvas = useRef<HTMLDivElement>(null), mapRef = useRef<google.maps.Map | null>(null), marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markerLibrary = useRef<google.maps.MarkerLibrary | null>(null);
  const [mode, setMode] = useState<"road" | "satellite">("road"), [expanded, setExpanded] = useState(false), [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [streetPoint, setStreetPoint] = useState<[number, number] | null>(null);
  const selectPoint = (point: [number, number]) => { if (validCoordinates(point)) onChange(point.map(n => Number(n.toFixed(6))) as [number, number]); };
  const pick = useEffectEvent(selectPoint);
  const viewOptions = useEffectEvent(() => ({ mapTypeId: mode === "satellite" ? "satellite" : "roadmap", gestureHandling: expanded ? "greedy" : "cooperative" }));
  const syncPoint = useEffectEvent(() => {
    const map = mapRef.current, library = markerLibrary.current; if (!map || !library) return;
    if (!value) { if (marker.current) { google.maps.event.clearInstanceListeners(marker.current); marker.current.map = null; } marker.current = null; return; }
    const position = { lng: value[0], lat: value[1] };
    if (!marker.current) {
      marker.current = new library.AdvancedMarkerElement({ map, position, gmpDraggable: true });
      marker.current.append(new library.PinElement({ background: "#0e753b", borderColor: "#fffdf7", glyphColor: "#fffdf7" }));
      marker.current.addListener("dragend", (event: google.maps.MapMouseEvent) => { if (event.latLng) pick([event.latLng.lng(), event.latLng.lat()]); });
    } else marker.current.position = position;
    marker.current.title = en ? "Report location - drag to adjust" : "Titik laporan - geser untuk menyesuaikan";
    map.moveCamera({ center: position, zoom: Math.max(16, map.getZoom() ?? 5) });
  });
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    let cancelled = false, blocked = false, resize: ResizeObserver | undefined;
    const authError = () => { blocked = true; if (!cancelled) { setFailed(true); setReady(false); } };
    window.addEventListener(GOOGLE_MAPS_AUTH_ERROR, authError);
    Promise.all([googleLibrary("maps"), googleLibrary("marker")]).then(([maps, markers]) => {
      if (cancelled || blocked) return;
      const map = new maps.Map(node, { center: { lat: -2, lng: 118 }, zoom: 5, minZoom: 4, maxZoom: 21,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID", mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        cameraControl: false, zoomControl: true, zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }, clickableIcons: false,
        restriction: { latLngBounds: { north: 8, south: -13, west: 93, east: 143 } }, ...viewOptions(),
      });
      mapRef.current = map; markerLibrary.current = markers;
      map.addListener("click", (event: google.maps.MapMouseEvent) => { if (event.latLng) pick([event.latLng.lng(), event.latLng.lat()]); });
      map.addListener("idle", () => { if (!cancelled && !blocked) setReady(true); });
      resize = new ResizeObserver(() => { if (!cancelled) google.maps.event.trigger(map, "resize"); }); resize.observe(node);
      syncPoint();
    }).catch(authError);
    return () => {
      cancelled = true; resize?.disconnect(); window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR, authError);
      if (marker.current) { google.maps.event.clearInstanceListeners(marker.current); marker.current.map = null; }
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null; marker.current = null; markerLibrary.current = null; node.replaceChildren();
    };
  }, [attempt]);
  useEffect(() => { syncPoint(); }, [value, en]);
  useEffect(() => { mapRef.current?.setOptions(viewOptions()); }, [mode, expanded]);
  const streetView = () => { const center = mapRef.current?.getCenter(); if (center) setStreetPoint([center.lng(), center.lat()]); };
  return <div>
    <div className={`${styles.mapWrap} ${expanded ? styles.expandedMap : ""}`}>
      <div ref={canvas} className={styles.map} aria-label={en ? "Pick report location" : "Pilih titik laporan"} />
      <div className={styles.mapModes} role="group" aria-label={en ? "Map view" : "Tampilan peta"}>
        <button type="button" disabled={!ready} aria-pressed={mode === "road"} onClick={() => setMode("road")}>{en ? "Map" : "Peta"}</button>
        <button type="button" disabled={!ready} aria-pressed={mode === "satellite"} onClick={() => setMode("satellite")}>{en ? "Satellite" : "Satelit"}</button>
      </div>
      <div className={styles.mapTools}>
        <button type="button" onClick={onLocate} disabled={locating || !ready} aria-label={en ? "Use my location" : "Gunakan lokasi saya"} title={en ? "Use my location" : "Gunakan lokasi saya"}><MapIcon name="extent" /></button>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={en ? (expanded ? "Reduce map" : "Expand map") : (expanded ? "Perkecil peta" : "Perbesar peta")}><MapIcon name={expanded ? "close" : "expand"} /></button>
      </div>
      <button type="button" className={styles.streetViewButton} onClick={streetView} disabled={!ready}><MapIcon name="streetView" />Street View</button>
      {(!ready && !failed || locating) && <span className={styles.mapLoading}>{locating ? (en ? "Locating…" : "Mencari lokasi…") : (en ? "Loading map…" : "Memuat peta…")}</span>}
    </div>
    {failed && <p className={styles.mapError} role="status">{en ? "Google Maps could not load." : "Google Maps belum dapat dimuat."} <button type="button" onClick={() => { setAttempt(attempt + 1); setFailed(false); setReady(false); }}>{en ? "Try again" : "Coba lagi"}</button></p>}
    {streetPoint && <StreetViewDialog point={streetPoint} language={language} onClose={() => setStreetPoint(null)} onPick={point => { selectPoint(point); setStreetPoint(null); }} />}
  </div>;
}
