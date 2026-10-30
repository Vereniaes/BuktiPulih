// Todo:
// -> share report category labels and coordinate checks

// --- Evidence labels ---
export const CONDITION_LABELS: Record<string, [string, string]> = {
  subur: ["Subur", "Thriving"], perlu_rawat: ["Perlu dirawat", "Needs care"],
  kritis: ["Kritis", "Critical"], mati: ["Mati", "Dead"],
  habis_terbakar:["Habis Terbakar","Burnt"],dalam_pemulihan:["Sedang dalam Pemulihan","Recovering"],terbakar:["Sedang Terbakar","Burning"],terendam:["Terendam","Flooded"],rusak:["Rusak","Damaged"],
};
export const ECOSYSTEM_LABELS: Record<string, [string, string]> = {
  gambut: ["Gambut", "Peatland"], hutan_kota: ["Hutan kota", "Urban forest"], mineral: ["Mineral", "Mineral soil"],
  rumah:["Rumah","House"],permukiman:["Permukiman","Settlement"],hutan:["Hutan","Forest"],mangrove:["Mangrove","Mangrove"],kebun:["Kebun","Garden"],pertanian:["Lahan pertanian","Farmland"],sungai:["Sungai","River"],
};
export function categoryLabel(kind:"ecosystem"|"condition",key:string,language:"id"|"en") {
  return (kind==="ecosystem"?ECOSYSTEM_LABELS:CONDITION_LABELS)[key]?.[language==="id"?0:1] ?? key;
}
export function validCoordinates(value: number[]): value is [number, number] {
  return value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
// --- end of Evidence labels ---
