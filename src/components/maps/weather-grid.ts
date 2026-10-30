// Todo:
// -> Sample dated native weather fields without filling missing observations.
// -> Share field colors, units and a bounded Mercator texture.

// --- Grid contract and sampling ---
export type WeatherMetric = "rain" | "wind" | "gust" | "temperature" | "feels_like";
export interface WeatherGrid {
  grid: { west: number; south: number; step: number; columns: number; rows: number };
  fields: Record<WeatherMetric | "u" | "v", (number | null)[]>;
  valid_at: string; run_at: string; fetched_at: string; checked_at: string;
  status: "ready" | "cached"; source: string; basis: "model"; resolution_km: number; interval_seconds: number;
}
type ColorStop = readonly [number, number, number, number];
export const WEATHER_SCALES: Record<WeatherMetric, { unit: string; stops: readonly ColorStop[]; ticks: readonly number[] }> = {
  rain: { unit: "mm/h", stops: [[0, 192, 218, 234], [0.5, 119, 190, 243], [2, 41, 135, 225], [5, 91, 81, 197], [10, 191, 72, 137], [20, 235, 111, 51], [40, 250, 223, 57]], ticks: [0, 5, 10, 20, 40] },
  wind: { unit: "km/h", stops: [[0, 77, 66, 142], [10, 81, 105, 183], [25, 82, 174, 207], [40, 104, 210, 182], [60, 210, 222, 106], [90, 220, 131, 116], [120, 165, 63, 122]], ticks: [0, 20, 40, 60, 90, 120] },
  gust: { unit: "km/h", stops: [[0, 77, 66, 142], [20, 81, 105, 183], [40, 82, 174, 207], [60, 104, 210, 182], [90, 210, 222, 106], [120, 220, 131, 116], [180, 165, 63, 122]], ticks: [0, 30, 60, 90, 120, 180] },
  temperature: { unit: "°C", stops: [[-10, 98, 81, 174], [0, 82, 152, 197], [10, 119, 202, 190], [20, 244, 217, 104], [30, 250, 157, 48], [40, 237, 80, 45], [50, 146, 29, 85]], ticks: [-10, 0, 10, 20, 30, 40, 50] },
  feels_like: { unit: "°C", stops: [[-10, 98, 81, 174], [0, 82, 152, 197], [10, 119, 202, 190], [20, 244, 217, 104], [30, 250, 157, 48], [40, 237, 80, 45], [50, 146, 29, 85]], ticks: [-10, 0, 10, 20, 30, 40, 50] },
};

export const weatherBounds = (data: WeatherGrid): [number, number, number, number] => {
  const g = data.grid;
  return [g.west, g.south, g.west + (g.columns - 1) * g.step, g.south + (g.rows - 1) * g.step];
};

/** Purpose: Bilinearly sample the native grid, retaining gaps and its true bounds.
 * Input: Grid, metric and longitude/latitude. Output: Value or unknown.
 */
export function sampleWeather(data: WeatherGrid, metric: keyof WeatherGrid["fields"], lng: number, lat: number): number | null {
  const g = data.grid, x = (lng - g.west) / g.step, y = (lat - g.south) / g.step;
  if (!Number.isFinite(x + y) || x < 0 || y < 0 || x > g.columns - 1 || y > g.rows - 1) return null;
  const ix = Math.min(Math.floor(x), g.columns - 2), iy = Math.min(Math.floor(y), g.rows - 2), fx = x - ix, fy = y - iy;
  const values = data.fields[metric], i = iy * g.columns + ix;
  const a = values[i], b = values[i + 1], c = values[i + g.columns], d = values[i + g.columns + 1];
  const wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy;
  if (wa > 1e-10 && (a === null || !Number.isFinite(a)) || wb > 1e-10 && (b === null || !Number.isFinite(b)) ||
      wc > 1e-10 && (c === null || !Number.isFinite(c)) || wd > 1e-10 && (d === null || !Number.isFinite(d))) return null;
  return (wa > 1e-10 ? a! * wa : 0) + (wb > 1e-10 ? b! * wb : 0) + (wc > 1e-10 ? c! * wc : 0) + (wd > 1e-10 ? d! * wd : 0);
}

export function weatherColor(metric: WeatherMetric, value: number): [number, number, number, number] {
  const stops = WEATHER_SCALES[metric].stops;
  let upper = stops.findIndex(stop => stop[0] >= value);
  if (upper < 0) upper = stops.length - 1;
  const a = stops[Math.max(0, upper - 1)], b = stops[upper], ratio = a[0] === b[0] ? 0 : Math.max(0, Math.min(1, (value - a[0]) / (b[0] - a[0])));
  const alpha = metric === "rain" ? Math.min(220, Math.max(0, (value - 0.05) * 700)) : 190;
  return [1, 2, 3].map(channel => Math.round(a[channel] + (b[channel] - a[channel]) * ratio)).concat(alpha) as [number, number, number, number];
}

export const weatherGradient = (metric: WeatherMetric) => {
  const stops = WEATHER_SCALES[metric].stops, min = stops[0][0], max = stops.at(-1)![0];
  return `linear-gradient(90deg,${stops.map(([value, r, g, b]) => `rgb(${r},${g},${b}) ${(value - min) / (max - min) * 100}%`).join(",")})`;
};
// --- end of Grid contract and sampling ---

// --- Geographic texture ---
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const textures = new WeakMap<WeatherGrid["fields"], Map<string, HTMLCanvasElement>>();

/** Purpose: Build one finite texture whose rows follow Mercator latitude.
 * Input: Regional grid and active metric. Output: Image for both native map engines.
 */
export function weatherTexture(data: WeatherGrid, metric: WeatherMetric, lowGraphics = false): HTMLCanvasElement {
  const key = `${metric}:${lowGraphics}`, cache = textures.get(data.fields) ?? new Map<string, HTMLCanvasElement>();
  const cached = cache.get(key);
  if (cached) { cache.delete(key); cache.set(key, cached); return cached; }
  const [west, south, east, north] = weatherBounds(data), top = mercatorY(north), bottom = mercatorY(south);
  const g = data.grid, values = data.fields[metric];
  const canvas = document.createElement("canvas");
  canvas.width = lowGraphics ? 512 : 1024; canvas.height = Math.round(canvas.width * (top - bottom) / ((east - west) * Math.PI / 180));
  const context = canvas.getContext("2d")!, pixels = context.createImageData(canvas.width, canvas.height);
  const stops = WEATHER_SCALES[metric].stops, minimum = stops[0][0], span = stops.at(-1)![0] - minimum;
  const palette = Array.from({ length: 1024 }, (_, i) => weatherColor(metric, minimum + i / 1023 * span));
  const indices = new Uint16Array(canvas.width), fractions = new Float32Array(canvas.width);
  for (let x = 0; x < canvas.width; x++) {
    const gx = x / (canvas.width - 1) * (g.columns - 1);
    indices[x] = Math.min(Math.floor(gx), g.columns - 2); fractions[x] = gx - indices[x];
  }
  for (let y = 0; y < canvas.height; y++) {
    const lat = Math.max(south, Math.min(north, (2 * Math.atan(Math.exp(top - y / (canvas.height - 1) * (top - bottom))) - Math.PI / 2) * 180 / Math.PI));
    const gy = (lat - south) / g.step, iy = Math.min(Math.floor(gy), g.rows - 2), fy = gy - iy;
    for (let x = 0; x < canvas.width; x++) {
      const n = iy * g.columns + indices[x], fx = fractions[x];
      const a = values[n], b = values[n + 1], c = values[n + g.columns], d = values[n + g.columns + 1];
      if (a === null || b === null || c === null || d === null) continue;
      const value = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      if (!Number.isFinite(value)) continue;
      const color = palette[Math.max(0, Math.min(1023, Math.round((value - minimum) / span * 1023)))], i = (y * canvas.width + x) * 4;
      pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2]; pixels.data[i + 3] = color[3];
    }
  }
  context.putImageData(pixels, 0, 0);
  cache.set(key, canvas); if (cache.size > 3) cache.delete(cache.keys().next().value!);
  textures.set(data.fields, cache);
  return canvas;
}
// --- end of Geographic texture ---
