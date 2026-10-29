// Compose satellite imagery, thermal detections and model wind on one map.
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { HotspotObservation, MapBounds } from "@/types/environment";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { HazardPanel, type LayerKey, type Selected } from "./HazardPanel";
import { MapIcon } from "./MapIcon";
import { useSatelliteSources } from "./useSatelliteSources";
import { CONFIDENCE_COLORS, DEFAULT_FILTERS, filterDetections, sensorName, windRotation } from "./satellite-explorer";
import { defaultImageryDate, readDeviceHints, useLowGraphics, type MapQuality } from "./map-display";
import { WindLayer, windColor } from "./wind-layer";
import { ISPU_COLORS, ISPU_LABELS, type IspuStation } from "@/types/air-quality";
import { ImageryLayer } from "./imagery-layer";
import styles from "./hazard-map.module.css";
const DEFAULT_IMAGERY_OPACITY=100;
const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function HazardMap({language="id"}:{language?:"id"|"en"}) {
  const en=language==="en", t=(id:string,english:string)=>en?english:id;
  const shell=useRef<HTMLElement>(null), element=useRef<HTMLDivElement>(null), mapRef=useRef<L.Map|null>(null);
  const layerButton=useRef<HTMLButtonElement>(null), imageRef=useRef<L.TileLayer|null>(null);
  const opacityRef=useRef(DEFAULT_IMAGERY_OPACITY), lastFocus=useRef<string|null>(null);
  const [open,setOpen]=useState(()=>window.innerWidth>860), [tab,setTab]=useState<"layers"|"results">("layers");
  const [enabled,setEnabled]=useState({fire:true,imagery:false,wind:false});
  const [quality,setQuality]=useState<MapQuality>(()=>{try {const saved=localStorage.getItem("buktipulih_map_quality");return saved==="low"||saved==="detail"?saved:"auto";}catch{return "auto";}});
  const [device]=useState(readDeviceHints);
  const [reduceMotion,setReduceMotion]=useState(reduced);
  useEffect(()=>{const query=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduceMotion(query.matches);query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  const lowGraphics=useLowGraphics(quality,device);
  const lowRef=useRef(lowGraphics);
  useEffect(()=>{lowRef.current=lowGraphics;try{localStorage.setItem("buktipulih_map_quality",quality);}catch{}},[quality,lowGraphics]);
  const [filters,setFilters]=useState(DEFAULT_FILTERS), [area,setArea]=useState<MapBounds|null>(null);
  const [productId,setProductId]=useState(""), [chosenDate,setChosenDate]=useState("");
  const [opacity,setOpacity]=useState(DEFAULT_IMAGERY_OPACITY), [windOpacity,setWindOpacity]=useState(90);
  const [brightness,setBrightness]=useState(100), [contrast,setContrast]=useState(100);
  const [tileProgress,setTileProgress]=useState({loaded:0,total:0});
  const [airVisible,setAirVisible]=useState(true), [windVisible,setWindVisible]=useState(true), [minIspu,setMinIspu]=useState(0);
  const [selection,setSelection]=useState<{kind:"fire"|"wind"|"air";id:string}|null>(null);
  const [imageError,setImageError]=useState(false), [imageLoading,setImageLoading]=useState(false), [tileRevision,setTileRevision]=useState(0);
  const [baseError,setBaseError]=useState(false), [imageEmpty,setImageEmpty]=useState(false);
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
    if(!element.current)return;
    const map=L.map(element.current,{zoomControl:false,minZoom:3,maxZoom:13,preferCanvas:true,
      zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,maxBounds:[[-35,65],[35,170]],maxBoundsViscosity:0.8});
    mapRef.current=map;
    map.createPane("satellite").style.zIndex="250";
    map.createPane("labels").style.zIndex="380";map.getPane("labels")!.style.pointerEvents="none";
    map.createPane("wind").style.zIndex="440";
    map.createPane("air").style.zIndex="445";
    map.createPane("detections").style.zIndex="420";
    map.createPane("selection").style.zIndex="450";map.getPane("selection")!.style.pointerEvents="none";
    if(window.innerWidth<=860)map.setView([-2,118],4,{animate:false});
    else map.fitBounds([[-11,95],[6,141]],{paddingTopLeft:[330,30],paddingBottomRight:[18,80],animate:false});
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.control.scale({position:"bottomright",imperial:false}).addTo(map);
    const resize=new ResizeObserver(()=>map.invalidateSize({animate:false}));resize.observe(element.current);
    const full=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",full);
    return()=>{document.removeEventListener("fullscreenchange",full);resize.disconnect();map.remove();mapRef.current=null;};
  },[]);
  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    map.options.inertia=!lowGraphics&&!reduced();
    const basemap=enabled.imagery?"World_Imagery":"World_Topo_Map";
    const base=L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${basemap}/MapServer/tile/{z}/{y}/{x}`,{
      attribution:'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',maxNativeZoom:lowGraphics?12:17,maxZoom:13,
      updateWhenIdle:true,updateWhenZooming:false,keepBuffer:lowGraphics?0:1,
    });
    base.on("loading",()=>setBaseError(false));
    base.on("tileerror",()=>setBaseError(true));
    base.addTo(map);
    return()=>{base.remove();base.off();};
  },[lowGraphics,tileRevision,enabled.imagery]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!enabled.imagery)return;
    const labels=L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{
      pane:"labels",maxNativeZoom:lowGraphics?6:9,maxZoom:13,opacity:0.85,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,
    }).addTo(map);
    return()=>{labels.remove();};
  },[enabled.imagery,lowGraphics]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!enabled.imagery||!product||!date)return;
    const layer=new ImageryLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${product.id}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`,{
      opacity:opacityRef.current/100,pane:"satellite",maxNativeZoom:lowGraphics?6:9,maxZoom:13,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,attribution:'<a href="https://worldview.earthdata.nasa.gov/">NASA GIBS</a>',bounds:[[-85,-180],[85,180]],
    });
    imageRef.current=layer;
    layer.on("loading",()=>{setImageLoading(true);setImageError(false);setImageEmpty(false);setTileProgress({loaded:0,total:0});});
    const progress=()=>{
      const tiles=[...(layer.getContainer()?.querySelectorAll<HTMLCanvasElement>("canvas")??[])];
      setTileProgress({loaded:tiles.filter(tile=>tile.dataset.coverage!==undefined||tile.dataset.failed).length,total:tiles.length});
    };
    layer.on("tileload",progress);
    layer.on("tileerror",()=>{setImageError(true);progress();});
    layer.on("load",()=>{
      const tiles=[...(layer.getContainer()?.querySelectorAll<HTMLCanvasElement>("canvas")??[])];
      setImageEmpty(tiles.length>0&&tiles.every(tile=>tile.dataset.coverage==="0"));
      progress();setImageLoading(false);
    });layer.addTo(map);
    return()=>{layer.remove();layer.off();imageRef.current=null;};
  },[enabled.imagery,product,date,tileRevision,lowGraphics]);
  useEffect(()=>{opacityRef.current=opacity;imageRef.current?.setOpacity(opacity/100);},[opacity,enabled.imagery,product,date,tileRevision]);
  useEffect(()=>{const pane=mapRef.current?.getPane("satellite");if(pane)pane.style.filter=`brightness(${brightness}%) contrast(${contrast}%)`;},[brightness,contrast]);
  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    const group=L.layerGroup().addTo(map);
    let index=0,frame=0;
    const draw=()=>{
      const start=performance.now();
      while(index<results.length&&performance.now()-start<6) {
        const point=results[index++];
        L.circleMarker(point.coordinates,{pane:"detections",radius:4,weight:1,color:"#512616",fillColor:CONFIDENCE_COLORS[point.confidence],fillOpacity:0.95})
          .bindTooltip(()=>`${sensorName(point.satellite)} · ${point.frp_mw===null?"—":point.frp_mw+" MW"}`)
          .on("click",()=>select({kind:"fire",point})).addTo(group);
      }
      if(index<results.length)frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);group.remove();};
  },[results,select]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!enabled.wind||!windVisible)return;
    const group=L.layerGroup().addTo(map);
    map.attributionControl.addAttribution('Wind: <a href="https://open-meteo.com/">Open-Meteo</a> / ECMWF');
    let animation:WindLayer|undefined;
    if(!lowGraphics&&!reduceMotion&&sources.wind.data?.points.length)animation=new WindLayer(sources.wind.data.points,windOpacity/100).addTo(map);
    for(const point of animation?[]:sources.wind.data?.points??[]) {
      const length=Math.min(34,18+point.speed_kmh/2);
      const html=point.speed_kmh===0?`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="3" fill="none" stroke="${windColor(point.speed_kmh)}" stroke-width="2"/></svg>`:
        `<svg viewBox="0 0 40 40" style="transform:rotate(${windRotation(point.direction_deg)}deg)"><path d="M20 ${20+length/2}V${20-length/2}m-5 6 5-6 5 6" fill="none" stroke="${windColor(point.speed_kmh)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      L.marker(point.coordinates,{pane:"wind",opacity:animation?0.25:windOpacity/100,title:`${en?"Wind":"Angin"} ${point.speed_kmh} km/h`,
        icon:L.divIcon({className:styles.windArrow,html,iconSize:[40,40],iconAnchor:[20,20]})})
        .on("click",()=>select({kind:"wind",point})).addTo(group);
    }
    return()=>{animation?.remove();group.remove();map.attributionControl.removeAttribution('Wind: <a href="https://open-meteo.com/">Open-Meteo</a> / ECMWF');};
  },[enabled.wind,windVisible,sources.wind.data,windOpacity,select,en,lowGraphics,reduceMotion]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!enabled.wind||!airVisible)return;
    const group=L.layerGroup().addTo(map);
    map.attributionControl.addAttribution('ISPU: <a href="https://ispu.kemenlh.go.id/">KLH/BPLH</a>');
    for(const point of stations) {
      const color=ISPU_COLORS[point.category],text=point.category==="TIDAK SEHAT"?"#17221b":"#ffffff";
      const title=`${point.name} · ISPU ${point.value} · ${ISPU_LABELS[point.category][en?1:0]}`;
      const marker=L.marker(point.coordinates,{pane:"air",title,zIndexOffset:point.value,
        icon:L.divIcon({className:styles.airStation,iconSize:[44,44],iconAnchor:[22,22],html:`<span style="background:${color};color:${text}">${point.value}</span>`})})
        .on("click",()=>select({kind:"air",point})).addTo(group);
      marker.getElement()?.setAttribute("aria-label",title);
    }
    return()=>{group.remove();map.attributionControl.removeAttribution('ISPU: <a href="https://ispu.kemenlh.go.id/">KLH/BPLH</a>');};
  },[enabled.wind,airVisible,stations,select,en]);
  useEffect(()=>{
    if(!mapRef.current||!selected){lastFocus.current=null;return;}
    if(lastFocus.current!==selected.point.id) {
      lastFocus.current=selected.point.id;
      mapRef.current.invalidateSize({animate:false});
      mapRef.current.panInside(selected.point.coordinates,{paddingTopLeft:[window.innerWidth>860?340:24,76],paddingBottomRight:[65,55],animate:!lowRef.current&&!reduced()});
    }
    const halo=L.circleMarker(selected.point.coordinates,{pane:"selection",radius:11,color:"#fff",weight:2,fill:false,interactive:false}).addTo(mapRef.current);
    return()=>{halo.remove();};
  },[selected]);
  const close=()=>{setOpen(false);layerButton.current?.focus();};
  const focus=(point:HotspotObservation)=>{
    select({kind:"fire",point});const map=mapRef.current;if(!map)return;
    map.setView(point.coordinates,Math.max(7,map.getZoom()),{animate:!lowRef.current&&!reduced()});
  };
  const focusStation=(point:IspuStation)=>{
    select({kind:"air",point});const map=mapRef.current;if(!map)return;
    map.setView(point.coordinates,Math.max(7,map.getZoom()),{animate:false});
  };
  const searchArea=()=>{
    const b=mapRef.current?.getBounds();if(!b)return;
    setArea([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]);setSelection(null);setTab("results");setOpen(true);
  };
  const full=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{setMessage(t("Layar penuh tidak tersedia pada browser ini.","Fullscreen is unavailable in this browser."));}};
  const resetExtent=()=>{
    const map=mapRef.current;if(!map)return;
    if(window.innerWidth<=860)map.setView([-2,118],4,{animate:!lowRef.current&&!reduced()});
    else map.fitBounds([[-11,95],[6,141]],{paddingTopLeft:[open?330:16,30],paddingBottomRight:[18,80],animate:!lowRef.current&&!reduced()});
  };
  const toggle=(key:LayerKey)=>{setEnabled(s=>({...s,[key]:!s[key]}));setSelection(null);};
  const busy=sources.fire.loading||sources.imagery.loading||sources.wind.loading||sources.air.loading;
  return <section ref={shell} className={`${styles.shell} ${open?styles.panelOpen:""}`} aria-label={t("Peta pemantauan satelit","Satellite monitoring map")} onKeyDown={e=>{if(e.key==="Escape"&&open)close();}}>
    <div ref={element} className={styles.map} aria-label={t("Peta interaktif","Interactive map")}/>
    <div className={styles.topbar}>
      <button ref={layerButton} className={styles.layerButton} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><MapIcon name="layers"/>{t("Lapisan","Layers")}<span>{Object.values(enabled).filter(Boolean).length}</span></button>
      <button className={styles.searchButton} onClick={searchArea}><MapIcon name="search"/>{t("Cari di area ini","Search this area")}</button>
    </div>
    <div className={styles.tools} aria-label={t("Kontrol peta","Map controls")}>
      <button className={styles.iconButton} disabled={busy} onClick={()=>{sources.refresh();setTileRevision(n=>n+1);setNow(Date.now());}} aria-label={t("Muat ulang sumber","Reload sources")} title={t("Muat ulang sumber","Reload sources")}><MapIcon name="refresh"/></button>
      <button className={styles.iconButton} onClick={resetExtent} aria-label={t("Tampilkan Indonesia","Show Indonesia")} title={t("Tampilkan Indonesia","Show Indonesia")}><MapIcon name="extent"/></button>
      <button className={styles.iconButton} onClick={full} aria-label={fullscreen?t("Keluar layar penuh","Exit fullscreen"):t("Layar penuh","Fullscreen")} title={t("Layar penuh","Fullscreen")}><MapIcon name="expand"/></button>
    </div>
    {open&&<HazardPanel en={en} now={now} tab={tab} setTab={setTab} onClose={close} enabled={enabled} toggle={toggle} filters={filters} setFilters={setFilters} sources={sources}
      product={product} setProduct={id=>{setProductId(id);setChosenDate("");}} date={date} setDate={setChosenDate} opacity={opacity} setOpacity={setOpacity} windOpacity={windOpacity} setWindOpacity={setWindOpacity}
      results={results} selected={selected} select={focus} selectStation={focusStation} clearSelection={()=>{setSelection(null);setTab("layers");}} areaActive={!!area} clearArea={()=>setArea(null)} imageError={imageError} imageLoading={imageLoading} tileProgress={tileProgress} brightness={brightness} setBrightness={setBrightness} contrast={contrast} setContrast={setContrast}
      airVisible={airVisible} setAirVisible={setAirVisible} windVisible={windVisible} setWindVisible={setWindVisible} minIspu={minIspu} setMinIspu={setMinIspu} quality={quality} setQuality={setQuality} lowGraphics={lowGraphics}/>}
    <div className={styles.legend} aria-label={t("Legenda peta","Map legend")}>
      {enabled.fire&&<div className={styles.confidence}><span>{t("Keyakinan","Confidence")}</span>{(["low","nominal","high"] as const).map((key,i)=><span key={key}><i style={{background:CONFIDENCE_COLORS[key]}}/>{(en?["Low","Nominal","High"]:["Rendah","Nominal","Tinggi"])[i]}</span>)}</div>}
      {enabled.wind&&airVisible&&<div className={styles.ispuLegend}><span>ISPU</span>{Object.entries(ISPU_LABELS).map(([key,label])=><span key={key}><i style={{background:ISPU_COLORS[key as keyof typeof ISPU_COLORS]}}/>{label[en?1:0]}</span>)}</div>}
      {enabled.wind&&windVisible&&<div className={styles.windLegend}><span>{t("Angin","Wind")} · m/s</span><i/><span>0</span><span>5</span><span>10+</span></div>}
      {baseError&&<div className={styles.sourceStatus}>{t("Peta dasar belum lengkap. Coba muat ulang.","Basemap incomplete. Try reloading.")}</div>}
      {enabled.fire&&sources.fire.error&&<div className={styles.sourceStatus}>{t("Titik panas belum tersedia","Hotspots unavailable")}</div>}
      <div className={styles.observationTime} role="status">{enabled.imagery?(sources.imagery.loading||imageLoading?`${t("Memuat citra","Loading imagery")} ${tileProgress.loaded}/${tileProgress.total||"…"}`:sources.imagery.error||imageError?t("Citra belum tersedia","Imagery unavailable"):`${imageEmpty?t("Belum ada citra","No imagery coverage"):t("Citra","Imagery")} · ${date} UTC`):sources.fire.data?.observed_at?formatTimeWib(sources.fire.data.observed_at):t("Peta dasar","Basemap")}{enabled.wind&&windVisible&&<span> · {t("Angin 10 m","Wind 10 m")}</span>}</div>
    </div>
    {message&&<div className={styles.notice} role="status">{message}<button onClick={()=>setMessage("")} aria-label={t("Tutup pemberitahuan","Dismiss notice")}><MapIcon name="close"/></button></div>}
  </section>;
}
