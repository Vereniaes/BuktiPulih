// Show model forecasts for one selected location, with an accessible data table.
"use client";
import { useEffect, useState } from "react";
import type { ForecastLocation, HourlyForecast } from "@/types/environment";
import { fetchAirQualityForecast } from "@/utils/airQualityService";
import { convertDegreeToCardinal, fetchWeatherForecast } from "@/utils/weatherService";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { formatId } from "@/utils/plotDisplay";
import styles from "./home.module.css";

const metrics = {
  pm2_5: { label: "PM2.5", unit: "µg/m³", source: "CAMS Global melalui Open-Meteo" },
  wind_speed_10m: { label: "Angin", unit: "km/jam", source: "Model cuaca Open-Meteo" },
  precipitation: { label: "Hujan", unit: "mm/jam", source: "Model cuaca Open-Meteo" },
};
type Metric = keyof typeof metrics;

export function ForecastPanel({ location }: { location: ForecastLocation | null }) {
  const [metric, setMetric] = useState<Metric>("pm2_5");
  const [results, setResults] = useState<{ air?: HourlyForecast; weather?: HourlyForecast }>({});
  const [retry, setRetry] = useState(0);
  const lat = location?.coordinates[0], lon = location?.coordinates[1];
  useEffect(() => {
    let active = true;
    setResults({});
    if (lat === undefined || lon === undefined) return;
    void fetchAirQualityForecast(lat, lon).then(air => { if (active) setResults(prev => ({ ...prev, air })); });
    void fetchWeatherForecast(lat, lon).then(weather => { if (active) setResults(prev => ({ ...prev, weather })); });
    return () => { active = false; };
  }, [lat, lon, retry]);

  const result = metric === "pm2_5" ? results.air : results.weather;
  const info = metrics[metric];
  const points = result?.points ?? [];
  const values = points.map(p => p.values[metric]);
  const max = Math.max(1, ...values.filter((v): v is number => v !== null));
  const x = (index: number) => 50 + index / Math.max(1, points.length - 1) * 710;
  const y = (value: number) => 190 - value / max * 160;
  let connected = false;
  const line = values.map((value, i) => {
    if (value === null) { connected = false; return ""; }
    const command = `${connected ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`;
    connected = true;
    return command;
  }).join(" ");
  const hasValues = values.some(v => v !== null);

  return <section className={styles.forecast} aria-labelledby="forecast-title">
    <div className={styles.sectionHead}>
      <div><h2 id="forecast-title">Prakiraan lokasi</h2><p className={styles.muted}>
        {location ? `${location.label} · ${lat?.toFixed(3)}, ${lon?.toFixed(3)}` : "Pilih wilayah atau titik pada peta untuk melihat prakiraan."}
      </p></div>
      {location && <div className={styles.segment} role="group" aria-label="Variabel prakiraan">
        {(Object.keys(metrics) as Metric[]).map(key => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{metrics[key].label}</button>)}
      </div>}
    </div>
    {location && <>
      <p className={styles.source}>Estimasi model · {info.source} · hingga 5 hari · waktu WIB</p>
      <div aria-live="polite">
        {!result && <p className={styles.empty}>Memuat prakiraan…</p>}
        {result?.status === "unavailable" && <p className={styles.empty}>Prakiraan {info.label} belum tersedia. <button onClick={() => setRetry(n => n + 1)}>Coba lagi</button></p>}
        {result?.status === "cached" && <p className={styles.notice}>Pembaruan gagal. Data tersimpan · {result.fetched_at && formatTimeWib(result.fetched_at)} <button onClick={() => setRetry(n => n + 1)}>Coba lagi</button></p>}
      </div>
      {result && result.status !== "unavailable" && <>
        {hasValues ? <figure className={styles.chart}>
          <svg viewBox="0 0 800 235" role="img" aria-labelledby="forecast-chart-title">
            <title id="forecast-chart-title">Prakiraan {info.label}, {info.unit}. Angka lengkap tersedia dalam tabel.</title>
            {[0, 0.5, 1].map(f => <g key={f}>
              <line x1="50" x2="760" y1={y(max * f)} y2={y(max * f)} className={styles.gridLine} />
              <text x="42" y={y(max * f) + 4} textAnchor="end">{formatId(max * f, 1)}</text>
            </g>)}
            <path d={line} fill="none" className={styles.chartLine} />
            {values.map((value, i) => value !== null && <circle key={i} cx={x(i)} cy={y(value)} r="2" className={styles.chartPoint}>
              <title>{formatTimeWib(points[i].time)}: {formatId(value, 1)} {info.unit}</title>
            </circle>)}
            {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i, n) => points[i] &&
              <text key={n} x={x(i)} y="220" textAnchor={n === 0 ? "start" : n === 2 ? "end" : "middle"}>
                {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(points[i].time)}
              </text>)}
          </svg>
          <figcaption>{info.label} ({info.unit}). Bagian kosong menandakan nilai belum tersedia.</figcaption>
        </figure> : <p className={styles.empty}>Nilai prakiraan belum tersedia.</p>}
        {points.length > 0 && <details className={styles.dataTable}>
          <summary>Lihat angka per jam</summary>
          <div><table><caption>{info.label} · waktu WIB</caption><thead><tr><th>Waktu</th><th>{info.label} ({info.unit})</th>{metric === "wind_speed_10m" && <th>Arah asal angin</th>}</tr></thead>
            <tbody>{points.map((p, i) => <tr key={p.time}><th scope="row">{formatTimeWib(p.time)}</th><td>{values[i] === null ? "Belum tersedia" : formatId(values[i], 1)}</td>
              {metric === "wind_speed_10m" && <td>{p.values.wind_direction_10m == null ? "Belum tersedia" : convertDegreeToCardinal(p.values.wind_direction_10m).label_id}</td>}
            </tr>)}</tbody></table></div>
        </details>}
        <p className={styles.source}>Diambil {result.fetched_at && formatTimeWib(result.fetched_at)}. PM2.5 mencakup berbagai sumber polusi.</p>
      </>}
    </>}
  </section>;
}
