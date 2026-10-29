// Todo:
// -> Animate illustrative smoke particles using hotspot positions and configured wind.

// --- Smoke animation ---
import L from "leaflet";
import { HotspotPoint } from "@/types";

export type WindDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface SmokeParticleConfig {
  windSpeedKmh: number; // 0 - 60 km/h
  windDirection: WindDirection;
  windAngleDeg?: number; // derajat eksak (0 - 360) dari live weather
  relativeHumidity?: number; // 0 - 100% dari live weather
  isPlaying: boolean;
}

interface SmokeParticle {
  hotspotIndex: number;
  progress: number; // 0.0 sampai 1.0
  speedFactor: number;
  offsetAngle: number;
  maxDistancePx: number;
  initialRadius: number;
  maxRadius: number;
  initialOpacity: number;
  colorType: "aktif membara" | "berasap tebal" | "tahap pendinginan";
}

// Wind labels describe the source direction; particles travel downwind.
function getWindAngleRad(dir: WindDirection): number {
  switch (dir) {
    case "N": return -Math.PI / 2; // bertiup ke utara (atas)
    case "NE": return -Math.PI / 4;
    case "E": return 0; // bertiup ke timur (kanan)
    case "SE": return Math.PI / 4;
    case "S": return Math.PI / 2; // bertiup ke selatan (bawah)
    case "SW": return (3 * Math.PI) / 4;
    case "W": return Math.PI; // bertiup ke barat (kiri)
    case "NW": return (-3 * Math.PI) / 4;
    default: return -Math.PI / 4;
  }
}

function getSmokeColorRgb(status: HotspotPoint["status_kebakaran"]): { r: number; g: number; b: number } {
  if (status === "aktif membara") {
    return { r: 220, g: 38, b: 38 }; // merah pekat bara
  }
  if (status === "berasap tebal") {
    return { r: 234, g: 88, b: 12 }; // oranye kabut tebal
  }
  return { r: 180, g: 215, b: 230 }; // uap air putih kebiruan pendinginan
}

export class SmokeParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: L.Map;
  private hotspots: HotspotPoint[] = [];
  private config: SmokeParticleConfig = {
    windSpeedKmh: 18,
    windDirection: "NW",
    isPlaying: true,
  };
  private particles: SmokeParticle[] = [];
  private animFrameId: number | null = null;
  private isDestroyed = false;

  constructor(canvas: HTMLCanvasElement, map: L.Map) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gagal menginisialisasi 2D canvas context");
    this.ctx = context;
    this.map = map;

    this.resize();
  }

  public resize(): void {
    const size = this.map.getSize();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.canvas.width = size.x * dpr;
    this.canvas.height = size.y * dpr;
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;
    this.ctx.scale(dpr, dpr);
  }

  public setHotspots(hotspots: HotspotPoint[]): void {
    this.hotspots = hotspots;
    this.rebuildParticles();
  }

  public updateConfig(newConfig: Partial<SmokeParticleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (!this.config.isPlaying && this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    } else if (this.config.isPlaying && !this.animFrameId) {
      this.loop();
    }
  }

  private rebuildParticles(): void {
    this.particles = [];
    if (this.hotspots.length === 0) return;

    // Bound particle count per hotspot; this is a visual effect, not a dispersion model.
    const particlesPerHotspot = 36;

    this.hotspots.forEach((spot, idx) => {
      const radiusKm = spot.smoke_radius_km || 20;
      const isCooling = spot.status_kebakaran === "tahap pendinginan";

      for (let i = 0; i < particlesPerHotspot; i++) {
        this.particles.push({
          hotspotIndex: idx,
          progress: Math.random(), // tersebar merata di awal
          speedFactor: isCooling ? 0.4 + Math.random() * 0.4 : 0.7 + Math.random() * 0.6,
          offsetAngle: (Math.random() - 0.5) * (isCooling ? 0.4 : 0.55), // kerucut dispersi uap lebih kompak
          maxDistancePx: isCooling ? Math.min(80, Math.max(30, radiusKm * 2.5)) : Math.min(180, Math.max(60, radiusKm * 4.5)),
          initialRadius: isCooling ? 4 + Math.random() * 3 : 6 + Math.random() * 4,
          maxRadius: isCooling ? 16 + Math.random() * 8 : 28 + Math.random() * 18,
          initialOpacity: isCooling ? 0.18 : (spot.status_kebakaran === "aktif membara" ? 0.45 : 0.35),
          colorType: spot.status_kebakaran,
        });
      }
    });
  }

  private loop = (): void => {
    if (this.isDestroyed) return;

    if (this.config.isPlaying) {
      this.render();
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  public start(): void {
    if (!this.animFrameId && this.config.isPlaying) {
      this.loop();
    }
  }

  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }

  public render(): void {
    const size = this.map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);

    if (this.hotspots.length === 0 || this.particles.length === 0) return;

    const screenPositions = this.hotspots.map((spot) => {
      try {
        const point = this.map.latLngToContainerPoint(spot.coordinates);
        return {
          x: point.x,
          y: point.y,
          isOnScreen: point.x >= -100 && point.x <= size.x + 100 && point.y >= -100 && point.y <= size.y + 100,
        };
      } catch {
        return { x: -999, y: -999, isOnScreen: false };
      }
    });

    const windAngle = this.config.windAngleDeg !== undefined
      ? (((this.config.windAngleDeg + 90) % 360) * Math.PI) / 180
      : getWindAngleRad(this.config.windDirection);

    const humidity = this.config.relativeHumidity ?? 75;
    // Humidity changes the appearance only; these factors are illustrative.
    const humiditySpreadFactor = humidity < 50 ? 1.25 : (humidity > 80 ? 0.85 : 1.0);
    const speedNormalized = (this.config.windSpeedKmh / 30) * 0.007;

    this.particles.forEach((p) => {
      const origin = screenPositions[p.hotspotIndex];
      if (!origin || !origin.isOnScreen) return;

      if (this.config.isPlaying) {
        p.progress += speedNormalized * p.speedFactor;
        if (p.progress > 1.0) {
          p.progress = 0;
          p.offsetAngle = (Math.random() - 0.5) * 0.55;
        }
      }

      const totalAngle = windAngle + p.offsetAngle;
      const currentDist = p.progress * p.maxDistancePx * humiditySpreadFactor;
      const px = origin.x + Math.cos(totalAngle) * currentDist;
      const py = origin.y + Math.sin(totalAngle) * currentDist;

      const currentRadius = p.initialRadius + p.progress * (p.maxRadius - p.initialRadius);
      // Fade particles in before fading them out to avoid a visible restart.
      const fadeIn = Math.min(1, p.progress * 4);
      const fadeOut = 1 - p.progress;
      const currentOpacity = p.initialOpacity * fadeIn * fadeOut;

      if (currentOpacity <= 0.01) return;

      let rgb = getSmokeColorRgb(p.colorType);
      if (humidity > 80 && p.colorType !== "aktif membara") {
        rgb = {
          r: Math.min(255, Math.round(rgb.r * 0.85 + 30)),
          g: Math.min(255, Math.round(rgb.g * 0.85 + 32)),
          b: Math.min(255, Math.round(rgb.b * 0.85 + 35)),
        };
      }

      const grad = this.ctx.createRadialGradient(px, py, 0, px, py, currentRadius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentOpacity.toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(currentOpacity * 0.6).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
}
// --- end of Smoke animation ---
