// src/components/ImpactLedger.tsx
// -> ringkasan metrik pemulihan dalam satu kalimat (pengganti 4 kartu metrik)
//      -> bibit hidup dari total bibit ditanam, termasuk yang mati tetap dicatat
//      -> stempel tingkat hidup dan baris konteks luas lahan, petak, kelompok tani

import React from "react";
import { ImpactLedgerData } from "@/types";
import { formatId } from "@/utils/plotDisplay";

interface ImpactLedgerProps {
  data: ImpactLedgerData;
}

export const ImpactLedger: React.FC<ImpactLedgerProps> = ({ data }) => {
  return (
    <section className="stat-sentence" aria-label="ringkasan bibit hidup">
      <p className="stat-sentence-main">
        {formatId(data.total_alive_trees)} dari {formatId(data.total_planted_trees)} bibit masih hidup.{" "}
        <span className="stat-sentence-soft">sisanya kami catat juga.</span>{" "}
        <span className="stamp">{formatId(data.overall_survival_rate, 2)}% hidup</span>
      </p>
      <p className="stat-sentence-context">
        {formatId(data.restored_area_hectares, 2)} ha lahan · {data.active_plots_count} petak ·{" "}
        {data.active_communities_count} kelompok tani dan relawan
      </p>
    </section>
  );
};
