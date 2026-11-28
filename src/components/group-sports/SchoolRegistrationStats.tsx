'use client';

import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';

type Counts={sport_count:number;entry_count:number;athlete_count:number;athlete_rows:number;staff_count:number;staff_rows:number};
type Result={competitionId:string;phase:'loading'|'ready'|'error';rows:Map<string,Counts>;updated:string|null};
const zero:Counts={sport_count:0,entry_count:0,athlete_count:0,athlete_rows:0,staff_count:0,staff_rows:0};
const fields=Object.keys(zero) as (keyof Counts)[];
const format=new Intl.NumberFormat('th-TH');
const timeFormat=new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});
function parseRows(value:unknown){
  if(!Array.isArray(value))throw new Error('Invalid statistics response');
  const rows=new Map<string,Counts>();
  for(const item of value){
    if(!item||typeof item.school_id!=='string'||rows.has(item.school_id)||fields.some(k=>!Number.isSafeInteger(item[k])||item[k]<0))throw new Error('Invalid statistics row');
    if(item.sport_count>10||item.athlete_count>item.athlete_rows||item.staff_count>item.staff_rows)throw new Error('Inconsistent statistics');
    rows.set(item.school_id,item as Counts);
  }
  return rows;
}
export function useSchoolRegistrationStats(competitionId:string,enabled:boolean){
  const [result,setResult]=useState<Result|null>(null);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled||!competitionId)return;
    let active=true;
    let running=false;
    const controller=new AbortController();
    async function load(){
      if(!active||running||document.hidden)return;
      running=true;
      setResult(previous=>({competitionId,phase:'loading',rows:previous?.competitionId===competitionId?previous.rows:new Map(),updated:previous?.competitionId===competitionId?previous.updated:null}));
      try{
        const q=await supabase.rpc('sports_school_public_stats_v1',{p_comp:competitionId}).abortSignal(controller.signal);
        if(q.error)throw q.error;
        const rows=parseRows(q.data);
        if(active)setResult({competitionId,phase:'ready',rows,updated:new Date().toISOString()});
      }catch{
        if(active)setResult(previous=>({competitionId,phase:'error',rows:previous?.competitionId===competitionId?previous.rows:new Map(),updated:previous?.competitionId===competitionId?previous.updated:null}));
      }finally{running=false;}
    }
    void load();
    const timer=window.setInterval(()=>void load(),90_000);
    const visible=()=>{if(!document.hidden)void load();};
    document.addEventListener('visibilitychange',visible);
    return()=>{active=false;controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[competitionId,enabled,revision]);
  const current=enabled&&result?.competitionId===competitionId?result:null;
  return {current,enabled,refresh:()=>setRevision(n=>n+1)};
}
type Stats=ReturnType<typeof useSchoolRegistrationStats>;
export function SchoolStatsStatus({stats}:{stats:Stats}){
  if(!stats.enabled)return null;
  const phase=stats.current?.phase??'loading';
  const updated=stats.current?.updated;
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">
    <div><p className="font-semibold text-blue-950">สถิติจากใบสมัครที่รับข้อมูลแล้ว · นับชื่อไม่ซ้ำภายในโรงเรียน</p><p className="mt-1">ยอดตามชื่อและนามสกุลที่ปรับคำนำหน้า/ช่องว่าง อาจคลาดเคลื่อนกรณีชื่อเหมือนกันหรือสะกดต่างกัน · เจ้าหน้าที่นับเฉพาะที่ระบุในใบสมัคร</p><p role="status" className={phase==='error'?'mt-1 font-semibold text-red-800':'mt-1 text-slate-600'}>{phase==='error'?(updated?'โหลดข้อมูลล่าสุดไม่สำเร็จ · แสดงข้อมูลเดิม':'โหลดสถิติไม่สำเร็จ · กรุณาลองใหม่'):phase==='loading'?'กำลังโหลดสถิติ…':'อัปเดตล่าสุด '+(updated?timeFormat.format(new Date(updated))+' น.':'')}</p></div>
    <button type="button" disabled={phase==='loading'} onClick={stats.refresh} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-900 disabled:opacity-50">↻ โหลดสถิติล่าสุด</button>
  </div>;
}
export function SchoolStatsCard({schoolId,stats}:{schoolId:string;stats:Stats}){
  if(!stats.enabled)return null;
  const current=stats.current;
  const data=current?.updated?(current.rows.get(schoolId)??zero):null;
  const values=[{label:'ประเภทกีฬา',value:data?.sport_count,unit:'ประเภท',style:'bg-blue-50 text-blue-900 border-blue-100'}, {label:'นักกีฬา',value:data?.athlete_count,unit:'คน*',style:'bg-emerald-50 text-emerald-900 border-emerald-100'}, {label:'ผู้ควบคุมทีม',value:data?.staff_count,unit:'คน*',style:'bg-violet-50 text-violet-900 border-violet-100'}];
  return <div className="mt-4 space-y-2" aria-label="สถิติการส่งนักกีฬา">
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">{values.map(v=><div key={v.label} className={`min-w-0 rounded-xl border px-1 py-2 text-center ${v.style}`}><p className="text-[11px] font-bold leading-snug sm:text-xs">{v.label}</p><p className="my-1 text-xl font-black tabular-nums sm:text-2xl">{v.value===undefined?'—':format.format(v.value)}</p><p className="text-[10px]">{v.unit}</p></div>)}</div>
    <p className="text-xs leading-relaxed text-slate-600">{data?`${format.format(data.entry_count)} ใบสมัคร · นักกีฬา ${format.format(data.athlete_rows)} รายชื่อ · เจ้าหน้าที่ ${format.format(data.staff_rows)} รายชื่อ (นับรวมทุกใบสมัคร)`:'ยังไม่มีข้อมูลสถิติที่ยืนยันได้'}</p>
  </div>;
}
