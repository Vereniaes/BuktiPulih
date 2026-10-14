// src/utils/plotDisplay.ts
// -> helper tampilan data petak yang dipakai bersama oleh peta, kalender, dan catatan
//      -> pencocokan wilayah filter (kalbar / bekasi / kalteng)
//      -> label dan warna status pohon
//      -> format angka dan tanggal lokal id-ID

import { TreeStatus } from "@/types";

export type RegionKey =
  | "all"
  | "kalteng"
  | "kalbar"
  | "riau"
  | "sumsel"
  | "kalsel"
  | "jambi"
  | "bekasi";

// helper --------------------------------------------------------------------------
// daftar tab wilayah beserta nama provinsi pada data petak
export const REGION_TABS: { key: RegionKey; label: string; province: string }[] = [
  { key: "all", label: "Semua Wilayah", province: "" },
  { key: "kalteng", label: "Kalteng (Sebangau / Pulang Pisau)", province: "Kalimantan Tengah" },
  { key: "kalbar", label: "Kalbar (Kubu Raya / Ketapang)", province: "Kalimantan Barat" },
  { key: "riau", label: "Riau (Pelalawan / Kampar)", province: "Riau" },
  { key: "sumsel", label: "Sumsel (Ogan Komering Ilir)", province: "Sumatera Selatan" },
  { key: "kalsel", label: "Kalsel (Banjarbaru)", province: "Kalimantan Selatan" },
  { key: "jambi", label: "Jambi (Muaro Jambi)", province: "Jambi" },
  { key: "bekasi", label: "Bekasi (Hutan Kota)", province: "Jawa Barat" },
];

// koordinat pusat tampilan peta per wilayah untuk navigasi flyTo presisi
export const REGION_COORDINATES: Record<RegionKey, { center: [number, number]; zoom: number }> = {
  all: { center: [-1.5, 112.0], zoom: 5 },
  kalteng: { center: [-2.40, 114.05], zoom: 9 },
  kalbar: { center: [-0.85, 109.85], zoom: 9 },
  riau: { center: [0.28, 102.15], zoom: 9 },
  sumsel: { center: [-3.35, 104.92], zoom: 9 },
  kalsel: { center: [-3.45, 114.83], zoom: 9 },
  jambi: { center: [-1.58, 103.75], zoom: 9 },
  bekasi: { center: [-6.23, 106.99], zoom: 11 },
};

// function buat cek apakah wilayah petak masuk filter yang dipilih
// input param : region (teks provinsi petak), key (kunci filter)
// output : boolean
export function matchRegion(region: string, key: string): boolean {
  if (key === "all") return true;
  const tab = REGION_TABS.find((t) => t.key === key);
  return tab ? region.toLowerCase().includes(tab.province.toLowerCase()) : true;
}

// label dan warna titik status pohon
export const STATUS_DISPLAY: Record<TreeStatus, { label: string; color: string }> = {
  subur: { label: "tumbuh subur", color: "var(--stamp)" },
  perlu_rawat: { label: "perlu dirawat", color: "var(--warning-amber)" },
  kritis: { label: "kritis", color: "var(--warning-amber)" },
  mati: { label: "mati", color: "var(--alert-red)" },
};

// function buat format angka gaya indonesia (4.150 / 82,89)
// input param : value, digits (jumlah desimal maksimal)
// output : string
export function formatId(value: number, digits = 0): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

// function buat format tanggal singkat (12 okt 2026) atau bulan saja (okt)
// input param : iso (tanggal iso), monthOnly
// output : string huruf kecil
export function formatDateId(iso: string, monthOnly = false): string {
  const options: Intl.DateTimeFormatOptions = monthOnly
    ? { month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return new Date(iso).toLocaleDateString("id-ID", options).toLowerCase();
}
// end of helper ------------------------------------------------------------------
