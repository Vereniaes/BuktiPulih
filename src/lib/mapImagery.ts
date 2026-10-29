// Keep only supported NASA true-color products and dates advertised by GIBS.
export const IMAGERY_PRODUCTS = [
  { id:"VIIRS_NOAA20_CorrectedReflectance_TrueColor", label:"VIIRS · NOAA-20" },
  { id:"VIIRS_NOAA21_CorrectedReflectance_TrueColor", label:"VIIRS · NOAA-21" },
  { id:"MODIS_Terra_CorrectedReflectance_TrueColor", label:"MODIS · Terra" },
  { id:"MODIS_Aqua_CorrectedReflectance_TrueColor", label:"MODIS · Aqua" },
];
export interface ImageryProduct { id:string; label:string; dates:string[] }
export function parseImageryCatalog(xml:string): ImageryProduct[] {
  const layers = xml.match(/<Layer(?:\s[^>]*)?>[\s\S]*?<\/Layer>/g) ?? [];
  return IMAGERY_PRODUCTS.flatMap(product => {
    const layer = layers.find(s=>s.includes(`<ows:Identifier>${product.id}</ows:Identifier>`));
    const dimension = layer?.match(/<Dimension>[\s\S]*?<\/Dimension>/)?.[0];
    const latest = dimension?.match(/<Default>(\d{4}-\d{2}-\d{2})<\/Default>/)?.[1];
    if (!latest || !Number.isFinite(Date.parse(latest))) return [];
    const ranges = [...dimension!.matchAll(/<Value>([^<]+)<\/Value>/g)].map(m=>m[1].split("/"));
    const dates = Array.from({length:7},(_,i)=>new Date(Date.parse(latest)-i*86400000).toISOString().slice(0,10))
      .filter(day=>ranges.some(([start,end])=>day>=start && day<=(end??start)));
    return dates.length ? [{ ...product,dates }] : [];
  });
}
