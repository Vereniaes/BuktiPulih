// Check combined forum search, region and ordering against the shared TypeScript helper.
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
const { getSortedPosts } = await import(dataUrl(source));
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
