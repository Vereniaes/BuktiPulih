// Todo:
// -> check region search, location suggestions and existing post ordering

// --- Forum filter checks ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function compile(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
}
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const regions = dataUrl(await compile("../src/utils/plotDisplay.ts"));
const source = (await compile("../src/utils/forumDisplay.ts")).replace(/from ["']\.\/plotDisplay["']/, `from "${regions}"`);
const { getSortedPosts, getForumRegions } = await import(dataUrl(source));
const posts = [
  { id:"a", region_key:"kalteng", location_name:"Parit Sebangau", author:{username:"Hendra",city:"Palangka Raya"}, caption:"Pompa untuk gambut", created_at:"2026-10-12T12:00:00Z", metrics:{likes:2,comments_count:9,views:40} },
  { id:"b", region_key:"kalbar", location_name:"Rasau Jaya, Kalimantan Barat", author:{username:"Sari",city:"Pontianak"}, caption:"Sekat kanal basah", created_at:"2026-10-13T12:00:00Z", metrics:{likes:9,comments_count:1,views:15} },
  { id:"c", region_key:"lainnya", location_name:"Kalimantan Tengah, desa Buntoi", author:{username:"Yusuf",city:"Sampit"}, caption:"Pompa perawatan bibit", created_at:"2026-10-14T12:00:00Z", metrics:{likes:4,comments_count:3,views:100} },
];
const ids = values => values.map(value=>value.id);

test("region filtering retains explicit region and legacy province matches",()=>{
  assert.deepEqual(ids(getSortedPosts(posts,"kalteng","latest")),["c","a"]);
  assert.deepEqual(ids(getSortedPosts(posts,"kalbar","latest")),["b"]);
});
test("search matches author, city, location and notes with whitespace and mixed case",()=>{
  assert.deepEqual(ids(getSortedPosts(posts,"all","latest","  POMPA  palangka  ")),["a"]);
  assert.deepEqual(ids(getSortedPosts(posts,"all","latest","YUSUF bibit")),["c"]);
  assert.deepEqual(ids(getSortedPosts(posts,"all","latest","RASAU SEKAT")),["b"]);
});
test("search and region intersect, including empty results",()=>{
  assert.deepEqual(ids(getSortedPosts(posts,"kalteng","latest","sekat")),[]);
  assert.deepEqual(ids(getSortedPosts(posts,"kalteng","views","pompa")),["c","a"]);
  assert.deepEqual(ids(getSortedPosts([],"all","latest","catatan")),[]);
});
test("existing sort callers and blank searches preserve ordering without mutating input",()=>{
  const original=structuredClone(posts);
  assert.deepEqual(ids(getSortedPosts(posts,"all","latest"," ")),["c","b","a"]);
  assert.deepEqual(ids(getSortedPosts(posts,"all","likes")),["b","c","a"]);
  assert.deepEqual(ids(getSortedPosts(posts,"all","comments")),["a","c","b"]);
  assert.deepEqual(ids(getSortedPosts(posts,"all","views")),["c","a","b"]);
  assert.deepEqual(posts,original);
});

const located = [
  {...posts[0],id:"aceh",region_key:"lainnya",province:"Aceh",city:"Aceh Besar",location_name:"Perbukitan Jantho",author:{username:"Warga",city:"Bandung"}},
  {...posts[1],id:"sepaku",region_key:"lainnya",province:"Kalimantan Timur",city:"Penajam Paser Utara",location_name:"Persemaian Sepaku",author:{username:"Relawan",city:"Bandung"}},
];
test("region search reads report province, city and location beyond the legacy list",()=>{
  assert.deepEqual(ids(getSortedPosts(located,"  ACEH  besar ","latest")),["aceh"]);
  assert.deepEqual(ids(getSortedPosts(located,"kalimantan timur","latest")),["sepaku"]);
  assert.deepEqual(ids(getSortedPosts(located,"sepaku","latest")),["sepaku"]);
  assert.deepEqual(ids(getSortedPosts(located,"Bandung","latest")),[]);
  assert.deepEqual(ids(getSortedPosts(located,"wilayah tanpa posting","latest")),[]);
});
test("free regions intersect content search and still respect sorting",()=>{
  assert.deepEqual(ids(getSortedPosts(located,"Aceh","likes","gambut")),["aceh"]);
  assert.deepEqual(ids(getSortedPosts(located,"Aceh","latest","sekat")),[]);
  assert.deepEqual(ids(getSortedPosts(located,"all","latest","penajam sekat")),["sepaku"]);
});
test("region suggestions use report locations and legacy provinces, without author cities or duplicates",()=>{
  const names=getForumRegions([...located,...located,posts[0]]);
  for(const name of ["Aceh","Aceh Besar","Perbukitan Jantho","Kalimantan Timur","Penajam Paser Utara","Kalimantan Tengah"])assert.ok(names.includes(name),name);
  assert.ok(!names.includes("Bandung"));
  assert.equal(names.length,new Set(names.map(name=>name.toLocaleLowerCase("id-ID"))).size);
});
test("searching Bekasi does not include other cities in West Java",()=>{
  const westJava=[
    {...located[0],id:"bekasi",province:"Jawa Barat",city:"Bekasi",location_name:"Hutan Kota Bekasi"},
    {...located[1],id:"bandung",province:"Jawa Barat",city:"Bandung",location_name:"Hutan Kota Bandung"},
  ];
  assert.deepEqual(ids(getSortedPosts(westJava,"bekasi","latest")),["bekasi"]);
  assert.deepEqual(ids(getSortedPosts(westJava,"Jawa Barat","latest")),["bandung","bekasi"]);
});
// --- end of Forum filter checks ---
