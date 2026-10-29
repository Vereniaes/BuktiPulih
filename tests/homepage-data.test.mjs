// Run against the actual TypeScript forecast parser without adding a test framework.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/utils/hourlyForecast.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { parseHourlyForecast, fetchHourlyForecast, formatTimeWib } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("null, missing and non-numeric hourly values remain gaps, while zero is retained", () => {
  const result = parseHourlyForecast({ hourly: { time: [1, 2, 3, 4, 5], pm2_5: [0, null, "4", 5] } }, ["pm2_5"], 0);
  assert.deepEqual(result.points.map(p => p.values.pm2_5), [0, null, null, 5, null]);
  assert.equal(result.points[0].time, 1000);
});

test("malformed model responses are not interpreted as zero readings", () => {
  for (const input of [null, {}, { hourly: {} }, { hourly: { time: [1] } }]) {
    assert.throws(() => parseHourlyForecast(input, ["pm2_5"]));
  }
});

test("timestamps are presented in WIB independently of machine timezone", () => {
  assert.match(formatTimeWib("2026-10-17T23:00:00Z"), /18 Okt, 06[.:]00 WIB/i);
});

test("independent providers can succeed and fail without synthetic replacement", async t => {
  t.mock.method(globalThis, "fetch", async url => String(url).includes("air.example")
    ? new Response("{}", { status: 429 }) : Response.json({ hourly: { time: [1], precipitation: [0] } }));
  const [air, weather] = await Promise.all([
    fetchHourlyForecast("https://air.example", 0, 1, ["pm2_5"]),
    fetchHourlyForecast("https://weather.example", 0, 1, ["precipitation"]),
  ]);
  assert.equal(air.status, "unavailable");
  assert.deepEqual(air.points, []);
  assert.equal(weather.status, "ready");
  assert.equal(weather.points[0].values.precipitation, 0);
});

test("same-location requests are shared and served from cache", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ hourly: { time: [1], pm2_5: [12] } }); });
  await Promise.all(Array.from({ length: 5 }, () => fetchHourlyForecast("https://shared.example", 2, 3, ["pm2_5"])));
  await fetchHourlyForecast("https://shared.example", 2, 3, ["pm2_5"]);
  assert.equal(calls, 1);
});

test("failed refresh preserves the original fetch time and cached state", async t => {
  let now = 1000000, fail = false;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async () => {
    if (fail) throw new Error("offline");
    return Response.json({ hourly: { time: [1], pm2_5: [12] } });
  });
  const first = await fetchHourlyForecast("https://cached.example", 4, 5, ["pm2_5"]);
  now += 16 * 60000; fail = true;
  const second = await fetchHourlyForecast("https://cached.example", 4, 5, ["pm2_5"]);
  assert.equal(second.status, "cached");
  assert.equal(second.fetched_at, first.fetched_at);
});
