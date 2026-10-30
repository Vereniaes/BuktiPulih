// Todo:
// -> Drape one weather texture on Google or terrain without camera redraws.
// -> Keep entity clicks ahead of weather inspection.

// --- Native weather overlay ---
"use client";
import { useEffect, useEffectEvent } from "react";
import type { Map as TerrainMap } from "maplibre-gl";
import type { ExplorerMapApi, ExplorerPoint } from "@/types/explorer-map";
import { sampleWeather, weatherBounds, weatherTexture, type WeatherGrid, type WeatherMetric } from "./weather-grid";

export function MapWeatherLayer({ api, data, metric, onSelect, lowGraphics = false }: {
  api: ExplorerMapApi | null; data: WeatherGrid | null; metric: WeatherMetric | null; onSelect: (point: ExplorerPoint) => void; lowGraphics?: boolean;
}) {
  const select = useEffectEvent(onSelect);
  useEffect(() => {
    if (!api || !data || !metric) return;
    const canvas = weatherTexture(data, metric, lowGraphics), [west, south, east, north] = weatherBounds(data);
    const off = api.onClick(({ point }) => {
      if (sampleWeather(data, metric, point[0], point[1]) === null) return;
      select(point); return true;
    }, -10);
    let remove: () => void;
    if (api.engine === "google") {
      const layer = new google.maps.GroundOverlay(canvas.toDataURL(), { west, south, east, north }, { clickable: false, map: api.native as google.maps.Map });
      remove = () => layer.setMap(null);
    } else {
      const map = api.native as TerrainMap, id = "bp-current-weather";
      map.addSource(id, { type: "canvas", canvas, animate: false, coordinates: [[west, north], [east, north], [east, south], [west, south]] });
      const before = map.getStyle().layers?.find(layer => layer.type === "symbol")?.id;
      map.addLayer({ id, source: id, type: "raster", paint: { "raster-fade-duration": 0 } }, before);
      remove = () => { if (map.getStyle()?.sources?.[id]) { map.removeLayer(id); map.removeSource(id); } };
    }
    return () => { off(); remove(); };
  }, [api, data, metric, lowGraphics]);
  return api && data && metric ? <span hidden data-weather-field={metric} data-weather-time={data.valid_at} /> : null;
}
// --- end of Native weather overlay ---
