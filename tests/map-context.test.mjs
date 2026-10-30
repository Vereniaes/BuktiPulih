// Todo:
// -> Verify mapped context preserves unknown data and respects polygon geometry.
// -> Bound loaded feature processing without claiming complete surroundings.

// --- Terrain context tests ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/components/maps/map-context.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { getTerrainContext } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const square = (x, y, size = .001) => [[x-size,y-size],[x+size,y-size],[x+size,y+size],[x-size,y+size],[x-size,y-size]];
const polygon = (coordinates, properties = {}) => ({ geometry: { type: "Polygon", coordinates }, properties });
const empty = { landcover: [], landuse: [], building: [] }, point = [110, -2];

test("missing loaded features remain unknown rather than no forest or homes", () => {
  assert.deepEqual(getTerrainContext(point, empty), { cover: null, residential: false, buildingDistance: null, limited: false });
});
test("mapped cover and residential context retain their source classification", () => {
  const cover = polygon([square(110,-2)], { class: "wood", subclass: "forest" });
  const result = getTerrainContext(point, { ...empty, landcover: [cover, cover], landuse: [polygon([square(110,-2)], { class: "residential" })] });
  assert.equal(result.cover, "forest"); assert.equal(result.residential, true); assert.equal(result.limited, false);
});
test("building distance measures a footprint edge instead of its centroid", () => {
  const building = polygon([square(110.003,-2,.0001)], { osm_id: 1 });
  const result = getTerrainContext(point, { ...empty, building: [building, building] });
  assert.ok(result.buildingDistance > 320 && result.buildingDistance < 330);
});
test("a point within a mapped footprint has zero distance", () => {
  assert.equal(getTerrainContext(point, { ...empty, building: [polygon([square(110,-2)])] }).buildingDistance, 0);
});
test("polygon holes are excluded from cover and count as distance to the footprint", () => {
  const hole = polygon([square(110,-2,.01), square(110,-2,.001)], { class: "wood" });
  assert.equal(getTerrainContext(point, { ...empty, landcover: [hole] }).cover, null);
  assert.ok(getTerrainContext(point, { ...empty, building: [hole] }).buildingDistance > 100);
});
test("any containing part of a multipolygon can describe the point", () => {
  const multi = { geometry: { type: "MultiPolygon", coordinates: [[square(109,-2)], [square(110,-2)]] }, properties: { class: "grass" } };
  assert.equal(getTerrainContext(point, { ...empty, landcover: [multi] }).cover, "grass");
});
test("distant loaded buildings do not become a nearby-home claim", () => {
  assert.equal(getTerrainContext(point, { ...empty, building: [polygon([square(111,-2)])] }).buildingDistance, null);
});
test("large feature sets are bounded and disclosed as a partial inspection", () => {
  const crowded = Array.from({ length: 3001 }, (_, i) => polygon([square(111+i/10000,-2)], { osm_id: i }));
  assert.equal(getTerrainContext(point, { ...empty, building: crowded }).limited, true);
  const dense = Array.from({ length: 60010 }, (_, i) => [110 + .001 * Math.cos(i / 60009 * Math.PI * 2), -2 + .001 * Math.sin(i / 60009 * Math.PI * 2)]);
  const limited = getTerrainContext(point, { ...empty, landcover: [polygon([dense], { class: "wood" })] });
  assert.equal(limited.cover, null); assert.equal(limited.limited, true);
});
// --- end of Terrain context tests ---
