// Official ISPU station values and pollutant subindices, without model replacements.
export type IspuCategory = "BAIK" | "SEDANG" | "TIDAK SEHAT" | "SANGAT TIDAK SEHAT" | "BERBAHAYA";
export interface IspuStation {
  id:string; name:string; address:string; province:string; coordinates:[number,number];
  value:number; category:IspuCategory; dominant_pollutant:string; observed_at:string; station_type:string;
}
export interface IspuResult { stations:IspuStation[]; fetched_at:string; source:"KLH/BPLH"; status:"ready"|"cached" }
export interface IspuDetail { station:IspuStation; pollutants:{key:string;label:string;index:number|null}[]; fetched_at:string; status:"ready"|"cached" }
export const ISPU_COLORS:Record<IspuCategory,string> = { BAIK:"#19743d", SEDANG:"#285bc4", "TIDAK SEHAT":"#ecd437", "SANGAT TIDAK SEHAT":"#c53c30", BERBAHAYA:"#252b27" };
export const ISPU_LABELS:Record<IspuCategory,[string,string]> = { BAIK:["Baik","Good"], SEDANG:["Sedang","Moderate"], "TIDAK SEHAT":["Tidak sehat","Unhealthy"], "SANGAT TIDAK SEHAT":["Sangat tidak sehat","Very unhealthy"], BERBAHAYA:["Berbahaya","Hazardous"] };
