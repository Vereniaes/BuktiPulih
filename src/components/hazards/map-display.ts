// Choose a rendering budget and preserve missing imagery as transparent pixels.
export type MapQuality = "auto" | "low" | "detail";
export interface DeviceHints { memory?:number; cores?:number; saveData?:boolean; connection?:string; mobile?:boolean }
export function useLowGraphics(quality:MapQuality,hints:DeviceHints) {
  if(quality!=="auto")return quality==="low";
  return Boolean(hints.saveData || /^(slow-2g|2g|3g)$/.test(hints.connection??"") ||
    (hints.memory!==undefined&&hints.memory<=4) || (hints.cores!==undefined&&hints.cores<=4) ||
    (hints.memory===undefined&&hints.mobile));
}
export function readDeviceHints():DeviceHints {
  const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean;effectiveType?:string}};
  return {memory:device.deviceMemory,cores:device.hardwareConcurrency,saveData:device.connection?.saveData,connection:device.connection?.effectiveType,mobile:window.matchMedia("(pointer: coarse)").matches};
}
export function clearBlackFill(pixels:Uint8ClampedArray) {
  let visible=0;
  for(let i=0;i<pixels.length;i+=4) {
    if(pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===0)pixels[i+3]=0;
    if(pixels[i+3])visible++;
  }
  return visible;
}
export function defaultImageryDate(dates:string[],now=Date.now()) {
  const today=new Date(now).toISOString().slice(0,10);
  return dates.find(date=>date<today)??dates[0]??"";
}
