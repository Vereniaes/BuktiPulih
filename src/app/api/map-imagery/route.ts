// Todo:
// -> Serve bounded NASA metadata while imagery tiles load independently.

// --- Imagery metadata response ---
import { createImageryCatalog } from "@/lib/mapImagery";
import { after } from "next/server";
const catalog=createImageryCatalog(fetch,Date.now,job=>after(async()=>{await job.catch(()=>{});}));
/** Purpose: Return advertised imagery dates. Input: GET. Output: Fresh or explicitly cached metadata. */
export async function GET() {
  try {
    const data=await catalog();
    return Response.json(data,{headers:{"Cache-Control":data.status==="cached"?"no-store":"public, max-age=300"}});
  }
  catch{return Response.json({error:"Imagery unavailable"},{status:502});}
}
// --- end of Imagery metadata response ---
