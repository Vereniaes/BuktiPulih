// Todo:
// -> Keep NASA products and dates advertised by GIBS.
// -> Revalidate metadata without hiding previously available imagery.

// --- NASA catalog ---
export const IMAGERY_PRODUCTS = [
  { id:"VIIRS_NOAA20_CorrectedReflectance_TrueColor", label:"VIIRS · NOAA-20" },
  { id:"VIIRS_NOAA21_CorrectedReflectance_TrueColor", label:"VIIRS · NOAA-21" },
  { id:"MODIS_Terra_CorrectedReflectance_TrueColor", label:"MODIS · Terra" },
  { id:"MODIS_Aqua_CorrectedReflectance_TrueColor", label:"MODIS · Aqua" },
];
export interface ImageryProduct { id:string; label:string; dates:string[] }
export interface ImageryCatalog {
  products:ImageryProduct[];
  status:"ready"|"cached";
  fetched_at:string;
  checked_at:string;
}
/** Purpose: Read supported imagery dates. Input: NASA capabilities XML. Output: Advertised products only. */
export function parseImageryCatalog(xml:string): ImageryProduct[] {
  const layers = xml.match(/<Layer(?:\s[^>]*)?>[\s\S]*?<\/Layer>/g) ?? [];
  return IMAGERY_PRODUCTS.flatMap(product => {
    const layer = layers.find(s=>s.includes(`<ows:Identifier>${product.id}</ows:Identifier>`));
    const dimension = layer?.match(/<Dimension>[\s\S]*?<\/Dimension>/)?.[0];
    const latest = dimension?.match(/<Default>(\d{4}-\d{2}-\d{2})<\/Default>/)?.[1];
    if (!latest || !Number.isFinite(Date.parse(latest)) || new Date(latest).toISOString().slice(0,10)!==latest) return [];
    const ranges = [...dimension!.matchAll(/<Value>([^<]+)<\/Value>/g)].map(m=>m[1].split("/"));
    const dates = Array.from({length:7},(_,i)=>new Date(Date.parse(latest)-i*86400000).toISOString().slice(0,10))
      .filter(day=>ranges.some(([start,end])=>day>=start && day<=(end??start)));
    return dates.length ? [{ ...product,dates }] : [];
  });
}
// --- end of NASA catalog ---

// --- Shared metadata cache ---
const CATALOG_URL="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml";
const FRESH_MS=15*60_000, MAX_AGE_MS=24*60*60_000, RETRY_MS=60_000;
/** Purpose: Keep known dates available during bounded upstream failures.
 * Input: Fetch, clock and background-work adapters. Output: One coalesced catalog reader with explicit cached status.
 */
export function createImageryCatalog(request=fetch,clock=Date.now,defer:(job:Promise<ImageryCatalog>)=>void=job=>{void job.catch(()=>{});}) {
  let saved:ImageryCatalog|undefined,pending:Promise<ImageryCatalog>|undefined;
  let attempted=-Infinity,checkedAt:string|undefined,lastError:Error|undefined;
  const refresh=()=>{
    if(pending)return pending;
    attempted=clock();checkedAt=new Date(attempted).toISOString();
    pending=(async()=>{
      try {
        const response=await request(CATALOG_URL,{cache:"no-store",signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error("Imagery unavailable");
        const products=parseImageryCatalog(await response.text());
        if(!products.length)throw new Error("Imagery unavailable");
        const fetched_at=new Date(clock()).toISOString();
        saved={products,status:"ready",fetched_at,checked_at:checkedAt!};lastError=undefined;
        return saved;
      } catch {
        lastError=new Error("Imagery unavailable");throw lastError;
      } finally {pending=undefined;}
    })();
    return pending;
  };
  return async():Promise<ImageryCatalog>=>{
    const now=clock(),age=saved?now-Date.parse(saved.fetched_at):Infinity;
    if(saved&&age>=0&&age<FRESH_MS)return saved;
    if(saved&&age>=0&&age<MAX_AGE_MS) {
      if(!pending&&now-attempted>=RETRY_MS)defer(refresh());
      return {...saved,status:"cached",checked_at:checkedAt??saved.checked_at};
    }
    if(pending)return pending;
    if(lastError&&now-attempted<RETRY_MS)throw lastError;
    return refresh();
  };
}
// --- end of Shared metadata cache ---
