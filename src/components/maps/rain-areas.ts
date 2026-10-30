// Todo:
// -> Project rain model samples as soft area hints.
// -> Keep unavailable samples clear and hit tests aligned with the canvas.

// --- Rain area geometry ---
import type { ExplorerMapApi, ExplorerPixel } from "@/types/explorer-map";
import type { RainPoint, RainResult } from "@/types/rain";

export interface RainArea { point: RainPoint; center: ExplorerPixel; east: ExplorerPixel; north: ExplorerPixel; strength: number; }
const PUFFS = [[-.32, -.12, .77, .65], [.3, -.04, .8, .72], [-.03, .34, .72, .62]] as const;
export const rainPuffs = PUFFS;

/** Purpose: Project model-cell areas, not precise rain boundaries. Input: current map and samples. Output: bounded canvas geometry. */
export function projectRainAreas(api: ExplorerMapApi, data: RainResult | null): RainArea[] {
  if (!data || !Number.isFinite(data.sample_step_deg) || data.sample_step_deg <= 0) return [];
  const radius = Math.min(12, data.sample_step_deg * .63), size = api.getSize(), ids = new Set<string>();
  const areas: RainArea[] = [];
  for (const point of data.points.slice(0, 100)) {
    if (point.state !== "now" && point.state !== "recent" || ids.has(point.id)) continue;
    const [lat, lng] = point.coordinates;
    if (!Number.isFinite(lat + lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) continue;
    ids.add(point.id);
    const center = api.project([lng, lat]), east = api.project([lng + radius, lat]), north = api.project([lng, Math.min(85, lat + radius)]);
    const x = { x: east.x - center.x, y: east.y - center.y }, y = { x: north.x - center.x, y: north.y - center.y };
    if (![center.x, center.y, x.x, x.y, y.x, y.y].every(Number.isFinite)) continue;
    const reachX = (Math.abs(x.x) + Math.abs(y.x)) * 1.2, reachY = (Math.abs(x.y) + Math.abs(y.y)) * 1.2;
    if (center.x + reachX < 0 || center.x - reachX > size.width || center.y + reachY < 0 || center.y - reachY > size.height) continue;
    const amount = point.state === "now" ? point.current_mm : point.recent_mm;
    areas.push({ point, center, east: x, north: y, strength: typeof amount === "number" && Number.isFinite(amount) ? Math.min(1, .45 + Math.log1p(Math.max(0, amount)) * .22) : .45 });
  }
  return areas;
}

/** Purpose: Pick a visible cloud area. Input: projected areas and map pixel. Output: nearest containing model sample or null. */
export function rainAreaAt(areas: RainArea[], pixel: ExplorerPixel): RainPoint | null {
  let nearest: RainPoint | null = null, distance = Infinity;
  for (const area of areas) {
    const { east, north, center } = area, determinant = east.x * north.y - east.y * north.x;
    if (Math.abs(determinant) < .001) continue;
    const dx = pixel.x - center.x, dy = pixel.y - center.y;
    const x = (dx * north.y - dy * north.x) / determinant, y = (east.x * dy - east.y * dx) / determinant;
    if (!PUFFS.some(([px, py, rx, ry]) => ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < .81)) continue;
    const score = x * x + y * y;
    if (score < distance) { nearest = area.point; distance = score; }
  }
  return nearest;
}
// --- end of Rain area geometry ---
