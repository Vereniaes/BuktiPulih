// Todo:
// -> Draw dated NASA imagery on Google and terrain maps.
// -> Clear missing pixels and share bounded native-resolution tiles.
// -> Update appearance without downloading the same imagery again.
"use client";

// --- Tile processing ---
import { useEffect, useEffectEvent, useRef } from "react";
import type { Map as TerrainMap } from "maplibre-gl";
import type { ExplorerMapApi } from "@/types/explorer-map";
import { IMAGERY_PRODUCTS } from "@/lib/mapImagery";
import { clearBlackFill } from "@/components/hazards/map-display";

export interface ImageryStatus { loading: boolean; error: boolean; empty: boolean; loaded: number; total: number; }
interface Props {
  api: ExplorerMapApi | null;
  product: string;
  date: string;
  opacity: number;
  brightness: number;
  contrast: number;
  lowGraphics: boolean;
  revision: number;
  onStatus: (status: ImageryStatus) => void;
}
interface TilePlacement { z: number; x: number; y: number; sx: number; sy: number; size: number; }
interface ProcessedTile { canvas: HTMLCanvasElement; visible: number; }
interface Progress { loaded: boolean; failed: boolean; visible: number; }
let sequence = 0;
const SIZE = 256;
const blankStatus: ImageryStatus = { loading: false, error: false, empty: false, loaded: 0, total: 0 };
const aborted = () => new DOMException("Imagery cancelled", "AbortError");

/** Purpose: Select a native parent tile and its exact overzoom crop.
 * Input: Requested XYZ tile and native zoom ceiling. Output: Parent coordinates and source pixels.
 */
export function imageryTile(x: number, y: number, zoom: number, nativeZoom: number): TilePlacement | null {
  if (![x, y, zoom].every(Number.isInteger) || zoom < 0 || zoom > 21 || y < 0 || y >= 2 ** zoom) return null;
  const width = 2 ** zoom, wrapped = (x % width + width) % width, z = Math.min(zoom, nativeZoom), scale = 2 ** (zoom - z);
  return { z, x: Math.floor(wrapped / scale), y: Math.floor(y / scale), sx: wrapped % scale * SIZE / scale, sy: y % scale * SIZE / scale, size: SIZE / scale };
}

function tileReader(product: string, date: string, low: boolean, controller: AbortController) {
  const cache = new Map<string, Promise<ProcessedTile>>();
  const queued: { run: () => void; reject: (error: Error) => void }[] = [];
  let running = 0;
  const limit = low ? 4 : 6, maximum = low ? 32 : 64;
  const next = () => { while (!controller.signal.aborted && running < limit && queued.length) queued.shift()!.run(); };
  const cancel = () => { queued.splice(0).forEach(task => task.reject(aborted())); cache.clear(); };
  controller.signal.addEventListener("abort", cancel, { once: true });
  return (tile: TilePlacement) => {
    const key = `${tile.z}/${tile.x}/${tile.y}`, saved = cache.get(key);
    if (saved) return saved;
    const job = new Promise<ProcessedTile>((resolve, reject) => {
      const run = () => {
        running++;
        void (async () => {
          const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${product}/default/${date}/GoogleMapsCompatible_Level9/${tile.z}/${tile.y}/${tile.x}.jpeg`;
          const response = await fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
          if (!response.ok) throw new Error("Imagery unavailable");
          const image = await createImageBitmap(await response.blob());
          try {
            if (controller.signal.aborted) throw aborted();
            const canvas = document.createElement("canvas"); canvas.width = canvas.height = SIZE;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error("Imagery canvas unavailable");
            context.drawImage(image, 0, 0, SIZE, SIZE);
            const pixels = context.getImageData(0, 0, SIZE, SIZE), visible = clearBlackFill(pixels.data);
            context.putImageData(pixels, 0, 0);
            return { canvas, visible };
          } finally { image.close(); }
        })().then(resolve, reject).finally(() => { running--; next(); });
      };
      if (controller.signal.aborted) reject(aborted());
      else { queued.push({ run, reject }); next(); }
    });
    if (cache.size >= maximum) cache.delete(cache.keys().next().value!);
    cache.set(key, job);
    return job;
  };
}

function png(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Imagery encoding failed")), "image/png")).then(blob => blob.arrayBuffer());
}
// --- end of Tile processing ---

// --- Renderer lifecycle ---
/** Purpose: Add transparent, progressively loaded NASA tiles to the active renderer.
 * Input: Shared map adapter, advertised product/date and appearance. Output: Source progress callbacks.
 */
export function MapImageryLayer({ api, product, date, opacity, brightness, contrast, lowGraphics, revision, onStatus }: Props) {
  const appearance = useEffectEvent(() => ({ opacity, brightness, contrast }));
  const publish = useEffectEvent((status: ImageryStatus) => onStatus(status));
  const updateStyle = useRef<() => void>(() => {});

  useEffect(() => {
    if (!api) return;
    const valid = IMAGERY_PRODUCTS.some(item => item.id === product) && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!valid) { publish({ ...blankStatus, error: true }); return; }
    const controller = new AbortController(), nativeZoom = lowGraphics ? 6 : 9;
    const read = tileReader(product, date, lowGraphics, controller);
    const entries = new Map<unknown, Progress>();
    let disposed = false, timer = 0, remove = () => {};
    const report = () => {
      if (disposed || timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        if (disposed) return;
        const tiles = [...entries.values()], loaded = tiles.filter(tile => tile.loaded).length, error = tiles.some(tile => tile.failed);
        publish({ loading: loaded < tiles.length, error, empty: tiles.length > 0 && loaded === tiles.length && !error && tiles.every(tile => tile.visible === 0), loaded, total: tiles.length });
      }, 0);
    };
    publish({ ...blankStatus, loading: true });

    if (api.engine === "google") {
      const map = api.native as google.maps.Map;
      const paint = () => {
        const values = appearance();
        for (const element of entries.keys() as MapIterator<HTMLCanvasElement>) {
          element.style.opacity = String(values.opacity / 100);
          element.style.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%)`;
        }
      };
      const layer: google.maps.MapType = {
        tileSize: new google.maps.Size(SIZE, SIZE), minZoom: 0, maxZoom: 21, projection: map.getProjection() ?? null, radius: 6378137,
        name: "NASA GIBS", alt: "NASA GIBS satellite imagery",
        getTile: (coordinate, zoom, ownerDocument) => {
          const canvas = ownerDocument.createElement("canvas"); canvas.width = canvas.height = SIZE;
          const tile = imageryTile(coordinate.x, coordinate.y, zoom, nativeZoom);
          if (!tile || disposed) return canvas;
          const progress: Progress = { loaded: false, failed: false, visible: 0 };
          entries.set(canvas, progress); paint(); report();
          void read(tile).then(parent => {
            if (disposed || !entries.has(canvas)) return;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Imagery canvas unavailable");
            context.drawImage(parent.canvas, tile.sx, tile.sy, tile.size, tile.size, 0, 0, SIZE, SIZE);
            progress.loaded = true;
            progress.visible = parent.visible === 0 ? 0 : context.getImageData(0, 0, SIZE, SIZE).data.some((value, index) => index % 4 === 3 && value > 0) ? 1 : 0;
            report();
          }).catch(() => {
            if (disposed || !entries.has(canvas)) return;
            progress.loaded = progress.failed = true; report();
          });
          return canvas;
        },
        releaseTile: element => { entries.delete(element); report(); },
      };
      map.overlayMapTypes.push(layer); updateStyle.current = paint;
      remove = () => {
        for (let index = map.overlayMapTypes.getLength() - 1; index >= 0; index--) if (map.overlayMapTypes.getAt(index) === layer) map.overlayMapTypes.removeAt(index);
      };
    } else {
      const map = api.native as TerrainMap, scheme = `bp-nasa-${++sequence}`, sourceId = `${scheme}-source`, layerId = `${scheme}-layer`;
      void import("maplibre-gl").then(library => {
        if (disposed) return;
        library.addProtocol(scheme, async (parameters, requestController) => {
          const match = parameters.url.match(new RegExp(`^${scheme}://tiles/(\\d+)/(\\d+)/(\\d+)$`));
          const tile = match ? imageryTile(Number(match[2]), Number(match[3]), Number(match[1]), nativeZoom) : null;
          if (!tile || tile.z !== Number(match![1]) || disposed) throw new Error("Invalid imagery tile");
          const key = `${tile.z}/${tile.x}/${tile.y}`, progress: Progress = { loaded: false, failed: false, visible: 0 };
          if (entries.size >= 128) entries.delete(entries.keys().next().value);
          entries.set(key, progress); report();
          try {
            const parent = await read(tile);
            if (disposed || requestController.signal.aborted) throw aborted();
            const data = await png(parent.canvas);
            if (disposed || requestController.signal.aborted) throw aborted();
            progress.loaded = true; progress.visible = parent.visible; report();
            return { data };
          } catch (error) {
            if (requestController.signal.aborted) entries.delete(key);
            else { progress.loaded = progress.failed = true; }
            report(); throw error;
          }
        });
        const paint = () => {
          if (disposed || !map.getLayer(layerId)) return;
          const values = appearance(), light = values.brightness / 100;
          map.setPaintProperty(layerId, "raster-opacity", values.opacity / 100);
          map.setPaintProperty(layerId, "raster-brightness-min", Math.max(0, light - 1));
          map.setPaintProperty(layerId, "raster-brightness-max", Math.min(1, light));
          map.setPaintProperty(layerId, "raster-contrast", Math.max(-1, Math.min(1, (values.contrast - 100) / 100)));
        };
        remove = () => {
          try { if (map.getLayer(layerId)) map.removeLayer(layerId); if (map.getSource(sourceId)) map.removeSource(sourceId); } catch { /* The parent renderer may already be removed. */ }
          library.removeProtocol(scheme);
        };
        map.addSource(sourceId, { type: "raster", tileSize: SIZE, minzoom: 0, maxzoom: nativeZoom,
          tiles: [`${scheme}://tiles/{z}/{x}/{y}`], attribution: '<a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noopener">NASA GIBS</a>' });
        const before = map.getStyle().layers?.find(layer => layer.id !== "background" && layer.id !== "satellite")?.id;
        map.addLayer({ id: layerId, type: "raster", source: sourceId, maxzoom: 18, paint: { "raster-fade-duration": 0 } }, before);
        updateStyle.current = paint; paint();
      }).catch(() => { if (!disposed) publish({ ...blankStatus, error: true }); });
    }
    return () => { disposed = true; window.clearTimeout(timer); controller.abort(); updateStyle.current = () => {}; remove(); entries.clear(); };
  }, [api, product, date, lowGraphics, revision]);

  useEffect(() => { updateStyle.current(); }, [opacity, brightness, contrast]);
  return null;
}
// --- end of Renderer lifecycle ---
