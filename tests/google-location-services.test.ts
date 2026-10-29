// Check provider sessions, selected fields and stale-request handling without network calls.
import test from "node:test";
import assert from "node:assert/strict";
import { createLocationSearch, reverseLocation } from "../src/services/locations";
const parts = [
  { types: ["country"], longText: "Indonesia", shortText: "ID" },
  { types: ["administrative_area_level_1"], longText: "Jawa Timur" },
  { types: ["administrative_area_level_2"], longText: "Surabaya" },
  { types: ["locality"], longText: "Kecamatan Genteng" },
];
const requests: google.maps.places.AutocompleteRequest[] = [];
let details: string[] = [], address = parts, finishSearch: (() => void) | undefined, finishDetails: (() => void) | undefined;
let deferSearch = false, deferDetails = false;
let geocodeResults: unknown[] = [];
const point = { lng: () => 112.74, lat: () => -7.26 };
class Token {}
const provider = {
  AutocompleteSessionToken: Token,
  AutocompleteSuggestion: { fetchAutocompleteSuggestions: async (request: google.maps.places.AutocompleteRequest) => {
    requests.push(request);
    if (deferSearch) await new Promise<void>(resolve => { finishSearch = resolve; });
    return { suggestions: [{ placePrediction: { placeId: "test-place", mainText: "Jalan Tunjungan", text: "Jalan Tunjungan, Surabaya, Jawa Timur", toPlace: () => ({
      id: "test-place", location: point, addressComponents: address,
      fetchFields: async ({ fields }: { fields: string[] }) => { details = fields; if (deferDetails) await new Promise<void>(resolve => { finishDetails = resolve; }); },
    }) } }] };
  } },
  Geocoder: class { async geocode() { return { results: geocodeResults }; } },
};
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "local-test-placeholder";
Object.assign(globalThis, { window: globalThis, google: { maps: { importLibrary: async () => provider } } });
const signal = () => new AbortController().signal;
async function until(check: () => boolean) { while (!check()) await new Promise(resolve => setTimeout(resolve, 0)); }

test("autocomplete reuses a token while typing and starts a new session after selection", async () => {
  requests.length = 0;
  const search = createLocationSearch();
  await search("Jalan Tun", signal(), "id");
  const result = await search("Jalan Tunjungan", signal(), "id");
  assert.equal(requests[0].sessionToken, requests[1].sessionToken);
  assert.deepEqual(requests[0].includedRegionCodes, ["id"]);
  assert.equal(requests[0].language, "id");
  const match = await result.items[0].resolve(signal());
  assert.deepEqual(details, ["location", "addressComponents"]);
  assert.equal(match.city, "Surabaya"); assert.equal(match.province, "Jawa Timur"); assert.deepEqual(match.coordinates, [112.74, -7.26]);
  await search("Surabaya", signal(), "en");
  assert.notEqual(requests[1].sessionToken, requests[2].sessionToken); assert.equal(requests[2].language, "en");
});
test("a response arriving after input cancellation cannot become selectable", async () => {
  deferSearch = true; finishSearch = undefined;
  const abort = new AbortController(), pending = createLocationSearch()("Old query", abort.signal, "id");
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await until(() => !!finishSearch); abort.abort(); finishSearch!(); await rejected; deferSearch = false;
});
test("cancelled place details cannot replace the current report point", async () => {
  const result = await createLocationSearch()("Tunjungan", signal(), "id");
  deferDetails = true; finishDetails = undefined;
  const abort = new AbortController(), pending = result.items[0].resolve(abort.signal);
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await until(() => !!finishDetails); abort.abort(); finishDetails!(); await rejected; deferDetails = false;
});
test("foreign selections fail and geocoding keeps the user's exact map point", async () => {
  address = [{ types: ["country"], longText: "Malaysia", shortText: "MY" }];
  const result = await createLocationSearch()("Foreign fixture", signal(), "id");
  await assert.rejects(result.items[0].resolve(signal()), /LOCATION_OUTSIDE_INDONESIA/); address = parts;
  assert.deepEqual(await reverseLocation([112.740123, -7.260456], signal(), "id"), { items: [] });
  geocodeResults = [{ place_id: "reverse-fixture", formatted_address: "Surabaya, Jawa Timur", address_components: parts.map(p => ({ types: p.types, long_name: p.longText, short_name: p.shortText })) }];
  const reverse = await reverseLocation([112.740123, -7.260456], signal(), "id");
  assert.deepEqual(reverse.items[0].coordinates, [112.740123, -7.260456]); assert.equal(reverse.items[0].city, "Surabaya");
});
