// Todo:
// -> load shared categories and publish newly entered choices
"use client";

// --- Shared categories ---
import { useEffect,useState } from "react";
import { requestApi } from "@/services/http";
import { CONDITION_LABELS,ECOSYSTEM_LABELS,categoryLabel } from "@/utils/recoveryEvidence";
export interface CategoryOption {key:string;label:string}
export type CategoryKind="ecosystem"|"condition";
type Catalog=Record<CategoryKind,CategoryOption[]>;
const initial:Catalog={ecosystem:Object.entries(ECOSYSTEM_LABELS).map(([key,labels])=>({key,label:labels[0]})),condition:Object.entries(CONDITION_LABELS).map(([key,labels])=>({key,label:labels[0]}))};

export function useCategories(language:"id"|"en") {
  const [catalog,setCatalog]=useState(initial),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    requestApi<Catalog>("/forum/categories",{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setCatalog(data);setFailed(false);}}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
    return ()=>controller.abort();
  },[retry]);
  const options=(kind:CategoryKind)=>catalog[kind].map(item=>({...item,label:categoryLabel(kind,item.key,language)}));
  async function create(kind:CategoryKind,label:string) {
    const item=await requestApi<CategoryOption>("/forum/categories",{method:"POST",body:JSON.stringify({kind,label})});
    setCatalog(previous=>({...previous,[kind]:[...previous[kind].filter(value=>value.key!==item.key),item]}));
    return item.key;
  }
  return {options,create,failed,refresh:()=>setRetry(value=>value+1)};
}
// --- end of Shared categories ---
