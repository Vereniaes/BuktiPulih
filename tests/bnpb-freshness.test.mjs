// Todo:
// -> Verify BNPB dates, cache checks, and failed refresh behavior.

// --- BNPB source behavior ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

let revision = 0;
function compiledUrl(path, replacements = {}) {
  let code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) code = code.replaceAll(from, to);
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}#${revision++}`;
}
const freshnessUrl = compiledUrl("../src/utils/bnpbFreshness.ts");
const { bnpbSourceDate, bnpbStatus } = await import(freshnessUrl);
const syncModule = () => import(compiledUrl("../src/lib/bnpbSync.ts", { "@/utils/bnpbFreshness": freshnessUrl }));
const source = attributes => ({ features: [{ attributes: { provinsi: "Jambi", today_luas_terbakar: 0, total_hotspot: 0, ...attributes } }] });

test("missing and invalid source dates never become today's date", () => {
  for (const value of [null, undefined, "", 0, "2026-02-29", "2026-09-31", "2026-10-30T00:00:00Z"])
    assert.equal(bnpbSourceDate(value), null);
  assert.equal(bnpbSourceDate("2024-02-29"), "2024-02-29");
  assert.equal(bnpbSourceDate("2026-09-26"), "2026-09-26");
});

test("retrieval freshness cannot move a historical source date", () => {
  const fetched = Date.parse("2026-10-30T01:00:00Z");
  const snapshot = { sync_timestamp: new Date(fetched).toISOString(), provinces: [{ tgl_update: "2026-09-26" }] };
  assert.equal(bnpbStatus(snapshot, fetched), "ready");
  assert.equal(bnpbStatus(snapshot, fetched + 13 * 3600000), "cached");
  assert.equal(bnpbStatus({ ...snapshot, status: "cached" }, fetched), "cached");
  assert.equal(bnpbStatus({ ...snapshot, sync_timestamp: null }, fetched), "unavailable");
  assert.equal(snapshot.provinces[0].tgl_update, "2026-09-26");
});

test("a failed initial refresh stays unavailable and contains no sample provinces", async t => {
  const sync = await syncModule();
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const result = await sync.syncBnpbData();
  assert.equal(result.success, false);
  assert.equal(result.data.status, "unavailable");
  assert.equal(result.data.fetched_at, null);
  assert.equal(result.data.sync_timestamp, null);
  assert.ok(result.data.checked_at);
  assert.deepEqual(result.data.provinces, []);
});

test("refresh failure advances only the check time and retains actual zero values", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-30T01:00:00Z") });
  const sync = await syncModule();
  let fail = false;
  t.mock.method(globalThis, "fetch", async () => {
    if (fail) throw new Error("offline");
    return Response.json(source({ tgl_update: "2026-09-26", relawan: null }));
  });
  const first = await sync.syncBnpbData();
  assert.equal(first.data.status, "ready");
  assert.equal(first.data.provinces[0].tgl_update, "2026-09-26");
  assert.equal(first.data.provinces[0].total_hotspot, 0);
  assert.equal(first.data.provinces[0].relawan_lapangan, null);
  assert.equal(first.data.provinces[0].kualitas_udara_pm25, null);
  assert.equal(first.data.provinces[0].buktipulih_coverage, undefined);
  fail = true;
  t.mock.timers.setTime(Date.parse("2026-10-30T07:00:00Z"));
  const second = await sync.syncBnpbData();
  assert.equal(second.data.status, "cached");
  assert.equal(second.data.fetched_at, first.data.fetched_at);
  assert.equal(second.data.sync_timestamp, first.data.sync_timestamp);
  assert.notEqual(second.data.checked_at, first.data.checked_at);
  assert.deepEqual(second.data.provinces, first.data.provinces);
});

test("incomplete totals reject a refresh instead of replacing observations with zero", async t => {
  const sync = await syncModule();
  t.mock.method(globalThis, "fetch", async () => Response.json(source({ total_hotspot: null })));
  assert.equal((await sync.syncBnpbData()).success, false);
  assert.equal(sync.getCachedBnpbData().status, "unavailable");
});

test("concurrent refreshes share one source request", async t => {
  const sync = await syncModule();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json(source({})); });
  const [first, second] = await Promise.all([sync.syncBnpbData(), sync.syncBnpbData()]);
  assert.equal(calls, 1);
  assert.equal(first.data.fetched_at, second.data.fetched_at);
  assert.equal(first.data.provinces[0].tgl_update, null);
});
// --- end of BNPB source behavior ---
