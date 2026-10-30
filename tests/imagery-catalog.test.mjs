// Todo:
// -> Verify catalog coalescing, bounded stale dates, retries, and source recovery.

// --- Catalog fixtures ---
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const code=ts.transpileModule(readFileSync(new URL("../src/lib/mapImagery.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {createImageryCatalog}=await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const xml=date=>`<Layer><ows:Identifier>VIIRS_NOAA20_CorrectedReflectance_TrueColor</ows:Identifier><Dimension><Default>${date}</Default><Value>2026-10-20/${date}/P1D</Value></Dimension></Layer>`;
const start=Date.parse("2026-10-30T00:00:00Z"),minute=60_000;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
// --- end of Catalog fixtures ---

// --- Cache behavior ---
test("cold catalog readers share one bounded request and retain advertised dates",async()=>{
 let calls=0,release;
 const read=createImageryCatalog(async(url,options)=>{
  calls++;assert.equal(new URL(url).hostname,"gibs.earthdata.nasa.gov");assert.equal(options.cache,"no-store");assert.ok(options.signal);
  await new Promise(resolve=>{release=resolve;});return new Response(xml("2026-10-29"));
 },()=>start);
 const first=read(),second=read();assert.equal(calls,1);release();
 const [a,b]=await Promise.all([first,second]);assert.deepEqual(a,b);
 assert.equal(a.status,"ready");assert.equal(a.products[0].dates[0],"2026-10-29");
 await read();assert.equal(calls,1);
});

test("stale metadata returns immediately while refresh is coalesced and recovers",async()=>{
 let time=start,calls=0,release;const deferred=[];
 const read=createImageryCatalog(async()=>{
  calls++;if(calls>1)await new Promise(resolve=>{release=resolve;});
  return new Response(xml(calls===1?"2026-10-29":"2026-10-30"));
 },()=>time,job=>deferred.push(job));
 const first=await read();time+=16*minute;
 const stale=await read(),again=await read();assert.equal(calls,2);assert.equal(deferred.length,1);
 assert.equal(stale.status,"cached");assert.deepEqual(stale.products,first.products);assert.equal(stale.fetched_at,first.fetched_at);
 assert.equal(again.status,"cached");assert.equal(stale.checked_at,new Date(time).toISOString());
 release();await deferred[0];const fresh=await read();
 assert.equal(fresh.status,"ready");assert.equal(fresh.products[0].dates[0],"2026-10-30");
 assert.equal(fresh.fetched_at,new Date(time).toISOString());
});

test("failed refresh keeps known dates for at most one day and backs off retries",async()=>{
 let time=start,calls=0;
 const read=createImageryCatalog(async()=>{calls++;if(calls>1)throw Error("Network unavailable");return new Response(xml("2026-10-29"));},()=>time);
 const first=await read();time+=16*minute;
 const stale=await read();await settle();
 assert.equal(stale.status,"cached");assert.equal(stale.fetched_at,first.fetched_at);
 await read();await read();assert.equal(calls,2);
 time+=minute;await read();await settle();assert.equal(calls,3);
 time=start+24*60*minute;await assert.rejects(read(),/Imagery unavailable/);
});

test("cold HTTP errors and invalid catalogs never manufacture product dates",async()=>{
 for(const response of [()=>new Response("Unavailable",{status:503}),()=>new Response("<html>Unavailable</html>")]) {
  let time=start,calls=0;
  const read=createImageryCatalog(async()=>{calls++;return response();},()=>time);
  await assert.rejects(read(),/Imagery unavailable/);await assert.rejects(read(),/Imagery unavailable/);assert.equal(calls,1);
  time+=minute;await assert.rejects(read(),/Imagery unavailable/);assert.equal(calls,2);
 }
});
// --- end of Cache behavior ---
