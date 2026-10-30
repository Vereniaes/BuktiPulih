// Todo:
// -> Render one Google map or satellite terrain canvas at a time.
// -> Keep the camera and overlay contract stable when switching views.
// -> Report unavailable map data and release browser resources.
"use client";

// --- Renderer adapters ---
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import type { Map as TerrainMap, StyleSpecification } from "maplibre-gl";
import { googleLibrary, GOOGLE_MAPS_AUTH_ERROR } from "@/lib/google-maps";
import type { ExplorerBounds, ExplorerCamera, ExplorerClick, ExplorerClickListener, ExplorerMapApi, ExplorerMode } from "@/types/explorer-map";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./explorer-map.module.css";
import { createTerrainImagery } from "./terrain-imagery";

interface Props {
  mode: ExplorerMode;
  language: "id" | "en";
  lowGraphics?: boolean;
  initialView?: ExplorerCamera;
  onReady: (api: ExplorerMapApi | null) => void;
  onBoundsChange?: (bounds: ExplorerBounds) => void;
  onModeChange?: (mode: ExplorerMode) => void;
}
const initialCamera: ExplorerCamera = { center: [118, -2.5], zoom: 5, pitch: 45, bearing: 0 };
const indonesia: ExplorerBounds = [93, -13, 143, 8];
const duration = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;

/** Purpose: Adapt Google camera methods. Input: map and event sets. Output: shared map API. */
function googleAdapter(map: google.maps.Map, overlay: google.maps.OverlayView, node: HTMLElement,
  listeners: Set<() => void>, clicks: Map<ExplorerClickListener, number>): ExplorerMapApi {
  return {
    engine: "google", native: map,
    getView: () => { const center = map.getCenter(); return { center: center ? [center.lng(), center.lat()] : initialCamera.center, zoom: map.getZoom() ?? 5, pitch: 0, bearing: 0 }; },
    getBounds: () => { const bounds = map.getBounds(); return bounds ? [bounds.getSouthWest().lng(), bounds.getSouthWest().lat(), bounds.getNorthEast().lng(), bounds.getNorthEast().lat()] : indonesia; },
    moveTo: (point, zoom = map.getZoom() ?? 5, offset) => {
      let center: google.maps.LatLngLiteral | google.maps.LatLng = { lng: point[0], lat: point[1] };
      const projection = map.getProjection(), world = projection?.fromLatLngToPoint(center);
      if (offset && world && projection) center = projection.fromPointToLatLng(new google.maps.Point(world.x - offset[0] / 2 ** zoom, world.y - offset[1] / 2 ** zoom)) ?? center;
      map.moveCamera({ center, zoom, tilt: 0, heading: 0 });
    },
    fitBounds: (bounds, padding, maxZoom) => {
      if (maxZoom !== undefined) google.maps.event.addListenerOnce(map, "idle", () => { if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom); });
      map.fitBounds({ west: bounds[0], south: bounds[1], east: bounds[2], north: bounds[3] }, padding ?? 28);
    },
    project: point => { const pixel = overlay.getProjection()?.fromLatLngToContainerPixel({ lng: point[0], lat: point[1] }); return pixel ? { x: pixel.x, y: pixel.y } : { x: NaN, y: NaN }; },
    unproject: pixel => { const point = overlay.getProjection()?.fromContainerPixelToLatLng(new google.maps.Point(pixel.x, pixel.y)); return point ? [point.lng(), point.lat()] : initialCamera.center; },
    getSize: () => ({ width: node.clientWidth, height: node.clientHeight }),
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onClick: (listener, priority = 0) => { clicks.set(listener, priority); return () => { clicks.delete(listener); }; },
  };
}

/** Purpose: Adapt terrain camera methods. Input: map and event sets. Output: shared map API. */
function terrainAdapter(map: TerrainMap, node: HTMLElement, listeners: Set<() => void>,
  clicks: Map<ExplorerClickListener, number>): ExplorerMapApi {
  return {
    engine: "terrain", native: map,
    getView: () => ({ center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }),
    getBounds: () => { const bounds = map.getBounds(); return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]; },
    moveTo: (center, zoom = map.getZoom(), offset) => { map.easeTo({ center, zoom: Math.min(19, zoom), offset: offset ?? [0, 0], duration: duration() }); },
    fitBounds: (bounds, padding, maxZoom = 19) => { map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: padding ?? 28, maxZoom, duration: duration() }); },
    project: point => { const pixel = map.project(point); return { x: pixel.x, y: pixel.y }; },
    unproject: pixel => map.unproject([pixel.x, pixel.y]).toArray(),
    getSize: () => ({ width: node.clientWidth, height: node.clientHeight }),
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onClick: (listener, priority = 0) => { clicks.set(listener, priority); return () => { clicks.delete(listener); }; },
  };
}
function dispatchClick(listeners: Map<ExplorerClickListener, number>, event: ExplorerClick) {
  for (const [listener] of [...listeners].sort((a, b) => b[1] - a[1])) if (listener(event) === true) break;
}
// --- end of Renderer adapters ---

// --- Terrain sources ---
const terrainStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    imagery: { type: "raster", tileSize: 256, maxzoom: 19,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      attribution: 'Imagery &copy; Esri, Vantor, Earthstar Geographics, GIS User Community' },
    elevation: { type: "raster-dem", tileSize: 512, encoding: "terrarium", maxzoom: 12,
      tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"],
      attribution: 'Terrain &copy; <a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">Mapterhorn</a>' },
    water: { type: "vector", url: "https://tiles.openfreemap.org/planet",
      attribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> &middot; OpenMapTiles &middot; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>' },
  },
  terrain: { source: "elevation", exaggeration: 1.5 },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#173f47" } },
    { id: "satellite", type: "raster", source: "imagery", paint: { "raster-saturation": -.08 } },
    { id: "ocean", type: "fill", source: "water", "source-layer": "water", minzoom: 7,
      filter: ["==", ["get", "class"], "ocean"], paint: { "fill-color": "#173f47", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 10, 1] } },
    { id: "lakes", type: "fill", source: "water", "source-layer": "water", minzoom: 7,
      filter: ["in", ["get", "class"], ["literal", ["lake", "river"]]], paint: { "fill-color": "#72bcc6", "fill-opacity": .15 } },
    { id: "rivers", type: "line", source: "water", "source-layer": "waterway", minzoom: 8,
      filter: ["all", ["in", ["get", "class"], ["literal", ["river", "stream"]]], ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#9dd8d7", "line-opacity": .6, "line-width": ["interpolate", ["linear"], ["zoom"], 8, .5, 14, 1.8] } },
    { id: "mountains", type: "symbol", source: "water", "source-layer": "mountain_peak", minzoom: 10,
      filter: ["all", ["has", "name"], [">=", ["to-number", ["get", "ele"], 0], 2000]],
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-padding": 40 },
      paint: { "text-color": "#f3f3de", "text-halo-color": "#173124", "text-halo-width": 1.5 } },
  ],
};
// --- end of Terrain sources ---

// --- Renderer lifecycle ---
/** Purpose: Render the selected map. Input: view settings and callbacks. Output: canvas and ready adapter. */
export function ExplorerMap(props: Props) {
  const view = props.initialView ?? initialCamera;
  const camera = useRef<ExplorerCamera>(view), terrainView = useRef({ pitch: view.pitch || 45, bearing: view.bearing });
  return <MapRenderer key={props.mode === "terrain" ? "terrain" : "google"} {...props} camera={camera} terrainView={terrainView} />;
}

function MapRenderer({ mode, language, lowGraphics = false, onReady, onBoundsChange, onModeChange, camera, terrainView }: Props & {
  camera: RefObject<ExplorerCamera>; terrainView: RefObject<{ pitch: number; bearing: number }>;
}) {
  const node = useRef<HTMLDivElement>(null), apiRef = useRef<ExplorerMapApi | null>(null);
  const imageryRef = useRef<ReturnType<typeof createTerrainImagery> | null>(null);
  const [imageryPending, setImageryPending] = useState(mode === "terrain");
  const [attempt, setAttempt] = useState(0), [status, setStatus] = useState<{ engine: string; state: "ready" | "error" | "partial" } | null>(null);
  const terrain = mode === "terrain", engine = terrain ? "terrain" : "google";
  const en = language === "en";
  const publish = useEffectEvent((api: ExplorerMapApi | null) => onReady(api));
  const boundsChanged = useEffectEvent((bounds: ExplorerBounds) => onBoundsChange?.(bounds));
  const settings = useEffectEvent(() => ({ mode, lowGraphics }));

  useEffect(() => {
    const canvas = node.current; if (!canvas) return;
    let cancelled = false, dispose = () => {}, resize: ResizeObserver | undefined;
    let loaded = false, dataFailed = false;
    const listeners = new Set<() => void>(), clicks = new Map<ExplorerClickListener, number>();
    const notify = () => { if (!cancelled) listeners.forEach(listener => listener()); };
    const changed = () => { if (!cancelled && apiRef.current) { camera.current = apiRef.current.getView(); notify(); boundsChanged(apiRef.current.getBounds()); } };
    const fail = () => { dataFailed = true; if (!cancelled) setStatus({ engine, state: loaded ? "partial" : "error" }); };
    const ready = (api: ExplorerMapApi) => {
      if (cancelled || loaded) return;
      loaded = true; apiRef.current = api;
      setStatus({ engine, state: dataFailed ? "partial" : "ready" }); publish(api); changed();
    };
    const timeout = window.setTimeout(() => { if (!loaded) fail(); }, 25000);
    if (!terrain) window.addEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);

    async function start(canvas: HTMLDivElement) {
      if (terrain) {
        const library = await import("maplibre-gl");
        if (cancelled) return;
        library.setWorkerCount(2);
        library.setMaxParallelImageRequests(settings().lowGraphics ? 8 : 16);
        library.setWorkerUrl("/vendor/maplibre-gl-worker-6.16.0.mjs");
        const imagery = createTerrainImagery(settings().lowGraphics ? 4 : 6); imageryRef.current = imagery;
        library.addProtocol(imagery.protocol, async (request, controller) => ({ data: await imagery.load(request.url, controller.signal) }));
        dispose = () => { imagery.dispose(); library.removeProtocol(imagery.protocol); imageryRef.current = null; };
        const style: StyleSpecification = { ...terrainStyle, sources: {
          baseImagery: { ...terrainStyle.sources.imagery, type: "raster", tiles: imagery.tiles, tileSize: 256, maxzoom: 12 }, ...terrainStyle.sources,
          imagery: { ...terrainStyle.sources.imagery, type: "raster", tiles: imagery.tiles, tileSize: 256, maxzoom: 19 } },
          layers: [terrainStyle.layers[0], { id: "base-satellite", type: "raster", source: "baseImagery", paint: { "raster-fade-duration": 0 } }, ...terrainStyle.layers.slice(1)] };
        const map = new library.Map({ container: canvas, center: camera.current.center, zoom: Math.min(19, camera.current.zoom),
          pitch: terrainView.current.pitch, bearing: terrainView.current.bearing, minZoom: 2.1, maxZoom: 19, maxPitch: 70,
          renderWorldCopies: false, pixelRatio: settings().lowGraphics ? 1 : Math.min(devicePixelRatio || 1, 2),
          maxTileCacheSize: settings().lowGraphics ? 64 : 128,
          canvasContextAttributes: { antialias: !settings().lowGraphics }, attributionControl: { compact: true }, style });
        const api = terrainAdapter(map, canvas, listeners, clicks);
        dispose = () => { imagery.dispose(); map.remove(); library.removeProtocol(imagery.protocol); imageryRef.current = null; };
        map.getCanvas().setAttribute("aria-label", "Indonesia terrain");
        map.getCanvas().addEventListener("webglcontextlost", fail);
        const imageProgress = () => {
          if (!cancelled && map.getSource("imagery")) setImageryPending(["baseImagery", "imagery"].some(id => !map.isSourceLoaded(id)));
        };
        map.on("style.load", () => ready(api)); map.on("sourcedata", imageProgress); map.on("idle", imageProgress); map.on("move", notify); map.on("render", notify); map.on("moveend", changed);
        map.on("click", event => dispatchClick(clicks, { point: event.lngLat.toArray(), pixel: { x: event.point.x, y: event.point.y } }));
        const failedSources = new Set<string>();
        map.on("error", event => {
          const sourceId = (event as { sourceId?: string }).sourceId;
          if (sourceId && ["baseImagery", "imagery", "elevation", "water"].includes(sourceId)) { failedSources.add(sourceId); fail(); }
          else if (!sourceId) fail();
        });
        map.on("sourcedata", event => {
          if (cancelled || event.sourceDataType !== "content" || !map.isSourceLoaded(event.sourceId)) return;
          failedSources.delete(event.sourceId);
          if (loaded && dataFailed && !failedSources.size) { dataFailed = false; setStatus({ engine, state: "ready" }); }
        });
        resize = new ResizeObserver(() => { if (!cancelled) { map.resize(); changed(); } });
      } else {
        const maps = await googleLibrary("maps");
        if (cancelled) return;
        const map = new maps.Map(canvas, { center: { lng: camera.current.center[0], lat: camera.current.center[1] }, zoom: camera.current.zoom,
          mapTypeId: settings().mode === "satellite" ? "satellite" : "roadmap", tilt: 0, heading: 0, minZoom: 3, maxZoom: 21,
          disableDefaultUI: true, clickableIcons: false, gestureHandling: "greedy", keyboardShortcuts: true, isFractionalZoomEnabled: true,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID" });
        const overlay = new google.maps.OverlayView(), api = googleAdapter(map, overlay, canvas, listeners, clicks);
        overlay.onAdd = () => {}; overlay.onRemove = () => {};
        overlay.draw = () => { if (overlay.getProjection()) { ready(api); notify(); } };
        overlay.setMap(map);
        map.addListener("idle", changed);
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) { const point: [number, number] = [event.latLng.lng(), event.latLng.lat()]; dispatchClick(clicks, { point, pixel: api.project(point) }); }
        });
        dispose = () => { overlay.setMap(null); google.maps.event.clearInstanceListeners(map); };
        resize = new ResizeObserver(() => { if (!cancelled) { google.maps.event.trigger(map, "resize"); changed(); } });
      }
      resize.observe(canvas);
    }
    void start(canvas).catch(fail);
    return () => {
      cancelled = true; window.clearTimeout(timeout); resize?.disconnect();
      window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR, fail);
      if (apiRef.current) { camera.current = apiRef.current.getView(); if (terrain) terrainView.current = { pitch: camera.current.pitch, bearing: camera.current.bearing }; }
      apiRef.current = null; publish(null); listeners.clear(); clicks.clear(); dispose(); canvas.replaceChildren();
    };
  }, [terrain, attempt, engine, camera, terrainView]);

  useEffect(() => {
    const api = apiRef.current;
    if (api?.engine === "google" && mode !== "terrain") (api.native as google.maps.Map).setMapTypeId(mode);
    if (api?.engine === "terrain") {
      (api.native as TerrainMap).setPixelRatio(lowGraphics ? 1 : Math.min(devicePixelRatio || 1, 2));
      imageryRef.current?.setLimit(lowGraphics ? 4 : 6);
    }
  }, [mode, lowGraphics]);

  const current = status?.engine === engine ? status.state : null;
  const retry = () => { setStatus(null); setImageryPending(terrain); setAttempt(value => value + 1); };
  return <div className={styles.renderer} data-map-engine={engine} aria-label={en ? "Interactive map" : "Peta interaktif"}>
    <div ref={node} className={styles.canvas} />
    {(!current || current === "ready" && imageryPending) && <span className={styles.loading} role="status">{current ? (en ? "Loading imagery…" : "Memuat citra…") : (en ? "Loading map…" : "Memuat peta…")}</span>}
    {(current === "error" || current === "partial") && <div className={styles.notice} role="status">
      <span>{en ? "Some map data could not load." : "Sebagian data peta belum dapat dimuat."}</span>
      <button type="button" onClick={retry}>{en ? "Try again" : "Coba lagi"}</button>
      {terrain && onModeChange && <button type="button" onClick={() => onModeChange("roadmap")}>{en ? "Use 2D map" : "Gunakan peta 2D"}</button>}
    </div>}
  </div>;
}
// --- end of Renderer lifecycle ---
