// Convert and interpolate wind samples within the model grid.
import type { WindPoint } from "@/services/api";

export interface WindVector { u:number; v:number }
export interface WindSample extends WindVector { speedKmh:number }

const EARTH_RADIUS_M=6_371_000;
const COLORS=["#47d7c5","#d4e650","#ff9d43","#ed554d"] as const;

export function windColor(speedKmh:number):string {
  const speed=Math.max(0,speedKmh)/3.6;
  if(speed<=2)return COLORS[0];
  if(speed<=4)return COLORS[1];
  if(speed<=6)return COLORS[2];
  if(speed>=10)return COLORS[3];
  const from=[255,157,67],to=[237,85,77],fraction=(speed-6)/4;
  return `#${from.map((value,index)=>Math.round(value+(to[index]-value)*fraction).toString(16).padStart(2,"0")).join("")}`;
}

// Meteorological direction points to the source; the vector points downwind.
export function windVector(directionDeg:number,speedKmh:number):WindVector {
  const speed=Math.max(0,speedKmh)/3.6,angle=directionDeg*Math.PI/180;
  return {u:-speed*Math.sin(angle),v:-speed*Math.cos(angle)};
}

export function windBounds(points:WindPoint[]) {
  if(!points.length)return null;
  return points.reduce((bounds,point)=>(
    {south:Math.min(bounds.south,point.coordinates[0]),north:Math.max(bounds.north,point.coordinates[0]),
      west:Math.min(bounds.west,point.coordinates[1]),east:Math.max(bounds.east,point.coordinates[1])}
  ),{south:Infinity,north:-Infinity,west:Infinity,east:-Infinity});
}

export function interpolateWind(points:WindPoint[],lat:number,lng:number):WindSample|null {
  const bounds=windBounds(points);
  if(!bounds||lat<bounds.south||lat>bounds.north||lng<bounds.west||lng>bounds.east)return null;
  const nearest=points.map(point=>{
    const [pointLat,pointLng]=point.coordinates;
    const dx=(pointLng-lng)*Math.cos(lat*Math.PI/180),dy=pointLat-lat;
    return {point,distance2:dx*dx+dy*dy};
  }).sort((a,b)=>a.distance2-b.distance2).slice(0,4);
  const exact=nearest.find(sample=>sample.distance2<1e-12);
  if(exact)return {...windVector(exact.point.direction_deg,exact.point.speed_kmh),speedKmh:exact.point.speed_kmh};
  let total=0,u=0,v=0,speedKmh=0;
  for(const sample of nearest) {
    const weight=1/sample.distance2;total+=weight;
    const vector=windVector(sample.point.direction_deg,sample.point.speed_kmh);
    u+=vector.u*weight;v+=vector.v*weight;speedKmh+=sample.point.speed_kmh*weight;
  }
  return total?{u:u/total,v:v/total,speedKmh:speedKmh/total}:null;
}

export function pixelsPerMeter(zoom:number,latitude:number):number {
  return 256*2**zoom/(2*Math.PI*EARTH_RADIUS_M*Math.max(0.01,Math.cos(latitude*Math.PI/180)));
}
