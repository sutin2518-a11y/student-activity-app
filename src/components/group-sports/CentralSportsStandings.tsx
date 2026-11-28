'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {groupStandings,esportsStandings,type Team,type GroupMatch,type EsGroup,type EsTeam,type EsMatch,type StandingGroup,type StandingSport} from '@/lib/group-sports/central-standings';

type Event={id:string;sport_name:string;event_code?:string|null;event_type:string;status:string};
const SPORTS=[
 {code:'FB',label:'ฟุตบอล',path:'football',icon:'⚽',rule:'ชนะ 3 · แพ้ 0 · เสมอในเวลาใช้ผลจุดโทษ',unit:'ประตู'},
 {code:'FS',label:'ฟุตซอล',path:'futsal',icon:'⚽',rule:'ชนะ 3 · แพ้ 0 · เสมอในเวลาใช้ผลจุดโทษ',unit:'ประตู'},
 {code:'BB',label:'บาสเกตบอล',path:'basketball',icon:'🏀',rule:'ชนะ 2 · แพ้ 0',unit:'แต้ม'},
 {code:'VB',label:'วอลเลย์บอล',path:'volleyball',icon:'🏐',rule:'ชนะ 2 · แพ้ 1 · แพ้โดยปรับ 0',unit:'เซต'},
 {code:'ST',label:'เซปักตะกร้อ',path:'takraw',icon:'🏐',rule:'ชนะ 2 · แพ้ 1 · แพ้โดยปรับ 0',unit:'เซต'},
 {code:'ES',label:'อีสปอร์ต (RoV)',path:'esports',icon:'🎮',rule:'ชนะ 2–0 ได้ 3 / แพ้ 0 · ชนะ 2–1 ได้ 2 / แพ้ 1 · คะแนนเท่ากันดูเวลารวมและ Kill เมื่อข้อมูลครบ',unit:'เกม'},
 {code:'PT',label:'เปตอง',path:'petanque',icon:'🎯'},
 {code:'TT',label:'เทเบิลเทนนิส',path:'table-tennis',icon:'🏓'},
 {code:'BX',label:'มวยสากลสมัครเล่น',path:'boxing',icon:'🥊'},
 {code:'AT',label:'กรีฑา',path:'athletics',icon:'🏃'},
] as const;
const sportCode=(e:Event)=>e.event_code?.split('-')[1]||'';
const isGroup=(code:string):code is StandingSport=>['FB','FS','BB','VB','ST','ES'].includes(code);
const selectClass='min-h-11 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-[#07123d]';
const errText=(e:unknown)=>e&&typeof e==='object'&&'message'in e?String(e.message):String(e);
// Read a complete result set in stable order; no writes and no student data.
async function pages<T>(get:(from:number,to:number)=>PromiseLike<{data:unknown;error:unknown}>):Promise<T[]>{
 const rows:T[]=[];
 for(let from=0;from<20000;from+=200){const r=await get(from,from+199);if(r.error)throw r.error;if(!Array.isArray(r.data))throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');rows.push(...r.data as T[]);if(r.data.length<200)return rows;}
 throw new Error('จำนวนข้อมูลเกินขอบเขต กรุณาติดต่อผู้ดูแล');
}
export default function CentralSportsStandings({competitionId,events,selectedEventId,onSelect}:{competitionId:string;events:Event[];selectedEventId:string;onSelect:(id:string)=>void}){
 const available=useMemo(()=>events.filter(e=>e.status!=='draft'&&SPORTS.some(s=>s.code===sportCode(e))),[events]);
 const selected=available.find(e=>e.id===selectedEventId);
 const [sport,setSport]=useState<string>(()=>selected?sportCode(selected):'FB');
 const activeSport=selected?sportCode(selected):sport;
 const cfg=SPORTS.find(s=>s.code===activeSport)||SPORTS[0];
 const divisions=available.filter(e=>sportCode(e)===cfg.code);
 const event=selected||divisions[0];
 const id=event?.id||'';
 const groupSport=isGroup(cfg.code)?cfg.code:null;
 const [state,setState]=useState<{key:string;groups:StandingGroup[];at:string}|null>(null);
 const [failure,setFailure]=useState<{key:string;text:string}|null>(null);
 const [loading,setLoading]=useState(false);
 const [revision,setRevision]=useState(0);
 const [group,setGroup]=useState('all');
 const requestKey=`${competitionId}:${id}:${groupSport||''}`;
 // Keep the parent filter and its official result table on the same division.
 useEffect(()=>{if(id&&selectedEventId!==id)onSelect(id);},[id,selectedEventId,onSelect]);
 useEffect(()=>{setGroup('all');},[id]);
 useEffect(()=>{
  if(!id||!groupSport)return;
  let cancelled=false,inFlight=false;
  async function load(){
   if(inFlight||cancelled)return;inFlight=true;setLoading(true);
   try{
    let result:StandingGroup[];
    if(groupSport==='ES'){
     const [groups,teams,matches]=await Promise.all([
      pages<EsGroup>((a,b)=>supabase.from('sports_esports_groups').select('id,group_code,sort_order').eq('competition_id',competitionId).eq('event_id',id).order('id').range(a,b)),
      pages<EsTeam>((a,b)=>supabase.from('sports_esports_group_teams').select('id,group_id,school_name,seed_order').eq('competition_id',competitionId).eq('event_id',id).order('id').range(a,b)),
      pages<EsMatch>((a,b)=>supabase.from('sports_esports_matches').select('id,group_id,stage,match_status,team1_id,team2_id,score1,score2,duration_minutes,team1_kills,team2_kills').eq('competition_id',competitionId).eq('event_id',id).eq('stage','group').eq('match_status','completed').order('id').range(a,b)),
     ]);if(matches.some(m=>!groups.some(g=>g.id===m.group_id)))throw new Error("พบผลที่ไม่ตรงกับสายการแข่งขัน กรุณาตรวจสอบหน้ากีฬา");result=esportsStandings(groups,teams,matches);
    }else if(groupSport){
     const [teams,matches]=await Promise.all([
      pages<Team>((a,b)=>supabase.from('sports_football_group_teams').select('id,group_code,school_name,seed_order').eq('competition_id',competitionId).eq('event_id',id).order('id').range(a,b)),
      pages<GroupMatch>((a,b)=>supabase.from('sports_football_matches').select('id,group_code,stage,status,team1_name,team2_name,score1,score2,penalty1,penalty2,volleyball_forfeit,takraw_forfeit').eq('competition_id',competitionId).eq('event_id',id).eq('stage','group').eq('status','completed').order('id').range(a,b)),
     ]);if(matches.some(m=>!m.group_code))throw new Error("พบผลที่ไม่ระบุสายการแข่งขัน กรุณาตรวจสอบหน้ากีฬา");result=groupStandings(groupSport,teams.sort((a,b)=>a.seed_order-b.seed_order),matches);
    }else return;
    if(!cancelled){setState({key:requestKey,groups:result,at:new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})});setFailure(null);}
   }catch(e){if(!cancelled)setFailure({key:requestKey,text:errText(e)});}finally{inFlight=false;if(!cancelled)setLoading(false);}
  }
  void load();const timer=window.setInterval(()=>{if(!document.hidden)void load();},60_000);
  const visible=()=>{if(!document.hidden)void load();};document.addEventListener('visibilitychange',visible);
  return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[competitionId,id,groupSport,requestKey,revision]);
 const data=state?.key===requestKey?state:null;
 const groups=data?.groups||[];
 const shown=group==='all'?groups:groups.filter(g=>g.id===group);
 const error=failure?.key===requestKey?failure.text:'';
 const total=groups.reduce((n,g)=>n+g.rows.length,0),done=groups.reduce((n,g)=>n+g.counted,0),issues=groups.reduce((n,g)=>n+g.issues,0);
 const chooseSport=(code:string)=>{setSport(code);setGroup('all');onSelect(available.find(e=>sportCode(e)===code)?.id||'all');};
 return <div className="mb-5 space-y-4 text-[#07123d]">
  <div className="rounded-2xl bg-gradient-to-r from-[#07123d] via-[#0755ce] to-[#078de9] p-4 text-white sm:p-5"><p className="text-xs font-black tracking-widest text-yellow-300">PHULANGKA GAMES 2026</p><h3 className="mt-1 text-xl font-black">ศูนย์ตารางคะแนนการแข่งขัน</h3><p className="mt-1 text-sm text-white/90">แยกตามชนิดกีฬา รุ่น และสาย · นับเฉพาะผลที่กรรมการบันทึกเสร็จสิ้น</p></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{SPORTS.map(s=><button type="button" key={s.code} aria-pressed={cfg.code===s.code} onClick={()=>chooseSport(s.code)} className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-bold transition ${cfg.code===s.code?'border-blue-700 bg-[#0755ce] !text-white shadow-sm':'border-blue-200 bg-blue-50 !text-[#123c91] hover:bg-blue-100'}`}><span aria-hidden="true">{s.icon} </span>{s.label}</button>)}</div>
  <div className="grid gap-3 rounded-xl border border-blue-100 bg-slate-50 p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"><label className="text-sm font-bold">รุ่น / รายการแข่งขัน<select className={selectClass} value={id} onChange={e=>{setGroup('all');onSelect(e.target.value);}}>{!divisions.length&&<option value="">ยังไม่มีรายการที่เปิดแสดง</option>}{divisions.map(e=><option key={e.id} value={e.id}>{e.sport_name}</option>)}</select></label><label className="text-sm font-bold">สายการแข่งขัน<select className={selectClass} value={group} disabled={!groupSport||!groups.length} onChange={e=>setGroup(e.target.value)}><option value="all">ทุกสาย</option>{groups.map(g=><option key={g.id} value={g.id}>สาย {g.label}</option>)}</select></label><button type="button" disabled={!groupSport||!id||loading} onClick={()=>setRevision(r=>r+1)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-blue-900 disabled:opacity-50">{loading?'กำลังโหลด…':'↻ โหลดล่าสุด'}</button></div>
  {!event?<p className="rounded-xl bg-slate-50 p-5 text-center text-slate-600">ยังไม่มีรายการที่เปิดแสดงในกีฬานี้</p>:!groupSport?<div className="rounded-xl border border-blue-100 bg-blue-50 p-5"><h4 className="font-black">{cfg.label} · {event.sport_name}</h4><p className="my-2 text-sm text-slate-700">{cfg.code==='PT'?'ใช้ระบบสายผู้ชนะ–ผู้แพ้และทีมเข้ารอบ ไม่ใช่ตารางคะแนนพบกันหมด':cfg.code==='AT'?'ใช้ผลการวิ่ง เวลา ระยะทาง และอันดับตามรายการ':'ใช้สายการแข่งขันแบบแพ้คัดออกและผลอันดับ ไม่ใช่ตารางสะสมคะแนน'}</p><Link className="inline-block rounded-xl bg-[#0755ce] px-4 py-2 text-sm font-bold !text-white" href={`/group-sports/${cfg.path}${cfg.code==='ES'?'':`?code=${encodeURIComponent(event.event_code||'')}`}`} prefetch={false}>ดูโปรแกรม / ผลการแข่งขัน →</Link></div>:<>
  <div className="grid grid-cols-3 gap-2">{[{name:'จำนวนสาย',value:data?groups.length:'—',color:'text-blue-700'},{name:'ทีมในสาย',value:data?total:'—',color:'text-emerald-700'},{name:'คู่ที่นับผลแล้ว',value:data?done:'—',color:'text-violet-700'}].map(s=><div key={s.name} className="rounded-xl border border-slate-200 bg-white p-3 text-center"><b className={`block text-2xl font-black ${s.color}`}>{s.value}</b><span className="text-xs font-semibold text-slate-600">{s.name}</span></div>)}</div>
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{'rule'in cfg?cfg.rule:''} · อันดับระหว่างการแข่งขันเป็นข้อมูลเบื้องต้น</span><span>{data?`อัปเดต ${data.at} น. · ทุก 60 วินาทีเมื่อเปิดดู`:'รอข้อมูล'}</span></div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">โหลดตารางคะแนนไม่สำเร็จ: {error}{data?' · แสดงข้อมูลเดิม กรุณาโหลดใหม่':''}</p>}
  {issues>0&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">มีผล {issues} คู่ที่ข้อมูลไม่สมบูรณ์หรือจับคู่โรงเรียนไม่ได้ จึงไม่นำมาคำนวณ · ตรวจสอบในหน้ากีฬา</p>}
  {!data&&!error&&<p role="status" className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">กำลังโหลดข้อมูลการแบ่งสาย…</p>}
  {data&&!groups.length&&<p className="rounded-xl bg-slate-50 p-5 text-center text-slate-600">ยังไม่มีข้อมูลแบ่งสายที่บัญชีนี้สามารถดูได้</p>}
  <div className="grid gap-4 xl:grid-cols-2">{shown.map(g=><section key={g.id} className="min-w-0 overflow-hidden rounded-xl border border-blue-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-2 bg-[#102e70] px-4 py-3 !text-white"><h4 className="font-black">สาย {g.label}</h4><span className="text-xs">{g.rows.length} ทีม · {g.counted} คู่ที่นับผลแล้ว</span></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-blue-50 text-xs text-blue-950"><tr>{['อันดับ','โรงเรียน','แข่ง','ชนะ','แพ้',`ได้/เสีย${'unit'in cfg?cfg.unit:''}`,...(groupSport==='VB'||groupSport==='ST'?['ปรับแพ้']:[]),...(groupSport==='ES'?['เวลา','Kill']:[]),'คะแนน'].map(h=><th key={h} scope="col" className={`p-2 ${h==='โรงเรียน'?'text-left':'text-center'}`}>{h}</th>)}</tr></thead><tbody>{g.rows.map((r,i)=><tr key={r.id} className="border-t border-slate-100 even:bg-slate-50/70"><td className="p-2 text-center font-black text-slate-700">{g.counted&&!g.issues?i+1:'—'}</td><th scope="row" className="min-w-[145px] p-2 text-left font-semibold">{r.school}</th><td className="p-2 text-center">{r.played}</td><td className="p-2 text-center text-emerald-800">{r.win}</td><td className="p-2 text-center text-red-800">{r.loss}</td><td className="p-2 text-center tabular-nums">{r.scored}–{r.conceded}</td>{(groupSport==='VB'||groupSport==='ST')&&<td className="p-2 text-center">{r.forfeit}</td>}{groupSport==='ES'&&<><td className="p-2 text-center">{r.played&&r.timeCount===r.played?r.time.toFixed(2):'—'}</td><td className="p-2 text-center">{r.played&&r.killCount===r.played?r.kills:'—'}</td></>}<td className="bg-blue-50 p-2 text-center text-base font-black text-blue-900">{r.points}</td></tr>)}</tbody></table></div>{!g.counted&&<p className="border-t p-2 text-center text-xs text-slate-500">ยังไม่มีผลการแข่งขัน · แสดงทีมตามลำดับแบ่งสาย</p>}</section>)}</div>
  <Link href={`/group-sports/${cfg.path}${cfg.code==='ES'?'':`?code=${encodeURIComponent(event.event_code||'')}`}`} prefetch={false} className="inline-block text-sm font-bold text-blue-800 underline">ดูรายละเอียดในหน้ากีฬา →</Link>
  </>}
 </div>;
}
