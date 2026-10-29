// src/components/BnpbSyncBanner.tsx
// -> banner penyelarasan data resmi bnpb karhutla 2026
//      -> status koneksi aktif ke WebGIS BNPB (gis.bnpb.go.id)
//      -> rincian wilayah terpantau tanpa emoji atau visual slop

import React, { useState } from "react";
import { BnpbSyncData } from "@/types";
import { formatId, formatDateId } from "@/utils/plotDisplay";

interface BnpbSyncBannerProps {
  data: BnpbSyncData;
}

export const BnpbSyncBanner: React.FC<BnpbSyncBannerProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className="bnpb-ticker-card" aria-label="sinkronisasi data bnpb">
      {/* status sinkronisasi ---------------------------------------------------- */}
      <div className="ticker-info">
        <span className="ticker-pulse" aria-hidden="true" />
        <div>
          <span className="ticker-title">
            data karhutla tersinkronisasi dari WebGIS BNPB
          </span>
          <p className="ticker-meta">
            sumber: {data.source} · pembaruan: {formatDateId(data.sync_timestamp)}
          </p>
        </div>
      </div>
      {/* end of status sinkronisasi --------------------------------------------- */}

      {/* tombol toggle rincian -------------------------------------------------- */}
      <div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-ticker-toggle"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "tutup rincian wilayah" : "lihat 6 provinsi terpantau"}
        </button>
      </div>
      {/* end of tombol toggle --------------------------------------------------- */}

      {/* grid provinsi terpantau ------------------------------------------------ */}
      {isExpanded && (
        <div className="ticker-expand-grid">
          {data.provinces.map((prov) => (
            <div key={prov.provinsi} className="ticker-province-card">
              <span className="province-name">{prov.provinsi.toLowerCase()}</span>
              <p className="province-stat">
                luas terbakar: <strong>{formatId(prov.today_luas_terbakar_ha, 1)} ha</strong> · hotspot:{" "}
                <strong>{prov.total_hotspot}</strong>
              </p>
              <p className="province-coverage">
                buktipulih: <strong>{formatId(prov.buktipulih_coverage.alive_trees)} pohon hidup</strong> (
                {formatId(prov.buktipulih_coverage.restored_area_ha, 1)} ha)
              </p>
            </div>
          ))}
        </div>
      )}
      {/* end of grid provinsi --------------------------------------------------- */}
    </aside>
  );
};
