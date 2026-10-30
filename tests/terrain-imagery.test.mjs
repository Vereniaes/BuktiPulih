// Todo:
// -> Verify real parent-image fallback and shared request budgets.
// -> Keep cancellation from dropping another visible tile.

// --- Terrain imagery behavior ---
import assert from "node:assert/strict";
import { test } from "node:test";
import { createTerrainImagery } from "../src/components/maps/terrain-imagery.ts";

function presence(url, missing = false) {
  const match = String(url).match(/tilemap\/(\d+)\/(\d+)\/(\d+)/);
  return match ? Response.json({ location: { top: Number(match[2]), left: Number(match[3]), width: 32, height: 32 }, data: Array(1024).fill(missing ? 0 : 1) }) : null;
}
const image = () => new Response(new Blob(["imagery"], { type: "image/jpeg" }), { status: 200, headers: { "content-type": "image/jpeg" } });

test("Missing detailed imagery uses the matching quadrant of a real parent tile", async t => {
  const requests = [], rectangles = [];
  t.mock.method(globalThis, "fetch", async url => { requests.push(url); const block = presence(url, String(url).includes("/19/")); if (block) return block; return image(); });
  const previousBitmap = globalThis.createImageBitmap, previousDocument = globalThis.document;
  globalThis.createImageBitmap = async () => ({ width: 256, height: 256, close() {} });
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage: (...args) => rectangles.push(args.slice(1)) }), toBlob: callback => callback(new Blob(["cropped"])), width: 0, height: 0 }) };
  const loader = createTerrainImagery(4);
  try {
    assert.equal(new TextDecoder().decode(await loader.load(`${loader.protocol}://19/11/7`, new AbortController().signal)), "cropped");
    assert.deepEqual(requests.filter(url => url.includes("/tile/")).map(url => url.split("/tile/")[1]), ["18/3/5?blankTile=false"]);
    assert.equal(requests.filter(url => url.includes("/tilemap/")).length, 2);
    assert.deepEqual(rectangles, [[128, 128, 128, 128, 0, 0, 256, 256]]);
  } finally { loader.dispose(); globalThis.createImageBitmap = previousBitmap; globalThis.document = previousDocument; }
});

test("Repeated visible requests share a fetch and keep other readers alive when one is cancelled", async t => {
  let fetches = 0, complete;
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => {
    const block = presence(_url); if (block) return block;
    fetches++; await new Promise((resolve, reject) => { complete = resolve; signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true }); }); return image();
  });
  const loader = createTerrainImagery(4), first = new AbortController(), second = new AbortController();
  try {
    const cancelled = loader.load(`${loader.protocol}://18/11/7`, first.signal), visible = loader.load(`${loader.protocol}://18/11/7`, second.signal);
    await new Promise(resolve => setTimeout(resolve, 0)); first.abort();
    await assert.rejects(cancelled, { name: "AbortError" }); complete();
    assert.equal(new TextDecoder().decode(await visible), "imagery"); assert.equal(fetches, 1);
    await loader.load(`${loader.protocol}://18/11/7`, new AbortController().signal); assert.equal(fetches, 1);
  } finally { loader.dispose(); }
});

test("Basic imagery never exceeds four simultaneous network requests", async t => {
  let active = 0, maximum = 0;
  t.mock.method(globalThis, "fetch", async url => { const block = presence(url); if (block) return block; active++; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return image(); });
  const loader = createTerrainImagery(4);
  try {
    await Promise.all(Array.from({ length: 16 }, (_, x) => loader.load(`${loader.protocol}://18/${x}/7`, new AbortController().signal)));
    assert.equal(maximum, 4); assert.equal(active, 0);
  } finally { loader.dispose(); }
});

test("Closing a map cancels queued and active imagery without starting the queued requests", async t => {
  let started = 0;
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => {
    const block = presence(_url); if (block) return block;
    started++; await new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true })); return image();
  });
  const loader = createTerrainImagery(1);
  const requests = [loader.load(`${loader.protocol}://18/1/7`, new AbortController().signal), loader.load(`${loader.protocol}://18/2/7`, new AbortController().signal)];
  const settled = Promise.allSettled(requests); await new Promise(resolve => setTimeout(resolve, 0)); loader.dispose();
  assert.equal(started, 1); assert.ok((await settled).every(result => result.status === "rejected"));
});
// --- end of Terrain imagery behavior ---
