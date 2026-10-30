// Todo:
// -> Refresh independent map sources without replacing their last successful data.
// -> Keep catalog age separate from imagery tile availability.

// --- Independent sources ---
import { useEffect, useEffectEvent, useState } from "react";
import { getHotspotsApi, getHotspotAvailabilityApi, getWindApi, getIspuApi } from "@/services/api";
import { ApiError } from "@/services/http";
import type { ImageryCatalog } from "@/lib/mapImagery";
import type { HotspotTimeRange } from "@/types/environment";
import { INDONESIA } from "./satellite-explorer";
interface Source<T> { data:T|null; loading:boolean; error:boolean; errorCode?:string; requestKey?:string; cached?:boolean; checked_at?:string }
interface SatelliteSourceOptions { fire:boolean; wind:boolean; imagery:boolean; air?:boolean }

function usePolledSource<T>(enabled:boolean,key:string,interval:number,read:(signal:AbortSignal)=>Promise<T>,timeout?:number,resourceKey?:string) {
  const [source,setSource]=useState<Source<T>>({data:null,loading:enabled,error:false});
  const readLatest=useEffectEvent(read);
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    let inFlight=false,lastAttempt=0;
    const request=async(force=false)=>{
      if(controller.signal.aborted||inFlight||document.hidden)return;
      const now=Date.now();
      if(!force&&now-lastAttempt<interval)return;
      lastAttempt=now;inFlight=true;
      const checkedAt=new Date(now).toISOString();
      setSource(s=>({...s,loading:true,checked_at:checkedAt}));
      const signal=timeout?AbortSignal.any([controller.signal,AbortSignal.timeout(timeout)]):controller.signal;
      try {
        const data=await readLatest(signal);
        if(!controller.signal.aborted)setSource({data,loading:false,error:false,requestKey:resourceKey,checked_at:checkedAt});
      } catch(error) {
        if(!controller.signal.aborted)setSource(s=>{
          const data=resourceKey!==undefined&&s.requestKey!==resourceKey?null:s.data;
          return {...s,data,loading:false,error:true,cached:data!==null,errorCode:error instanceof ApiError?error.code:undefined,requestKey:resourceKey,checked_at:checkedAt};
        });
      } finally {inFlight=false;}
    };
    const timer=window.setInterval(()=>void request(true),interval);
    const onVisibility=()=>{if(!document.hidden)void request();};
    document.addEventListener("visibilitychange",onVisibility);
    void request(true);
    return()=>{controller.abort();window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);};
  },[enabled,key,interval,timeout,resourceKey]);
  if(enabled&&resourceKey!==undefined&&source.requestKey!==resourceKey)return {...source,data:null,loading:true,error:false};
  return enabled?source:source.loading?{...source,loading:false}:source;
}

/** Purpose: Poll only enabled sources. Input: Filters and visible layers. Output: Independent source states. */
export function useSatelliteSources(range:HotspotTimeRange|null,enabled:SatelliteSourceOptions={fire:true,wind:true,imagery:true}) {
  const [revision,setRevision]=useState(0);
  const rangeKey=range?`${range.start}:${range.end}`:"latest";
  const fire=usePolledSource(enabled.fire,`${rangeKey}:${revision}`,300000,
    signal=>getHotspotsApi(INDONESIA,signal,72,range),undefined,rangeKey);
  const availability=usePolledSource(enabled.fire,String(revision),3600000,getHotspotAvailabilityApi);
  const wind=usePolledSource(enabled.wind,String(revision),300000,
    signal=>getWindApi(signal),20000);
  const air=usePolledSource(!!enabled.air,String(revision),300000,signal=>getIspuApi(signal),20000);
  const catalog=usePolledSource<ImageryCatalog>(enabled.imagery,String(revision),900000,
    async signal=>{
      const response=await fetch("/api/map-imagery",{signal});
      if(!response.ok)throw Error();
      const data=await response.json();
      if(!Array.isArray(data.products)||!data.products.length)throw Error();
      return data as ImageryCatalog;
    },12000);
  const imagery={...catalog,data:catalog.data?.products??null,
    cached:catalog.cached||catalog.data?.status==="cached",fetched_at:catalog.data?.fetched_at,checked_at:catalog.data?.checked_at};
  const refresh=()=>setRevision(n=>n+1);
  return {fire,wind,air,imagery,availability,refresh};
}
// --- end of Independent sources ---
