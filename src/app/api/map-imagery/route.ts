// Return small source metadata; imagery tiles go directly to NASA.
import { parseImageryCatalog, type ImageryProduct } from "@/lib/mapImagery";
let saved:{products:ImageryProduct[];expires:number}|undefined;
let pending:Promise<ImageryProduct[]>|undefined;
async function catalog() {
  if(saved && saved.expires>Date.now())return saved.products;
  if(pending)return pending;
  pending=(async()=>{
    const response=await fetch("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",{
      cache:"no-store",signal:AbortSignal.timeout(20000),
    });
    if(!response.ok)throw new Error("Imagery unavailable");
    const products=parseImageryCatalog(await response.text());
    if(!products.length)throw new Error("Imagery unavailable");
    saved={products,expires:Date.now()+900000};return products;
  })();
  try{return await pending;}finally{pending=undefined;}
}
export async function GET() {
  try{return Response.json({products:await catalog()},{headers:{"Cache-Control":"public, max-age=300"}});}
  catch{return Response.json({error:"Imagery unavailable"},{status:502});}
}
