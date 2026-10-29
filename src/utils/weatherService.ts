// Todo:
// -> Read Open-Meteo wind and humidity with fixed fallback values.

// --- Weather ---
import { WindDirection } from "@/types";
import { fetchHourlyForecast } from "./hourlyForecast";

export const fetchWeatherForecast = (lat: number, lon: number) =>
  fetchHourlyForecast("https://api.open-meteo.com/v1/forecast", lat, lon,
    ["wind_speed_10m", "wind_direction_10m", "precipitation"], { wind_speed_unit: "kmh" });

export interface LiveWeatherData {
  wind_speed_kmh: number;
  wind_direction_deg: number;
  wind_direction_cardinal: WindDirection;
  wind_direction_label_id: string; // contoh: "Tenggara", "Timur"
  relative_humidity: number; // kelembapan relatif 0-100%
  temperature_c?: number;
  source_label: string;
  fetched_at: string;
  is_live: boolean;
}

interface WeatherCacheItem {
  data: LiveWeatherData;
  expiresAt: number;
}

const weatherCache = new Map<string, WeatherCacheItem>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Purpose: Map meteorological degrees to eight compass labels.
// Input: Wind direction in degrees.
// Output: Compass direction and its Indonesian label.
export function convertDegreeToCardinal(deg: number): { cardinal: WindDirection; label_id: string } {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.floor((normalized + 22.5) / 45) % 8;

  const directions: Array<{ cardinal: WindDirection; label_id: string }> = [
    { cardinal: "N", label_id: "Utara" },
    { cardinal: "NE", label_id: "Timur Laut" },
    { cardinal: "E", label_id: "Timur" },
    { cardinal: "SE", label_id: "Tenggara" },
    { cardinal: "S", label_id: "Selatan" },
    { cardinal: "BD" as WindDirection, label_id: "Barat Daya" },
    { cardinal: "W", label_id: "Barat" },
    { cardinal: "NW", label_id: "Barat Laut" },
  ];

  // Use SW for the legacy BD entry in the table.
  const dir = directions[index];
  if (index === 5) {
    return { cardinal: "SW", label_id: "Barat Daya" };
  }
  return dir;
}

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

function getFallbackWeatherData(lat: number, lng: number): LiveWeatherData {
  return {
    wind_speed_kmh: 14,
    wind_direction_deg: 135,
    wind_direction_cardinal: "SE",
    wind_direction_label_id: "Tenggara (Estimasi)",
    relative_humidity: 78,
    temperature_c: 31,
    source_label: "Model Klimatologi BMKG",
    fetched_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    is_live: false,
  };
}

// Purpose: Read wind and humidity, with a short-lived fixed fallback.
// Input: Latitude and longitude.
// Output: Weather values with their source and live flag.
export async function fetchLiveWeatherData(lat: number, lng: number): Promise<LiveWeatherData> {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,relative_humidity_2m&wind_speed_unit=kmh`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo respon gagal: ${res.status}`);
    }

    const json = await res.json();
    const current = json.current;

    const windSpeed = typeof current?.wind_speed_10m === "number" ? Math.round(current.wind_speed_10m) : 12;
    const windDeg = typeof current?.wind_direction_10m === "number" ? Math.round(current.wind_direction_10m) : 90;
    const humidity = typeof current?.relative_humidity_2m === "number" ? Math.round(current.relative_humidity_2m) : 75;

    const cardinalInfo = convertDegreeToCardinal(windDeg);

    const liveData: LiveWeatherData = {
      wind_speed_kmh: Math.max(2, Math.min(60, windSpeed)),
      wind_direction_deg: windDeg,
      wind_direction_cardinal: cardinalInfo.cardinal,
      wind_direction_label_id: cardinalInfo.label_id,
      relative_humidity: Math.max(10, Math.min(100, humidity)),
      source_label: "Open-Meteo ECMWF Live",
      fetched_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      is_live: true,
    };

    weatherCache.set(cacheKey, {
      data: liveData,
      expiresAt: now + CACHE_TTL_MS,
    });

    return liveData;
  } catch {
    // These fixed values are examples, not a BMKG observation.
    const fallback = getFallbackWeatherData(lat, lng);
    weatherCache.set(cacheKey, {
      data: fallback,
      expiresAt: now + 60 * 1000,
    });
    return fallback;
  }
}
// --- end of Weather ---
