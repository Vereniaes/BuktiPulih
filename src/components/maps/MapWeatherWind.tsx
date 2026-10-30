// Todo:
// -> Draw bounded wind trails from the active native grid.
// -> Pause during camera movement and use static arrows on modest devices.

// --- Wind field drawing ---
"use client";
import { useEffect, useRef } from "react";
import type { ExplorerMapApi } from "@/types/explorer-map";
import { sampleWeather, type WeatherGrid } from "./weather-grid";
import { snapshotProjection } from "./map-projection";

interface Vector { x: number; y: number; }
interface Particle extends Vector { age: number; }

export function MapWeatherWind({ api, data, lowGraphics }: { api: ExplorerMapApi | null; data: WeatherGrid; lowGraphics: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext("2d");
    if (!api || !element || !context) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)"), step = 40;
    let width = 0, height = 0, columns = 0, rows = 0, frame = 0, timer = 0, last = 0, lastPaint = 0, viewKey = "", builtKey = "";
    let grid: (Vector | null)[] = [], valid: number[] = [], particles: Particle[] = [];
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
    const at = (x: number, y: number) => {
      const gx = Math.floor(x / step), gy = Math.floor(y / step);
      return gx < 0 || gy < 0 || gx >= columns || gy >= rows ? null : grid[gy * columns + gx];
    };
    const reset = (particle: Particle) => {
      const cell = valid[Math.floor(Math.random() * valid.length)];
      particle.x = (cell % columns + Math.random()) * step;
      particle.y = (Math.floor(cell / columns) + Math.random()) * step;
      particle.age = Math.random() * 100;
    };
    const animate = (time: number) => {
      if (document.hidden || motion.matches || !valid.length) return;
      frame = requestAnimationFrame(animate);
      if (time - lastPaint < 1000 / 25) return;
      const dt = Math.min(0.08, last ? (time - last) / 1000 : 0.04); last = time; lastPaint = time;
      context.save(); context.globalCompositeOperation = "destination-out";
      context.fillStyle = "rgba(0,0,0,.12)"; context.fillRect(0, 0, width, height); context.restore();
      context.lineWidth = 1.25; context.lineCap = "round"; context.strokeStyle = "rgba(255,255,255,.86)";
      context.beginPath();
      for (const particle of particles) {
        const vector = at(particle.x, particle.y);
        if (!vector || particle.age++ > 150) { reset(particle); continue; }
        const x = particle.x + vector.x * dt, y = particle.y + vector.y * dt;
        if (!at(x, y)) { reset(particle); continue; }
        context.moveTo(particle.x, particle.y); context.lineTo(x, y); particle.x = x; particle.y = y;
      }
      context.stroke();
    };
    const rebuild = () => {
      clearTimeout(timer); timer = 0;
      const cameraKey = JSON.stringify([api.getView(), api.getSize()]), key = `${cameraKey}:${motion.matches}`;
      if (key === builtKey) return;
      builtKey = key; viewKey = cameraKey;
      stop(); if (document.hidden) return;
      ({ width, height } = api.getSize());
      const project = snapshotProjection(api);
      element.width = width; element.height = height;
      columns = Math.ceil(width / step); rows = Math.ceil(height / step);
      grid = new Array(columns * rows); valid = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const index = y * columns + x;
        if ((lowGraphics || motion.matches) && (index % 3 !== 0 || y % 2 !== 0)) { grid[index] = null; continue; }
        const pixel = { x: (x + 0.5) * step, y: (y + 0.5) * step }, point = api.unproject(pixel);
        const u = sampleWeather(data, "u", point[0], point[1]), v = sampleWeather(data, "v", point[0], point[1]);
        if (u === null || v === null || Math.hypot(u, v) < 0.2) { grid[index] = null; continue; }
        const ahead = project([point[0] + u * 0.002 / Math.cos(point[1] * Math.PI / 180), point[1] + v * 0.002]);
        const origin = api.engine === "google" ? pixel : project(point), dx = ahead.x - origin.x, dy = ahead.y - origin.y, length = Math.hypot(dx, dy);
        if (!Number.isFinite(length) || length < 0.001) { grid[index] = null; continue; }
        const scale = Math.min(55, Math.max(6, Math.hypot(u, v) * 4));
        grid[index] = { x: dx / length * scale, y: dy / length * scale }; valid.push(index);
      }
      if (lowGraphics || motion.matches) {
        context.strokeStyle = "rgba(255,255,255,.85)"; context.lineWidth = 1.25;
        for (const index of valid) {
          if (index % 3 !== 0 || Math.floor(index / columns) % 2 !== 0) continue;
          const vector = grid[index]!, angle = Math.atan2(vector.y, vector.x), x = (index % columns + 0.5) * step, y = (Math.floor(index / columns) + 0.5) * step;
          context.save(); context.translate(x, y); context.rotate(angle); context.beginPath();
          context.moveTo(-6, 0); context.lineTo(6, 0); context.moveTo(2, -3); context.lineTo(6, 0); context.lineTo(2, 3); context.stroke(); context.restore();
        }
      } else if (valid.length) {
        particles = Array.from({ length: Math.min(280, Math.floor(width * height / 3000)) }, () => {
          const particle = { x: 0, y: 0, age: 0 }; reset(particle); return particle;
        });
        frame = requestAnimationFrame(animate);
      }
    };
    const schedule = () => {
      const key = JSON.stringify([api.getView(), api.getSize()]);
      if (key === viewKey) return;
      viewKey = key; stop(); context.clearRect(0, 0, width, height); clearTimeout(timer); timer = window.setTimeout(rebuild, 140);
    };
    const idle = api.engine === "google" ? (api.native as google.maps.Map).addListener("idle", rebuild) : null;
    const off = api.subscribe(schedule);
    const visible = () => { if (document.hidden) stop(); else { builtKey = ""; rebuild(); } };
    document.addEventListener("visibilitychange", visible); motion.addEventListener("change", rebuild); rebuild();
    return () => { stop(); clearTimeout(timer); off(); idle?.remove(); document.removeEventListener("visibilitychange", visible); motion.removeEventListener("change", rebuild); element.width = element.height = 0; };
  }, [api, data, lowGraphics]);
  return <canvas ref={canvas} data-weather-wind aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} />;
}
// --- end of Wind field drawing ---
