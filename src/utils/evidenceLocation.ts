// Keep new province names compatible with the existing regional report filters.
import type { ForumPost } from "@/types";
export function evidenceRegion(province: string, city: string): ForumPost["region_key"] {
  const name = province.toLowerCase().replace(/provinsi|province/g, "").trim();
  const regions: Record<string, ForumPost["region_key"]> = {
    "kalimantan barat": "kalbar", "west kalimantan": "kalbar", "kalimantan tengah": "kalteng", "central kalimantan": "kalteng",
    riau: "riau", "sumatera selatan": "sumsel", "south sumatra": "sumsel", "kalimantan selatan": "kalsel", "south kalimantan": "kalsel", jambi: "jambi",
  };
  return regions[name] ?? ((name === "jawa barat" || name === "west java") && /bekasi/i.test(city) ? "bekasi" : "lainnya");
}
