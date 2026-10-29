// Show cancellable place suggestions with keyboard support.
"use client";
import { useEffect, useId, useState } from "react";
import { createLocationSearch } from "@/services/locations";
import type { LocationSuggestion } from "@/types/location";
import { MapIcon } from "../hazards/MapIcon";
import styles from "./evidence-form.module.css";
interface Props { value: string; onEdit: (query: string) => void; onSelect: (item: LocationSuggestion) => void; language: "id" | "en"; }
export function LocationSearch({ value, onEdit, onSelect, language }: Props) {
  const en = language === "en", id = useId();
  const [search] = useState(createLocationSearch);
  const [open, setOpen] = useState(false), [items, setItems] = useState<LocationSuggestion[]>([]);
  const [active, setActive] = useState(0), [loading, setLoading] = useState(false), [searched, setSearched] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!open || value.trim().length < 3) return;
    const request = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      search(value.trim(), request.signal, language).then(result => {
        if (!request.signal.aborted) { setItems(result.items); setActive(0); setSearched(true); }
      }).catch(() => { if (!request.signal.aborted) setError(en ? "Search is unavailable. Try again or pick on the map." : "Pencarian belum tersedia. Coba lagi atau pilih pada peta."); })
        .finally(() => { if (!request.signal.aborted) setLoading(false); });
    }, 650);
    return () => { clearTimeout(timer); request.abort(); };
  }, [value, open, en, language, search]);
  const choose = (item: LocationSuggestion) => { setOpen(false); setItems([]); setSearched(false); setLoading(false); onSelect(item); };
  return <div className={styles.search} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <label htmlFor={id}>{en ? "Search location" : "Cari lokasi"}</label>
    <div className={styles.searchInput}><MapIcon name="search" /><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && value.trim().length >= 3} aria-controls={`${id}-results`} aria-activedescendant={open && items[active] ? `${id}-${active}` : undefined}
      value={value} autoComplete="off" maxLength={160} placeholder={en ? "Search a street, area or place" : "Cari jalan, daerah, atau tempat"}
      onFocus={() => { setOpen(true); setSearched(false); setError(""); setLoading(value.trim().length >= 3); }} onChange={event => { setItems([]); setSearched(false); setLoading(event.target.value.trim().length >= 3); setError(""); setOpen(true); onEdit(event.target.value); }}
      onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); if (open && items[active]) choose(items[active]); }
        if (["ArrowDown", "ArrowUp"].includes(event.key) && items.length) { event.preventDefault(); setOpen(true); const next = (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; setActive(next); document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" }); }
        if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      }} /></div>
    {open && value.trim().length >= 3 && <div className={styles.searchResults}>
      <div id={`${id}-results`} role="listbox" aria-label={en ? "Location results" : "Hasil pencarian lokasi"}>
        {items.map((item, index) => {
          const area = item.label.startsWith(`${item.name}, `) ? item.label.slice(item.name.length + 2) : item.label === item.name ? "" : item.label;
          return <button key={item.id} id={`${id}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}><MapIcon name="pin" /><span><strong>{item.name}</strong>{area && <small>{area}</small>}</span></button>;
        })}
      </div>
      {loading ? <p role="status">{en ? "Searching…" : "Mencari…"}</p> : error ? <p role="status">{error}</p> : searched && !items.length ? <p role="status">{en ? "No places found. Try another name." : "Lokasi tidak ditemukan. Coba nama lain."}</p> : null}
      <small className={styles.searchCredit}>Google Maps</small>
    </div>}
  </div>;
}
