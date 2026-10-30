// Todo:
// -> Match selected detections to island polygons and subdistrict components.
// -> Keep missing names unknown without guessing from province or nearest island.

// --- Selected location names ---
import type { IslandLabel } from "@/data/islandLabels";
import type { ExplorerPoint } from "@/types/explorer-map";
import { containsLocation } from "../maps/map-context";

/** Purpose: Match a physical island. Input: Coordinates, polygons and language. Output: Name or unknown. */
export function islandAt(point: ExplorerPoint, islands: IslandLabel[], en: boolean): string | null {
  const [lng, lat] = point;
  const island = islands.find(({ bbox: [west, south, east, north], polygons }) =>
    lng >= west && lng <= east && lat >= south && lat <= north && containsLocation(point, polygons));
  return island ? en ? island.english : island.name : null;
}

/** Purpose: Read an Indonesian subdistrict. Input: Google address components. Output: Name or unknown. */
export function subdistrictFrom(results: Pick<google.maps.GeocoderResult, "address_components">[]): string | null {
  for (const result of results) {
    if (!result.address_components.some(part => part.types.includes("country") && part.short_name === "ID")) continue;
    const part = result.address_components.find(part => part.types.includes("administrative_area_level_3"));
    if (part?.long_name.trim()) return part.long_name.trim();
  }
  return null;
}
// --- end of Selected location names ---
