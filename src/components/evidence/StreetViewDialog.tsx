// Browse real Street View and select its current position only on explicit confirmation.
"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { googleLibrary, GOOGLE_MAPS_AUTH_ERROR } from "@/lib/google-maps";
import { keepDialogFocus } from "@/utils/dialogFocus";
import { validCoordinates } from "@/utils/recoveryEvidence";
import { MapIcon } from "../hazards/MapIcon";
import styles from "./evidence-form.module.css";
interface Props { point: [number, number]; language: "id" | "en"; onClose: () => void; onPick: (point: [number, number]) => void; }
export function StreetViewDialog({ point, language, onClose, onPick }: Props) {
  const en = language === "en", dialog = useRef<HTMLDialogElement>(null), canvas = useRef<HTMLDivElement>(null);
  const panorama = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading"), [attempt, setAttempt] = useState(0);
  const origin = useEffectEvent(() => ({ lng: point[0], lat: point[1] }));
  useEffect(() => {
    const node = dialog.current, opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    return () => { node?.close(); opener?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    let cancelled = false;
    const fail = () => { if (!cancelled) setStatus("error"); };
    window.addEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);
    googleLibrary("streetView").then(async library => {
      const result = await new library.StreetViewService().getPanorama({ location: origin(), radius: 250, preference: "nearest", sources: ["outdoor"] });
      if (cancelled) return;
      if (!result.data.location?.pano) { setStatus("empty"); return; }
      const view = new library.StreetViewPanorama(node, { pano: result.data.location.pano, visible: true, addressControl: false,
        fullscreenControl: false, enableCloseButton: false, motionTracking: false, motionTrackingControl: false, clickToGo: true, linksControl: true,
      });
      panorama.current = view;
      const update = () => { if (!cancelled) setStatus(view.getStatus() === "OK" && view.getPosition() ? "ready" : view.getStatus() === "ZERO_RESULTS" ? "empty" : view.getStatus() === "UNKNOWN_ERROR" ? "error" : "loading"); };
      view.addListener("status_changed", update); view.addListener("position_changed", update);
      if (view.getStatus() === "OK" && view.getPosition()) update();
    }).catch(error => { if (!cancelled) setStatus(error?.code === "ZERO_RESULTS" ? "empty" : "error"); });
    return () => {
      cancelled = true; window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);
      if (panorama.current) { google.maps.event.clearInstanceListeners(panorama.current); panorama.current.setVisible(false); }
      panorama.current = null; node.replaceChildren();
    };
  }, [attempt]);
  const choose = () => {
    const position = panorama.current?.getPosition(); if (!position || status !== "ready") return;
    const point: [number, number] = [position.lng(), position.lat()]; if (validCoordinates(point)) onPick(point);
  };
  return <dialog ref={dialog} className={styles.streetDialog} onKeyDown={keepDialogFocus} aria-label="Street View" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <header className={styles.streetHeader}><button type="button" onClick={onClose} aria-label={en ? "Back to map" : "Kembali ke peta"}><MapIcon name="back" />{en ? "Back" : "Kembali"}</button><h2>Street View</h2></header>
    <div className={styles.streetCanvasWrap}>
      <div ref={canvas} inert={status !== "ready"} className={styles.streetCanvas} aria-label={en ? "Explore Street View" : "Jelajahi Street View"} />
      {status !== "ready" && <div className={styles.streetMessage} role="status"><p>{status === "empty" ? (en ? "Street View is unavailable at this point." : "Street View belum tersedia di titik ini.") : status === "error" ? (en ? "Street View could not load." : "Street View belum dapat dimuat.") : (en ? "Loading Street View…" : "Memuat Street View…")}</p>{status === "error" && <button type="button" onClick={() => { dialog.current?.querySelector("button")?.focus(); setStatus("loading"); setAttempt(attempt + 1); }}>{en ? "Try again" : "Coba lagi"}</button>}</div>}
    </div>
    <footer className={styles.streetFooter}><button type="button" onClick={choose} disabled={status !== "ready"}>{en ? "Select this location" : "Pilih lokasi ini"}<MapIcon name="pin" /></button></footer>
  </dialog>;
}
