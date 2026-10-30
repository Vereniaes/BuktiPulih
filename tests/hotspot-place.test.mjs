// Todo:
// -> Verify physical island names and subdistricts without province guesses.

// --- Selected place tests ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const contextUrl = url(compile("../src/components/maps/map-context.ts"));
const { islandAt, subdistrictFrom } = await import(url(compile("../src/components/hazards/hotspot-place.ts").replace('"../maps/map-context"', JSON.stringify(contextUrl))));
const { islandLabels } = await import(url(compile("../src/data/islandLabels.ts")));
const component = (type, name, short = name) => ({ types: [type], long_name: name, short_name: short });

test("the screenshot's point resolves to Biak instead of the Papua province or mainland", () => {
  assert.equal(islandAt([135.9130, -0.8028], islandLabels, false), "Pulau Biak");
  assert.equal(islandAt([135.9130, -0.8028], islandLabels, true), "Biak");
});

test("mainland and smaller islands are resolved by containment rather than nearest names", () => {
  for (const [point, expected] of [[[106.8, -6.2], "Jawa"], [[116.4, -8.4], "Lombok"], [[114, -2], "Kalimantan"]]) {
    assert.match(islandAt(point, islandLabels, false), new RegExp(expected, "i"));
  }
  assert.equal(islandAt([118, -5], islandLabels, false), null);
  assert.equal(islandAt([0, 0], islandLabels, false), null);
});

test("subdistrict uses address level three, not the village, city or province", () => {
  const results = [{ address_components: [component("country", "Indonesia", "ID"), component("administrative_area_level_1", "Papua"), component("administrative_area_level_2", "Kabupaten Biak Numfor"), component("administrative_area_level_4", "Inswanbesi"), component("administrative_area_level_3", "Distrik Warsa")] }];
  assert.equal(subdistrictFrom(results), "Distrik Warsa");
  assert.equal(subdistrictFrom([{ address_components: results[0].address_components.filter(part => !part.types.includes("administrative_area_level_3")) }]), null);
});

test("empty, foreign and partial address results remain unknown", () => {
  assert.equal(subdistrictFrom([]), null);
  assert.equal(subdistrictFrom([{ address_components: [component("country", "Papua New Guinea", "PG"), component("administrative_area_level_3", "Example")] }]), null);
  assert.equal(subdistrictFrom([{ address_components: [component("country", "Indonesia", "ID")] }]), null);
});
// --- end of Selected place tests ---
