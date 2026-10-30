// Todo:
// -> Verify cloud hints use available model samples and match hit geometry.
// -> Bound rendered areas without changing provider coordinates.

// --- Rain area tests ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/components/maps/rain-areas.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { projectRainAreas, rainAreaAt } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const map = { project: ([lng, lat]) => ({ x: lng * 100 + 500, y: 400 - lat * 100 }), getSize: () => ({ width: 1000, height: 800 }) };
const point = (id, state = "now", lat = 0, lng = 0) => ({ id, state, coordinates: [lat, lng], current_mm: .8, recent_mm: 2 });
const data = points => ({ points, sample_step_deg: 1 });

test("dry and unknown samples never become clouds", () => {
  assert.equal(projectRainAreas(map, data([point("a", "dry"), point("b", "unknown")])).length, 0);
  assert.deepEqual(projectRainAreas(map, null), []);
});
test("cloud areas preserve GeoJSON order and distinguish now from recent samples", () => {
  const areas = projectRainAreas(map, data([point("a", "now", 1, 2), point("b", "recent", 0, 1)]));
  assert.deepEqual(areas[0].center, { x: 700, y: 300 });
  assert.equal(areas[0].point.state, "now"); assert.equal(areas[1].point.state, "recent");
  assert.equal(rainAreaAt(areas, { x: 700, y: 300 }).id, "a");
});
test("hit tests follow rotated or tilted map projection", () => {
  const tilted = { ...map, project: ([lng, lat]) => ({ x: 500 + 90 * lng + 25 * lat, y: 400 + 20 * lng - 40 * lat }) };
  const areas = projectRainAreas(tilted, data([point("a")]));
  assert.equal(rainAreaAt(areas, { x: 500, y: 400 }).id, "a");
  assert.equal(rainAreaAt(areas, { x: 600, y: 500 }), null);
});
test("adjacent rain samples have overlapping soft areas without a square boundary", () => {
  const areas = projectRainAreas(map, data([point("a", "now", 0, 0), point("b", "now", 0, 1)]));
  assert.equal(areas.length, 2); assert.ok(rainAreaAt(areas, { x: 550, y: 400 }));
});
test("duplicate samples and offscreen cells are not repeatedly rendered", () => {
  const areas = projectRainAreas(map, data([point("a"), point("a"), point("far", "now", 0, 100)]));
  assert.equal(areas.length, 1);
});
test("invalid step and nonfinite model coordinates remain unavailable", () => {
  assert.deepEqual(projectRainAreas(map, { ...data([point("a")]), sample_step_deg: 0 }), []);
  assert.equal(projectRainAreas(map, data([point("a", "now", NaN, 0)])).length, 0);
});
test("cloud processing is bounded and missing intensity is a subdued area hint", () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ ...point(String(i)), current_mm: null }));
  const areas = projectRainAreas(map, data(points)); assert.equal(areas.length, 100);
  assert.equal(areas[0].strength, .45);
});
// --- end of Rain area tests ---
