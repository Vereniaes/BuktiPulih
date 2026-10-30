// Todo:
// -> Describe viewport rain estimates and source freshness.

// --- Rain contract ---
import type { MapBounds } from "./environment";
export interface RainPoint {
  id: string;
  coordinates: [number, number];
  state: "now" | "recent" | "dry" | "unknown";
  at: string | null;
  last_rain_at: string | null;
  current_mm: number | null;
  current_interval_seconds: number | null;
  recent_mm: number | null;
}
export interface RainResult {
  points: RainPoint[];
  bounds: MapBounds;
  fetched_at: string;
  status: "ready" | "cached";
  source: "Open-Meteo";
  basis: "model";
  sample_step_deg: number;
}
// --- end of Rain contract ---
