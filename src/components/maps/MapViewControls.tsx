// Todo:
// -> Switch basemaps and inspect one current weather field at a time.
// -> Keep zoom and source details within reach on desktop and phone.
"use client";

// --- Shared map controls ---
import { useEffect, useRef, useState } from "react";
import type { Map as TerrainMap } from "maplibre-gl";
import type { ExplorerMapApi, ExplorerMode, ExplorerPoint } from "@/types/explorer-map";
import { MapIcon } from "../hazards/MapIcon";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { useWeather } from "./useWeather";
import { MapWeatherLayer } from "./MapWeatherLayer";
import { MapWeatherWind } from "./MapWeatherWind";
import { sampleWeather, WEATHER_SCALES, weatherGradient, type WeatherMetric } from "./weather-grid";
import styles from "./map-view-controls.module.css";

export function MapViewControls({ api, mode, onModeChange, language, lowGraphics = false, onWindActiveChange, onOpenWeather }: {
  api: ExplorerMapApi | null; mode: ExplorerMode; onModeChange: (mode: ExplorerMode) => void;
  language: "id" | "en"; lowGraphics?: boolean; onWindActiveChange?: (active: boolean) => void; onOpenWeather?: () => void;
}) {
  const en = language === "en", t = (id: string, english: string) => en ? english : id;
  const [metric, setMetric] = useState<WeatherMetric | null>("rain"), [weatherOpen, setWeatherOpen] = useState(false);
  const [selected, setSelected] = useState<ExplorerPoint | null>(null);
  const [creditHeight, setCreditHeight] = useState(0);
  const weatherButton = useRef<HTMLButtonElement>(null), controls = useRef<HTMLDivElement>(null);
  const weather = useWeather(!!api && !!metric), data = metric ? weather.data : null;
  const isWind = metric === "wind" || metric === "gust", isTemperature = metric === "temperature" || metric === "feels_like";
  const labels: Record<WeatherMetric, string> = { rain: t("Hujan", "Rain"), wind: t("Kecepatan angin", "Wind speed"), gust: t("Hembusan angin", "Wind gusts"), temperature: t("Suhu", "Temperature"), feels_like: t("Terasa seperti", "Feels like") };
  const value = data && metric && selected ? sampleWeather(data, metric, selected[0], selected[1]) : null;
  const choose = (next: WeatherMetric | null) => { setMetric(next); setSelected(null); onWindActiveChange?.(next === "wind" || next === "gust"); };
  const closeDetail = () => { setSelected(null); weatherButton.current?.focus(); };
  useEffect(() => {
    if (api?.engine !== "terrain") return;
    const credits = (api.native as TerrainMap).getContainer().querySelector<HTMLElement>(".maplibregl-ctrl-bottom-right");
    if (!credits) return;
    const observer = new ResizeObserver(() => setCreditHeight(credits.offsetHeight)); observer.observe(credits);
    return () => observer.disconnect();
  }, [api]);
  useEffect(() => {
    if (selected) controls.current?.querySelector<HTMLElement>("[data-weather-detail] strong")?.focus({ preventScroll: true });
  }, [selected]);
  const zoom = (step: number) => { if (api) api.moveTo(api.getView().center, api.getView().zoom + step); };
  return <>
    <MapWeatherLayer api={api} data={data} metric={metric} onSelect={setSelected} lowGraphics={lowGraphics} />
    {data && isWind && <MapWeatherWind api={api} data={data} lowGraphics={lowGraphics} />}
    <div ref={controls} className={styles.controls} data-map-controls onKeyDown={event => {
      if (event.key === "Escape" && (selected || weatherOpen)) { event.preventDefault(); event.stopPropagation(); setSelected(null); setWeatherOpen(false); weatherButton.current?.focus(); }
    }} style={api?.engine === "terrain" ? { bottom: Math.max(42, creditHeight + 12) } : undefined}>
      {selected && metric && data && <div className={styles.detail} data-weather-detail role="region" aria-label={t("Rincian cuaca", "Weather details")}>
        <button type="button" className={styles.close} onClick={closeDetail} aria-label={t("Tutup rincian cuaca", "Close weather details")}><MapIcon name="close" /></button>
        <strong tabIndex={-1}>{labels[metric]} · {value === null ? "—" : `${value.toLocaleString(en ? "en-GB" : "id-ID", { maximumFractionDigits: 1 })} ${WEATHER_SCALES[metric].unit}`}</strong>
        <span>{selected[1].toFixed(3)}, {selected[0].toFixed(3)}</span>
        <span>{t("Waktu data", "Data time")}: {formatTimeWib(data.valid_at)}</span>
        <small>{data.source} · {t("Estimasi model", "Model estimate")} · ~{data.resolution_km} km</small>
        <small>{t("Waktu model", "Model run")}: {formatTimeWib(data.run_at)}<br />{t("Diambil", "Retrieved")}: {formatTimeWib(data.fetched_at)}{data.status === "cached" ? t(" · Tersimpan", " · Cached") : ""}</small>
      </div>}
      {weatherOpen && <div className={styles.weatherPanel} data-weather-panel role="region" aria-label={t("Pilihan cuaca", "Weather options")}>
        <div className={styles.panelHeading}><strong>{t("Cuaca saat ini", "Current weather")}</strong><button type="button" onClick={() => { setWeatherOpen(false); weatherButton.current?.focus(); }} aria-label={t("Tutup pilihan cuaca", "Close weather options")}><MapIcon name="close" /></button></div>
        <div className={styles.weatherTabs} aria-label={t("Lapisan cuaca", "Weather layer")}>
          <button type="button" aria-pressed={metric === "rain"} onClick={() => choose("rain")}>{t("Hujan", "Rain")}</button>
          <button type="button" aria-pressed={isWind} onClick={() => choose("wind")}>{t("Angin", "Wind")}</button>
          <button type="button" aria-pressed={isTemperature} onClick={() => choose("temperature")}>{t("Suhu", "Temperature")}</button>
        </div>
        {(isWind || isTemperature) && <div className={styles.subtypes} aria-label={t("Jenis nilai", "Value type")}>
          {(isWind ? ["wind", "gust"] as const : ["temperature", "feels_like"] as const).map(kind => <button type="button" key={kind} aria-pressed={metric === kind} onClick={() => choose(kind)}>{kind === "wind" ? t("Kecepatan", "Speed") : kind === "gust" ? t("Hembusan", "Gusts") : kind === "temperature" ? t("Aktual", "Actual") : t("Terasa", "Feels like")}</button>)}
        </div>}
        {data && <button type="button" className={styles.offButton} onClick={() => { if (api) setSelected(api.getView().center); setWeatherOpen(false); }}>{t("Lihat cuaca di tengah peta", "Inspect weather at map center")}</button>}
        <button type="button" className={styles.offButton} aria-pressed={!metric} onClick={() => choose(null)}>{t("Nonaktifkan cuaca", "Turn weather off")}</button>
        {weather.error && metric && <div className={styles.error} role="status"><span>{data ? t("Menampilkan data tersimpan.", "Showing cached data.") : t("Data cuaca belum tersedia.", "Weather data unavailable.")}</span><button type="button" onClick={weather.refresh}>{t("Coba lagi", "Try again")}</button></div>}
      </div>}
      {metric && <div className={styles.weatherLegend} data-weather-legend aria-label={t("Legenda cuaca", "Weather legend")}>
        <div><strong>{labels[metric]}</strong><span>{WEATHER_SCALES[metric].unit}</span></div>
        <i style={{ background: weatherGradient(metric) }} />
        <div className={styles.scale}>{WEATHER_SCALES[metric].ticks.map((tick, index, ticks) => <span key={tick} style={{ left: `${(tick - ticks[0]) / (ticks.at(-1)! - ticks[0]) * 100}%` }}>{tick}{!isTemperature && index === ticks.length - 1 ? "+" : ""}</span>)}</div>
        <small role="status">{weather.loading && !data ? t("Memuat cuaca…", "Loading weather…") : !data ? t("Data belum tersedia", "Data unavailable") : `${formatTimeWib(data.valid_at)}${data.status === "cached" || weather.error ? t(" · Tersimpan", " · Cached") : ""}`}</small>
      </div>}
      <div className={styles.actions}>
        <div className={styles.zoom}><button onClick={() => zoom(1)} disabled={!api} aria-label={t("Perbesar peta", "Zoom in")}>+</button><button onClick={() => zoom(-1)} disabled={!api} aria-label={t("Perkecil peta", "Zoom out")}>−</button></div>
        <button ref={weatherButton} type="button" disabled={!api} aria-expanded={weatherOpen} aria-busy={weather.loading || undefined} aria-label={t("Pilihan cuaca", "Weather options")} onClick={() => { setSelected(null); if (!weatherOpen) onOpenWeather?.(); setWeatherOpen(value => !value); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 2 9H5Zm2 3-1 3m6-3-1 3m6-3-1 3" /></svg><span>{t("Cuaca", "Weather")}</span></button>
      </div>
      <div className={styles.modes} aria-label={t("Tampilan peta", "Map view")}>
        {(["roadmap", "satellite", "terrain"] as const).map(kind => <button key={kind} aria-pressed={mode === kind} onClick={() => onModeChange(kind)}>{kind === "roadmap" ? t("Peta", "Map") : kind === "satellite" ? t("Satelit", "Satellite") : t("Jelajah 3D", "Explore 3D")}</button>)}
      </div>
      {mode === "terrain" && <small className={styles.hint}>{t("Geser untuk jelajah · dua jari / klik kanan untuk putar", "Drag to explore · two fingers / right-drag to rotate")}</small>}
    </div>
  </>;
}
// --- end of Shared map controls ---
