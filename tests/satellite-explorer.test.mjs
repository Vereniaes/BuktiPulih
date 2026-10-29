import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
async function module(path){const text=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;return import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);}
const {filterDetections,DEFAULT_FILTERS,windRotation,readHotspotRange,toWibInput,HOTSPOT_RANGE_MS,calendarDayCount,addCalendarDays,canSelectHotspotEnd,isHotspotHourAvailable}=await module("../src/components/hazards/satellite-explorer.ts");
const {parseImageryCatalog}=await module("../src/lib/mapImagery.ts");
const now=Date.parse("2026-10-27T01:00:00Z");
const point={id:"one",coordinates:[-2,110],observed_at:new Date(now-3600000).toISOString(),satellite:"VIIRS_NOAA20_NRT",confidence:"high",frp_mw:0};
test("filters combine time, satellite, confidence, FRP and visible bounds",()=>{
 const points=[point,{...point,id:"older",observed_at:new Date(now-48*3600000).toISOString()}];
 assert.equal(filterDetections(points,DEFAULT_FILTERS,null,now).length,1);
 assert.equal(filterDetections(points,{...DEFAULT_FILTERS,range:{start:now-HOTSPOT_RANGE_MS,end:now}},null,now).length,2);
 for(const filter of [{frp:5},{satellite:"VIIRS_NOAA21_NRT"},{confidence:"low"}])assert.equal(filterDetections(points,{...DEFAULT_FILTERS,...filter},null,now).length,0);
 assert.equal(filterDetections(points,DEFAULT_FILTERS,[115,-5,120,5],now).length,0);
 assert.equal(filterDetections([{...point,frp_mw:null}],DEFAULT_FILTERS,null,now).length,1);
 assert.equal(filterDetections([{...point,frp_mw:null}],{...DEFAULT_FILTERS,frp:5},null,now).length,0);
 assert.equal(windRotation(0),180);assert.equal(windRotation(270),90);
});
test("imagery dates follow the advertised product range and preserve gaps",()=>{
 const xml='<Layer><ows:Identifier>VIIRS_NOAA20_CorrectedReflectance_TrueColor</ows:Identifier><Dimension><Default>2026-10-27</Default><Value>2026-10-20/2026-10-24/P1D</Value><Value>2026-10-26/2026-10-27/P1D</Value></Dimension></Layer>';
 const [product]=parseImageryCatalog(xml);assert.equal(product.dates[0],"2026-10-27");assert.ok(!product.dates.includes("2026-10-25"));assert.equal(product.dates.length,6);
 assert.deepEqual(parseImageryCatalog('<html>unavailable</html>'),[]);
});

const {useLowGraphics,clearBlackFill,defaultImageryDate}=await module("../src/components/hazards/map-display.ts");
test("quality respects a manual choice and constrained devices",()=>{
 assert.equal(useLowGraphics("detail",{memory:2,saveData:true}),false);
 assert.equal(useLowGraphics("low",{memory:16,cores:16}),true);
 for(const hints of [{saveData:true},{memory:2},{cores:2},{connection:"3g"},{mobile:true}])assert.equal(useLowGraphics("auto",hints),true);
 assert.equal(useLowGraphics("auto",{memory:8,cores:8,connection:"4g"}),false);
});
test("missing black fill is transparent without erasing dark observed colors",()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,1,2,3,255,100,140,180,255,0,0,0,0]);
 assert.equal(clearBlackFill(pixels),2);
 assert.deepEqual([...pixels],[0,0,0,0,1,2,3,255,100,140,180,255,0,0,0,0]);
});
test("default imagery avoids incomplete current UTC day without inventing dates",()=>{
 assert.equal(defaultImageryDate(["2026-10-27","2026-10-26"],now),"2026-10-26");
 assert.equal(defaultImageryDate(["2026-10-27"],now),"2026-10-27");
 assert.equal(defaultImageryDate([],now),"");
});


test("WIB date/time parsing is explicit and crosses UTC midnight",()=>{
 assert.equal(toWibInput(Date.parse("2026-10-27T20:15:00Z")),"2026-10-28T03");
 const result=readHotspotRange("2026-10-26T22","2026-10-27T08",now);
 assert.deepEqual(result,{range:{start:Date.parse("2026-10-26T15:00:00Z"),end:now}});
 for(const value of ["","bad","2026-02-31T12:00","2026-10-27T25:00","2026-10-27T08:60"])
  assert.equal(readHotspotRange(value,"2026-10-27T08",now).error,"invalid");
});

test("custom ranges reject reversed, future and excessive calendar spans",()=>{
 assert.equal(readHotspotRange("2026-10-27T08","2026-10-27T07",now).error,"order");
 assert.equal(readHotspotRange("2026-10-27T08","2026-10-27T08",now).range.end,now);
 assert.equal(readHotspotRange("2026-10-27T07","2026-10-27T09",now).error,"future");
 assert.equal(readHotspotRange("2026-10-21T07","2026-10-27T08",now).error,"length");
 assert.ok(readHotspotRange("2026-10-24T08","2026-10-27T08",now).range);
});

test("applied bounds include the last selected hour and retain other filters",()=>{
 const {range}=readHotspotRange("2026-10-26T22","2026-10-26T23",now);
 const dates=["2026-10-26T14:59:59Z","2026-10-26T15:00:00Z","2026-10-26T16:59:59Z","2026-10-26T17:00:00Z"];
 const points=dates.map((observed_at,i)=>({...point,id:String(i),observed_at}));
 const filters={...DEFAULT_FILTERS,range};
 assert.deepEqual(filterDetections(points,filters,null,now).map(p=>p.id),["2","1"]);
 assert.equal(filterDetections(points,{...filters,confidence:"low"},null,now).length,0);
 assert.equal(filterDetections(points,{...filters,satellite:"VIIRS_NOAA21_NRT"},null,now).length,0);
 assert.equal(filterDetections(points,{...filters,frp:5},null,now).length,0);
 assert.equal(filterDetections(points,filters,[115,-5,120,5],now).length,0);
 // An explicit end stays fixed as time advances; historical results do not expire out of the selected window.
 assert.equal(filterDetections(points,filters,null,now+3600000).length,2);
 assert.equal(filterDetections(points,filters,null,now+HOTSPOT_RANGE_MS).length,2);
 assert.equal(filterDetections([{...point,observed_at:new Date(now+1000).toISOString()}],{...DEFAULT_FILTERS,range:{start:now-3600000,end:now}},null,now).length,0);
});

test("historical SP observations retain their date and match the satellite filter",()=>{
 const start=Date.parse("2020-08-01T00:00:00Z"),end=Date.parse("2020-08-02T00:00:00Z");
 const points=[{...point,satellite:"VIIRS_NOAA20_SP",observed_at:new Date(start+3600000).toISOString()}];
 assert.equal(filterDetections(points,{...DEFAULT_FILTERS,range:{start,end},satellite:"VIIRS_NOAA20_NRT"},null,now).length,1);
 assert.equal(filterDetections(points,{...DEFAULT_FILTERS,range:{start,end},satellite:"VIIRS_NOAA21_NRT"},null,now).length,0);
 assert.equal(filterDetections(points,DEFAULT_FILTERS,null,now).length,0);
 assert.ok(readHotspotRange("2020-08-01T07","2020-08-02T07",now).range);
});


test("calendar end selection stops at five dates including across months and years",()=>{
 assert.equal(calendarDayCount("2026-10-29","2026-11-02"),5);
 assert.equal(addCalendarDays("2026-12-29",4),"2027-01-02");
 for(const [start,fifth,sixth] of [["2026-10-29","2026-11-02","2026-11-03"],["2026-12-29","2027-01-02","2027-01-03"],["2024-02-27","2024-03-02","2024-03-03"]]) {
  const time=Date.parse("2028-01-01T00:00:00Z");
  assert.equal(canSelectHotspotEnd(fifth,start,null,time),true);
  assert.equal(canSelectHotspotEnd(sixth,start,null,time),false);
  assert.ok(readHotspotRange(`${start}T00`,`${fifth}T23`,time).range);
  assert.equal(readHotspotRange(`${start}T23`,`${sixth}T00`,time).error,"length");
 }
});

test("unavailable calendar gaps and future hours cannot be chosen",()=>{
 const availability={sources:[{name:"VIIRS_NOAA20_SP",min_date:"2026-10-24",max_date:"2026-10-25"},{name:"VIIRS_NOAA20_NRT",min_date:"2026-10-27",max_date:"2026-10-27"}],status:"complete",fetched_at:new Date(now).toISOString()};
 assert.equal(canSelectHotspotEnd("2026-10-28","2026-10-25",availability,now),false);
 assert.equal(canSelectHotspotEnd("2026-10-28","2026-10-27",null,now),false);
 assert.equal(isHotspotHourAvailable("2026-10-27T08",null,now),true);
 assert.equal(isHotspotHourAvailable("2026-10-27T09",null,now),false);
 assert.equal(isHotspotHourAvailable("2026-10-24T06",availability,now),false);
 assert.equal(isHotspotHourAvailable("2026-10-24T07",availability,now),true);
 assert.equal(readHotspotRange("2026-10-27T07:15","2026-10-27T08",now).error,"invalid");
});
