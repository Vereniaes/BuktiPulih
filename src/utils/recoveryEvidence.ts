// Shared field labels for evidence submissions and restoration maps.
import type { EcosystemType, TreeStatus } from "@/types";
export const CONDITION_LABELS: Record<TreeStatus, [string, string]> = {
  subur: ["Subur", "Thriving"], perlu_rawat: ["Perlu dirawat", "Needs care"],
  kritis: ["Kritis", "Critical"], mati: ["Mati", "Dead"],
};
export const ECOSYSTEM_LABELS: Record<EcosystemType, [string, string]> = {
  gambut: ["Gambut", "Peatland"], hutan_kota: ["Hutan kota", "Urban forest"], mineral: ["Mineral", "Mineral soil"],
};
export function validCoordinates(value: number[]): value is [number, number] {
  return value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
