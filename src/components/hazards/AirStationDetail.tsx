// Show official air quality readings for a selected station.
"use client";

import { useEffect, useRef, useState } from "react";
import type { IspuDetail, IspuStation } from "@/types/air-quality";
import { ISPU_COLORS, ISPU_LABELS } from "@/types/air-quality";
import { getIspuDetailApi } from "@/services/api";
import { formatTimeWib } from "@/utils/hourlyForecast";
import { MapIcon } from "./MapIcon";
import styles from "./air-station-detail.module.css";

interface Props {
  station: IspuStation;
  en: boolean;
  onBack: () => void;
}

const POLLUTANTS = [["pm25","PM2.5"],["pm10","PM10"],["so2","SO2"],["co","CO"],["o3","O3"],["no2","NO2"],["hc","HC"]];

function barColor(value: number) {
  if (value <= 50) return "#19743d";
  if (value <= 100) return "#285bc4";
  if (value <= 200) return "#b49b00";
  if (value <= 300) return "#c53c30";
  return "#252b27";
}

export function AirStationDetail({ station, en, onBack }: Props) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>heading.current?.focus({preventScroll:true}),[station.id]);
  const [request, setRequest] = useState<{ id: string; data?: IspuDetail; failed?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const data = request?.id === station.id ? request.data : undefined;
  const failed = request?.id === station.id && request.failed === true;
  const loading = request?.id !== station.id;

  useEffect(() => {
    const controller = new AbortController();
    getIspuDetailApi(station.id, controller.signal).then(
      (detail) => { if (!controller.signal.aborted) setRequest({ id: station.id, data: detail }); },
      () => { if (!controller.signal.aborted) setRequest({ id: station.id, failed: true }); },
    );
    return () => controller.abort();
  }, [station.id, station.observed_at, retry]);

  function retryDetail() {
    setRequest(null);
    setRetry((value) => value + 1);
  }

  const reading=data?.station??station;
  const pollutantValues = POLLUTANTS.map(([key,label]) => ({ key:label, value:data?.pollutants.find(item=>item.key===key)?.index??null }));
  const maxValue = Math.max(300, ...pollutantValues.map(({ value }) => value ?? 0));
  const category = en ? ISPU_LABELS[reading.category][1] : ISPU_LABELS[reading.category][0];

  return (
    <div className={styles.detail}>
      <button type="button" className={styles.back} onClick={()=>{onBack();requestAnimationFrame(()=>document.getElementById("ispu-station-select")?.focus());}}>
        <MapIcon name="back" />{en ? "Back to layers" : "Kembali ke lapisan"}
      </button>
      <h3 ref={heading} tabIndex={-1} className={styles.name}>{station.name}</h3>
      <p className={styles.address}>{station.address}{station.address && station.province ? " · " : ""}{station.province}</p>

      <section className={styles.overall} aria-label={en ? "Overall ISPU" : "ISPU keseluruhan"}>
        <div className={styles.score} style={{ color: reading.category==="TIDAK SEHAT"?"#806900":ISPU_COLORS[reading.category] }}>{reading.value}</div>
        <div>
          <strong>{category}</strong>
          <span>{en ? "Overall ISPU" : "ISPU keseluruhan"}</span>
        </div>
      </section>

      <dl className={styles.facts}>
        <dt>{en ? "Dominant pollutant" : "Polutan dominan"}</dt><dd>{reading.dominant_pollutant}</dd>
        <dt>{en ? "Observed" : "Waktu pengamatan"}</dt><dd>{formatTimeWib(reading.observed_at)}</dd>
        <dt>{en ? "Station type" : "Jenis stasiun"}</dt><dd>{station.station_type}</dd>
      </dl>

      {data?.status==="cached"&&<p className={styles.message} role="status">{en?"Showing cached readings.":"Menampilkan nilai tersimpan."}</p>}
      <h4 className={styles.chartTitle}>{en ? "ISPU subindex" : "Subindeks ISPU"}</h4>
      {loading ? <p className={styles.message} role="status">{en ? "Loading pollutant values…" : "Memuat nilai polutan…"}</p> : failed ? (
        <div className={styles.message} role="alert">
          <p>{en ? "Pollutant values could not be loaded." : "Nilai polutan belum dapat dimuat."}</p>
          <button type="button" className={styles.retry} onClick={retryDetail}>{en ? "Retry" : "Coba lagi"}</button>
        </div>
      ) : (
        <div className={styles.chart} role="table" aria-label={en?"ISPU subindices":"Subindeks ISPU"}>
          {pollutantValues.map(({ key, value }) => {
            const color = value === null ? "#a5aa9f" : barColor(value);
            const width = value === null ? 0 : Math.max(0, value) / maxValue * 100;
            return (
              <div className={styles.row} key={key} role="row">
                <span className={styles.pollutant} role="rowheader">{key}</span>
                <div className={styles.track} aria-hidden="true"><span style={{ width: `${width}%`, backgroundColor: color }} /></div>
                <span role="cell" className={styles.value} style={{ color: value === null ? undefined : color }}>{value ?? "—"}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className={styles.unit}>{en ? "Subindex · unitless" : "Subindeks · tanpa satuan"}</p>
      <a className={styles.source} href="https://ispu.kemenlh.go.id/app/" target="_blank" rel="noreferrer">KLH/BPLH ↗</a>
    </div>
  );
}
