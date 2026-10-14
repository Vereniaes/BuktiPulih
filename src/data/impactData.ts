// src/data/impactData.ts
// -> penyedia data mock metrik impact ledger nasional
//      -> total bibit ditanam dan bibit hidup
//      -> luasan lahan terpulihkan dan jumlah petak aktif

import { ImpactLedgerData } from "@/types";

export const mockImpactData: ImpactLedgerData = {
  total_planted_trees: 15420,
  total_alive_trees: 13180,
  overall_survival_rate: 85.47,
  restored_area_hectares: 48.75,
  active_plots_count: 18,
  active_communities_count: 9,
  total_field_reports: 242,
  last_updated_at: "2026-10-13T23:15:00.000Z",
};
