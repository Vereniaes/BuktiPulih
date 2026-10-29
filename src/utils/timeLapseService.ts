// Todo:
// -> Combine hourly weather with modeled smoke estimates for playback.

// --- Time-lapse frames ---
import { WindDirection } from "@/types";
import { convertDegreeToCardinal } from "@/utils/weatherService";

export interface TimeLapseFrame {
  hourOffset: number; // -24 s.d. 0
  isoTimestamp: string;
  hourLabel: string; // misal: "14:00"
  fullLabel: string; // misal: "14 Okt 14:00 (-8 Jam)" atau "14 Okt 22:00 (Live)"
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCardinal: WindDirection;
  windDirectionLabelId: string;
  relativeHumidity: number;
  temperatureC: number;
  frpMultiplier: number; // 0.45x (dini hari) s.d. 1.35x (siang terik)
  estimatedPm25: number;
  estimatedAreaHa: number;
}

interface TimeLapseCacheItem {
  frames: TimeLapseFrame[];
  expiresAt: number;
}

const timeLapseCache = new Map<string, TimeLapseCacheItem>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Purpose: Build illustrative frames when hourly weather is unavailable.
// Input: Baseline PM2.5, area, and current time.
// Output: 25 synthetic hourly frames from -24 through 0.
function generateDiurnalFallbackFrames(
  basePm25: number,
  baseAreaHa: number,
  now: Date
): TimeLapseFrame[] {
  const frames: TimeLapseFrame[] = [];

  for (let offset = -24; offset <= 0; offset++) {
    const targetDate = new Date(now.getTime() + offset * 60 * 60 * 1000);
    const hour = targetDate.getHours();

    // The synthetic daily curve is lowest at 04:00 and highest at 16:00.
    const diurnalAngle = ((hour - 4) / 24) * 2 * Math.PI;
    const diurnalFactor = 0.5 * (1 - Math.cos(diurnalAngle)); // 0.0 di 04:00, 1.0 di 16:00

    const windSpeedKmh = Math.round(8 + diurnalFactor * 16);
    const temperatureC = Math.round(24 + diurnalFactor * 10);
    const relativeHumidity = Math.round(90 - diurnalFactor * 35);

    // Vary the example wind direction; this does not model local coastal weather.
    const baseDeg = 315; // NW
    const windDirectionDeg = Math.round((baseDeg + Math.sin(diurnalAngle) * 45 + 360) % 360);
    const { cardinal, label_id } = convertDegreeToCardinal(windDirectionDeg);

    const frpMultiplier = Number((0.45 + diurnalFactor * 0.9).toFixed(2));
    const estimatedPm25 = Math.round(basePm25 * (0.6 + diurnalFactor * 0.55));
    const estimatedAreaHa = Math.round(baseAreaHa * (0.75 + diurnalFactor * 0.35));

    const hourStr = `${String(hour).padStart(2, "0")}:00`;
    const dateStr = `${targetDate.getDate()} Okt`;
    const fullLabel = offset === 0 ? `${dateStr} ${hourStr} (Kondisi Terkini)` : `${dateStr} ${hourStr} (${offset} Jam)`;

    frames.push({
      hourOffset: offset,
      isoTimestamp: targetDate.toISOString(),
      hourLabel: hourStr,
      fullLabel,
      windSpeedKmh,
      windDirectionDeg,
      windDirectionCardinal: cardinal,
      windDirectionLabelId: label_id,
      relativeHumidity,
      temperatureC,
      frpMultiplier,
      estimatedPm25,
      estimatedAreaHa,
    });
  }

  return frames;
}

// Purpose: Build hourly frames; smoke and FRP remain modeled estimates.
// Input: Coordinates and baseline smoke values.
// Output: Frames for the previous 24 hours.
export async function fetch24HourTimeLapse(
  lat: number,
  lng: number,
  baseMetrics: { basePm25: number; baseAreaHa: number } = { basePm25: 168, baseAreaHa: 12450 }
): Promise<TimeLapseFrame[]> {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = timeLapseCache.get(cacheKey);
  const now = new Date();

  if (cached && cached.expiresAt > Date.now()) {
    return cached.frames;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=windspeed_10m,winddirection_10m,relativehumidity_2m,temperature_2m&past_days=1&forecast_days=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const times: string[] = data.hourly?.time || [];
    const windSpeeds: number[] = data.hourly?.windspeed_10m || [];
    const windDirs: number[] = data.hourly?.winddirection_10m || [];
    const humidities: number[] = data.hourly?.relativehumidity_2m || [];
    const temps: number[] = data.hourly?.temperature_2m || [];

    if (times.length < 24) {
      throw new Error("Data deret waktu tidak lengkap");
    }

    const currentIsoHour = now.toISOString().slice(0, 13);
    let currentIndex = times.findIndex((t) => t.startsWith(currentIsoHour));
    if (currentIndex === -1) currentIndex = Math.min(24, times.length - 1);

    const frames: TimeLapseFrame[] = [];
    for (let offset = -24; offset <= 0; offset++) {
      const idx = currentIndex + offset;
      const safeIdx = Math.max(0, Math.min(times.length - 1, idx));

      const timeStr = times[safeIdx];
      const targetDate = new Date(timeStr);
      const hour = targetDate.getHours();

      const windSpeedKmh = Math.round(windSpeeds[safeIdx] ?? 18);
      const windDirectionDeg = Math.round(windDirs[safeIdx] ?? 315);
      const relativeHumidity = Math.round(humidities[safeIdx] ?? 75);
      const temperatureC = Math.round(temps[safeIdx] ?? 29);

      const { cardinal, label_id } = convertDegreeToCardinal(windDirectionDeg);

      // FRP and smoke vary by a fixed day/night rule, not historical satellite readings.
      const diurnalFactor = hour >= 11 && hour <= 16 ? 1.0 : (hour >= 20 || hour <= 6 ? 0.35 : 0.65);
      const frpMultiplier = Number((0.45 + diurnalFactor * 0.9).toFixed(2));
      const estimatedPm25 = Math.round(baseMetrics.basePm25 * (0.6 + diurnalFactor * 0.55));
      const estimatedAreaHa = Math.round(baseMetrics.baseAreaHa * (0.8 + diurnalFactor * 0.3));

      const hourStr = `${String(hour).padStart(2, "0")}:00`;
      const dateStr = `${targetDate.getDate()} Okt`;
      const fullLabel = offset === 0 ? `${dateStr} ${hourStr} (Kondisi Terkini)` : `${dateStr} ${hourStr} (${offset} Jam)`;

      frames.push({
        hourOffset: offset,
        isoTimestamp: timeStr,
        hourLabel: hourStr,
        fullLabel,
        windSpeedKmh,
        windDirectionDeg,
        windDirectionCardinal: cardinal,
        windDirectionLabelId: label_id,
        relativeHumidity,
        temperatureC,
        frpMultiplier,
        estimatedPm25,
        estimatedAreaHa,
      });
    }

    timeLapseCache.set(cacheKey, {
      frames,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return frames;
  } catch (err) {
    console.warn("Menggunakan deret waktu diurnal lokal:", err);
    const fallbackFrames = generateDiurnalFallbackFrames(baseMetrics.basePm25, baseMetrics.baseAreaHa, now);
    timeLapseCache.set(cacheKey, {
      frames: fallbackFrames,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return fallbackFrames;
  }
}
// --- end of Time-lapse frames ---
