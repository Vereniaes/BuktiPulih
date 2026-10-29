// Shared map filters use source observations, never sample detections.
import type { HotspotObservation, HotspotTimeRange, HotspotAvailability, MapBounds } from "@/types/environment";
export type { HotspotTimeRange } from "@/types/environment";
export interface FireFilters { range:HotspotTimeRange|null; satellite:string; confidence:string; frp:number }
export const DEFAULT_FILTERS:FireFilters = { range:null, satellite:"all", confidence:"all", frp:0 };
const HOUR=3600000, DAY=24*HOUR;
export const MAX_HOTSPOT_DAYS=5;
export const HOTSPOT_RANGE_MS=MAX_HOTSPOT_DAYS*DAY;
export const toWibInput=(time:number)=>new Date(time+7*HOUR).toISOString().slice(0,13);
export const addCalendarDays=(date:string,days:number)=>new Date(Date.parse(`${date}T00:00:00Z`)+days*DAY).toISOString().slice(0,10);
export const calendarDayCount=(start:string,end:string)=>Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/DAY)+1;
function fromWibInput(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(value))return NaN;
  const time=Date.parse(`${value}:00:00+07:00`);
  return Number.isFinite(time)&&toWibInput(time)===value?time:NaN;
}
export function isHotspotHourAvailable(value:string,availability:HotspotAvailability|null,now:number) {
  const start=fromWibInput(value),end=Math.min(start+HOUR-1,now);
  return Number.isFinite(start)&&start<=now&&(!availability||availability.sources.some(source=>end>=Date.parse(source.min_date+"T00:00:00Z")&&start<=Date.parse(source.max_date+"T23:59:59.999Z")));
}
export function isHotspotDateAvailable(date:string,availability:HotspotAvailability|null,now:number) {
  const start=fromWibInput(`${date}T00`),end=Math.min(start+DAY-1,now);
  return Number.isFinite(start)&&start<=now&&(!availability||availability.sources.some(source=>end>=Date.parse(source.min_date+"T00:00:00Z")&&start<=Date.parse(source.max_date+"T23:59:59.999Z")));
}
export function canSelectHotspotEnd(date:string,start:string,availability:HotspotAvailability|null,now:number) {
  const count=calendarDayCount(start,date);
  return count>=1&&count<=MAX_HOTSPOT_DAYS&&Array.from({length:count},(_,offset)=>addCalendarDays(start,offset)).every(day=>isHotspotDateAvailable(day,availability,now));
}
export function readHotspotRange(startValue:string,endValue:string,now:number): {range:HotspotTimeRange;error?:never}|{error:"invalid"|"order"|"length"|"future";range?:never} {
  const start=fromWibInput(startValue),end=fromWibInput(endValue);
  if(!Number.isFinite(start)||!Number.isFinite(end))return {error:"invalid"};
  if(start>end)return {error:"order"};
  if(end>now)return {error:"future"};
  if(calendarDayCount(startValue.slice(0,10),endValue.slice(0,10))>MAX_HOTSPOT_DAYS)return {error:"length"};
  return {range:{start,end:Math.min(end+HOUR-1,now)}};
}
export const INDONESIA:MapBounds = [94,-12,142,8];
export const CONFIDENCE_COLORS = { low:"#f6d45b", nominal:"#ff9a45", high:"#ff514d" };
export function filterDetections(points:HotspotObservation[], filters:FireFilters, area:MapBounds|null, now:number) {
  const start=filters.range?.start??now-24*HOUR,end=filters.range?.end??now;
  return points.filter(p=> {
    const time=Date.parse(p.observed_at), [lat,lon]=p.coordinates;
    return time>=start && time<=Math.min(end,now) &&
      (filters.satellite==="all" || sensorName(p.satellite)===sensorName(filters.satellite)) &&
      (filters.confidence==="all" || p.confidence===filters.confidence) &&
      (filters.frp===0 || (p.frp_mw!==null && p.frp_mw>=filters.frp)) &&
      (!area || (lon>=area[0] && lon<=area[2] && lat>=area[1] && lat<=area[3]));
  }).sort((a,b)=>b.observed_at.localeCompare(a.observed_at));
}
export const sensorName = (value:string) => value.replace("VIIRS_", "").replace(/_(NRT|SP)$/, "").replace("NOAA", "NOAA-");
export const windRotation = (from:number) => (from+180)%360;
