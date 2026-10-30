// Todo:
// -> Show satellite filters, source states and selected details.
// -> Open terrain exploration around a thermal detection.
"use client";
// --- Satellite panel ---
import { useEffect, useRef } from "react";
import type { IspuStation } from "@/types/air-quality";
import { AirStationDetail } from "./AirStationDetail";
import { HotspotCoordinates } from "./HotspotCoordinates";
import type { HotspotObservation } from "@/types/environment";
import type { WindPoint } from "@/services/api";
import type { ImageryProduct } from "@/lib/mapImagery";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { HotspotTimePicker } from "./HotspotTimePicker";
import { MapIcon } from "./MapIcon";
import { sensorName, type FireFilters } from "./satellite-explorer";
import type { useSatelliteSources } from "./useSatelliteSources";
import type { MapQuality } from "./map-display";
import styles from "./hazard-map.module.css";
export type LayerKey="fire"|"imagery"|"wind";
export type Selected={kind:"fire";point:HotspotObservation}|{kind:"wind";point:WindPoint}|{kind:"air";point:IspuStation};
interface Props {
  brightness:number; setBrightness:(value:number)=>void; contrast:number; setContrast:(value:number)=>void;
  imageLoading:boolean; tileProgress:{loaded:number;total:number};
  airVisible:boolean; setAirVisible:(value:boolean)=>void; windVisible:boolean; setWindVisible:(value:boolean)=>void; minIspu:number; setMinIspu:(value:number)=>void;
  quality:MapQuality; setQuality:(quality:MapQuality)=>void; lowGraphics:boolean;
  en:boolean; now:number; tab:"layers"|"results"; setTab:(tab:"layers"|"results")=>void; onClose:()=>void;
  enabled:Record<LayerKey,boolean>; toggle:(key:LayerKey)=>void;
  filters:FireFilters; setFilters:(filters:FireFilters)=>void;
  sources:ReturnType<typeof useSatelliteSources>; product:ImageryProduct|undefined;
  setProduct:(id:string)=>void; date:string; setDate:(date:string)=>void;
  opacity:number; setOpacity:(value:number)=>void; windOpacity:number; setWindOpacity:(value:number)=>void;
  results:HotspotObservation[]; selected:Selected|null; select:(point:HotspotObservation)=>void;
  selectStation:(station:IspuStation)=>void;
  clearSelection:()=>void; areaActive:boolean; clearArea:()=>void; imageError:boolean;
  onExplore:()=>void;
}
export function HazardPanel(p:Props) {
  const {en,sources,filters,selected}=p;
  const detailHeading=useRef<HTMLHeadingElement>(null);
  const selectedId=selected?.point.id;
  useEffect(()=>{if(selectedId)detailHeading.current?.focus();},[selectedId]);
  const t=(id:string,english:string)=>en?english:id;
  const field=(key:keyof FireFilters,value:string|number)=>p.setFilters({...filters,[key]:value});
  const status=(key:LayerKey)=>{
    if(key==="wind") {
      if(!p.enabled.wind)return "ISPU KLH/BPLH · ECMWF IFS";
      if(p.airVisible&&sources.air.loading||p.windVisible&&sources.wind.loading)return t("Memuat…","Loading…");
      return [p.airVisible?`${sources.air.data?.stations.length??"—"} ${t("stasiun · KLH/BPLH","stations · KLH/BPLH")}`:"",p.windVisible?"ECMWF IFS · 10 m":""].filter(Boolean).join(" · ");
    }
    const source=key==="imagery"?sources.imagery:sources[key];
    if(!p.enabled[key])return key==="fire"?"NASA FIRMS":"NASA GIBS";
    if(key==="imagery"&&sources.imagery.data?.length&&sources.imagery.cached)return t("Katalog tersimpan · NASA GIBS","Cached catalog · NASA GIBS");
    if(source.loading)return t("Memuat…","Loading…");
    if(source.error||key==="imagery"&&p.imageError)return source.data?t("Pembaruan gagal · data tersimpan","Refresh failed · cached data"):t("Sumber belum tersedia","Source unavailable");
    if(key==="fire")return `${p.results.length} ${t("deteksi · NASA FIRMS","detections · NASA FIRMS")}${sources.fire.data?.status==="cached"?t(" · Tersimpan"," · Cached"):sources.fire.data?.status==="partial"?t(" · Sebagian"," · Partial"):""}`;
    return p.imageLoading?`${t("Memuat citra","Loading imagery")} ${p.tileProgress.loaded}/${p.tileProgress.total||"…"}`:`${p.product?.label??"NASA GIBS"} · ${p.date}`;
  };
  return <aside className={styles.panel} aria-label={t("Lapisan dan filter","Layers and filters")}>
    <header className={styles.panelHeader}>
      <div><span className={styles.eyebrow}>{t("PEMANTAUAN SATELIT","SATELLITE MONITORING")}</span><h2>{selected?t("Rincian lokasi","Location details"):t("Lapisan peta","Map layers")}</h2></div>
      <button className={styles.iconButton} onClick={p.onClose} aria-label={t("Tutup panel","Close panel")}><MapIcon name="close"/></button>
    </header>
    {selected?.kind==="air"?<div className={styles.panelBody}><AirStationDetail key={selected.point.id} station={selected.point} en={en} onBack={p.clearSelection}/></div>:selected ? <div className={styles.panelBody}>
      <button className={styles.back} onClick={p.clearSelection}><MapIcon name="back"/>{t("Kembali ke lapisan","Back to layers")}</button>
      <span className={styles.detailTag}>{selected.kind==="fire"?"NASA FIRMS":"ECMWF IFS"}</span>
      <h3 ref={detailHeading} tabIndex={-1}>{selected.kind==="fire"?t("Titik panas terdeteksi","Thermal detection"):t("Angin permukaan","Surface wind")}</h3>
      {selected.kind==="fire"?<HotspotCoordinates coordinates={selected.point.coordinates} en={en}/>:<p className={styles.coordinates}>{selected.point.coordinates.map(v=>v.toFixed(4)).join(", ")}</p>}
      <dl className={styles.detailList}>
        <dt>{t("Waktu data","Data time")}</dt><dd>{formatTimeWib(selected.point.observed_at)}</dd>
        {selected.kind==="fire"?<>
          <dt>{t("Satelit","Satellite")}</dt><dd>VIIRS · {sensorName(selected.point.satellite)}</dd>
          <dt>{t("Keyakinan deteksi","Detection confidence")}</dt><dd>{({low:t("Rendah","Low"),nominal:t("Nominal","Nominal"),high:t("Tinggi","High")})[selected.point.confidence]}</dd>
          <dt>{t("Daya radiasi api","Fire radiative power")}</dt><dd>{selected.point.frp_mw===null?"—":`${selected.point.frp_mw} MW`}</dd>
        </>:<>
          <dt>{t("Kecepatan · 10 m","Speed · 10 m")}</dt><dd>{selected.point.speed_kmh} km/h</dd>
          <dt>{t("Berasal dari","Coming from")}</dt><dd>{selected.point.direction_deg}°</dd>
        </>}
      </dl>
      {selected.kind==="wind"&&<p className={styles.note}>{t("Sampel model angin pada ketinggian 10 m.","Model wind at 10 m.")}</p>}
      {selected.kind==="fire"&&<button type="button" className={styles.exploreButton} onClick={p.onExplore}><MapIcon name="extent"/>{t("Jelajahi sekitar","Explore surroundings")}</button>}
      <a className={styles.sourceLink} href={selected.kind==="fire"?"https://firms.modaps.eosdis.nasa.gov/map/":"https://open-meteo.com/en/docs"} target="_blank" rel="noreferrer">{t("Buka sumber data","Open data source")} ↗</a>
    </div>:<>
      <div className={styles.tabs} role="group" aria-label={t("Isi panel","Panel content")}>
        <button aria-pressed={p.tab==="layers"} onClick={()=>p.setTab("layers")}>{t("Lapisan","Layers")}</button>
        <button aria-pressed={p.tab==="results"} onClick={()=>p.setTab("results")}>{t("Titik panas","Hotspots")} <span>{sources.fire.data?p.results.length:"—"}</span></button>
      </div>
      <div className={styles.panelBody}>
        {p.tab==="layers"?<>
          {(["fire","imagery","wind"] as LayerKey[]).map(key=><section className={styles.layer} key={key}>
            <label className={styles.layerToggle}>
              <span className={`${styles.swatch} ${styles[key]}`}/>
              <span className={styles.layerLabel}><strong>{key==="fire"?t("Titik panas","Hotspots"):key==="imagery"?t("Citra satelit","Satellite imagery"):t("Kualitas Udara","Air quality")}</strong><small>{status(key)}</small></span>
              <input type="checkbox" checked={p.enabled[key]} onChange={()=>p.toggle(key)} aria-label={key==="fire"?t("Titik panas NASA","NASA hotspots"):key==="imagery"?t("Citra satelit","Satellite imagery"):t("Kualitas Udara","Air quality")}/>
            </label>
            {p.enabled[key]&&<div className={styles.layerSettings}>
              {key==="fire"?<>
                <HotspotTimePicker range={filters.range} now={p.now} availability={sources.availability.data} en={en} onApply={range=>p.setFilters({...filters,range})}/>
                <details><summary>{t("Filter deteksi","Detection filters")}{(filters.satellite!=="all"||filters.confidence!=="all"||filters.frp>0)&&<span className={styles.activeDot}/>}</summary>
                  <label>{t("Satelit","Satellite")}<select aria-label={t("Satelit","Satellite")} value={filters.satellite} onChange={e=>field("satellite",e.target.value)}><option value="all">{t("Semua satelit","All satellites")}</option><option value="VIIRS_NOAA20_NRT">VIIRS · NOAA-20</option><option value="VIIRS_NOAA21_NRT">VIIRS · NOAA-21</option></select></label>
                  <label>{t("Keyakinan deteksi","Detection confidence")}<select aria-label={t("Keyakinan deteksi","Detection confidence")} value={filters.confidence} onChange={e=>field("confidence",e.target.value)}><option value="all">{t("Semua tingkat","All levels")}</option><option value="high">{t("Tinggi","High")}</option><option value="nominal">Nominal</option><option value="low">{t("Rendah","Low")}</option></select></label>
                  <label>{t("Daya radiasi minimum","Minimum radiative power")}<select aria-label={t("Daya radiasi minimum","Minimum radiative power")} value={filters.frp} onChange={e=>field("frp",Number(e.target.value))}><option value={0}>{t("Semua nilai","Any value")}</option>{[5,10,25,50].map(n=><option key={n} value={n}>≥ {n} MW</option>)}</select></label>
                </details>
                {sources.fire.error&&<p className={styles.warning}>{sources.fire.errorCode==="HOTSPOT_DATE_UNAVAILABLE"?t("Data NASA belum tersedia untuk tanggal tersebut.","NASA data are unavailable for those dates."):sources.fire.errorCode==="INVALID_TIME_RANGE"?t("Pilih rentang tanggal dan jam yang valid, maksimal 5 hari.","Choose a valid date/time range of at most 5 days."):sources.fire.data?t("Pembaruan titik panas gagal. Coba muat ulang sumber.","Hotspot refresh failed. Try reloading sources."):t("Titik panas belum tersedia. Coba muat ulang sumber.","Hotspots unavailable. Try reloading sources.")}</p>}
                {(sources.fire.cached||sources.fire.data?.status==="cached")&&<p className={styles.warning}>{t("Menampilkan data tersimpan.","Showing cached observations.")}</p>}
                {sources.fire.data?.status==="partial"&&<p className={styles.warning}>{t("Sebagian data belum tersedia.","Some data are unavailable.")}</p>}
                {sources.fire.data&&<p className={styles.note}>
                  {t("Pengamatan terakhir","Latest observation")}: {sources.fire.data.observed_at?formatTimeWib(sources.fire.data.observed_at):t("belum tersedia","unavailable")}<br/>
                  {t("Diambil","Retrieved")}: {formatTimeWib(sources.fire.data.fetched_at)}
                </p>}
                {sources.fire.checked_at&&<p className={styles.note}>{t("Diperiksa","Last checked")}: {formatTimeWib(sources.fire.checked_at)}</p>}
              </>:key==="imagery"?<>
                <details><summary>{t("Tampilan citra","Imagery settings")}</summary>
                  <label>{t("Sumber citra","Imagery source")}<select aria-label={t("Sumber citra","Imagery source")} value={p.product?.id??""} onChange={e=>p.setProduct(e.target.value)} disabled={!p.product}>{!p.product&&<option value="">{t("Belum tersedia","Unavailable")}</option>}{sources.imagery.data?.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                  <label>{t("Tanggal citra · UTC","Image date · UTC")}<select aria-label={t("Tanggal citra · UTC","Image date · UTC")} value={p.date} onChange={e=>p.setDate(e.target.value)} disabled={!p.product}>{!p.product&&<option value="">—</option>}{p.product?.dates.map(date=><option key={date}>{date}</option>)}</select></label>
                  {sources.imagery.fetched_at&&<p className={styles.note}>{t("Katalog diambil","Catalog retrieved")}: {formatTimeWib(sources.imagery.fetched_at)}</p>}
                  <label>{t("Opasitas","Opacity")} <output>{p.opacity}%</output><input aria-label={t("Opasitas","Opacity")} type="range" min="0" max="100" step="5" value={p.opacity} onChange={e=>p.setOpacity(Number(e.target.value))}/></label>
                  <label>{t("Kecerahan","Brightness")} <output>{p.brightness}%</output><input aria-label={t("Kecerahan citra","Image brightness")} type="range" min="60" max="160" step="5" value={p.brightness} onChange={e=>p.setBrightness(Number(e.target.value))}/></label>
                  <label>{t("Kontras","Contrast")} <output>{p.contrast}%</output><input aria-label={t("Kontras citra","Image contrast")} type="range" min="60" max="160" step="5" value={p.contrast} onChange={e=>p.setContrast(Number(e.target.value))}/></label>
                  <button className={styles.detailAction} onClick={()=>{p.setBrightness(100);p.setContrast(100);p.setOpacity(100);}}>{t("Reset tampilan","Reset appearance")}</button>
                </details>
                {p.lowGraphics&&<button className={styles.detailAction} onClick={()=>{p.setQuality("detail");p.setOpacity(100);}}>{t("Gunakan Detailed","Use Detailed")}</button>}
                {p.imageError&&<p className={styles.warning}>{t("Sebagian citra gagal dimuat. Coba tanggal lain atau muat ulang.","Some tiles failed. Try another date or reload.")}</p>}
              </>:<>
                <label className={styles.subToggle}><input type="checkbox" checked={p.airVisible} onChange={e=>p.setAirVisible(e.target.checked)}/>{t("Stasiun ISPU","ISPU stations")}</label>
                {p.airVisible&&<label className={styles.airFilter}>{t("Kategori ISPU","ISPU category")}<select aria-label={t("Kategori ISPU","ISPU category")} value={p.minIspu} onChange={e=>p.setMinIspu(Number(e.target.value))}><option value={0}>{t("Semua kategori","All categories")}</option><option value={101}>{t("Tidak sehat ke atas","Unhealthy and above")}</option><option value={201}>{t("Sangat tidak sehat ke atas","Very unhealthy and above")}</option><option value={301}>{t("Berbahaya","Hazardous")}</option></select></label>}
                {p.airVisible&&!!sources.air.data?.stations.length&&<label className={styles.airFilter}>{t("Pilih stasiun","Choose a station")}<select id="ispu-station-select" aria-label={t("Pilih stasiun ISPU","Choose ISPU station")} value="" onChange={e=>{const station=sources.air.data?.stations.find(item=>item.id===e.target.value);if(station)p.selectStation(station);}}><option value="">{t("Nama stasiun…","Station name…")}</option>{[...sources.air.data.stations].sort((a,b)=>a.name.localeCompare(b.name)).map(station=><option key={station.id} value={station.id}>{station.name} · {station.value}</option>)}</select></label>}
                {p.airVisible&&sources.air.error&&<p className={styles.warning}>{t("Stasiun ISPU belum tersedia. Coba muat ulang.","ISPU stations unavailable. Try reloading.")}</p>}
                {p.airVisible&&sources.air.data?.status==="cached"&&<p className={styles.warning}>{t("Menampilkan ISPU tersimpan.","Showing cached ISPU observations.")}</p>}
                <label className={styles.subToggle}><input type="checkbox" checked={p.windVisible} onChange={e=>p.setWindVisible(e.target.checked)}/>{t("Angin permukaan","Surface wind")}</label>
                {p.windVisible&&<details><summary>{t("Tampilan & waktu angin","Wind display & time")}</summary>
                  <label>{t("Opasitas angin","Wind opacity")} <output>{p.windOpacity}%</output><input aria-label={t("Opasitas angin","Wind opacity")} type="range" min="20" max="100" step="10" value={p.windOpacity} onChange={e=>p.setWindOpacity(Number(e.target.value))}/></label>
                  <p className={styles.note}>{sources.wind.data?.points[0]?formatTimeWib(sources.wind.data.points[0].observed_at):t("Waktu model belum tersedia.","Model time unavailable.")}</p>
                  {sources.wind.data?.status==="cached"&&<p className={styles.warning}>{t("Menampilkan model tersimpan.","Showing cached model data.")}</p>}
                </details>}
                {p.windVisible&&sources.wind.error&&<p className={styles.warning}>{t("Model angin belum tersedia.","Wind model unavailable.")}</p>}
              </>}
            </div>}
          </section>)}
          <div className={styles.displaySettings}>
            <label>{t("Kualitas peta","Map quality")}<select aria-label={t("Kualitas peta","Map quality")} value={p.quality} onChange={e=>p.setQuality(e.target.value as MapQuality)}>
              <option value="auto">{t("Otomatis","Automatic")}</option>
              <option value="low">Basic</option><option value="detail">Detailed</option>
            </select></label>
          </div>
          <div className={styles.panelFoot}><a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA Worldview ↗</a><p>{t("API titik panas diperiksa setiap 5 menit. Waktu pengamatan mengikuti satelit.","The hotspot API is checked every 5 minutes. Observation time follows the satellite.")}</p></div>
        </>:<>
          <div className={styles.resultsHeading}><strong>{sources.fire.data?p.results.length:"—"} {t("deteksi","detections")}</strong>{p.areaActive&&<button onClick={p.clearArea}>{t("Semua area","All areas")}</button>}</div>
          <p className={styles.note}>{t("Terbaru dahulu · pilih untuk melihat lokasi","Newest first · select to locate")}</p>
          {!p.enabled.fire?<p>{t("Aktifkan lapisan titik panas untuk melihat hasil.","Enable hotspots to view detections.")}</p>:!p.results.length?<p className={styles.empty}>{sources.fire.loading?t("Memuat titik panas…","Loading hotspots…"):sources.fire.error?t("Sumber titik panas belum tersedia.","Hotspot source unavailable."):t("Tidak ada deteksi yang cocok. Ubah filter atau cari di area lain.","No matching detections. Change filters or search another area.")}</p>:p.results.slice(0,100).map(point=><button className={styles.result} key={point.id} onClick={()=>p.select(point)}><span><strong>{sensorName(point.satellite)}</strong><small>{point.coordinates.map(v=>v.toFixed(3)).join(", ")}</small></span><span><strong>{point.frp_mw===null?"—":`${point.frp_mw} MW`}</strong><small>{formatTimeWib(point.observed_at).split(" ").slice(-2).join(" ")}</small></span></button>)}
          {p.results.length>100&&<p className={styles.note}>{t("100 deteksi terbaru ditampilkan. Persempit area atau filter.","Showing the latest 100. Narrow the area or filters.")}</p>}
        </>}
      </div>
    </>}
  </aside>;
}
// --- end of Satellite panel ---
