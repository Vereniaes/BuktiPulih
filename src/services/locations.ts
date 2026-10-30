// Todo:
// -> Resolve Google suggestions and selected map points.
// -> Share address components with report forms and hotspot labels.

// --- Google place lookup ---
import { googleLibrary } from "@/lib/google-maps";
import type { LocationMatch, LocationSuggestion } from "@/types/location";
type AddressPart = { types: string[]; longText?: string | null; shortText?: string | null; long_name?: string; short_name?: string };
function administration(parts: AddressPart[]) {
  const text = (type: string) => { const part = parts.find(item => item.types.includes(type)); return part?.longText ?? part?.long_name ?? ""; };
  const country = parts.find(item => item.types.includes("country"));
  if ((country?.shortText ?? country?.short_name) !== "ID") throw new Error("LOCATION_OUTSIDE_INDONESIA");
  return { province: text("administrative_area_level_1"), city: text("administrative_area_level_2") || text("locality") || text("administrative_area_level_3") };
}
export function createLocationSearch() {
  let token: google.maps.places.AutocompleteSessionToken | undefined;
  return async (query: string, signal: AbortSignal, language: "id" | "en") => {
    const places = await googleLibrary("places") as google.maps.PlacesLibrary;
    signal.throwIfAborted();
    token ??= new places.AutocompleteSessionToken();
    const session = token;
    const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query, sessionToken: session, includedRegionCodes: ["id"], language, region: "id" });
    signal.throwIfAborted();
    const items: LocationSuggestion[] = response.suggestions.flatMap(suggestion => {
      const prediction = suggestion.placePrediction;
      if (!prediction) return [];
      const name = prediction.mainText?.toString() || prediction.text.toString(), label = prediction.text.toString();
      return [{ id: prediction.placeId, name, label, resolve: async selectedSignal => {
        selectedSignal.throwIfAborted();
        const place = prediction.toPlace();
        try {
          await place.fetchFields({ fields: ["location", "addressComponents"] });
          selectedSignal.throwIfAborted();
          if (!place.location) throw new Error("LOCATION_NOT_FOUND");
          return { id: place.id, name, label, ...administration(place.addressComponents ?? []), coordinates: [place.location.lng(), place.location.lat()] };
        } finally { if (token === session) token = undefined; }
      } }];
    });
    return { items };
  };
}
/** Purpose: Read a selected point's address. Input: Coordinates, cancellation and language. Output: Address components. */
export async function reverseAddress(point: [number, number], signal: AbortSignal, language: "id" | "en") {
  const { Geocoder } = await googleLibrary("geocoding") as google.maps.GeocodingLibrary;
  signal.throwIfAborted();
  const response = await new Geocoder().geocode({ location: { lng: point[0], lat: point[1] }, language, region: "id", fulfillOnZeroResults: true });
  signal.throwIfAborted();
  return response.results;
}
export async function reverseLocation(point: [number, number], signal: AbortSignal, language: "id" | "en") {
  const results = await reverseAddress(point, signal, language);
  const result = results[0];
  if (!result) return { items: [] as LocationMatch[] };
  const area = administration(result.address_components);
  return { items: [{ id: result.place_id, name: result.formatted_address, label: result.formatted_address, ...area, coordinates: point }] };
}
// --- end of Google place lookup ---
