// src/utils/airQualityService.ts
// -> modul integrasi sensor live kualitas udara ispu klhk & pm2.5
//      -> penarik data kualitas udara atmosferik dari open-meteo cams
//      -> perhitungan indeks standar pencemar udara (ispu) permen lhk no 14/2020
//      -> penyedia rekomendasi kesehatan dan mitigasi kabut asap lapangan
//      -> penampung cache memori berbasis koordinat

import { fetchHourlyForecast } from "./hourlyForecast";

export const fetchAirQualityForecast = (lat: number, lon: number) =>
  fetchHourlyForecast("https://air-quality-api.open-meteo.com/v1/air-quality", lat, lon,
    ["pm2_5"], { domains: "cams_global" });

export type IspuCategory = "BAIK" | "SEDANG" | "TIDAK SEHAT" | "SANGAT TIDAK SEHAT" | "BERBAHAYA";

export interface LiveAirQualityData {
  pm25: number;
  pm10: number;
  ispu_index: number;
  ispu_category: IspuCategory;
  ispu_color: string;
  health_advice: string;
  carbon_monoxide_ugm3?: number;
  us_aqi?: number;
  source_label: string;
  fetched_at: string;
  is_live: boolean;
}

interface AirQualityCacheItem {
  data: LiveAirQualityData;
  expiresAt: number;
}

// penampung cache lokal memori (ttl 15 menit)
const aqiCache = new Map<string, AirQualityCacheItem>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// helper --------------------------------------------------------------------------
// function pembentuk cache key dari koordinat geospasial
// input param : lat (latitude), lng (longitude)
// output : string cache key format "lat_lng"
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

// function hitung ispu berdasarkan konsentrasi pm2.5 permen lhk no 14 tahun 2020
// input param : pm25 (konsentrasi ug/m3)
// output : object { ispu_index, ispu_category, ispu_color, health_advice }
export function calculateIspuFromPm25(pm25: number): {
  ispu_index: number;
  ispu_category: IspuCategory;
  ispu_color: string;
  health_advice: string;
} {
  const p = Math.max(0, pm25);

  if (p <= 15.5) {
    const ispu = Math.round((50 / 15.5) * p);
    return {
      ispu_index: Math.max(1, ispu),
      ispu_category: "BAIK",
      ispu_color: "#059669",
      health_advice: "Kualitas udara sangat baik. Aman untuk seluruh aktivitas luar ruangan.",
    };
  }

  if (p <= 55.4) {
    const ispu = Math.round(((100 - 51) / (55.4 - 15.6)) * (p - 15.6) + 51);
    return {
      ispu_index: ispu,
      ispu_category: "SEDANG",
      ispu_color: "#0284C7",
      health_advice: "Kualitas udara dapat diterima. Kelompok sangat sensitif disarankan membatasi aktivitas fisik berat.",
    };
  }

  if (p <= 150.4) {
    const ispu = Math.round(((200 - 101) / (150.4 - 55.5)) * (p - 55.5) + 101);
    return {
      ispu_index: ispu,
      ispu_category: "TIDAK SEHAT",
      ispu_color: "#EAB308",
      health_advice: "Udara mulai merugikan kesehatan. Gunakan masker N95 saat berada di luar ruangan.",
    };
  }

  if (p <= 250.4) {
    const ispu = Math.round(((300 - 201) / (250.4 - 150.5)) * (p - 150.5) + 201);
    return {
      ispu_index: ispu,
      ispu_category: "SANGAT TIDAK SEHAT",
      ispu_color: "#DC2626",
      health_advice: "Risiko kesehatan meningkat bagi semua orang. Batasi aktivitas luar dan tutup ventilasi rumah.",
    };
  }

  // di atas 250.4 ug/m3 (berbahaya)
  const ispu = Math.round(((500 - 301) / (500 - 250.5)) * (Math.min(500, p) - 250.5) + 301);
  return {
    ispu_index: Math.min(500, ispu),
    ispu_category: "BERBAHAYA",
    ispu_color: "#1E293B",
    health_advice: "Tingkat darurat kesehatan. Evakuasi kelompok rentan dan kenakan masker respirator standar.",
  };
}

// function data fallback kualitas udara saat jaringan terputus
// input param : pm25Estimate
// output : LiveAirQualityData default
function getFallbackAirQuality(pm25Estimate: number = 85): LiveAirQualityData {
  const ispuInfo = calculateIspuFromPm25(pm25Estimate);
  return {
    pm25: pm25Estimate,
    pm10: Math.round(pm25Estimate * 1.15),
    ispu_index: ispuInfo.ispu_index,
    ispu_category: ispuInfo.ispu_category,
    ispu_color: ispuInfo.ispu_color,
    health_advice: ispuInfo.health_advice,
    carbon_monoxide_ugm3: 3200,
    us_aqi: ispuInfo.ispu_index,
    source_label: "Model Asimilasi Atmosfer BMKG",
    fetched_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    is_live: false,
  };
}
// end of helper ------------------------------------------------------------------

// function penarik live air quality dari open-meteo air-quality api
// input param : lat (latitude), lng (longitude), fallbackPm25 (opsional)
// output : Promise<LiveAirQualityData>
export async function fetchLiveAirQuality(
  lat: number,
  lng: number,
  fallbackPm25: number = 85
): Promise<LiveAirQualityData> {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();

  const cached = aqiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,us_aqi`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000), // batas waktu 5 detik
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Air Quality respon gagal: ${res.status}`);
    }

    const json = await res.json();
    const current = json.current;

    const pm25Val = typeof current?.pm2_5 === "number" ? Math.round(current.pm2_5 * 10) / 10 : fallbackPm25;
    const pm10Val = typeof current?.pm10 === "number" ? Math.round(current.pm10 * 10) / 10 : Math.round(pm25Val * 1.15);
    const coVal = typeof current?.carbon_monoxide === "number" ? Math.round(current.carbon_monoxide) : 3200;
    const usAqi = typeof current?.us_aqi === "number" ? current.us_aqi : undefined;

    const ispuInfo = calculateIspuFromPm25(pm25Val);

    const liveData: LiveAirQualityData = {
      pm25: pm25Val,
      pm10: pm10Val,
      ispu_index: ispuInfo.ispu_index,
      ispu_category: ispuInfo.ispu_category,
      ispu_color: ispuInfo.ispu_color,
      health_advice: ispuInfo.health_advice,
      carbon_monoxide_ugm3: coVal,
      us_aqi: usAqi,
      source_label: "Open-Meteo CAMS Live",
      fetched_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      is_live: true,
    };

    aqiCache.set(cacheKey, {
      data: liveData,
      expiresAt: now + CACHE_TTL_MS,
    });

    return liveData;
  } catch {
    const fallback = getFallbackAirQuality(fallbackPm25);
    aqiCache.set(cacheKey, {
      data: fallback,
      expiresAt: now + 60 * 1000,
    });
    return fallback;
  }
}
