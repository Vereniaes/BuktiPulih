// Pick a bounded date range and whole hours in WIB, then apply it to the map.
"use client";

import { useRef, useState, type FormEvent } from "react";
import { calendarDayCount, isHotspotHourAvailable, readHotspotRange, toWibInput, type HotspotTimeRange } from "./satellite-explorer";
import type { HotspotAvailability } from "@/types/environment";
import { HotspotRangeCalendar } from "./HotspotRangeCalendar";
import styles from "./hazard-map.module.css";

export function HotspotTimePicker({range,now,availability,en,onApply}:{range:HotspotTimeRange|null;now:number;availability:HotspotAvailability|null;en:boolean;onApply:(range:HotspotTimeRange)=>void}) {
  const trigger=useRef<HTMLButtonElement>(null);
  const [draft,setDraft]=useState<{start:string;end:string}|null>(null);
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [error,setError]=useState("");
  const values=draft??{start:toWibInput(range?.start??now-24*3600000),end:toWibInput(range?.end??now)};
  const startDate=values.start.slice(0,10),endDate=values.end.slice(0,10);
  const startHour=values.start.slice(-2),endHour=values.end.slice(-2);
  const hours=Array.from({length:24},(_,index)=>String(index).padStart(2,"0"));
  const validHour=(date:string,hour:string)=>isHotspotHourAvailable(`${date}T${hour}`,availability,now);
  const setHours=(start:string,end:string)=>{setDraft({start,end});setError("");};
  const chooseDates=(start:string,end:string)=>{
    const first=hours.find(hour=>validHour(start,hour));
    const a=validHour(start,startHour)?startHour:first??"00";
    const allowedEnd=hours.filter(hour=>validHour(end,hour)&&(start!==end||hour>=a));
    const b=allowedEnd.includes(endHour)?endHour:allowedEnd.at(-1)??a;
    setHours(`${start}T${a}`,`${end}T${b}`);
  };
  const format=(date:string)=>new Intl.DateTimeFormat(en?"en-GB":"id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`));
  const apply=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const result=readHotspotRange(values.start,values.end,now);
    if(result.error) {
      setError((en?{invalid:"Choose dates and hours.",order:"End must be after start.",length:"Choose up to 5 calendar dates.",future:"Choose an hour that has already started."}
        :{invalid:"Pilih tanggal dan jam.",order:"Waktu selesai harus setelah mulai.",length:"Pilih maksimal 5 tanggal.",future:"Pilih jam yang sudah dimulai."})[result.error]);return;
    }
    if(!validHour(startDate,startHour)||!validHour(endDate,endHour)) {setError(en?"NASA data are unavailable for those dates.":"Data NASA belum tersedia untuk tanggal tersebut.");return;}
    onApply(result.range);setDraft(null);setError("");
  };

  return <form id="hotspot-time-range" className={styles.timePicker} aria-label={en?"Hotspot time range":"Rentang waktu titik panas"} onSubmit={apply} noValidate>
    <span className={styles.timeLabel}>{en?"Dates":"Tanggal"}</span>
    <button ref={trigger} type="button" className={styles.dateRangeButton} aria-label={en?"Choose date range":"Pilih rentang tanggal"} aria-haspopup="dialog" onClick={()=>setCalendarOpen(true)}>
      <span>{format(startDate)}<span aria-hidden="true"> - </span>{format(endDate)}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
    </button>
    <div className={styles.hourFields}>
      <label>{en?"Start hour (WIB)":"Jam mulai (WIB)"}<select aria-label={en?"Start hour (WIB)":"Jam mulai (WIB)"} value={startHour} onChange={event=>{
        const hour=event.target.value;
        setHours(`${startDate}T${hour}`,startDate===endDate&&hour>endHour?`${endDate}T${hour}`:values.end);
      }}>{hours.map(hour=><option value={hour} key={hour} disabled={!validHour(startDate,hour)}>{hour}</option>)}</select></label>
      <label>{en?"End hour (WIB)":"Jam selesai (WIB)"}<select aria-label={en?"End hour (WIB)":"Jam selesai (WIB)"} value={endHour} onChange={event=>setHours(values.start,`${endDate}T${event.target.value}`)}>
        {hours.map(hour=><option value={hour} key={hour} disabled={!validHour(endDate,hour)||(startDate===endDate&&hour<startHour)}>{hour}</option>)}</select></label>
    </div>
    <div className={styles.timePickerActions}>
      <span>{calendarDayCount(startDate,endDate)} {en?"of 5 days":"dari 5 hari"}</span>
      <button type="submit">{en?"Apply":"Terapkan"}</button>
    </div>
    <p className={styles.warning} role="alert">{error}</p>
    {calendarOpen&&<HotspotRangeCalendar start={startDate} end={endDate} now={now} availability={availability} en={en} onChoose={chooseDates} onClose={()=>{setCalendarOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}}/>}
  </form>;
}
