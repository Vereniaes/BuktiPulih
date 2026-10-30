// Todo:
// -> Show mapped cover, approximate elevation, and loaded building context.
// -> Outline available OSM features without inventing tree or building heights.
"use client";

// --- Terrain context ---
import { useEffect, useId, useRef, useState } from "react";
import type { Map as TerrainMap, LayerSpecification } from "maplibre-gl";
import type { ExplorerMapApi, ExplorerPoint } from "@/types/explorer-map";
import { MapIcon } from "../hazards/MapIcon";
import { getTerrainContext, type MappedContext } from "./map-context";
import styles from "./terrain-context.module.css";

interface Props { api: ExplorerMapApi | null; point: ExplorerPoint; language: "id" | "en"; onClose: () => void; }
interface Snapshot { key: string; context: MappedContext; elevation: number | null; loading: boolean; }
const coverLabels: Record<string, [string, string]> = {
  wood: ["Pepohonan", "Tree cover"], forest: ["Hutan pada peta", "Mapped forest"], grass: ["Rumput", "Grass"],
  grassland: ["Padang rumput", "Grassland"], meadow: ["Padang rumput", "Meadow"], farmland: ["Lahan pertanian", "Farmland"],
  farm: ["Lahan pertanian", "Farmland"], orchard: ["Kebun", "Orchard"], scrub: ["Semak", "Scrub"],
  wetland: ["Lahan basah", "Wetland"], swamp: ["Rawa", "Swamp"], mangrove: ["Mangrove", "Mangrove"],
  rock: ["Batuan", "Rock"], bare_rock: ["Batuan terbuka", "Bare rock"], sand: ["Pasir", "Sand"],
  park: ["Taman", "Park"], garden: ["Kebun", "Garden"], ice: ["Es", "Ice"], glacier: ["Gletser", "Glacier"],
};

/** Purpose: Inspect a terrain point. Input: active terrain map and coordinates. Output: read-only context and optional map outlines. */
export function TerrainContext({ api, point, language, onClose }: Props) {
  const en = language === "en", t = (id: string, english: string) => en ? english : id;
  const title = useRef<HTMLHeadingElement>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [coverVisible, setCoverVisible] = useState(true), [buildingsVisible, setBuildingsVisible] = useState(true);
  const prefix = "context-" + useId().replaceAll(":", ""), key = point.join(",");
  useEffect(() => {
    if (api?.engine !== "terrain") return;
    const frame = requestAnimationFrame(() => title.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [api]);
  useEffect(() => {
    if (api?.engine !== "terrain") return;
    const map = api.native as TerrainMap;
    let timer = 0, disposed = false;
    const started = Date.now();
    const read = () => {
      if (disposed) return;
      try {
        const ready = !!map.getSource("water");
        const context = getTerrainContext(point, {
          landcover: ready ? map.querySourceFeatures("water", { sourceLayer: "landcover" }) : [],
          landuse: ready ? map.querySourceFeatures("water", { sourceLayer: "landuse" }) : [],
          building: ready ? map.querySourceFeatures("water", { sourceLayer: "building" }) : [],
        });
        const terrain = map.getTerrain(), scale = terrain?.exaggeration ?? 1;
        const raw = terrain && map.getSource(terrain.source) ? map.queryTerrainElevation(point) : null;
        const elevation = raw !== null && Number.isFinite(raw) && typeof scale === "number" && scale > 0 ? raw / scale : null;
        setSnapshot({ key, context, elevation, loading: Date.now() - started < 8000 && (!ready || !map.isSourceLoaded("water")) });
      } catch {
        setSnapshot({ key, context: { cover: null, residential: false, buildingDistance: null, limited: false }, elevation: null, loading: false });
      }
    };
    const schedule = () => { if (!timer) timer = window.setTimeout(() => { timer = 0; read(); }, 200); };
    map.on("idle", schedule); map.on("sourcedata", schedule);
    const unsubscribe = api.subscribe(schedule), timeout = window.setTimeout(read, 8200); schedule();
    return () => { disposed = true; window.clearTimeout(timer); window.clearTimeout(timeout); unsubscribe(); map.off("idle", schedule); map.off("sourcedata", schedule); };
  }, [api, key, point]);

  useEffect(() => {
    if (api?.engine !== "terrain") return;
    const map = api.native as TerrainMap;
    const layers: LayerSpecification[] = [
      { id: prefix + "-cover", type: "line", source: "water", "source-layer": "landcover",
        layout: { visibility: coverVisible ? "visible" : "none" },
        paint: { "line-color": ["match", ["get", "class"], "wood", "#76b88a", "grass", "#cfbe71", "#c89157"], "line-width": 1.5, "line-opacity": .85 } },
      { id: prefix + "-residential", type: "line", source: "water", "source-layer": "landuse", filter: ["==", ["get", "class"], "residential"],
        layout: { visibility: coverVisible ? "visible" : "none" },
        paint: { "line-color": "#f2cd98", "line-width": 1.5, "line-dasharray": [3, 2] } },
      { id: prefix + "-buildings", type: "line", source: "water", "source-layer": "building", minzoom: 13,
        layout: { visibility: buildingsVisible ? "visible" : "none" },
        paint: { "line-color": "#fff3ce", "line-width": 1.5, "line-opacity": .95 } },
    ];
    let adding = false;
    const draw = () => {
      if (adding || !map.getSource("water")) return;
      adding = true;
      try { for (const layer of layers) if (!map.getLayer(layer.id)) map.addLayer(layer); }
      finally { adding = false; }
    };
    draw(); map.on("styledata", draw);
    return () => { map.off("styledata", draw); try { for (const layer of layers) if (map.getLayer(layer.id)) map.removeLayer(layer.id); } catch { /* The renderer may already be closed. */ } };
  }, [api, prefix, coverVisible, buildingsVisible]);

  if (api?.engine !== "terrain") return null;
  const current = snapshot?.key === key ? snapshot : null;
  const unknown = current?.loading || !current ? t("Memuat data peta…", "Loading map data…") : t("Belum terpetakan / belum tersedia", "Not mapped / unavailable");
  const elevationUnknown = !current ? t("Memuat elevasi…", "Loading elevation…") : t("Elevasi belum tersedia", "Elevation unavailable");
  const cover = current?.context.cover;
  const coverLabel = cover ? (coverLabels[cover]?.[en ? 1 : 0] ?? cover.replaceAll("_", " ")) : null;
  const distance = current?.context.buildingDistance;
  const distanceLabel = distance === null || distance === undefined ? unknown : distance < 1 ? t("Pada bangunan terpetakan", "At a mapped building")
    : t("Sekitar ", "About ") + (distance < 1000 ? Math.max(10, Math.round(distance / 10) * 10) + " m" : (distance / 1000).toLocaleString(en ? "en-US" : "id-ID", { maximumFractionDigits: 1 }) + " km");
  return <aside className={styles.panel} aria-labelledby={prefix + "-title"}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header><div><span>3D · OpenStreetMap</span><h2 ref={title} id={prefix + "-title"} tabIndex={-1}>{t("Lingkungan sekitar", "Surrounding environment")}</h2></div><button type="button" onClick={onClose} aria-label={t("Tutup lingkungan sekitar", "Close environment details")}><MapIcon name="close" /></button></header>
    <div className={styles.body}>
      <dl aria-live="polite">
        <div><dt>{t("Tutupan pada peta (OpenStreetMap)", "Mapped cover (OpenStreetMap)")}</dt><dd>{coverLabel ?? (current?.context.residential ? t("Area permukiman", "Residential area") : unknown)}{coverLabel && current?.context.residential && <small>{t("Di area permukiman pada peta", "Within a mapped residential area")}</small>}</dd></div>
        <div><dt>{t("Perkiraan elevasi", "Approximate elevation")}</dt><dd>{current?.elevation === null || current?.elevation === undefined ? elevationUnknown : Math.round(current.elevation).toLocaleString(en ? "en-US" : "id-ID") + t(" m di atas laut", " m above sea level")}</dd></div>
        <div><dt>{t("Bangunan terpetakan", "Mapped buildings")}</dt><dd>{distanceLabel}<small>{t("Hanya bangunan di area peta yang termuat.", "Only buildings in the loaded map area.")}</small></dd></div>
      </dl>
      <div className={styles.layers} role="group" aria-label={t("Garis pada peta", "Map outlines")}>
        <button type="button" aria-pressed={coverVisible} onClick={() => setCoverVisible(value => !value)}><i className={styles.coverKey} />{t("Tutupan lahan", "Land cover")}</button>
        <button type="button" aria-pressed={buildingsVisible} onClick={() => setBuildingsVisible(value => !value)}><i className={styles.buildingKey} />{t("Bangunan", "Buildings")}</button>
      </div>
      <p>{t("Tanggal citra berbeda tiap area. Citra dan peta tidak menunjukkan kondisi saat ini secara pasti.", "Imagery dates vary by area. Imagery and maps do not establish current conditions.")}{current?.context.limited && " " + t("Sebagian fitur peta diperiksa.", "A subset of map features was checked.")}</p>
    </div>
  </aside>;
}
// --- end of Terrain context ---
