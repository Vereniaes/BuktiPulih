// Todo:
// -> Share region filters, status labels, and Indonesian number and date formats.

// --- Plot display ---
import { TreeStatus } from "@/types";

export type RegionKey =
  | "all"
  | "kalteng"
  | "kalbar"
  | "riau"
  | "sumsel"
  | "kalsel"
  | "jambi"
  | "bekasi"
  | "lainnya";

export const REGION_TABS: { key: RegionKey; label: string; province: string }[] = [
  { key: "all", label: "Semua Wilayah", province: "" },
  { key: "kalteng", label: "Kalteng (Sebangau / Pulang Pisau)", province: "Kalimantan Tengah" },
  { key: "kalbar", label: "Kalbar (Kubu Raya / Ketapang)", province: "Kalimantan Barat" },
  { key: "riau", label: "Riau (Pelalawan / Kampar)", province: "Riau" },
  { key: "sumsel", label: "Sumsel (Ogan Komering Ilir)", province: "Sumatera Selatan" },
  { key: "kalsel", label: "Kalsel (Banjarbaru)", province: "Kalimantan Selatan" },
  { key: "jambi", label: "Jambi (Muaro Jambi)", province: "Jambi" },
  { key: "bekasi", label: "Bekasi (Hutan Kota)", province: "Jawa Barat" },
  { key: "lainnya", label: "Wilayah lain", province: "Wilayah lain" },
];

export const REGION_COORDINATES: Record<RegionKey, { center: [number, number]; zoom: number }> = {
  all: { center: [-1.5, 112.0], zoom: 5 },
  kalteng: { center: [-2.40, 114.05], zoom: 9 },
  kalbar: { center: [-0.85, 109.85], zoom: 9 },
  riau: { center: [0.28, 102.15], zoom: 9 },
  sumsel: { center: [-3.35, 104.92], zoom: 9 },
  kalsel: { center: [-3.45, 114.83], zoom: 9 },
  jambi: { center: [-1.58, 103.75], zoom: 9 },
  lainnya: { center: [-1.5, 112], zoom: 5 },
  bekasi: { center: [-6.23, 106.99], zoom: 11 },
};

export function matchRegion(region: string, key: string): boolean {
  if (key === "all") return true;
  if (key === "lainnya") return !REGION_TABS.some(tab => tab.key !== "all" && tab.key !== "lainnya" && region.toLowerCase().includes(tab.province.toLowerCase()));
  const tab = REGION_TABS.find((t) => t.key === key);
  return tab ? region.toLowerCase().includes(tab.province.toLowerCase()) : true;
}

export const STATUS_DISPLAY: Record<TreeStatus, { label: string; color: string }> = {
  subur: { label: "tumbuh subur", color: "var(--stamp)" },
  perlu_rawat: { label: "perlu dirawat", color: "var(--warning-amber)" },
  kritis: { label: "kritis", color: "var(--warning-amber)" },
  mati: { label: "mati", color: "var(--alert-red)" },
};

export function formatId(value: number, digits = 0): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

export function formatDateId(iso: string, monthOnly = false): string {
  const options: Intl.DateTimeFormatOptions = monthOnly
    ? { month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return new Date(iso).toLocaleDateString("id-ID", options).toLowerCase();
}
// --- end of Plot display ---
