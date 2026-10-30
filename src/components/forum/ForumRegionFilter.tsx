// Todo:
// -> search post regions with optional suggestions
// -> support pointer and keyboard selection
"use client";

// --- Region search ---
import { useId, useRef, useState } from "react";
import styles from "./forum.module.css";

interface Props { value: string; regions: string[]; onChange: (value: string) => void; language: "id" | "en" }

/** Input: region and post locations. Output: an editable region filter. */
export function ForumRegionFilter({ value, regions, onChange, language }: Props) {
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState<string | null>(null);
  // Keep typing immediate while the router updates its query state.
  const [draft, setDraft] = useState<string | null>(null);
  const en = language === "en", committed = value === "all" ? "" : value, text = draft ?? committed;
  if (draft !== null && draft === committed) setDraft(null);
  const terms = text.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  const options = [{ value: "all", label: en ? "All regions" : "Semua wilayah" }, ...regions
    .filter(name => terms.every(term => name.toLocaleLowerCase("id-ID").includes(term)))
    .slice(0, 8).map(name => ({ value: name, label: name }))];
  const activeIndex = options.findIndex(option => option.value === active);
  const choose = (next: string) => { onChange(next); input.current?.focus(); setDraft(next === "all" ? "" : next); setOpen(false); setActive(null); };

  return <div className={styles.regionFilter} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(null); setDraft(null); } }}>
    <div className={styles.regionInput}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
      <input ref={input} className={styles.input} type="text" role="combobox" value={text} maxLength={160} autoComplete="off"
        aria-label={en ? "Search region" : "Cari wilayah"} placeholder={en ? "Search region" : "Cari wilayah"}
        aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-results` : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-${activeIndex}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { setDraft(event.target.value); onChange(event.target.value || "all"); setOpen(true); setActive(null); }}
        onKeyDown={event => {
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(null); }
          if (event.key === "Enter") { event.preventDefault(); if (open && activeIndex >= 0) choose(options[activeIndex].value); else setOpen(false); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const next = activeIndex < 0 ? (event.key === "ArrowDown" ? 0 : options.length - 1) : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
            setOpen(true); setActive(options[next].value);
            requestAnimationFrame(() => document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" }));
          }
        }} />
      {text && <button type="button" className={styles.clearRegion} aria-label={en ? "Clear region" : "Hapus wilayah"}
        onClick={() => { onChange("all"); input.current?.focus(); setDraft(""); setOpen(true); setActive(null); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>}
    </div>
    {open && <div id={`${id}-results`} className={styles.regionResults} role="listbox" aria-label={en ? "Region suggestions" : "Saran wilayah"}>
      {options.map((option, index) => <button key={option.value} id={`${id}-${index}`} type="button" role="option" tabIndex={-1}
        aria-selected={active === option.value} onMouseDown={event => event.preventDefault()} onClick={() => choose(option.value)}>{option.label}</button>)}
    </div>}
  </div>;
}
// --- end of Region search ---
