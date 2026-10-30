// Todo:
// -> Show supplied provincial totals and their recorded update date.

// --- BNPB summary ---
import React, { useState } from "react";
import { BnpbSyncData } from "@/types";
import { formatId, formatDateId } from "@/utils/plotDisplay";
import { bnpbSourceDate, bnpbStatus } from "@/utils/bnpbFreshness";
import { formatTimeWib } from "@/utils/hourlyForecast";

interface BnpbSyncBannerProps {
  data: BnpbSyncData;
}

export const BnpbSyncBanner: React.FC<BnpbSyncBannerProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = bnpbStatus(data);
  const dates = data.provinces.map(province => bnpbSourceDate(province.tgl_update)).filter((date): date is string => date !== null).sort();

  return (
    <aside className="bnpb-ticker-card" aria-label="sinkronisasi data bnpb">
      <div className="ticker-info">
        <div>
          <span className="ticker-title">
            {status === "unavailable" ? "Data BNPB belum tersedia" : status === "cached" ? "Data BNPB tersimpan" : "Data karhutla BNPB"}
          </span>
          <p className="ticker-meta">
            Sumber: {data.source} · tanggal sumber terakhir: {dates.length ? formatDateId(dates.at(-1)!) : "belum tersedia"}
            {(data.fetched_at ?? data.sync_timestamp) && <> · diambil: {formatTimeWib((data.fetched_at ?? data.sync_timestamp)!)}</>}
            {data.checked_at && <> · diperiksa: {formatTimeWib(data.checked_at)}</>}
          </p>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-ticker-toggle"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "tutup rincian wilayah" : `lihat ${data.provinces.length} provinsi terpantau`}
        </button>
      </div>

      {isExpanded && (
        <div className="ticker-expand-grid">
          {data.provinces.map((prov) => (
            <div key={prov.provinsi} className="ticker-province-card">
              <span className="province-name">{prov.provinsi.toLowerCase()}</span>
              <p className="province-stat">
                luas terbakar: <strong>{formatId(prov.today_luas_terbakar_ha, 1)} ha</strong> · hotspot:{" "}
                <strong>{prov.total_hotspot}</strong>
              </p>
              {prov.buktipulih_coverage && <p className="province-coverage">
                buktipulih: <strong>{formatId(prov.buktipulih_coverage.alive_trees)} pohon hidup</strong> (
                {formatId(prov.buktipulih_coverage.restored_area_ha, 1)} ha)
              </p>}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
// --- end of BNPB summary ---
