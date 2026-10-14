// src/components/TimeLapsePlayerDock.tsx
// -> komponen pemutar linimasa melayang (floating interactive player dock)
//      -> bilah kendali media putar otomatis kilas balik 24 jam karhutla
//      -> slider penjelajah waktu (-24 jam s.d. kondisi terkini)
//      -> selektor kecepatan animasi (1x, 2x, 4x) & penanda parameter riil per jam

"use client";

import React from "react";
import { TimeLapseFrame } from "@/utils/timeLapseService";

interface TimeLapsePlayerDockProps {
  frames: TimeLapseFrame[];
  currentOffset: number; // -24 s.d. 0
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 4;
  isLoading: boolean;
  onTogglePlay: () => void;
  onSeek: (offset: number) => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onClose: () => void;
}

// helper --------------------------------------------------------------------------
// function pemilih frame aktif berdasarkan offset jam
// input param : frames (array), currentOffset (number)
// output : TimeLapseFrame atau null
function getActiveFrame(frames: TimeLapseFrame[], currentOffset: number): TimeLapseFrame | null {
  if (frames.length === 0) return null;
  const match = frames.find((f) => f.hourOffset === currentOffset);
  return match || frames[frames.length - 1];
}
// end of helper ------------------------------------------------------------------

export const TimeLapsePlayerDock: React.FC<TimeLapsePlayerDockProps> = ({
  frames,
  currentOffset,
  isPlaying,
  playbackSpeed,
  isLoading,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onClose,
}) => {
  const activeFrame = getActiveFrame(frames, currentOffset);

  // navigasi 1 langkah jam ke belakang
  const handleStepBack = () => {
    onSeek(Math.max(-24, currentOffset - 1));
  };

  // navigasi 1 langkah jam ke depan
  const handleStepForward = () => {
    onSeek(Math.min(0, currentOffset + 1));
  };

  // siklus rotasi kecepatan putar (1x -> 2x -> 4x -> 1x)
  const handleCycleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1;
    onSpeedChange(nextSpeed);
  };

  const progressPercent = ((currentOffset + 24) / 24) * 100;

  return (
    <aside
      className="timelapse-dock-container"
      aria-label="Panel Pemutar Kilas Balik 24 Jam"
      role="region"
    >
      {/* 1. bilah informasi stempel waktu & penutup */}
      <div className="timelapse-dock-header">
        <div className="timelapse-dock-title-group">
          <span className="timelapse-status-pulse" />
          <span className="timelapse-dock-title">Kilas Balik 24 Jam</span>
          {isLoading ? (
            <span className="timelapse-badge-loading">Memuat Deret Waktu...</span>
          ) : (
            <span className="timelapse-badge-time">
              {activeFrame ? activeFrame.fullLabel : "Sinkronisasi Cuaca"}
            </span>
          )}
        </div>

        <button
          type="button"
          className="timelapse-btn-close"
          onClick={onClose}
          title="Tutup pemutar kilas balik dan kembali ke pantauan live"
          aria-label="Tutup pemutar"
        >
          ✕
        </button>
      </div>

      {/* 2. bilah kontrol media & slider penjelajah waktu */}
      <div className="timelapse-dock-controls">
        <div className="timelapse-media-btns">
          <button
            type="button"
            className="timelapse-btn-ctrl"
            onClick={handleStepBack}
            disabled={currentOffset <= -24}
            title="Mundur 1 Jam"
            aria-label="Mundur 1 Jam"
          >
            ⏮
          </button>

          <button
            type="button"
            className={`timelapse-btn-play ${isPlaying ? "playing" : ""}`}
            onClick={onTogglePlay}
            title={isPlaying ? "Jeda Pemutaran" : "Putar Deret Waktu Satelit 24 Jam"}
            aria-label={isPlaying ? "Jeda" : "Putar"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button
            type="button"
            className="timelapse-btn-ctrl"
            onClick={handleStepForward}
            disabled={currentOffset >= 0}
            title="Maju 1 Jam"
            aria-label="Maju 1 Jam"
          >
            ⏭
          </button>

          <button
            type="button"
            className="timelapse-btn-speed"
            onClick={handleCycleSpeed}
            title="Ubah Kecepatan Putar"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* slider waktu dengan rel progress terisi */}
        <div className="timelapse-slider-track-wrap">
          <input
            type="range"
            min={-24}
            max={0}
            step={1}
            value={currentOffset}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="timelapse-slider-input"
            style={{
              background: `linear-gradient(to right, var(--color-orange-hazard, #F97316) 0%, var(--color-orange-hazard, #F97316) ${progressPercent}%, rgba(120, 120, 120, 0.3) ${progressPercent}%, rgba(120, 120, 120, 0.3) 100%)`,
            }}
            aria-valuemin={-24}
            aria-valuemax={0}
            aria-valuenow={currentOffset}
            aria-label="Slider linimasa jam"
          />

          {/* penanda jam klik langsung (ticks) */}
          <div className="timelapse-ticks-row">
            {[-24, -18, -12, -6, 0].map((tick) => (
              <button
                key={tick}
                type="button"
                className={`timelapse-tick-btn ${currentOffset === tick ? "active" : ""}`}
                onClick={() => onSeek(tick)}
              >
                {tick === 0 ? "Live" : `${tick}j`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ringkasan parameter meteorologi jam aktif */}
      {activeFrame && (
        <div className="timelapse-dock-parameters">
          <div className="timelapse-param-pill">
            <span className="param-label">Angin:</span>
            <span className="param-val">
              {activeFrame.windSpeedKmh} km/j · {activeFrame.windDirectionCardinal} ({activeFrame.windDirectionLabelId})
            </span>
          </div>

          <div className="timelapse-param-pill">
            <span className="param-label">Kelembapan:</span>
            <span className="param-val">
              {activeFrame.relativeHumidity}% ({activeFrame.temperatureC}°C)
            </span>
          </div>

          <div className="timelapse-param-pill">
            <span className="param-label">Est. PM2.5:</span>
            <span className="param-val" style={{ color: activeFrame.estimatedPm25 > 150 ? "#DC2626" : "#F59E0B", fontWeight: 700 }}>
              {activeFrame.estimatedPm25} µg/m³
            </span>
          </div>

          <div className="timelapse-param-pill hide-on-mobile">
            <span className="param-label">Luas Asap:</span>
            <span className="param-val">
              {activeFrame.estimatedAreaHa.toLocaleString("id-ID")} Ha
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
