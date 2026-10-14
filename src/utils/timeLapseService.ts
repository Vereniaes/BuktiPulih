// src/utils/timeLapseService.ts
// -> modul deret waktu 24 jam kilas balik karhutla
//      -> penarik data cuaca per jam open-meteo hourly api
//      -> sintesis variasi diurnal suhu, kelembapan, dan frp titik api
//      -> generator frame waktu temporal untuk pemutar linimasa 60 fps
// -> disini buat orkestrasi frame temporal peta

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

// penampung cache memori per koordinat (ttl 15 menit)
const timeLapseCache = new Map<string, TimeLapseCacheItem>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// helper --------------------------------------------------------------------------
// function pembentuk deret waktu fallback berbasis model diurnal siklus 24 jam
// input param : basePm25, baseAreaHa, now
// output : array 25 TimeLapseFrame (-24 s.d. 0)
function generateDiurnalFallbackFrames(
  basePm25: number,
  baseAreaHa: number,
  now: Date
): TimeLapseFrame[] {
  const frames: TimeLapseFrame[] = [];

  for (let offset = -24; offset <= 0; offset++) {
    const targetDate = new Date(now.getTime() + offset * 60 * 60 * 1000);
    const hour = targetDate.getHours();

    // kurva diurnal: puncak siang (14:00), palung malam (04:00)
    const diurnalAngle = ((hour - 4) / 24) * 2 * Math.PI;
    const diurnalFactor = 0.5 * (1 - Math.cos(diurnalAngle)); // 0.0 di 04:00, 1.0 di 16:00

    // kecepatan angin: 8 km/h malam s.d. 24 km/h siang
    const windSpeedKmh = Math.round(8 + diurnalFactor * 16);
    // suhu: 24°C malam s.d. 34°C siang
    const temperatureC = Math.round(24 + diurnalFactor * 10);
    // kelembapan relatif terbalik dengan suhu: 90% subuh s.d. 55% siang
    const relativeHumidity = Math.round(90 - diurnalFactor * 35);

    // pergeseran arah angin bertahap (angin darat ke angin laut pesisir gambut)
    const baseDeg = 315; // NW
    const windDirectionDeg = Math.round((baseDeg + Math.sin(diurnalAngle) * 45 + 360) % 360);
    const { cardinal, label_id } = convertDegreeToCardinal(windDirectionDeg);

    // frp bara api & luas sebaran kabut
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
// end of helper ------------------------------------------------------------------

// penarik data deret waktu 24 jam terintegrasi open-meteo hourly api
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

    // temukan indeks yang paling mendekati waktu saat ini
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

      // faktor intensitas bara berdasarkan siang-malam
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
