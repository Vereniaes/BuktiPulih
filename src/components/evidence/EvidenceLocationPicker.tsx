// Choose a place or map point, then identify its editable province and city.
"use client";
import { useEffect, useRef, useState } from "react";
import { reverseLocation } from "@/services/locations";
import type { EvidenceLocation, LocationSuggestion } from "@/types/location";
import { LocationSearch } from "./LocationSearch";
import { EvidenceMap } from "./EvidenceMap";
import styles from "./evidence-form.module.css";
interface Props { value: EvidenceLocation; onChange: (location: EvidenceLocation | ((current: EvidenceLocation) => EvidenceLocation)) => void; onName: (name: string) => void; language: "id" | "en"; }
export function EvidenceLocationPicker({ value, onChange, onName, language }: Props) {
  const en = language === "en";
  const [query, setQuery] = useState(""), [looking, setLooking] = useState(false), [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  const [locating, setLocating] = useState(false);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);
  const stop = () => { generation.current++; request.current?.abort(); setLooking(false); setLocating(false); setMessage(""); };
  const select = async (suggestion: LocationSuggestion) => {
    stop(); const current = new AbortController(); request.current = current;
    setQuery(suggestion.label.slice(0, 160)); setLooking(true);
    onChange(value => ({ ...value, point: null, province: "", city: "" }));
    try {
      const item = await suggestion.resolve(current.signal);
      if (current.signal.aborted) return;
      onChange(value => ({ ...value, point: item.coordinates, province: item.province, city: item.city })); onName(item.name);
    } catch { if (!current.signal.aborted) setMessage(en ? "Place could not be selected. Try again or pick on the map." : "Lokasi belum dapat dipilih. Coba lagi atau pilih pada peta."); }
    finally { if (!current.signal.aborted) setLooking(false); }
  };
  const pick = async (point: [number, number]) => {
    stop(); const current = new AbortController(); request.current = current;
    setQuery(""); onChange(current => ({ ...current, point, province: "", city: "" })); setLooking(true);
    try {
      const result = await reverseLocation(point, current.signal, language);
      if (current.signal.aborted) return;
      if (result.items[0]) { const item = result.items[0]; setQuery(item.label.slice(0, 160)); onChange(current => ({ ...current, point, province: item.province, city: item.city })); }
      else setMessage(en ? "Region not found. Enter the province and city below." : "Wilayah belum ditemukan. Isi provinsi dan kota secara manual.");
    } catch { if (!current.signal.aborted) setMessage(en ? "Region lookup is unavailable. Enter the province and city." : "Wilayah belum dapat dimuat. Isi provinsi dan kota."); }
    finally { if (!current.signal.aborted) setLooking(false); }
  };
  const locate = () => {
    stop();
    if (!navigator.geolocation) { setMessage(en ? "Device location is unavailable. Pick a point on the map." : "Lokasi perangkat tidak tersedia. Pilih titik pada peta."); return; }
    const current = generation.current; setLocating(true); setQuery("");
    onChange(current => ({ ...current, point: null, province: "", city: "" }));
    navigator.geolocation.getCurrentPosition(position => {
      if (current === generation.current) void pick([Number(position.coords.longitude.toFixed(6)), Number(position.coords.latitude.toFixed(6))]);
    }, () => {
      if (current !== generation.current) return;
      setLocating(false); setMessage(en ? "Location is unavailable. Search or choose a point on the map." : "Lokasi belum dapat diakses. Cari atau pilih titik pada peta.");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const edit = (field: "province" | "city" | "place_detail", text: string) => { if (field !== "place_detail") stop(); onChange(current => ({ ...current, [field]: text })); };
  return <div className={styles.locationFields}>
    <LocationSearch value={query} onEdit={text => { stop(); setQuery(text); onChange(current => ({ ...current, point: null, province: "", city: "" })); }} onSelect={item => void select(item)} language={language} />
    <div className={styles.administrativeFields}>
      <label>{en ? "Region" : "Wilayah"}<input value={value.province} onChange={event => edit("province", event.target.value)} required minLength={2} maxLength={100} autoComplete="address-level1" placeholder={en ? "Province" : "Provinsi"} /></label>
      <label>{en ? "District/City" : "Daerah/Kota"}<input value={value.city} onChange={event => edit("city", event.target.value)} required minLength={2} maxLength={100} autoComplete="address-level2" placeholder={en ? "District or city" : "Kabupaten atau kota"} /></label>
    </div>
    <label>{en ? "Place details" : "Detail tempat"}<input value={value.place_detail} onChange={event => edit("place_detail", event.target.value)} maxLength={240} placeholder={en ? "For example, beside the tyre repair shop" : "Contoh: samping tambal ban"} /></label>
    <EvidenceMap value={value.point} onChange={point => void pick(point)} onLocate={locate} locating={locating} language={language} />
    <p className={styles.locationStatus} role="status">{looking ? (en ? "Finding the region…" : "Mencari wilayah…") : message || (value.point ? (en ? "Report point selected. Drag the pin to adjust." : "Titik laporan dipilih. Geser pin untuk menyesuaikan.") : (en ? "Search for a place or tap the map to select a point." : "Cari lokasi atau ketuk peta untuk memilih titik."))}</p>
  </div>;
}
