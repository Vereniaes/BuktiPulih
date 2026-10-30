// Todo:
// -> Explore thermal detections, imagery, wind and air stations.
// -> Keep source filters and details shared across map views.
// --- Satellite explorer ---
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExplorerMap } from "../maps/ExplorerMap";
import { MapMarkerLayer, type ExplorerMarker } from "../maps/MapMarkerLayer";
import { MapViewControls } from "../maps/MapViewControls";
import { MapWindLayer } from "../maps/MapWindLayer";
import { MapImageryLayer } from "../maps/MapImageryLayer";
import type { ExplorerMapApi, ExplorerMode } from "@/types/explorer-map";
import { TerrainContext } from "../maps/TerrainContext";
import type { HotspotObservation, MapBounds } from "@/types/environment";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { HazardPanel, type LayerKey, type Selected } from "./HazardPanel";
import { MapIcon } from "./MapIcon";
import { useSatelliteSources } from "./useSatelliteSources";
import { CONFIDENCE_COLORS, DEFAULT_FILTERS, filterDetections, sensorName, windRotation } from "./satellite-explorer";
import { defaultImageryDate, readDeviceHints, useLowGraphics, type MapQuality } from "./map-display";
import { windColor } from "./wind-field";
import { ISPU_COLORS, ISPU_LABELS, type IspuStation } from "@/types/air-quality";
import styles from "./hazard-map.module.css";
const DEFAULT_IMAGERY_OPACITY=100;
const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function HazardMap({language="id"}:{language?:"id"|"en"}) {
  const en=language==="en", t=(id:string,english:string)=>en?english:id;
  const shell=useRef<HTMLElement>(null), layerButton=useRef<HTMLButtonElement>(null), lastFocus=useRef<string|null>(null), fitted=useRef(false);
  const [api,setApi]=useState<ExplorerMapApi|null>(null), [mode,setMode]=useState<ExplorerMode>("roadmap");
  const [weatherWind,setWeatherWind]=useState(false);
  const [explorePoint,setExplorePoint]=useState<[number,number]|null>(null);
  const changeMode=useCallback((next:ExplorerMode)=>{setMode(next);if(next!=="terrain")setExplorePoint(null);},[]);
  const [open,setOpen]=useState(()=>window.innerWidth>860), [tab,setTab]=useState<"layers"|"results">("layers");
  const [enabled,setEnabled]=useState({fire:true,imagery:false,wind:false});
  const [quality,setQuality]=useState<MapQuality>(()=>{try {const saved=localStorage.getItem("buktipulih_map_quality_v2");return saved==="low"||saved==="detail"?saved:"auto";}catch{return "auto";}});
  const [device]=useState(readDeviceHints);
  const [reduceMotion,setReduceMotion]=useState(reduced);
  useEffect(()=>{const query=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduceMotion(query.matches);query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  const lowGraphics=useLowGraphics(quality,device);
  useEffect(()=>{try{localStorage.setItem("buktipulih_map_quality_v2",quality);}catch{}},[quality,lowGraphics]);
  const [filters,setFilters]=useState(DEFAULT_FILTERS), [area,setArea]=useState<MapBounds|null>(null);
  const [productId,setProductId]=useState(""), [chosenDate,setChosenDate]=useState("");
  const [opacity,setOpacity]=useState(DEFAULT_IMAGERY_OPACITY), [windOpacity,setWindOpacity]=useState(90);
  const [brightness,setBrightness]=useState(100), [contrast,setContrast]=useState(100);
  const [tileProgress,setTileProgress]=useState({loaded:0,total:0});
  const [airVisible,setAirVisible]=useState(true), [windVisible,setWindVisible]=useState(true), [minIspu,setMinIspu]=useState(0);
  const [selection,setSelection]=useState<{kind:"fire"|"wind"|"air";id:string}|null>(null);
  const [imageError,setImageError]=useState(false), [imageLoading,setImageLoading]=useState(false), [tileRevision,setTileRevision]=useState(0);
  const [imageEmpty,setImageEmpty]=useState(false);
  const [fullscreen,setFullscreen]=useState(false), [message,setMessage]=useState("");
  const [now,setNow]=useState(()=>Date.now());
  const sources=useSatelliteSources(filters.range,{...enabled,wind:enabled.wind&&windVisible,air:enabled.wind&&airVisible});
  const product=sources.imagery.data?.find(p=>p.id===productId)??sources.imagery.data?.[0];
  const date=product?.dates.includes(chosenDate)?chosenDate:defaultImageryDate(product?.dates??[]);
  const results=useMemo(()=>enabled.fire?filterDetections(sources.fire.data?.observations??[],filters,area,now):[],[sources.fire.data,filters,area,now,enabled.fire]);
  const stations=useMemo(()=>sources.air.data?.stations.filter(point=>point.value>=minIspu)??[],[sources.air.data,minIspu]);
  const selected:Selected|null=useMemo(()=>{
    if(selection?.kind==="fire") {const point=results.find(p=>p.id===selection.id);return point?{kind:"fire",point}:null;}
    if(selection?.kind==="wind"&&enabled.wind) {const point=sources.wind.data?.points.find(p=>p.id===selection.id);return point?{kind:"wind",point}:null;}
    if(selection?.kind==="air"&&enabled.wind&&airVisible) {const point=stations.find(point=>point.id===selection.id);return point?{kind:"air",point}:null;}
    return null;
  },[selection,results,sources.wind.data,enabled.wind,stations,airVisible]);
  const select=useCallback((value:Selected)=>{setSelection({kind:value.kind,id:value.point.id});setOpen(true);},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!api||fitted.current)return;fitted.current=true;
    if(window.innerWidth<=860)api.moveTo([118,-2],4);
    else api.fitBounds([95,-11,141,6],{top:30,right:18,bottom:80,left:330},6);
  },[api]);
  useEffect(()=>{const full=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",full);return()=>document.removeEventListener("fullscreenchange",full);},[]);
  const imageStatus=useCallback((status:{loading:boolean;error:boolean;empty:boolean;loaded:number;total:number})=>{
    setImageLoading(status.loading);setImageError(status.error);setImageEmpty(status.empty);setTileProgress({loaded:status.loaded,total:status.total});
  },[]);
  const markers=useMemo<ExplorerMarker[]>(()=>[
    ...results.map(point=>({id:"fire:"+point.id,point:[point.coordinates[1],point.coordinates[0]] as [number,number],kind:"dot" as const,color:CONFIDENCE_COLORS[point.confidence],label:`${sensorName(point.satellite)} · ${point.frp_mw??"—"} MW`,selected:selection?.kind==="fire"&&selection.id===point.id})),
    ...(enabled.wind&&windVisible&&!weatherWind?sources.wind.data?.points??[]:[]).map(point=>({id:"wind:"+point.id,point:[point.coordinates[1],point.coordinates[0]] as [number,number],kind:"wind" as const,color:windColor(point.speed_kmh),rotation:windRotation(point.direction_deg),opacity:windOpacity/100,label:`${en?"Wind":"Angin"} ${point.speed_kmh} km/h`,selected:selection?.kind==="wind"&&selection.id===point.id})),
    ...(enabled.wind&&airVisible?stations:[]).map(point=>({id:"air:"+point.id,point:[point.coordinates[1],point.coordinates[0]] as [number,number],kind:"air" as const,color:ISPU_COLORS[point.category],value:String(point.value),label:`${point.name} · ISPU ${point.value} · ${ISPU_LABELS[point.category][en?1:0]}`,selected:selection?.kind==="air"&&selection.id===point.id})),
  ],[results,selection,enabled.wind,windVisible,airVisible,stations,sources.wind.data,windOpacity,en,weatherWind]);
  const selectMarker=useCallback((id:string)=>{
    const colon=id.indexOf(":"),kind=id.slice(0,colon) as "fire"|"air"|"wind";
    setSelection({kind,id:id.slice(colon+1)});setExplorePoint(null);setOpen(true);
  },[]);
  useEffect(()=>{if(api?.engine==="terrain"&&explorePoint)api.moveTo(explorePoint,14.5);},[api,explorePoint]);
  const explore=()=>{if(selected?.kind!=="fire")return;setExplorePoint([selected.point.coordinates[1],selected.point.coordinates[0]]);setMode("terrain");setOpen(false);};
  useEffect(()=>{
    if(!api||!selected){lastFocus.current=null;return;}
    if(explorePoint)return;
    if(lastFocus.current===selected.point.id)return;lastFocus.current=selected.point.id;
    api.moveTo([selected.point.coordinates[1],selected.point.coordinates[0]],api.getView().zoom,window.innerWidth>860?[150,0]:[0,0]);
  },[api,selected,explorePoint]);
  const close=()=>{setOpen(false);layerButton.current?.focus();};
  const focus=(point:HotspotObservation)=>{
    select({kind:"fire",point});api?.moveTo([point.coordinates[1],point.coordinates[0]],Math.max(7,api.getView().zoom));
  };
  const focusStation=(point:IspuStation)=>{
    select({kind:"air",point});api?.moveTo([point.coordinates[1],point.coordinates[0]],Math.max(7,api.getView().zoom));
  };
  const searchArea=()=>{
    if(!api)return;
    setArea(api.getBounds());setSelection(null);setTab("results");setOpen(true);
  };
  const full=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{setMessage(t("Layar penuh tidak tersedia pada browser ini.","Fullscreen is unavailable in this browser."));}};
  const resetExtent=()=>{
    if(!api)return;
    if(window.innerWidth<=860)api.moveTo([118,-2],4);
    else api.fitBounds([95,-11,141,6],{top:30,right:18,bottom:80,left:open?330:16},6);
  };
  const toggle=(key:LayerKey)=>{if(key==="imagery"&&!enabled.imagery&&mode!=="terrain")setMode("satellite");setEnabled(s=>({...s,[key]:!s[key]}));setSelection(null);};
  const busy=sources.fire.loading||sources.imagery.loading||sources.wind.loading||sources.air.loading;
  return <section ref={shell} data-exploring={!!explorePoint} className={`${styles.shell} ${open?styles.panelOpen:""}`} aria-label={t("Peta pemantauan satelit","Satellite monitoring map")} onKeyDown={e=>{if(e.key==="Escape"&&open)close();}}>
    <div className={styles.map}>
      <ExplorerMap mode={mode} language={language} lowGraphics={lowGraphics} onReady={setApi} onModeChange={changeMode}/>
      {enabled.imagery&&product&&date&&<MapImageryLayer api={api} product={product.id} date={date} opacity={opacity} brightness={brightness} contrast={contrast} lowGraphics={lowGraphics} revision={tileRevision} onStatus={imageStatus}/>}
      {enabled.wind&&windVisible&&!weatherWind&&!lowGraphics&&!reduceMotion&&sources.wind.data&&<MapWindLayer api={api} points={sources.wind.data.points} opacity={windOpacity/100}/>}
      <MapMarkerLayer api={api} markers={markers} onSelect={selectMarker} language={language} lowGraphics={lowGraphics}/>
      <MapViewControls onWindActiveChange={setWeatherWind} onOpenWeather={()=>{if(window.innerWidth<=860)setOpen(false);}} api={api} mode={mode} onModeChange={changeMode} language={language} lowGraphics={lowGraphics}/>
      {mode==="terrain"&&explorePoint&&<TerrainContext api={api} point={explorePoint} language={language} onClose={()=>{setExplorePoint(null);setOpen(true);}}/>}
    </div>
    <div className={styles.topbar}>
      <button ref={layerButton} className={styles.layerButton} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><MapIcon name="layers"/>{t("Lapisan","Layers")}<span>{Object.values(enabled).filter(Boolean).length}</span></button>
      <button className={styles.searchButton} onClick={searchArea}><MapIcon name="search"/>{t("Cari di area ini","Search this area")}</button>
    </div>
    <div className={styles.tools} aria-label={t("Kontrol peta","Map controls")}>
      <button className={styles.iconButton} disabled={busy} onClick={()=>{sources.refresh();setTileRevision(n=>n+1);setNow(Date.now());}} aria-label={t("Muat ulang sumber","Reload sources")} title={t("Muat ulang sumber","Reload sources")}><MapIcon name="refresh"/></button>
      <button className={styles.iconButton} onClick={resetExtent} aria-label={t("Tampilkan Indonesia","Show Indonesia")} title={t("Tampilkan Indonesia","Show Indonesia")}><MapIcon name="extent"/></button>
      <button className={styles.iconButton} onClick={full} aria-label={fullscreen?t("Keluar layar penuh","Exit fullscreen"):t("Layar penuh","Fullscreen")} title={t("Layar penuh","Fullscreen")}><MapIcon name="expand"/></button>
    </div>
    {open&&<HazardPanel en={en} now={now} tab={tab} setTab={setTab} onClose={close} onExplore={explore} enabled={enabled} toggle={toggle} filters={filters} setFilters={setFilters} sources={sources}
      product={product} setProduct={id=>{setProductId(id);setChosenDate("");}} date={date} setDate={setChosenDate} opacity={opacity} setOpacity={setOpacity} windOpacity={windOpacity} setWindOpacity={setWindOpacity}
      results={results} selected={selected} select={focus} selectStation={focusStation} clearSelection={()=>{setSelection(null);setTab("layers");}} areaActive={!!area} clearArea={()=>setArea(null)} imageError={imageError} imageLoading={imageLoading} tileProgress={tileProgress} brightness={brightness} setBrightness={setBrightness} contrast={contrast} setContrast={setContrast}
      airVisible={airVisible} setAirVisible={setAirVisible} windVisible={windVisible} setWindVisible={setWindVisible} minIspu={minIspu} setMinIspu={setMinIspu} quality={quality} setQuality={setQuality} lowGraphics={lowGraphics}/>}
    <div className={styles.legend} aria-label={t("Legenda peta","Map legend")}>
      {enabled.fire&&<div className={styles.confidence}><span>{t("Keyakinan","Confidence")}</span>{(["low","nominal","high"] as const).map((key,i)=><span key={key}><i style={{background:CONFIDENCE_COLORS[key]}}/>{(en?["Low","Nominal","High"]:["Rendah","Nominal","Tinggi"])[i]}</span>)}</div>}
      {enabled.wind&&airVisible&&<div className={styles.ispuLegend}><span>ISPU</span>{Object.entries(ISPU_LABELS).map(([key,label])=><span key={key}><i style={{background:ISPU_COLORS[key as keyof typeof ISPU_COLORS]}}/>{label[en?1:0]}</span>)}</div>}
      {enabled.wind&&windVisible&&<div className={styles.windLegend}><span>{t("Angin","Wind")} · m/s</span><i/><span>0</span><span>5</span><span>10+</span></div>}
      {enabled.fire&&sources.fire.error&&<div className={styles.sourceStatus}>{t("Titik panas belum tersedia","Hotspots unavailable")}</div>}
      <div className={styles.observationTime} role="status">{enabled.imagery?((sources.imagery.loading&&!product)||imageLoading?`${t("Memuat citra","Loading imagery")} ${tileProgress.loaded}/${tileProgress.total||"…"}`:(sources.imagery.error&&!product)||imageError?t("Citra belum tersedia","Imagery unavailable"):`${imageEmpty?t("Belum ada citra","No imagery coverage"):t("Citra","Imagery")} · ${date} UTC`):sources.fire.data?.observed_at?formatTimeWib(sources.fire.data.observed_at):t("Peta dasar","Basemap")}{enabled.wind&&windVisible&&<span> · {t("Angin 10 m","Wind 10 m")}</span>}</div>
    </div>
    {message&&<div className={styles.notice} role="status">{message}<button onClick={()=>setMessage("")} aria-label={t("Tutup pemberitahuan","Dismiss notice")}><MapIcon name="close"/></button></div>}
  </section>;
}

// --- end of Satellite explorer ---
