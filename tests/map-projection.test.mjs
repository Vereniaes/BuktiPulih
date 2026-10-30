// Todo:
// -> Verify flat-map projection batches and native terrain fallback.

// --- Projection behavior ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(readFileSync(new URL("../src/components/maps/map-projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { snapshotProjection } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("a flat map needs only three native anchors for thousands of Mercator points", () => {
  const anchors = [[400, 300], [402.84444444444443, 300], [400, 297.1554111333358]];
  let calls = 0;
  const project = snapshotProjection({ engine: "google", getView: () => ({ center: [0, 0], pitch: 0, bearing: 0 }), project: () => {
    const [x, y] = anchors[calls++]; return { x, y };
  } });
  assert.deepEqual(project([0, 0]), { x: 400, y: 300 });
  const point = project([90, 60]);
  assert.ok(Math.abs(point.x - 656) < 0.001);
  assert.ok(Math.abs(point.y - 85.36923224116083) < 0.001);
  for (let i = 0; i < 5000; i++) project([100 + i / 1000, -10]);
  assert.equal(calls, 3);
});

test("terrain and tilted views keep the native ground projection", () => {
  const result = { x: 123, y: 456 };
  for (const [engine, pitch] of [["terrain", 45], ["google", 45]]) {
    const project = snapshotProjection({ engine, getView: () => ({ center: [118, -2], pitch, bearing: 0 }), project: () => result });
    assert.equal(project([118, -2]), result);
  }
});

test("a projection that is not ready falls back rather than shifting hit targets", () => {
  const api = { engine: "google", getView: () => ({ center: [118, -2], pitch: 0, bearing: 0 }), project: () => ({ x: NaN, y: NaN }) };
  assert.ok(Number.isNaN(snapshotProjection(api)([118, -2]).x));
});
// --- end of Projection behavior ---
