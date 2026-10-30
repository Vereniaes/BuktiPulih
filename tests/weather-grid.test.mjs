// Todo:
// -> Verify map weather values, bounds, missing cells and metric colors.

// --- Weather grid behavior ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(readFileSync(new URL("../src/components/maps/weather-grid.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { sampleWeather, weatherBounds, weatherColor, WEATHER_SCALES } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const data = { grid: { west: 100, south: -2, step: 1, columns: 2, rows: 2 }, fields: { temperature: [10, 20, 30, 40], rain: [0, 0, null, 8], u: [-2, -2, -2, -2], v: [1, 1, 1, 1] } };

test("southwest and northeast nodes retain geography and values after interpolation", () => {
  assert.deepEqual(weatherBounds(data), [100, -2, 101, -1]);
  assert.equal(sampleWeather(data, "temperature", 100, -2), 10);
  assert.equal(sampleWeather(data, "temperature", 101, -1), 40);
  assert.equal(sampleWeather(data, "temperature", 100.5, -1.5), 25);
});

test("missing cells are gaps while a valid dry zero remains selectable", () => {
  assert.equal(sampleWeather(data, "rain", 100.5, -1.5), null);
  assert.equal(sampleWeather(data, "rain", 100, -2), 0);
  assert.equal(sampleWeather(data, "rain", 101, -1), 8);
});

test("outside coverage never extrapolates a weather field", () => {
  for (const [lng, lat] of [[99, -2], [101.1, -1], [100, -3], [100, 0], [NaN, -1]]) assert.equal(sampleWeather(data, "temperature", lng, lat), null);
});

test("wind components interpolate across direction changes without angle wrap artifacts", () => {
  const field = { ...data, fields: { ...data.fields, u: [-1, 1, -1, 1] } };
  assert.equal(sampleWeather(field, "u", 100.5, -1.5), 0);
  assert.equal(sampleWeather(field, "v", 100.5, -1.5), 1);
});

test("dry rain is transparent and temperature and wind have distinct physical scales", () => {
  assert.equal(weatherColor("rain", 0)[3], 0);
  assert.ok(weatherColor("rain", 2)[3] > 100);
  assert.notDeepEqual(weatherColor("temperature", 30), weatherColor("wind", 30));
  assert.equal(WEATHER_SCALES.rain.unit, "mm/h");
  assert.equal(WEATHER_SCALES.gust.unit, "km/h");
  assert.equal(WEATHER_SCALES.feels_like.unit, "°C");
});
// --- end of Weather grid behavior ---
