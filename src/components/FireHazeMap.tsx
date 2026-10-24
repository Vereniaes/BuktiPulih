// src/components/FireHazeMap.tsx
// -> modul peta webgis karhutla bnpb & sensor satelit nasa modis / noaa viirs
//      -> 5 kpis metrik situasi darurat karhutla
//      -> integrasi data riil layer webgis bnpb arcgis (mv_prov_karhutla_2026)
//      -> rincian sensor pengorbit bumi (indeks kepercayaan, frp mw, suhu kecerahan k)
//      -> vektor cuaca & kelembapan gambut aktual open-meteo di koordinat aktif
//      -> ekspor lembar disposisi posko siaga resmi bpbd (png / pdf)

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import { HotspotPoint, BnpbSyncData, WindDirection, MapViewMode, SatelliteTimeWindowHours } from "@/types";
import { initialHotspotsData } from "@/data/hotspotsData";
import { initialForumPosts } from "@/data/forumPostsData";
import { peatHydrologicalUnitsData, PeatHydrologicalUnitProperties } from "@/data/peatHydrologicalUnitsData";
import { SmokeParticleEngine } from "@/utils/smokeParticleEngine";
import { fetchLiveWeatherData, LiveWeatherData } from "@/utils/weatherService";
import { fetchLiveAirQuality, LiveAirQualityData, calculateIspuFromPm25 } from "@/utils/airQualityService";
import { DispatchModal } from "@/components/DispatchModal";
import { TimeLapsePlayerDock } from "@/components/TimeLapsePlayerDock";
import { TimeLapseFrame, fetch24HourTimeLapse } from "@/utils/timeLapseService";

interface FireHazeMapProps {
  bnpbData: BnpbSyncData;
  onNavigateToRecovery: (regionKey?: string) => void;
}

// helper --------------------------------------------------------------------------
// function penentu warna status kebakaran
function getFireStatusColor(status: HotspotPoint["status_kebakaran"]): string {
  if (status === "aktif membara") return "#DC2626"; // merah bara
  if (status === "berasap tebal") return "#EA580C"; // oranye asap
  return "#059669"; // hijau zamrud pendinginan
}

// function pembuat svg ikon api berkobar dinamis satelit
function createFlameIconHtml(
  color: string,
  label: string,
  status: HotspotPoint["status_kebakaran"]
): string {
  const isCooling = status === "tahap pendinginan";
  return `
    <div class="fire-flame-pin ${isCooling ? "cooling" : ""}" title="${label}">
      ${!isCooling ? `
        <div class="heat-aura" style="border-color: ${color};"></div>
        <div class="ember-spark" style="top: 2px; left: 10px;"></div>
        <div class="ember-spark" style="top: 4px; right: 8px; animation-delay: 0.8s;"></div>
      ` : `
        <div class="cooling-steam-aura"></div>
      `}
      <svg class="flame-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="${color}">
        <path d="M12 23c-4.97 0-9-4.03-9-9 0-4.07 3.03-7.57 6.03-10.98.67-.76 1.34-1.53 1.97-2.35.34-.44.97-.56 1.45-.26.3.19.48.51.5.86.07 1.25.43 2.45 1.05 3.51.97 1.66 2.43 2.94 3.99 4.22 1.95 1.6 3.01 3.23 3.01 5 0 4.97-4.03 9-9 9zm-1.89-6.95c.53.53 1.25.95 1.89.95.83 0 1.5-.67 1.5-1.5 0-.82-.55-1.66-1.12-2.52-.35-.53-.7-1.07-1-1.63-.44.75-.89 1.55-1.14 2.37-.16.53-.13 1.13.13 1.65.2.4.47.53.74.68z"/>
      </svg>
    </div>
  `;
}

// function pembuat key wilayah dari nama provinsi untuk bridging ke tab 2
function getRegionKeyFromProvince(provName: string): string {
  const lower = provName.toLowerCase();
  if (lower.includes("tengah")) return "kalteng";
  if (lower.includes("barat")) return "kalbar";
  if (lower.includes("riau")) return "riau";
  if (lower.includes("selatan")) return lower.includes("kalimantan") ? "kalsel" : "sumsel";
  if (lower.includes("jambi")) return "jambi";
  return "all";
}

// function pengecek apakah koordinat titik api berada di dalam kubah gambut khg
// input param: lat, lng, khg features
// output: PeatHydrologicalUnitProperties | null
function findKhgForCoordinates(
  lat: number,
  lng: number,
  features: typeof peatHydrologicalUnitsData.features
): PeatHydrologicalUnitProperties | null {
  for (const feat of features) {
    const ring = feat.geometry.coordinates[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    if (inside) return feat.properties;
  }
  return null;
}
// end of helper ------------------------------------------------------------------

export const FireHazeMap: React.FC<FireHazeMapProps> = ({
  bnpbData,
  onNavigateToRecovery,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const particleEngineRef = useRef<SmokeParticleEngine | null>(null);
  const fireLayersRef = useRef<L.LayerGroup | null>(null);
  const hazeLayersRef = useRef<L.LayerGroup | null>(null);
  const khgLayersRef = useRef<L.LayerGroup | null>(null);

  // state visualisasi peta & jendela waktu lintasan satelit -----------------------
  const [timeWindow, setTimeWindow] = useState<SatelliteTimeWindowHours>(24);
  const [viewMode, setViewMode] = useState<MapViewMode>("both");
  const [showKhgLayer, setShowKhgLayer] = useState<boolean>(true);
  const [windSpeed, setWindSpeed] = useState<number>(18);
  const [windDirection, setWindDirection] = useState<WindDirection>("NW");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // state cuaca & sensor kualitas udara live koordinat aktual -------------------
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [liveAirQuality, setLiveAirQuality] = useState<LiveAirQualityData | null>(null);
  const [isLoadingAirQuality, setIsLoadingAirQuality] = useState<boolean>(false);

  // state data titik pantau satelit & lembar disposisi ----------------------------
  const [hotspotsList] = useState<HotspotPoint[]>(initialHotspotsData);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);

  // state pemutar kilas balik 24 jam historis satelit ----------------------------
  const [isTimeLapseActive, setIsTimeLapseActive] = useState<boolean>(false);
  const [timeLapseFrames, setTimeLapseFrames] = useState<TimeLapseFrame[]>([]);
  const [currentTimeOffset, setCurrentTimeOffset] = useState<number>(0);
  const [isTimeLapsePlaying, setIsTimeLapsePlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [isLoadingTimeLapse, setIsLoadingTimeLapse] = useState<boolean>(false);

  // state interaksi antarmuka & tab data riil ------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [controlTab, setControlTab] = useState<"provinces" | "satellite_spots">("provinces");
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPoint | null>(
    initialHotspotsData[0]
  );

  // deteksi apakah titik api aktif berada di dalam kawasan kubah gambut khg
  const selectedHotspotKhg = useMemo(() => {
    if (!selectedHotspot) return null;
    return findKhgForCoordinates(
      selectedHotspot.coordinates[0],
      selectedHotspot.coordinates[1],
      peatHydrologicalUnitsData.features
    );
  }, [selectedHotspot]);

  // pengurutan peringkat 6 provinsi webgis bnpb berdasarkan luas terbakar harian
  const sortedProvinces = useMemo(() => {
    if (!bnpbData?.provinces) return [];
    return [...bnpbData.provinces].sort(
      (a, b) => b.today_luas_terbakar_ha - a.today_luas_terbakar_ha
    );
  }, [bnpbData]);

  // fungsi penarik cuaca aktual & sensor ispu klhk untuk koordinat titik terpilih
  const updateAtmosphereForHotspot = async (spot: HotspotPoint) => {
    setIsLoadingWeather(true);
    setIsLoadingAirQuality(true);
    try {
      const [weatherData, aqiData] = await Promise.all([
        fetchLiveWeatherData(spot.coordinates[0], spot.coordinates[1]),
        fetchLiveAirQuality(spot.coordinates[0], spot.coordinates[1], spot.pm25_index),
      ]);
      setLiveWeather(weatherData);
      setWindSpeed(weatherData.wind_speed_kmh);
      setWindDirection(weatherData.wind_direction_cardinal);
      setLiveAirQuality(aqiData);
    } catch (err) {
      console.error("Gagal sinkronisasi data cuaca & kualitas udara:", err);
    } finally {
      setIsLoadingWeather(false);
      setIsLoadingAirQuality(false);
    }
  };

  // penarikan awal cuaca & ispu live saat komponen dimuat
  useEffect(() => {
    if (initialHotspotsData[0]) {
      updateAtmosphereForHotspot(initialHotspotsData[0]);
    }
  }, []);

  // kendali pemutar kilas balik 24 jam historis satelit
  const handleToggleTimeLapse = async (activate?: boolean) => {
    const nextActive = activate !== undefined ? activate : !isTimeLapseActive;
    setIsTimeLapseActive(nextActive);

    if (nextActive) {
      setIsTimeLapsePlaying(true);
      setCurrentTimeOffset(-24);
      if (timeLapseFrames.length === 0) {
        setIsLoadingTimeLapse(true);
        try {
          const spot = selectedHotspot || initialHotspotsData[0];
          const frames = await fetch24HourTimeLapse(spot.coordinates[0], spot.coordinates[1]);
          setTimeLapseFrames(frames);
        } catch (err) {
          console.error("Gagal memuat deret waktu satelit:", err);
        } finally {
          setIsLoadingTimeLapse(false);
        }
      }
    } else {
      setIsTimeLapsePlaying(false);
      setCurrentTimeOffset(0);
      if (selectedHotspot) {
        updateAtmosphereForHotspot(selectedHotspot);
      }
    }
  };

  // siklus pemutaran otomatis linimasa kilas balik
  useEffect(() => {
    if (!isTimeLapseActive || !isTimeLapsePlaying) return;

    const intervalMs = Math.round(1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentTimeOffset((prev) => {
        if (prev >= 0) {
          return -24;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTimeLapseActive, isTimeLapsePlaying, playbackSpeed]);

  // sinkronisasi frame aktif kilas balik ke mesin partikel kanvas
  useEffect(() => {
    if (!isTimeLapseActive || timeLapseFrames.length === 0) return;

    const frame = timeLapseFrames.find((f) => f.hourOffset === currentTimeOffset);
    if (!frame) return;

    setWindSpeed(frame.windSpeedKmh);
    setWindDirection(frame.windDirectionCardinal);

    if (particleEngineRef.current) {
      particleEngineRef.current.updateConfig({
        windSpeedKmh: frame.windSpeedKmh,
        windDirection: frame.windDirectionCardinal,
        windAngleDeg: frame.windDirectionDeg,
        relativeHumidity: frame.relativeHumidity,
        isPlaying: true,
      });
    }
  }, [isTimeLapseActive, currentTimeOffset, timeLapseFrames]);

  // penyaringan data titik api berdasarkan kueri pencarian
  const filteredHotspots = useMemo(() => {
    if (!searchQuery.trim()) return hotspotsList;
    const q = searchQuery.toLowerCase();
    return hotspotsList.filter(
      (spot) =>
        spot.provinsi.toLowerCase().includes(q) ||
        spot.kabupaten.toLowerCase().includes(q) ||
        spot.status_kebakaran.toLowerCase().includes(q) ||
        (spot.satellite_sensor && spot.satellite_sensor.toLowerCase().includes(q))
    );
  }, [hotspotsList, searchQuery]);

  // kalkulasi metrik kpi riil situasi darurat & kualitas udara ispu
  const kpiMetrics = useMemo(() => {
    const totalSpots = hotspotsList.length;
    const extremeSpots = hotspotsList.filter((s) => s.status_kebakaran === "aktif membara").length;
    const maxPm25 = Math.max(...hotspotsList.map((s) => s.pm25_index));

    const currentPm25 = liveAirQuality ? liveAirQuality.pm25 : maxPm25;
    const ispu = liveAirQuality || calculateIspuFromPm25(currentPm25);

    // hitung total luas terbakar riil dari agregasi layer webgis arcgis bnpb 6 provinsi
    const totalBnpbBurnedAreaHa = sortedProvinces.reduce(
      (acc, prov) => acc + prov.today_luas_terbakar_ha,
      0
    );

    const activeFrame = isTimeLapseActive
      ? timeLapseFrames.find((f) => f.hourOffset === currentTimeOffset)
      : null;

    if (activeFrame) {
      const frameIspu = calculateIspuFromPm25(activeFrame.estimatedPm25);
      return {
        totalHotspots: totalSpots,
        extremeHotspots: activeFrame.frpMultiplier > 1 ? extremeSpots : Math.max(1, Math.round(extremeSpots * activeFrame.frpMultiplier)),
        maxPm25: activeFrame.estimatedPm25,
        ispuIndex: frameIspu.ispu_index,
        ispuCategory: frameIspu.ispu_category,
        ispuColor: frameIspu.ispu_color,
        healthAdvice: frameIspu.health_advice,
        estimatedAreaHa: activeFrame.estimatedAreaHa,
        areaSubText: `Deret Waktu Satelit (${activeFrame.hourLabel})`,
        windVelocityText: `${activeFrame.windSpeedKmh} km/j ${activeFrame.windDirectionCardinal} (${activeFrame.windDirectionDeg}°)`,
        windSubText: `Kilas Balik (${activeFrame.hourLabel}) • RH ${activeFrame.relativeHumidity}%`,
        siagaStatus: activeFrame.estimatedPm25 > 150 ? "Siaga 1 Darurat" : "Waspada Asap",
      };
    }

    return {
      totalHotspots: totalSpots,
      extremeHotspots: extremeSpots,
      maxPm25: currentPm25,
      ispuIndex: ispu.ispu_index,
      ispuCategory: ispu.ispu_category,
      ispuColor: ispu.ispu_color,
      healthAdvice: ispu.health_advice,
      estimatedAreaHa: totalBnpbBurnedAreaHa > 0 ? totalBnpbBurnedAreaHa : 1134,
      areaSubText: "Agregasi Resmi WebGIS BNPB 6 Provinsi",
      windVelocityText: liveWeather
        ? `${windSpeed} km/j ${windDirection} (${liveWeather.wind_direction_deg}°)`
        : `${windSpeed} km/j ${windDirection}`,
      windSubText: liveWeather
        ? `Open-Meteo ECMWF • RH ${liveWeather.relative_humidity}%`
        : "Vektor atmosfer permukaan",
      siagaStatus: extremeSpots > 1 ? "Siaga 1 Darurat" : "Waspada Asap",
    };
  }, [hotspotsList, windSpeed, windDirection, liveWeather, liveAirQuality, isTimeLapseActive, timeLapseFrames, currentTimeOffset, sortedProvinces]);

  // inisialisasi peta leaflet & mesin partikel kanvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-1.2, 108.5],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const hazeGroup = L.layerGroup().addTo(map);
      const khgGroup = L.layerGroup().addTo(map);
      const fireGroup = L.layerGroup().addTo(map);

      hazeLayersRef.current = hazeGroup;
      khgLayersRef.current = khgGroup;
      fireLayersRef.current = fireGroup;
      mapInstanceRef.current = map;

      // inisialisasi mesin partikel kanvas
      if (canvasOverlayRef.current) {
        const engine = new SmokeParticleEngine(canvasOverlayRef.current, map);
        engine.setHotspots(initialHotspotsData);
        engine.updateConfig({
          windSpeedKmh: windSpeed,
          windDirection: windDirection,
          isPlaying: isPlaying,
        });
        engine.start();
        particleEngineRef.current = engine;

        map.on("move", () => engine.render());
        map.on("zoom", () => engine.render());
        map.on("resize", () => {
          engine.resize();
          engine.render();
        });
      }
    }

    return () => {
      if (particleEngineRef.current) {
        particleEngineRef.current.destroy();
        particleEngineRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // render layer poligon kesatuan hidrologis gambut (khg) brgm pada peta
  useEffect(() => {
    const map = mapInstanceRef.current;
    const khgGroup = khgLayersRef.current;
    if (!map || !khgGroup) return;

    khgGroup.clearLayers();
    if (!showKhgLayer) return;

    peatHydrologicalUnitsData.features.forEach((feat) => {
      const latLngs = feat.geometry.coordinates[0].map((coord) => [coord[1], coord[0]] as [number, number]);
      const isLindung = feat.properties.fungsi_ekosistem.includes("Lindung");

      const polygon = L.polygon(latLngs, {
        color: isLindung ? "#B45309" : "#D97706",
        weight: 1.5,
        dashArray: "5, 5",
        fillColor: isLindung ? "#78350F" : "#92400E",
        fillOpacity: 0.16,
      });

      polygon.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 200px; color: #1E293B;">
          <div style="font-size: 10px; font-weight: 800; color: #B45309; text-transform: uppercase;">
            ${feat.properties.khg_id} • BRGM / KLHK
          </div>
          <div style="font-size: 13px; font-weight: 800; margin: 2px 0 4px; color: #0F172A;">
            ${feat.properties.nama_khg}
          </div>
          <div style="font-size: 11px; margin-bottom: 2px;">
            <b>Fungsi:</b> ${feat.properties.fungsi_ekosistem}
          </div>
          <div style="font-size: 11px; margin-bottom: 2px;">
            <b>Kedalaman Kubah:</b> ${feat.properties.kedalaman_rata_m} meter
          </div>
          <div style="font-size: 11px; margin-bottom: 2px;">
            <b>Luas Kawasan:</b> ${feat.properties.luas_ha.toLocaleString("id-ID")} Ha
          </div>
          <div style="margin-top: 6px; padding: 3px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700; background: #FEF3C7; color: #92400E;">
            ${feat.properties.status_kerentanan}
          </div>
        </div>
      `);

      khgGroup.addLayer(polygon);
    });
  }, [showKhgLayer]);

  // sinkronisasi perubahan konfigurasi cuaca ke engine partikel kanvas
  useEffect(() => {
    if (particleEngineRef.current) {
      particleEngineRef.current.updateConfig({
        windSpeedKmh: windSpeed,
        windDirection: windDirection,
        windAngleDeg: liveWeather ? liveWeather.wind_direction_deg : undefined,
        relativeHumidity: liveWeather?.relative_humidity,
        isPlaying: isPlaying && (viewMode === "both" || viewMode === "haze_wind"),
      });
      if (viewMode === "satellite") {
        particleEngineRef.current.stop();
      } else {
        particleEngineRef.current.start();
      }
    }
  }, [windSpeed, windDirection, isPlaying, viewMode, liveWeather]);

  // sinkronisasi layer marker titik api dan radius lingkaran
  useEffect(() => {
    const map = mapInstanceRef.current;
    const fireGroup = fireLayersRef.current;
    const hazeGroup = hazeLayersRef.current;
    if (!map || !fireGroup || !hazeGroup) return;

    fireGroup.clearLayers();
    hazeGroup.clearLayers();

    const showHotspotsLayer = viewMode === "both" || viewMode === "satellite";
    const showHazeLayer = viewMode === "both" || viewMode === "haze_wind";

    filteredHotspots.forEach((spot) => {
      const color = getFireStatusColor(spot.status_kebakaran);

      // layer radius bahaya pm2.5
      if (showHazeLayer) {
        const hazeCircle = L.circle(spot.coordinates, {
          radius: spot.smoke_radius_km * 1000,
          color: color,
          weight: 1.5,
          dashArray: "4, 6",
          fillColor: color,
          fillOpacity: 0.16,
        });

        hazeCircle.on("click", () => {
          setSelectedHotspot(spot);
          updateAtmosphereForHotspot(spot);
        });

        hazeGroup.addLayer(hazeCircle);
      }

      // layer marker api membara dinamis
      if (showHotspotsLayer) {
        const fireIcon = L.divIcon({
          className: "leaflet-flame-marker-wrapper",
          html: createFlameIconHtml(
            color,
            `${spot.kabupaten} (${spot.status_kebakaran})`,
            spot.status_kebakaran
          ),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(spot.coordinates, { icon: fireIcon });
        marker.on("click", () => {
          setSelectedHotspot(spot);
          updateAtmosphereForHotspot(spot);
        });

        fireGroup.addLayer(marker);
      }
    });

    if (particleEngineRef.current) {
      particleEngineRef.current.setHotspots(filteredHotspots);
    }
  }, [filteredHotspots, viewMode]);

  // navigasi bidik peta (fly-to) saat baris titik diklik
  const handleSelectSpotFromTable = (spot: HotspotPoint) => {
    setSelectedHotspot(spot);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(spot.coordinates, 8, { duration: 1.2 });
    }
    updateAtmosphereForHotspot(spot);
  };

  return (
    <div className="cv-container" aria-label="Dashboard Pantau Karhutla BNPB & Satelit">
      {/* 1. header komparasi gaya oyenza ----------------------------------------- */}
      <header className="cv-head">
        <div className="cv-title">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <h2 style={{ margin: 0 }}>Pantau Karhutla & WebGIS Satelit BNPB</h2>
            {liveAirQuality && (
              <div
                className="live-ispu-badge"
                style={{
                  backgroundColor: `${liveAirQuality.ispu_color}18`,
                  borderColor: liveAirQuality.ispu_color,
                  color: liveAirQuality.ispu_color,
                }}
                title={`Sensor CAMS/BMKG: CO ${liveAirQuality.carbon_monoxide_ugm3} µg/m³, PM10 ${liveAirQuality.pm10} µg/m³. Saran: ${liveAirQuality.health_advice}`}
              >
                <span className="ispu-pulse-dot" style={{ backgroundColor: liveAirQuality.ispu_color }}></span>
                <span>ISPU {liveAirQuality.ispu_index} — {liveAirQuality.ispu_category}</span>
                <span className="ispu-pm-label">({liveAirQuality.pm25} µg/m³)</span>
              </div>
            )}
          </div>
          <p>
            Data agregasi resmi WebGIS BNPB ArcGIS (mv_prov_karhutla_2026) dipadukan dengan sensor
            satelit termal NASA MODIS, NOAA VIIRS, dan sensor kualitas udara live ISPU KLHK (Permen LHK 14/2020).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* satellite overpass window pills */}
          <div className="cv-win" role="group" aria-label="Jendela Lintasan Satelit">
            {([6, 12, 24] as const).map((hours) => (
              <button
                key={hours}
                type="button"
                className={timeWindow === hours ? "active" : ""}
                onClick={() => {
                  setTimeWindow(hours);
                  if (hours === 24) {
                    handleToggleTimeLapse(true);
                  } else if (isTimeLapseActive) {
                    handleToggleTimeLapse(false);
                  }
                }}
              >
                {hours} Jam
              </button>
            ))}
          </div>

          {/* tombol pemutar kilas balik 24 jam */}
          <button
            type="button"
            className={`btn-toggle-timelapse ${isTimeLapseActive ? "active" : ""}`}
            onClick={() => handleToggleTimeLapse()}
            title="Buka pemutar kilas balik 24 jam historis satelit"
          >
            <span>⏱</span>
            <span>Kilas Balik 24j</span>
          </button>

          {/* tombol buka modal lembar disposisi posko siaga */}
          <button
            type="button"
            className="btn-export-dispatch"
            onClick={() => setIsDispatchModalOpen(true)}
            title="Buka dan ekspor lembar disposisi posko siaga (PNG / PDF A4)"
          >
            <span>📋</span>
            <span>Ekspor Disposisi</span>
          </button>
        </div>
      </header>

      {/* 2. strip status siaga terpadu (deslopped unified status strip) -------- */}
      <section className="unified-status-strip" aria-label="Ringkasan Status Siaga Karhutla">
        <div className="status-strip-segment status-alert">
          <div className="status-strip-indicator">
            <span className="pulse-beacon red" />
            <span className="status-strip-badge">{kpiMetrics.siagaStatus}</span>
          </div>
          <div className="status-strip-metric">
            <span className="status-strip-number">{kpiMetrics.totalHotspots}</span>
            <span className="status-strip-label">
              Titik Api Aktif
              <strong className="status-strip-sub">{kpiMetrics.extremeHotspots} intensitas tinggi</strong>
            </span>
          </div>
        </div>

        <div className="status-strip-divider" aria-hidden="true" />

        <div className="status-strip-segment">
          <span className="status-strip-tag">Luas Terbakar BNPB</span>
          <div className="status-strip-metric">
            <span className="status-strip-number">
              {kpiMetrics.estimatedAreaHa.toLocaleString("id-ID")}
              <span className="unit">Ha</span>
            </span>
            <span className="status-strip-label">
              Agregasi 6 Provinsi
              <span className="status-strip-sub">{kpiMetrics.areaSubText}</span>
            </span>
          </div>
        </div>

        <div className="status-strip-divider" aria-hidden="true" />

        <div className="status-strip-segment" title={kpiMetrics.healthAdvice}>
          <span className="status-strip-tag">Kualitas Udara & ISPU</span>
          <div className="status-strip-metric">
            <span className="status-strip-number" style={{ color: kpiMetrics.ispuColor }}>
              {kpiMetrics.maxPm25}
              <span className="unit">µg/m³</span>
            </span>
            <span className="status-strip-label">
              <strong style={{ color: kpiMetrics.ispuColor }}>
                ISPU {kpiMetrics.ispuIndex} ({kpiMetrics.ispuCategory})
              </strong>
              <span className="status-strip-sub">Sensor Permen LHK 14/2020</span>
            </span>
          </div>
        </div>

        <div className="status-strip-divider" aria-hidden="true" />

        <div className="status-strip-segment">
          <span className="status-strip-tag">Vektor Angin</span>
          <div className="status-strip-metric">
            <span className="status-strip-number small">{kpiMetrics.windVelocityText}</span>
            <span className="status-strip-label">
              Arah Dispersi Asap
              <span className="status-strip-sub">{kpiMetrics.windSubText}</span>
            </span>
          </div>
        </div>
      </section>

      {/* 3. grid peta komparasi & panel data riil -------------------------------- */}
      <div className="cv-grid">
        {/* kartu peta utama */}
        <section className="cv-mapcard" aria-label="Peta Geospasial Satelit">
          <div className="cv-maphead">
            {/* segmented mode layer pills */}
            <div className="seg" role="group" aria-label="Pilihan Layer Peta">
              <button
                type="button"
                className={viewMode === "both" ? "active" : ""}
                onClick={() => setViewMode("both")}
              >
                Semua Layer
              </button>
              <button
                type="button"
                className={viewMode === "satellite" ? "active" : ""}
                onClick={() => setViewMode("satellite")}
              >
                Sensor Satelit Saja
              </button>
              <button
                type="button"
                className={viewMode === "haze_wind" ? "active" : ""}
                onClick={() => setViewMode("haze_wind")}
              >
                Dispersi & Angin
              </button>
            </div>

            {/* sakelar layer kubah gambut brgm */}
            <button
              type="button"
              className={`btn-toggle-khg ${showKhgLayer ? "active" : ""}`}
              onClick={() => setShowKhgLayer((prev) => !prev)}
              title="Tampilkan/sembunyikan layer Kesatuan Hidrologis Gambut (KHG) BRGM"
              aria-pressed={showKhgLayer}
            >
              <span className="khg-dot-indicator"></span>
              <span>Kubah Gambut BRGM</span>
            </button>

            <input
              type="search"
              className="cv-input"
              placeholder="Cari provinsi, kabupaten, sensor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari titik api atau sensor"
            />
          </div>

          {/* kontainer leaflet + canvas overlay partikel asap */}
          <div className="cv-map-wrapper">
            <div
              ref={mapContainerRef}
              style={{ width: "100%", height: "100%" }}
            />
            <canvas
              ref={canvasOverlayRef}
              className="cv-canvas-overlay"
            />

            {/* floating legend khas peta satelit */}
            <div className="cv-legend">
              <div className="cv-legend-item">
                <span className="legend-dot flame"></span>
                <span>Hotspot Sensor Satelit (MODIS / VIIRS)</span>
              </div>
              <div className="cv-legend-item">
                <span className="legend-dot smoke"></span>
                <span>Aliran Asap Mengalir (Vektor Angin)</span>
              </div>
              {showKhgLayer && (
                <div className="cv-legend-item">
                  <span className="legend-dot" style={{ backgroundColor: "#78350F", border: "1px dashed #B45309" }}></span>
                  <span>Kubah Gambut BRGM (&gt;3m)</span>
                </div>
              )}
            </div>

            {/* panel pemutar kilas balik 24 jam melayang (floating dock) */}
            {isTimeLapseActive && (
              <TimeLapsePlayerDock
                frames={timeLapseFrames}
                currentOffset={currentTimeOffset}
                isPlaying={isTimeLapsePlaying}
                playbackSpeed={playbackSpeed}
                isLoading={isLoadingTimeLapse}
                onTogglePlay={() => setIsTimeLapsePlaying((prev) => !prev)}
                onSeek={(offset) => setCurrentTimeOffset(offset)}
                onSpeedChange={(speed) => setPlaybackSpeed(speed)}
                onClose={() => handleToggleTimeLapse(false)}
              />
            )}
          </div>
        </section>

        {/* panel data riil bnpb arcgis & sensor satelit ------------------------- */}
        <section className="cv-control-card" aria-label="Data BNPB WebGIS & Sensor Satelit">
          {/* tab nav panel samping */}
          <div className="card-tab-nav">
            <button
              type="button"
              className={`card-tab-btn ${controlTab === "provinces" ? "active" : ""}`}
              onClick={() => setControlTab("provinces")}
            >
              Peringkat Provinsi BNPB ({sortedProvinces.length})
            </button>
            <button
              type="button"
              className={`card-tab-btn ${controlTab === "satellite_spots" ? "active" : ""}`}
              onClick={() => setControlTab("satellite_spots")}
            >
              Sensor Satelit ({filteredHotspots.length})
            </button>
          </div>

          {/* TAB 1: PERINGKAT 6 PROVINSI WEBGIS BNPB ARCGIS --------------------- */}
          {controlTab === "provinces" && (
            <div className="bnpb-tab-content">
              {/* header info sumber resmi */}
              <div className="bnpb-source-banner">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--stamp)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    WebGIS BNPB ArcGIS
                  </span>
                  <span className="bnpb-live-tag">
                    <span className="live-pulse-dot"></span>
                    <span>Sinkron</span>
                  </span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginTop: "2px" }}>
                  Layer: mv_prov_karhutla_2026
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                  Update: {bnpbData.sync_timestamp ? new Date(bnpbData.sync_timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Terbaru"} • 6 Provinsi Pantauan
                </div>
              </div>

              {/* daftar peringkat provinsi */}
              <div className="bnpb-prov-list">
                {sortedProvinces.map((prov, idx) => {
                  const maxHa = 350; // batas normalisasi grafis batang
                  const pct = Math.min(100, Math.round((prov.today_luas_terbakar_ha / maxHa) * 100));
                  const isTopCritical = idx === 0;

                  return (
                    <div key={prov.provinsi} className={`bnpb-prov-item ${isTopCritical ? "critical-top" : ""}`}>
                      <div className="bnpb-prov-head">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`bnpb-rank-badge rank-${idx + 1}`}>#{idx + 1}</span>
                          <span style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--ink)" }}>
                            {prov.provinsi}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                          {prov.tgl_update}
                        </span>
                      </div>

                      {/* indikator suhu dan kelembapan zona gambut */}
                      {prov.weather_summary && (
                        <div className="bnpb-prov-subclimate">
                          <span
                            className={`bnpb-weather-chip ${prov.weather_summary.temperature_c >= 34 ? "hot-critical" : ""}`}
                            title={`Suhu udara dan kelembapan di ${prov.weather_summary.zone_centroid} (Sumber: Open-Meteo / BMKG)`}
                          >
                            🌡️ {prov.weather_summary.temperature_c}°C · RH {prov.weather_summary.relative_humidity}% ({prov.weather_summary.condition_label})
                          </span>
                          <span className="bnpb-weather-centroid" title="Titik fokus pantauan gambut rawan">
                            📍 {prov.weather_summary.zone_centroid}
                          </span>
                        </div>
                      )}

                      {/* progress bar luas terbakar */}
                      <div style={{ marginTop: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
                          <span style={{ color: "#64748B" }}>Luas Terbakar Harian:</span>
                          <span style={{ fontWeight: 800, color: isTopCritical ? "#DC2626" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                            {prov.today_luas_terbakar_ha.toLocaleString("id-ID")} Ha
                          </span>
                        </div>
                        <div className="bnpb-bar-track">
                          <div
                            className={`bnpb-bar-fill ${isTopCritical ? "bar-danger" : "bar-warning"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* ringkasan 3 metrik lapangan */}
                      <div className="bnpb-stat-row">
                        <div className="bnpb-stat-col">
                          <span className="bnpb-stat-lbl">Hotspot Satelit</span>
                          <span className="bnpb-stat-val" style={{ color: "#DC2626" }}>
                            🔥 {prov.total_hotspot.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="bnpb-stat-col">
                          <span className="bnpb-stat-lbl">Personil Lapangan</span>
                          <span className="bnpb-stat-val">
                            👥 {prov.relawan_lapangan.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="bnpb-stat-col">
                          <span className="bnpb-stat-lbl">Indeks PM2.5</span>
                          <span className="bnpb-stat-val" style={{ fontSize: "11px" }}>
                            {prov.kualitas_udara_pm25}
                          </span>
                        </div>
                      </div>

                      {/* footer liputan buktipulih */}
                      <div className="bnpb-coverage-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                          🌱 BuktiPulih: <b>{prov.buktipulih_coverage.active_plots} petak</b> ({prov.buktipulih_coverage.alive_trees.toLocaleString("id-ID")} pohon hidup)
                        </span>
                        <button
                          type="button"
                          className="btn-prov-bridge"
                          onClick={() => onNavigateToRecovery(getRegionKeyFromProvince(prov.provinsi))}
                          title={`Lihat petak pemulihan di ${prov.provinsi}`}
                        >
                          Lihat Petak &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* tautan navigasi ke tab 2 peta pemulihan */}
              <div className="bnpb-bridge-box">
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                  Bandingkan Lahan Pulih Pasca-Karhutla
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748B", margin: "4px 0 8px" }}>
                  Lihat koordinat sekat kanal gambut dan pohon yang berhasil bertahan di zona rawan.
                </p>
                <button
                  type="button"
                  className="btn-text-sm"
                  style={{ color: "var(--stamp)", fontWeight: 800, padding: 0, background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => onNavigateToRecovery(selectedHotspot ? getRegionKeyFromProvince(selectedHotspot.provinsi) : "all")}
                >
                  Buka Peta Bukti Pulih &rarr;
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RINCIAN DETEKSI SENSOR SATELIT NASA MODIS & NOAA VIIRS ------- */}
          {controlTab === "satellite_spots" && (
            <div className="satellite-spots-container">
              {/* info ringkasan sensor */}
              <div className="satellite-header-banner">
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                  Sensor Satelit Pengorbit Polar
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                  NASA MODIS (Terra/Aqua) & NOAA VIIRS (SNPP) dengan deteksi radiasi termal 4µm/11µm.
                </div>
              </div>

              {/* kartu titik terpilih aktif dengan data cuaca live */}
              {selectedHotspot && (
                <div className="selected-hotspot-card">
                  <div className="selected-hotspot-head">
                    <div>
                      <span className="selected-badge">Titik Terpilih</span>
                      <h4 style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
                        {selectedHotspot.kabupaten}, {selectedHotspot.provinsi}
                      </h4>
                    </div>
                    <span className={`sensor-tag ${selectedHotspot.satellite_sensor?.includes("VIIRS") ? "tag-viirs" : "tag-modis"}`}>
                      {selectedHotspot.satellite_sensor || "VIIRS SNPP"}
                    </span>
                  </div>

                  {/* parameter satelit detil */}
                  <div className="satellite-metrics-grid">
                    <div className="sat-metric-box">
                      <span className="sat-metric-lbl">Indeks Kepercayaan</span>
                      <span className="sat-metric-val" style={{ color: (selectedHotspot.confidence_pct || 85) >= 90 ? "#DC2626" : "#D97706" }}>
                        {selectedHotspot.confidence_pct || 90}%
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748B" }}>Kategori {selectedHotspot.confidence}</span>
                    </div>

                    <div className="sat-metric-box">
                      <span className="sat-metric-lbl">Fire Radiative Power</span>
                      <span className="sat-metric-val">
                        {selectedHotspot.frp_mw || 45.0} <span style={{ fontSize: "11px" }}>MW</span>
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748B" }}>Intensitas thermal</span>
                    </div>

                    <div className="sat-metric-box">
                      <span className="sat-metric-lbl">Suhu Kecerahan</span>
                      <span className="sat-metric-val">
                        {selectedHotspot.brightness_temp_k || 335.0} <span style={{ fontSize: "11px" }}>K</span>
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748B" }}>
                        ≈ {Math.round((selectedHotspot.brightness_temp_k || 335) - 273.15)}°C
                      </span>
                    </div>

                    <div className="sat-metric-box">
                      <span className="sat-metric-lbl">Radius Asap PM2.5</span>
                      <span className="sat-metric-val" style={{ color: "#EA580C" }}>
                        {selectedHotspot.smoke_radius_km} <span style={{ fontSize: "11px" }}>km</span>
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748B" }}>
                        {selectedHotspot.pm25_index} µg/m³
                      </span>
                    </div>
                  </div>

                  {/* kondisi atmosfer riil open-meteo di koordinat ini */}
                  <div className="live-spot-weather-bar">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>
                        Vektor Cuaca Aktual [{selectedHotspot.coordinates.join(", ")}]
                      </span>
                      {isLoadingWeather && (
                        <span style={{ fontSize: "10.5px", color: "#64748B" }}>Memuat...</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "11.5px", color: "#475569", flexWrap: "wrap" }}>
                      <span>💨 Angin: <b>{windSpeed} km/j {windDirection}</b> ({liveWeather?.wind_direction_deg || 0}°)</span>
                      <span>💧 Gambut: <b>{liveWeather?.relative_humidity || 75}% RH</b></span>
                    </div>
                  </div>

                  {/* indikator kawasan kubah gambut brgm jika berada di dalam khg */}
                  {selectedHotspotKhg && (
                    <div className="khg-spot-indicator-box">
                      <span className="khg-indicator-icon">🌱</span>
                      <div className="khg-indicator-content">
                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#92400E" }}>
                          Kubah Gambut: {selectedHotspotKhg.nama_khg}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#B45309" }}>
                          {selectedHotspotKhg.fungsi_ekosistem} • Kedalaman {selectedHotspotKhg.kedalaman_rata_m}m • {selectedHotspotKhg.status_kerentanan}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="selected-spot-footer">
                    <span style={{ fontSize: "11px", color: "#64748B" }}>
                      🛰️ Overpass: {selectedHotspot.last_overpass || "14 Okt 2026"} • {selectedHotspot.ground_status || "Pemantauan Satelit"}
                    </span>
                    <button
                      type="button"
                      className="btn-focus-spot"
                      onClick={() => handleSelectSpotFromTable(selectedHotspot)}
                    >
                      Bidik Lokasi
                    </button>
                  </div>
                </div>
              )}

              {/* daftar titik satelit lainnya */}
              <div className="satellite-spots-list">
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", margin: "6px 0 2px" }}>
                  Semua Titik Deteksi Aktif ({filteredHotspots.length})
                </div>
                {filteredHotspots.map((spot) => {
                  const isSelected = selectedHotspot?.id === spot.id;
                  const color = getFireStatusColor(spot.status_kebakaran);

                  return (
                    <div
                      key={spot.id}
                      className={`satellite-spot-card ${isSelected ? "selected-row" : ""}`}
                      onClick={() => handleSelectSpotFromTable(spot)}
                    >
                      <div className="spot-card-top">
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--ink)" }}>
                            {spot.kabupaten}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748B" }}>
                            {spot.provinsi}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className={`sensor-tag-mini ${spot.satellite_sensor?.includes("VIIRS") ? "tag-viirs" : "tag-modis"}`}>
                            {spot.satellite_sensor?.includes("VIIRS") ? "VIIRS" : "MODIS"}
                          </span>
                          <span className="confidence-pill" style={{ color: color, borderColor: color }}>
                            {spot.confidence_pct || 85}%
                          </span>
                        </div>
                      </div>

                      <div className="spot-card-bottom">
                        <span style={{ fontSize: "11px", color: "#64748B" }}>
                          FRP: <b>{spot.frp_mw || 40} MW</b> • Temp: <b>{spot.brightness_temp_k || 330} K</b>
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: color }}>
                          {spot.status_kebakaran}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* modal lembar disposisi posko siaga resmi */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        params={{
          docNumber: `DISP-BPBD/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}/08`,
          generatedAt: `${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
          siagaStatus: kpiMetrics.siagaStatus,
          windSpeedKmh: windSpeed,
          windDirectionText: `${windDirection} (${liveWeather?.wind_direction_deg || 0}° ${liveWeather?.wind_direction_label_id || windDirection})`,
          relativeHumidity: liveWeather?.relative_humidity || 75,
          maxPm25: kpiMetrics.maxPm25,
          ispuIndex: kpiMetrics.ispuIndex,
          ispuCategory: kpiMetrics.ispuCategory,
          estimatedAreaHa: kpiMetrics.estimatedAreaHa,
          hotspots: hotspotsList,
          verifications: initialForumPosts.flatMap(p => p.field_verifications || []).map(v => ({
            verifier_name: v.verifier_name,
            role_label: v.role_label,
            condition_status: v.condition_status,
            notes: v.notes,
            created_at: new Date(v.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
          })),
        }}
      />
    </div>
  );
};
