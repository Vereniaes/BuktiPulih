// Todo:
// -> Verify source separation, selection and coincident marker access.

// --- Marker contracts ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const projection = ts.transpileModule(readFileSync(new URL("../src/components/maps/map-projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const projectionUrl = `data:text/javascript;base64,${Buffer.from(projection).toString("base64")}`;
const source = ts.transpileModule(readFileSync(new URL("../src/components/maps/map-markers.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"./map-projection"', JSON.stringify(projectionUrl));
const { projectMarkers } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const api = { getSize: () => ({ width: 400, height: 300 }),getBounds:()=>[0,0,400,300], project: ([x, y]) => ({ x, y }), unproject: ({ x, y }) => [x, y] };
const marker = (id, group, selected = false) => ({ id, point: [100, 100], kind: "pin", label: id, cluster: group, selected });

test("plot and unverified report clusters retain separate counts", () => {
  const items = projectMarkers(api, [marker("a", "plots"), marker("b", "plots"), marker("c", "reports"), marker("d", "reports")], true, null);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(item => item.members.length), [2, 2]);
  assert.deepEqual(items.map(item => item.marker.cluster), ["plots", "reports"]);
});
test("the selected entity remains visible outside its cluster", () => {
  const items = projectMarkers(api, [marker("a", "plots", true), marker("b", "plots"), marker("c", "plots")], true, null);
  assert.equal(items.length, 2);
  assert.equal(items.at(-1).marker.id, "a");
  assert.equal(items[0].members.length, 2);
});
test("coincident cluster expansion keeps every entity selectable", () => {
  const markers = Array.from({ length: 60 }, (_, index) => marker(String(index), "plots"));
  const group = projectMarkers(api, markers, true, null)[0];
  const expanded = projectMarkers(api, markers, true, group.marker.id);
  assert.equal(expanded.length, 60);
  assert.equal(new Set(expanded.map(item => `${item.x}:${item.y}`)).size, 60);
  assert.equal(new Set(expanded.map(item => item.marker.id)).size, 60);
});
test("offscreen entities do not become pointer targets and source data stays intact", () => {
  const markers = [marker("visible", "plots"), { ...marker("outside", "plots"), point: [900, 100] }];
  assert.equal(projectMarkers(api, markers, true, null).length, 1);
  assert.equal(markers.length, 2);
});
// --- end of Marker contracts ---
