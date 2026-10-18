// Data used by the homepage map and forecast. Coordinates use latitude, longitude.
export type MapBounds = [number, number, number, number];
export interface HotspotObservation {
  id: string;
  coordinates: [number, number];
  observed_at: string;
  satellite: "VIIRS_NOAA20_NRT" | "VIIRS_NOAA21_NRT";
  confidence: "low" | "nominal" | "high";
  frp_mw: number | null;
}
export interface HotspotResult {
  observations: HotspotObservation[];
  bounds: MapBounds;
  fetched_at: string;
  observed_at: string | null;
  status: "complete" | "partial" | "cached";
  sources: { name: string; available: boolean }[];
}
export interface ForecastLocation {
  coordinates: [number, number];
  label: string;
}
export interface HourlyForecast {
  points: { time: number; values: Record<string, number | null> }[];
  fetched_at: string | null;
  status: "ready" | "cached" | "unavailable";
}
export interface DataResult<T> {
  data: T;
  origin: "service" | "sample";
  fetched_at: string | null;
  failed: boolean;
}
