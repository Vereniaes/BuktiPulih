// Todo:
// -> Share camera, bounds, and interaction contracts across map renderers.

// --- Map contracts ---
import type { Map as TerrainMap } from "maplibre-gl";

export type ExplorerMode = "roadmap" | "satellite" | "terrain";
export type ExplorerPoint = [longitude: number, latitude: number];
export type ExplorerBounds = [west: number, south: number, east: number, north: number];
export interface ExplorerPixel { x: number; y: number; }
export interface ExplorerCamera { center: ExplorerPoint; zoom: number; pitch: number; bearing: number; }
export interface ExplorerPadding { top: number; right: number; bottom: number; left: number; }
export interface ExplorerClick { point: ExplorerPoint; pixel: ExplorerPixel; }
export type ExplorerClickListener = (event: ExplorerClick) => boolean | void;

/** Shared map boundary. Coordinates use GeoJSON order; pixels are relative to the map container. Clicks stop when a handler returns true. */
export interface ExplorerMapApi {
  engine: "google" | "terrain";
  native: google.maps.Map | TerrainMap;
  getView(): ExplorerCamera;
  getBounds(): ExplorerBounds;
  moveTo(point: ExplorerPoint, zoom?: number, offset?: [number, number]): void;
  fitBounds(bounds: ExplorerBounds, padding?: ExplorerPadding, maxZoom?: number): void;
  project(point: ExplorerPoint): ExplorerPixel;
  unproject(pixel: ExplorerPixel): ExplorerPoint;
  getSize(): { width: number; height: number; };
  subscribe(listener: () => void): () => void;
  onClick(listener: ExplorerClickListener, priority?: number): () => void;
}
// --- end of Map contracts ---
