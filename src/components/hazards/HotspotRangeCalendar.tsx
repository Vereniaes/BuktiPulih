// Choose up to five connected calendar dates without allowing a longer range.
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { HotspotAvailability } from "@/types/environment";
import { addCalendarDays, calendarDayCount, canSelectHotspotEnd, isHotspotDateAvailable } from "./satellite-explorer";
import styles from "./hotspot-calendar.module.css";

interface Props {
  start:string; end:string; now:number; en:boolean; availability:HotspotAvailability|null;
  onChoose:(start:string,end:string)=>void; onClose:()=>void;
}
const utcDate=(date:string)=>new Date(`${date}T00:00:00Z`);
export function HotspotRangeCalendar({start,end,now,en,availability,onChoose,onClose}:Props) {
  const dialog=useRef<HTMLDialogElement>(null),initialDate=useRef(start);
  const [selection,setSelection]=useState({start,end});
  const [step,setStep]=useState<"start"|"end"|"done">("start");
  const [month,setMonth]=useState(start.slice(0,7));
  const [focused,setFocused]=useState(start);
  const locale=en?"en-GB":"id-ID";
  const title=new Intl.DateTimeFormat(locale,{month:"long",year:"numeric",timeZone:"UTC"}).format(utcDate(`${month}-01`));
  const label=(date:string)=>new Intl.DateTimeFormat(locale,{dateStyle:"full",timeZone:"UTC"}).format(utcDate(date));
  const first=utcDate(`${month}-01`),offset=(first.getUTCDay()+6)%7;
  const days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const cells=Array.from({length:Math.ceil((days+offset)/7)*7},(_,i)=>addCalendarDays(`${month}-01`,i-offset));
  const selectable=(date:string)=>step!=="start"?canSelectHotspotEnd(date,selection.start,availability,now):isHotspotDateAvailable(date,availability,now);
  const focusDay=(date:string)=>{
    setMonth(date.slice(0,7));setFocused(date);
    requestAnimationFrame(()=>dialog.current?.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus());
  };
  const choose=(date:string)=>{
    if(!selectable(date))return;
    if(step!=="start") { setSelection({...selection,end:date});setStep("done"); }
    else { setSelection({start:date,end:date});setStep("end"); }
    setFocused(date);
  };
  const hasDates=(value:string)=>Array.from({length:31},(_,i)=>addCalendarDays(`${value}-01`,i)).some(date=>date.slice(0,7)===value&&selectable(date));
  const changeMonth=(value:string)=>{
    setMonth(value);
    const next=Array.from({length:31},(_,i)=>addCalendarDays(`${value}-01`,i)).find(date=>date.slice(0,7)===value&&selectable(date));
    if(next)setFocused(next);
  };
  const firstYear=Number(availability?.sources.map(source=>source.min_date).sort()[0]?.slice(0,4)??"2018");
  const lastYear=new Date(now+7*3600000).getUTCFullYear();
  const years=Array.from({length:Math.max(1,lastYear-firstYear+1)},(_,index)=>firstYear+index);
  const moveMonth=(direction:number)=>{
    const date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+direction,1)).toISOString().slice(0,10);
    changeMonth(date.slice(0,7));
  };
  const canMove=(direction:number)=>{
    const date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+direction,1)).toISOString().slice(0,10);
    return hasDates(date.slice(0,7));
  };
  const keyDown=(event:KeyboardEvent<HTMLButtonElement>,date:string)=>{
    const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7} as Record<string,number>)[event.key];
    if(delta!==undefined) {
      event.preventDefault();let target=addCalendarDays(date,delta);
      if(delta===1||delta===-1)for(let i=0;i<31&&!selectable(target);i++)target=addCalendarDays(target,delta);
      if(selectable(target))focusDay(target);
    } else if(event.key==="Home"||event.key==="End") {
      event.preventDefault();const day=(utcDate(date).getUTCDay()+6)%7;
      const target=addCalendarDays(date,event.key==="Home"?-day:6-day);
      if(selectable(target))focusDay(target);
    } else if(event.key==="PageUp"||event.key==="PageDown") {
      event.preventDefault();const direction=event.key==="PageUp"?-1:1;
      if(canMove(direction)) { moveMonth(direction);requestAnimationFrame(()=>dialog.current?.querySelector<HTMLButtonElement>('button[data-date][tabindex="0"]')?.focus()); }
    }
  };
  useEffect(()=>{
    const node=dialog.current;node?.showModal();
    node?.querySelector<HTMLButtonElement>(`button[data-date="${initialDate.current}"]`)?.focus();
  },[]);
  const count=calendarDayCount(selection.start,selection.end);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="hotspot-calendar-title" onClose={onClose}
    onKeyDown={event=>event.stopPropagation()} onClick={event=>{
      if(event.target!==event.currentTarget)return;
      const rect=event.currentTarget.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.current?.close();
    }}>
    <header className={styles.header}><div><h2 id="hotspot-calendar-title">{en?"Choose dates":"Pilih tanggal"}</h2><p>{en?"Up to 5 days, including the start date":"Maksimal 5 hari, termasuk tanggal mulai"}</p></div>
      <button type="button" className={styles.iconButton} aria-label={en?"Close calendar":"Tutup kalender"} onClick={()=>dialog.current?.close()}>×</button>
    </header>
    <div className={styles.month}>
      <button type="button" className={styles.iconButton} aria-label={en?"Previous month":"Bulan sebelumnya"} disabled={!canMove(-1)} onClick={()=>moveMonth(-1)}>‹</button>
      <div className={styles.monthSelects}>
        <select aria-label={en?"Month":"Bulan"} value={month.slice(5)} onChange={event=>changeMonth(`${month.slice(0,4)}-${event.target.value}`)}>
          {Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")).map(value=><option key={value} value={value} disabled={!hasDates(`${month.slice(0,4)}-${value}`)}>{new Intl.DateTimeFormat(locale,{month:"long",timeZone:"UTC"}).format(utcDate(`2024-${value}-01`))}</option>)}
        </select>
        <select aria-label={en?"Year":"Tahun"} value={month.slice(0,4)} onChange={event=>{
          const target=`${event.target.value}-${month.slice(5)}`;
          const next=hasDates(target)?target:Array.from({length:12},(_,i)=>`${event.target.value}-${String(i+1).padStart(2,"0")}`).find(hasDates);
          if(next)changeMonth(next);
        }}>{years.map(year=><option key={year} value={year} disabled={step!=="start"&&year!==Number(selection.start.slice(0,4))&&year!==Number(addCalendarDays(selection.start,4).slice(0,4))}>{year}</option>)}</select>
      </div>
      <span className="visually-hidden" aria-live="polite">{title}</span>
      <button type="button" className={styles.iconButton} aria-label={en?"Next month":"Bulan berikutnya"} disabled={!canMove(1)} onClick={()=>moveMonth(1)}>›</button>
    </div>
    <p className={styles.instruction} aria-live="polite">{step!=="start"?(en?"Choose an end date":"Pilih tanggal selesai"):(en?"Choose a start date":"Pilih tanggal mulai")}</p>
    <div role="grid" aria-label={en?"Date range calendar":"Kalender rentang tanggal"} className={styles.grid}>
      <div role="row" className={styles.week}>{(en?["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]:["Sen","Sel","Rab","Kam","Jum","Sab","Min"]).map(day=><span role="columnheader" key={day}>{day}</span>)}</div>
      {Array.from({length:cells.length/7},(_,row)=><div role="row" className={styles.week} key={row}>
        {cells.slice(row*7,row*7+7).map(date=>{
          const inRange=date>=selection.start&&date<=selection.end;
          const edge=date===selection.start?(date===selection.end?"both":"start"):date===selection.end?"end":undefined;
          return <div role="gridcell" aria-selected={inRange} key={date} className={styles.cell} data-edge={edge} data-range={inRange}>
            <button type="button" data-date={date} data-outside={date.slice(0,7)!==month} disabled={!selectable(date)}
              tabIndex={focused===date?0:-1} aria-label={label(date)} onKeyDown={event=>keyDown(event,date)} onClick={()=>choose(date)}>{Number(date.slice(-2))}</button>
          </div>;
        })}
      </div>)}
    </div>
    <footer className={styles.footer}><div><span aria-live="polite">{count} {en?(count===1?"day":"days"):"hari"}</span>
      {step!=="start"&&<button type="button" className={styles.restart} onClick={()=>setStep("start")}>{en?"Change start date":"Ubah tanggal mulai"}</button>}</div>
      <button type="button" className={styles.confirm} disabled={step==="end"} onClick={()=>{onChoose(selection.start,selection.end);dialog.current?.close();}}>{en?"Use dates":"Gunakan tanggal"}</button>
    </footer>
  </dialog>;
}
