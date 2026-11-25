"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ThaiDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2020, month, 1)),
);
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatThaiDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ThaiDatePicker({ value, onChange, className = "", required = false, disabled = false }: ThaiDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseIsoDate(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1, 12);
    const offset = firstDay.getDay();
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= count ? new Date(viewYear, viewMonth, day, 12) : null;
    });
  }, [viewMonth, viewYear]);

  const yearOptions = Array.from({ length: today.getFullYear() - 1900 + 1 }, (_, index) => today.getFullYear() - index);

  const openCalendar = () => {
    if (disabled) return;
    const initial = selected ?? new Date(today.getFullYear() - 15, today.getMonth(), 1, 12);
    setViewYear(initial.getFullYear());
    setViewMonth(initial.getMonth());
    setOpen((current) => !current);
  };

  const moveMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1, 12);
    if(next.getFullYear()<1900 || next.getFullYear()>today.getFullYear() || (next.getFullYear()===today.getFullYear() && next.getMonth()>today.getMonth())) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const chooseDate = (date: Date) => {
    if (isFuture(date)) return;
    onChange(toIsoDate(date));
    setOpen(false);
  };

  const isFuture = (date: Date) => {
    return toIsoDate(date) > toIsoDate(today);
  };

  return (
    <div ref={rootRef} style={{position:"relative",width:"100%",minWidth:0}}>
      <div style={{position:"relative",width:"100%"}}>
        <input
          type="text"
          readOnly
          required={required}
          disabled={disabled}
          value={formatThaiDate(selected)}
          placeholder="เลือกวันเดือนปีเกิด (พ.ศ.)"
          aria-label="วันเดือนปีเกิด (พ.ศ.)"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openCalendar}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openCalendar();
            }
          }}
          className={`${className} cursor-pointer`}
          style={{width:"100%",boxSizing:"border-box",paddingRight:"42px"}}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openCalendar}
          aria-label="เปิดปฏิทินวันเกิดภาษาไทย"
          className="rounded-md text-slate-600 hover:bg-rose-50 hover:text-red-800 disabled:opacity-40"
          style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:32,height:32,padding:5,display:"flex",alignItems:"center",justifyContent:"center",border:0,background:"transparent",cursor:"pointer"}}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="16" rx="2" />
            <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
            <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label="ปฏิทินวันเกิด พ.ศ." className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xl" style={{position:"absolute",left:0,top:"100%",zIndex:80,marginTop:8,width:"min(21rem, calc(100vw - 3rem))",boxSizing:"border-box",background:"#fff",border:"1px solid #dbe2ea",borderRadius:12,padding:12,boxShadow:"0 12px 30px #0f172a26"}}>
          <div className="mb-3" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:12}}>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="เดือนก่อนหน้า" className="rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" style={{flex:"0 0 30px",height:34,padding:0}}>‹</button>
            <div style={{display:"flex",minWidth:0,flex:1,gap:6}}>
              <select aria-label="เดือน" value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-800" style={{minWidth:0,flex:1,width:0}}>
                {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
              </select>
              <select aria-label="ปี พ.ศ." value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-800" style={{width:88,minWidth:0}}>
                {yearOptions.map((year) => <option key={year} value={year}>{year + 543}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => moveMonth(1)} aria-label="เดือนถัดไป" className="rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" style={{flex:"0 0 30px",height:34,padding:0}}>›</button>
          </div>
          <div className="text-xs font-bold text-slate-500" style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0, 1fr))",textAlign:"center",marginBottom:4,gap:4}}>
            {WEEKDAYS.map((day) => <div key={day} className="py-2">{day}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0, 1fr))",gap:4}}>
            {calendarDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} style={{height:36,minWidth:0}} />;
              const active = Boolean(selected && toIsoDate(selected) === toIsoDate(date));
              const future = isFuture(date);
              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  disabled={future}
                  onClick={() => chooseDate(date)}
                  aria-pressed={active}
                  aria-label={formatThaiDate(date)}
                  style={{width:"100%",minWidth:0,height:36,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:0,borderRadius:8,background:active?"#991b1b":"transparent",color:active?"#fff":future?"#cbd5e1":"#334155",cursor:future?"not-allowed":"pointer"}}
                  className={`h-9 rounded-lg text-sm font-medium transition ${active ? "bg-red-800 text-white shadow" : future ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:bg-rose-50 hover:text-red-800"}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:12}}>
            <button type="button" onClick={()=>{onChange("");setOpen(false);}} className="text-xs text-slate-600 hover:underline">ล้างวันที่</button>
            <button type="button" onClick={() => chooseDate(new Date())} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-rose-100">วันนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}
