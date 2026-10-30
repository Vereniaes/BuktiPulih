// Todo:
// -> search one category and optionally create a shared choice
"use client";

// --- Category field ---
import { useEffect,useId,useRef,useState } from "react";
import type { CategoryOption } from "./useCategories";
import styles from "./category-field.module.css";
interface Props {label:string;value:string;options:CategoryOption[];onChange:(value:string)=>void;onCreate?:(label:string)=>Promise<string>;disabled?:boolean;required?:boolean;language:"id"|"en"}

export function CategoryField({label,value,options,onChange,onCreate,disabled,required,language}:Props) {
  const id=useId(),input=useRef<HTMLInputElement>(null),pending=useRef(false),restoreFocus=useRef(false),en=language==="en";
  const [query,setQuery]=useState<string|null>(null),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(!busy && restoreFocus.current){input.current?.focus();restoreFocus.current=false;}},[busy]);
  const selected=options.find(item=>item.key===value)?.label ?? value;
  const text=query??selected, normalized=text.trim().toLocaleLowerCase("id-ID");
  const filtered=options.filter(item=>item.label.toLocaleLowerCase("id-ID").includes(normalized)).slice(0,50);
  const create=!!onCreate && !!normalized && !options.some(item=>item.label.toLocaleLowerCase("id-ID")===normalized || item.key.toLocaleLowerCase("id-ID")===normalized);
  const choices=[...filtered,...(create?[{key:"__create",label:(en?"Create ":"Buat ")+`“${text.trim()}”`}]:[])];
  async function choose(index:number) {
    const item=choices[index];if(!item || pending.current)return;
    if(item.key!=="__create") {onChange(item.key);setQuery(null);input.current?.focus();setOpen(false);return;}
    pending.current=true;restoreFocus.current=true;setBusy(true);setError("");
    try {onChange(await onCreate!(text.trim()));setQuery(null);setOpen(false);}
    catch(cause){setQuery(text);setError(cause instanceof Error?cause.message:en?"Category could not be saved.":"Kategori belum tersimpan.");}
    finally{pending.current=false;setBusy(false);}
  }
  return <div className={styles.field} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)){setOpen(false);setQuery(null);setActive(-1);}}}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}><input ref={input} id={id} role="combobox" autoComplete="off" value={text} maxLength={60} required={required} disabled={disabled||busy}
      aria-expanded={open} aria-autocomplete="list" aria-controls={open?`${id}-list`:undefined} aria-activedescendant={open&&active>=0&&choices[active]?`${id}-${active}`:undefined}
      placeholder={onCreate?(en?"Search or type a category":"Cari atau ketik kategori"):(en?"Search categories":"Cari kategori")}
      onFocus={()=>{if(!restoreFocus.current){setOpen(true);setActive(-1);}}} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(-1);setError("");onChange("");}}
      onKeyDown={event=>{
        if(event.key==="Escape"){event.preventDefault();event.stopPropagation();setOpen(false);setQuery(null);}
        if(event.key==="ArrowDown"||event.key==="ArrowUp") {event.preventDefault();setOpen(true);const next=choices.length?(active+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length:-1;setActive(next);requestAnimationFrame(()=>document.getElementById(`${id}-${next}`)?.scrollIntoView({block:"nearest"}));}
        if(event.key==="Enter"){event.preventDefault();const exact=choices.findIndex(item=>item.label.toLocaleLowerCase("id-ID")===normalized);void choose(active>=0?active:exact>=0?exact:create?choices.length-1:0);}
      }} />
      {value && !required && <button type="button" className={styles.clear} aria-label={en?`Clear ${label}`:`Hapus ${label}`} disabled={disabled} onClick={()=>{onChange("");setQuery(null);input.current?.focus();}}>×</button>}
    </div>
    {open&&<div className={styles.results} role="listbox" id={`${id}-list`} aria-label={label}>{choices.map((item,index)=><button id={`${id}-${index}`} key={item.key} type="button" role="option" tabIndex={-1} aria-selected={active===index} disabled={busy} onMouseDown={event=>event.preventDefault()} onClick={()=>void choose(index)}>{item.label}</button>)}{!choices.length&&<p>{en?"No categories found.":"Kategori tidak ditemukan."}</p>}</div>}
    {busy&&<small role="status">{en?"Saving…":"Menyimpan…"}</small>}{error&&<small role="alert">{error}</small>}
  </div>;
}
// --- end of Category field ---
