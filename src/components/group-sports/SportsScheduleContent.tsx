"use client";

import { makePlan, fixtureStatus, type Bundle } from "@/components/group-sports/EsportsSessionSchedule";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const SLUG = "phayao-secondary-group-sports-2569";
const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:bg-slate-100";
const primary = "rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50";
const secondary = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const statusNames: Record<string,string> = { draft:"ฉบับร่าง",published:"เผยแพร่แล้ว",postponed:"เลื่อนการแข่งขัน",cancelled:"ยกเลิก",scheduled:"กำหนดการแข่งขันแล้ว",registration:"เปิดรับสมัคร",closed:"ปิดรับสมัคร",in_progress:"กำลังแข่งขัน",completed:"เสร็จสิ้น" };
const types: Record<string,string>={team:"กีฬาทีม",individual:"กีฬาเดี่ยว/คู่",athletics:"กรีฑา"};
const formats:Record<string,string>={manual:"รอยืนยันรูปแบบ",league:"พบกันหมด",knockout:"แพ้คัดออก",time:"จับเวลา",distance:"วัดระยะ",points:"คะแนน"};
const sportOptions=["ฟุตบอล","ฟุตซอล","บาสเกตบอล","วอลเลย์บอล","เซปักตะกร้อ","เทเบิลเทนนิส","เปตอง","E-Sport (RoV)","มวยสากลสมัครเล่น","กรีฑา"];

type EventRow={id:string;event_code:string|null;sport_name:string;sport_group:string|null;event_type:string;gender_rule:string;level_rule:string;competition_format:string;venue_name:string|null;status:string;stage3_source:string|null;notes:string|null};
type SessionRow={esports?:boolean;id:string;event_id:string;session_number:string;session_date:string|null;report_time:string|null;start_time:string|null;end_time:string|null;round_name:string;participants:string;venue_name:string;source_ref:string;review_note:string;status:string};
type EForm={event_code:string;sport_name:string;sport_group:string;event_type:string;gender_rule:string;level_rule:string;competition_format:string;venue_name:string;status:string;stage3_source:string;notes:string};
type SForm={event_id:string;session_number:string;session_date:string;report_time:string;start_time:string;end_time:string;round_name:string;participants:string;venue_name:string;source_ref:string;review_note:string;status:string};
const blankEvent:EForm={event_code:"",sport_name:"",sport_group:"",event_type:"team",gender_rule:"ชาย",level_rule:"ไม่จำกัดอายุ",competition_format:"manual",venue_name:"",status:"draft",stage3_source:"",notes:""};
const blankSession:SForm={event_id:"",session_number:"",session_date:"",report_time:"",start_time:"",end_time:"",round_name:"ไม่ระบุรอบ",participants:"",venue_name:"",source_ref:"",review_note:"",status:"draft"};
function errorText(e:unknown){return typeof e==="object"&&e!==null&&"message" in e?String(e.message):"ไม่สามารถดำเนินการได้";}
function thaiDate(d:string|null){return d?new Intl.DateTimeFormat("th-TH",{dateStyle:"medium",timeZone:"Asia/Bangkok"}).format(new Date(d+"T00:00:00+07:00")):"ยังไม่กำหนด";}
function shortTime(t:string|null){return t?t.slice(0,5):"";}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="relative block pt-1"><span className="absolute left-2 top-0 z-10 bg-white px-1 text-[11px] font-bold text-slate-600">{label}</span>{children}</label>}
function Status({status}:{status:string}){return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status==="draft"?"bg-amber-50 text-amber-800":status==="cancelled"?"bg-red-50 text-red-800":status==="postponed"?"bg-orange-50 text-orange-800":"bg-emerald-50 text-emerald-800"}`}>{statusNames[status]||status}</span>}

function isEsportsEvent(event: EventRow) {
  return event.event_code === "GS3-ES-SM" || event.event_code === "GS3-ES-SF";
}

async function loadEsportsSchedule(competitionId: string, events: EventRow[]): Promise<SessionRow[]> {
  const ids = events.map(event => event.id);
  if (!ids.length) return [];
  const [groups, teams, matches] = await Promise.all([
    supabase.from("sports_esports_groups").select("id,event_id,group_code,sort_order").eq("competition_id", competitionId).in("event_id", ids),
    supabase.from("sports_esports_group_teams").select("id,group_id,school_name,seed_order").eq("competition_id", competitionId).in("event_id", ids),
    supabase.from("sports_esports_matches").select("id,event_id,group_id,match_no,stage,team1_id,team2_id,scheduled_date,start_time,match_status,score1,score2,venue_name").eq("competition_id", competitionId).in("event_id", ids),
  ]);
  for (const result of [groups, teams, matches]) if (result.error) throw result.error;
  const bundle: Bundle = {
    events: events.map(e => ({id: e.id, event_code: e.event_code!})),
    groups: groups.data ?? [], teams: teams.data ?? [], matches: matches.data ?? [],
  };
  const fixtures = new Map(makePlan(bundle).rows.map(row => [row.match.id, row]));
  const schools = new Map(bundle.teams.map(team => [team.id, team.school_name]));
  const stages: Record<string,string> = { knockout: "รอบ 8 ทีม", semifinal: "รอบรองชนะเลิศ", final: "รอบชิงชนะเลิศ", third_place: "รอบชิงอันดับ 3" };
  return (matches.data ?? []).map(match => {
    const row = fixtures.get(match.id);
    const participants = row ? `${row.school1} พบ ${row.school2}` :
      `${schools.get(match.team1_id ?? "") ?? "รอทีม"} พบ ${schools.get(match.team2_id ?? "") ?? "รอทีม"}`;
    const result = match.match_status === "completed" ?
      (row ? fixtureStatus(row) : `บันทึกผลแล้ว ${match.score1}–${match.score2}`) : "";
    return {
      esports: true, id: match.id, event_id: match.event_id, session_number: match.match_no,
      session_date: row?.date ?? match.scheduled_date, start_time: row?.start ?? match.start_time,
      end_time: row?.end ?? null, report_time: null, status: match.match_status,
      round_name: row ? `แมตช์ ${row.session} · คู่ที่ ${row.station} · กลุ่ม ${row.groupCode}` : stages[match.stage] ?? "รอบแบ่งกลุ่ม",
      participants: [participants, result].filter(Boolean).join("\n"), venue_name: match.venue_name || "",
      source_ref: "", review_note: "",
    };
  }).sort((a,b) => a.round_name.localeCompare(b.round_name,"th",{numeric:true}));
}

export default function SportsScheduleContent({ embedded = false, initialTab = "schedule" }: { embedded?: boolean; initialTab?: "schedule" | "events" }){
 const [comp,setComp]=useState("");const [email,setEmail]=useState("");const [admin,setAdmin]=useState(false);const [authStatus,setAuthStatus]=useState<"checking"|"guest"|"admin"|"no_role">("checking");
 const [events,setEvents]=useState<EventRow[]>([]);const [sessions,setSessions]=useState<SessionRow[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [tab,setTab]=useState<"schedule"|"events">(initialTab);const [query,setQuery]=useState("");const [sport,setSport]=useState("");const [day,setDay]=useState("");const [status,setStatus]=useState("");const [page,setPage]=useState(1);const [selected,setSelected]=useState<string[]>([]);
 const [editingEvent,setEditingEvent]=useState<string|null>(null);const [ef,setEf]=useState<EForm>(blankEvent);const [editingSession,setEditingSession]=useState<string|null>(null);const [sf,setSf]=useState<SForm>(blankSession);
 const load=useCallback(async()=>{
  setLoading(true);setError("");setAuthStatus("checking");
  setAdmin(false);setEvents([]);setSessions([]);setSelected([]);
  try{
   // Always verify the user with Supabase Auth; a profile or UI label alone is not authorization.
   const { data: authData, error: authError } = await supabase.auth.getUser();
   const user = authData.user;
   if (authError && authError.name !== "AuthSessionMissingError") {
     throw new Error("ตรวจสอบบัญชีผู้ใช้ไม่สำเร็จ: " + authError.message);
   }
   setEmail(user?.app_metadata?.sports_school_account ? "บัญชีโรงเรียน" : user?.email || "");
   const c = await supabase.from("sports_competitions").select("id").eq("slug",SLUG).single();
   if(c.error) throw c.error;
   const id=c.data.id as string;setComp(id);
   let allowed=false;
   if(user){
     const p=await supabase.rpc("sports_stage3_admin",{p_comp:id});
     if(p.error)throw new Error("ตรวจสอบสิทธิ์กีฬากลุ่มไม่สำเร็จ: "+p.error.message);
     allowed=p.data===true;
   }
   const e=await supabase.from("sports_events")
      .select("id,event_code,sport_name,sport_group,event_type,gender_rule,level_rule,competition_format,venue_name,status,stage3_source,notes")
      .eq("competition_id",id).order("sport_name");
   if(e.error)throw e.error;
   const all:SessionRow[]=[];
   for(let offset=0;;offset+=500){
     const s=await supabase.from("sports_schedule_sessions")
       .select("id,event_id,session_number,session_date,report_time,start_time,end_time,round_name,participants,venue_name,source_ref,review_note,status")
       .eq("competition_id",id).order("session_date",{nullsFirst:false})
       .order("start_time",{nullsFirst:false}).order("id").range(offset,offset+499);
     if(s.error)throw s.error;
     all.push(...((s.data||[]) as SessionRow[]));
     if((s.data||[]).length<500)break;
   }
   setAdmin(allowed);setAuthStatus(!user?"guest":allowed?"admin":"no_role");
   const eventRows = (e.data || []) as EventRow[];
   const esportsEvents = eventRows.filter(isEsportsEvent);
   const esportsIds = new Set(esportsEvents.map(event => event.id));
   const combined = all.filter(session => !esportsIds.has(session.event_id));
   try {
     combined.push(...await loadEsportsSchedule(id, esportsEvents));
   } catch (cause) {
     setError("โหลดโปรแกรม E-Sport ไม่สำเร็จ: " + errorText(cause));
   }
   combined.sort((a,b) => (a.session_date ?? "9999").localeCompare(b.session_date ?? "9999") ||
     (a.start_time ?? "99").slice(0,5).localeCompare((b.start_time ?? "99").slice(0,5)));
   setEvents(eventRows);setSessions(combined);
  }catch(e){setError(errorText(e));}finally{setLoading(false);}
 },[]);
 useEffect(()=>{
   let mounted=true;
   let refreshTimer:ReturnType<typeof setTimeout>|undefined;
   const scheduleRefresh=()=>{
     if(refreshTimer)clearTimeout(refreshTimer);
     // Supabase auth events must not perform awaited API calls synchronously.
     refreshTimer=setTimeout(()=>{if(mounted)void load();},0);
   };
   const {data}=supabase.auth.onAuthStateChange((event)=>{
     if(event==="SIGNED_OUT"){
       setAdmin(false);setEmail("");setAuthStatus("guest");
       setEvents([]);setSessions([]);setSelected([]);
       setEditingEvent(null);setEditingSession(null);
     }
     if(["INITIAL_SESSION","SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event)){
       scheduleRefresh();
     }
   });
   // INITIAL_SESSION is emitted as the session is restored from storage.
   return()=>{mounted=false;if(refreshTimer)clearTimeout(refreshTimer);data.subscription.unsubscribe();};
 },[load]);
 const byId=useMemo(()=>new Map(events.map(e=>[e.id,e])),[events]);
 const group=(e:EventRow|undefined)=>e?.sport_group||e?.sport_name||"ไม่ระบุ";
 const groups=useMemo(()=>Array.from(new Set(events.map(e=>e.sport_group||e.sport_name))).sort((a,b)=>a.localeCompare(b,"th")),[events]);
 const dates=useMemo(()=>Array.from(new Set(sessions.map(s=>s.session_date).filter((v):v is string=>!!v))).sort(),[sessions]);
 const search=(value:string)=>value.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th"));
 const efilt=events.filter(e=>(!sport||group(e)===sport)&&(!status||e.status===status)&&search([e.event_code,e.sport_name,e.gender_rule,e.level_rule,e.venue_name].join(" ")));
 const sfilt=sessions.filter(s=>{const e=byId.get(s.event_id);return (!sport||group(e)===sport)&&(!day||s.session_date===day)&&(!status||s.status===status)&&search([e?.sport_name,s.session_number,s.participants,s.venue_name,s.round_name].join(" "));});
 const size=25;const total=tab==="schedule"?sfilt.length:efilt.length;const pages=Math.max(1,Math.ceil(total/size));const activePage=Math.min(page,pages);const visibleS=sfilt.slice((activePage-1)*size,activePage*size);const visibleE=efilt.slice((activePage-1)*size,activePage*size);
 const selectable=visibleS.filter(s=>!s.esports&&s.status==="draft"&&s.session_date).map(s=>s.id);
 const resetFilter=()=>{setPage(1);setSelected([]);};
 function openEvent(e?:EventRow){setEditingSession(null);setEditingEvent(e?.id||"new");setEf(e?{event_code:e.event_code||"",sport_name:e.sport_name,sport_group:e.sport_group||"",event_type:e.event_type,gender_rule:e.gender_rule,level_rule:e.level_rule,competition_format:e.competition_format,venue_name:e.venue_name||"",status:e.status,stage3_source:e.stage3_source||"",notes:e.notes||""}:{...blankEvent,sport_group:sport||""});if(embedded) document.getElementById("sports-schedule-edit-area")?.scrollIntoView({behavior:"smooth",block:"start"}); else window.scrollTo({top:0,behavior:"smooth"});}
 function openSession(s?:SessionRow){setEditingEvent(null);setEditingSession(s?.id||"new");setSf(s?{event_id:s.event_id,session_number:s.session_number,session_date:s.session_date||"",start_time:shortTime(s.start_time),end_time:shortTime(s.end_time),report_time:shortTime(s.report_time),round_name:s.round_name,participants:s.participants,venue_name:s.venue_name,source_ref:s.source_ref,review_note:s.review_note,status:s.status}:{...blankSession,session_date:day});if(embedded) document.getElementById("sports-schedule-edit-area")?.scrollIntoView({behavior:"smooth",block:"start"}); else window.scrollTo({top:0,behavior:"smooth"});}
 async function saveEvent(ev:FormEvent<HTMLFormElement>){ev.preventDefault();if(!admin||!comp||!editingEvent||busy)return;setError("");setNotice("");if(!ef.sport_name.trim()||!ef.sport_group.trim()||!ef.event_code.trim()){setError("กรุณากรอกรหัส ชื่อ และชนิดกีฬา");return;}if(ef.status!=="draft"&& !window.confirm("ยืนยันสถานะรายการแข่งขันนี้? ข้อมูลรายการอาจแสดงต่อสาธารณะ"))return;setBusy(true);try{const payload={...ef,event_code:ef.event_code.trim(),sport_name:ef.sport_name.trim(),sport_group:ef.sport_group.trim(),updated_at:new Date().toISOString()};const res=editingEvent==="new"?await supabase.from("sports_events").insert({...payload,competition_id:comp}).select("id").single():await supabase.from("sports_events").update(payload).eq("id",editingEvent).eq("competition_id",comp).select("id").single();if(res.error)throw res.error;setEditingEvent(null);setNotice("บันทึกรายการแข่งขันแล้ว");await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 async function saveSession(ev:FormEvent<HTMLFormElement>){ev.preventDefault();if(!admin||!comp||!editingSession||busy)return;setError("");setNotice("");if(!sf.session_number.trim()||!sf.round_name.trim()){setError("กรุณาระบุเลขรายการและรอบ");return;}if(sf.status!=="draft"&&!window.confirm("ยืนยันเปลี่ยนโปรแกรมที่เผยแพร่แล้ว?"))return;setBusy(true);try{const payload={...sf,session_number:sf.session_number.trim(),session_date:sf.session_date||null,report_time:sf.report_time||null,start_time:sf.start_time||null,end_time:sf.end_time||null};const res=editingSession==="new"?await supabase.from("sports_schedule_sessions").insert({...payload,competition_id:comp}).select("id").single():await supabase.from("sports_schedule_sessions").update(payload).eq("id",editingSession).eq("competition_id",comp).select("id").single();if(res.error)throw res.error;setEditingSession(null);setNotice("บันทึกโปรแกรมแล้ว");await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 async function remove(s:SessionRow){if(!admin||busy||s.status!=="draft"||!window.confirm("ลบฉบับร่างนี้? ไม่กระทบผลการแข่งขัน"))return;setBusy(true);setError("");setNotice("");try{const r=await supabase.from("sports_schedule_sessions").delete().eq("id",s.id).eq("competition_id",comp).eq("status","draft").select("id").single();if(r.error)throw r.error;setNotice("ลบฉบับร่างแล้ว");await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 async function publish(ids:string[]){if(!admin||busy||!ids.length)return;if(!window.confirm(`ยืนยันว่าได้ตรวจต้นฉบับ วันเวลา รุ่น สนาม และคู่แข่งขันทั้ง ${ids.length} รายการแล้ว? เมื่อเผยแพร่บุคคลทั่วไปจะเห็นได้ทันที`))return;setBusy(true);setError("");setNotice("");try{const p=await supabase.rpc("sports_stage3_publish",{p_comp:comp,p_ids:ids});if(p.error)throw p.error;setNotice(`เผยแพร่ ${p.data} รายการแล้ว (ยังไม่เปิดรับสมัคร)`);await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 const efield=(key:keyof EForm,label:string,required=false)=><Field label={label}><input className={input} value={ef[key]} onChange={e=>setEf(o=>({...o,[key]:e.target.value}))} required={required}/></Field>;
 const sfield=(key:keyof SForm,label:string,type="text",required=false)=><Field label={label}><input className={input} type={type} value={sf[key]} onChange={e=>setSf(o=>({...o,[key]:e.target.value}))} required={required}/></Field>;
 return <div className={embedded ? "w-full min-w-0 text-slate-900" : "min-h-screen bg-slate-100 text-slate-900"}>
  {!embedded && <header className="bg-gradient-to-r from-slate-950 via-[#15244a] to-slate-900 text-white"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-4"><Link href="/group-sports" className="text-sm font-bold text-blue-200 hover:text-white">← กลับระบบกีฬากลุ่ม</Link><Link href="/group-sports/esports" className="text-sm font-bold text-amber-200 hover:text-white">🎮 จัดการ E-Sport</Link></div><div className="flex flex-wrap items-center gap-2 text-xs">{email?<span>{email} · {admin?"ผู้ดูแลการแข่งขัน":"ยังไม่มีสิทธิ์จัดการโปรแกรม"}</span>:<Link href="/group-sports/login" className="rounded-lg bg-white px-3 py-2 font-bold text-slate-900">เข้าสู่ระบบ</Link>}</div></div><p className="mt-5 text-xs font-bold tracking-[.22em] text-amber-300">PHULANGKA GAMES 2026</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">โปรแกรมการแข่งขัน · ภูลังกาเกมส์ 2026</h1><p className="mt-2 text-sm text-slate-300">กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30</p></div></header>}
  {embedded && <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6"><div><h2 className="text-xl font-black text-slate-900">จัดการ / ดูโปรแกรมการแข่งขัน</h2><p className="mt-1 text-sm text-slate-500">ภูลังกาเกมส์ 2569 · โปรแกรมการแข่งขันและรายการกีฬา</p></div><div className="flex flex-wrap items-center gap-3 text-xs">{email && <span className="text-slate-600">{email} · {admin ? "ผู้ดูแลการแข่งขัน" : "ผู้ใช้งาน"}</span>}<Link href="/group-sports/esports" className="font-bold text-blue-700 underline-offset-4 hover:underline">จัดการ E-Sport</Link></div></section>}
  <section className={embedded ? "w-full space-y-4" : "mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6"}>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}{notice&&<div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}
    {!loading && authStatus==="guest" && <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">หน้านี้ยังไม่พบ Session ที่เข้าสู่ระบบ จึงแสดงเฉพาะโปรแกรมที่เผยแพร่แล้ว (ปัจจุบันยังเป็นฉบับร่าง) กรุณาเข้าสู่ระบบในเบราว์เซอร์และที่อยู่ localhost:3000 เดียวกัน แล้วกลับมารีเฟรชหน้านี้</div>}
    {!loading && authStatus==="no_role" && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">บัญชีนี้เข้าสู่ระบบแล้ว แต่ยังไม่ได้รับบทบาท competition_admin ของการแข่งขันนี้ ให้ตรวจ sports_user_roles ว่าผูกกับ auth.users.id ของบัญชีนี้ถูกต้อง</div>}
   {admin&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">ข้อมูลนำเข้าจากเอกสารยังเป็นฉบับร่าง ตรวจเทียบกับต้นฉบับก่อนเผยแพร่ โดยเฉพาะฟุตบอล 15 ปีชาย วอลเลย์บอล เทเบิลเทนนิส และกรีฑารายการ 110/114 · รายการกีฬาที่ข้อมูลไม่ครบเพิ่มได้ภายหลัง</div>}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["รายการแข่งขัน",events.length],["โปรแกรมที่มองเห็น",sessions.length],["กรีฑา",sessions.filter(s=>byId.get(s.event_id)?.event_type==="athletics").length],[admin?"ฉบับร่าง":"เผยแพร่แล้ว",sessions.filter(s=>admin?s.status==="draft":s.esports?s.status!=="draft":s.status==="published").length]].map(([label,count])=><div key={label} className={panel}><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black tabular-nums">{count}</div></div>)}</div>
   <div className="flex flex-wrap items-center gap-2"><button onClick={()=>{setTab("schedule");setStatus("");resetFilter();}} className={tab==="schedule"?primary:secondary}>โปรแกรมการแข่งขัน</button><button onClick={()=>{setTab("events");setStatus("");resetFilter();}} className={tab==="events"?primary:secondary}>รายการแข่งขัน</button><div className="flex-1"/><button className={secondary} disabled={busy||loading} onClick={()=>void load()}>รีเฟรชข้อมูล</button>{admin&&<button className={primary} disabled={busy||loading} onClick={()=>tab==="events"?openEvent():openSession()}>+ {tab==="events"?"เพิ่มรายการ":"เพิ่มโปรแกรม"}</button>}</div>
   <div id="sports-schedule-edit-area" className="scroll-mt-6" />
   {admin&&editingEvent&&<form className={`${panel} space-y-4`} onSubmit={saveEvent}><div className="flex items-center justify-between"><h2 className="font-black">{editingEvent==="new"?"เพิ่มรายการแข่งขัน":"แก้ไขรายการแข่งขัน"}</h2><button type="button" className={secondary} disabled={busy} onClick={()=>setEditingEvent(null)}>ปิด</button></div><div className="grid gap-4 sm:grid-cols-2">{efield("event_code","รหัสรายการ *",true)}{efield("sport_name","ชื่อรายการแข่งขัน *",true)}<Field label="ชนิดกีฬา *"><input list="sports-catalogue" className={input} value={ef.sport_group} onChange={e=>setEf(o=>({...o,sport_group:e.target.value}))} required/><datalist id="sports-catalogue">{sportOptions.map(s=><option key={s} value={s}/>)}</datalist></Field><Field label="ประเภท"><select className={input} value={ef.event_type} onChange={e=>setEf(o=>({...o,event_type:e.target.value}))}>{Object.entries(types).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>{efield("gender_rule","เพศ",true)}{efield("level_rule","รุ่นอายุ",true)}<Field label="รูปแบบ"><select className={input} value={ef.competition_format} onChange={e=>setEf(o=>({...o,competition_format:e.target.value}))}>{Object.entries(formats).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>{efield("venue_name","สนาม")}{efield("stage3_source","เอกสารอ้างอิง")}<Field label="สถานะ"><select className={input} value={ef.status} onChange={e=>setEf(o=>({...o,status:e.target.value}))}>{["draft","registration","scheduled","closed",...(!["draft","registration","scheduled","closed"].includes(ef.status)?[ef.status]:[])].map(v=><option key={v} value={v}>{statusNames[v]||v}</option>)}</select></Field></div><Field label="หมายเหตุ (ห้ามใส่ข้อมูลส่วนบุคคล)"><textarea className={input} rows={3} value={ef.notes} onChange={e=>setEf(o=>({...o,notes:e.target.value}))}/></Field><div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={busy} onClick={()=>setEditingEvent(null)}>ยกเลิก</button><button className={primary} disabled={busy}>บันทึกรายการ</button></div></form>}
   {admin&&editingSession&&<form className={`${panel} space-y-4`} onSubmit={saveSession}><div className="flex items-center justify-between"><h2 className="font-black">{editingSession==="new"?"เพิ่มโปรแกรมแข่งขัน":"แก้ไขโปรแกรมแข่งขัน"}</h2><button type="button" className={secondary} disabled={busy} onClick={()=>setEditingSession(null)}>ปิด</button></div><Field label="รายการแข่งขัน *"><select className={input} required value={sf.event_id} onChange={e=>setSf(o=>({...o,event_id:e.target.value,venue_name:byId.get(e.target.value)?.venue_name||o.venue_name}))}><option value="">เลือกรายการ</option>{events.filter(e=>!isEsportsEvent(e)).map(e=><option key={e.id} value={e.id}>{e.sport_name} · {e.event_code}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-3">{sfield("session_number","เลขคู่ / เลขรายการ *","text",true)}{sfield("session_date","วันที่แข่งขัน","date")}{sfield("round_name","รอบ *","text",true)}{sfield("report_time","เวลารายงานตัว","time")}{sfield("start_time","เวลาเริ่มแข่งขัน","time")}{sfield("end_time","เวลาสิ้นสุด","time")}</div><div className="grid gap-4 sm:grid-cols-2">{sfield("participants","คู่แข่งขัน / ตำแหน่งจากสาย")} {sfield("venue_name","สนาม / โต๊ะ / ลู่")} {sfield("source_ref","เอกสารอ้างอิง")}<Field label="สถานะ"><select className={input} value={sf.status} onChange={e=>setSf(o=>({...o,status:e.target.value}))}>{(sf.status==="draft"?["draft"]:["draft","published","postponed","cancelled"]).map(v=><option key={v} value={v}>{statusNames[v]}</option>)}</select></Field></div><Field label="หมายเหตุตรวจสอบ (ห้ามใส่ข้อมูลส่วนบุคคล)"><textarea className={input} rows={3} value={sf.review_note} onChange={e=>setSf(o=>({...o,review_note:e.target.value}))}/></Field><div className="flex justify-end gap-2"><button type="button" className={secondary} disabled={busy} onClick={()=>setEditingSession(null)}>ยกเลิก</button><button className={primary} disabled={busy}>บันทึกโปรแกรม</button></div></form>}
   <section className={`${panel} space-y-4`}><div className="grid gap-3 sm:grid-cols-4"><Field label="ค้นหารายการ / ชื่อโรงเรียน / เลขคู่"><input className={input} value={query} onChange={e=>{setQuery(e.target.value);resetFilter();}}/></Field><Field label="ชนิดกีฬา"><select className={input} value={sport} onChange={e=>{setSport(e.target.value);resetFilter();}}><option value="">ทุกชนิดกีฬา</option>{groups.map(g=><option key={g} value={g}>{g}</option>)}</select></Field>{tab==="schedule"&&<Field label="วันที่"><select className={input} value={day} onChange={e=>{setDay(e.target.value);resetFilter();}}><option value="">ทุกวัน</option>{dates.map(d=><option key={d} value={d}>{thaiDate(d)}</option>)}</select></Field>}<Field label="สถานะ"><select className={input} value={status} onChange={e=>{setStatus(e.target.value);resetFilter();}}><option value="">ทุกสถานะ</option>{(tab==="schedule"?["draft","published","scheduled","completed","postponed","cancelled"]:["draft","scheduled","registration","closed","completed"]).filter(s=>admin||s!=="draft").map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select></Field></div>
   <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">พบ <b>{total}</b> รายการ {loading&&"· กำลังโหลด"}</p>{admin&&tab==="schedule"&&<div className="flex flex-wrap items-center gap-2"><button className={secondary} disabled={busy||!selectable.length} onClick={()=>setSelected(old=>Array.from(new Set([...old,...selectable])))}>เลือกฉบับร่างหน้านี้</button><button className={secondary} disabled={busy||!selected.length} onClick={()=>setSelected([])}>ล้างที่เลือก</button><button className={primary} disabled={busy||!selected.length} onClick={()=>void publish(selected)}>เผยแพร่ที่เลือก ({selected.length})</button></div>}</div>
   {total===0&&!loading?<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">{admin?"ไม่พบข้อมูลตามเงื่อนไข":"ยังไม่มีรายการที่เผยแพร่ตามเงื่อนไข"}</div>:tab==="schedule"?<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600">{admin&&<th className="p-3">เลือก</th>}{["เลขคู่ / รายการ","วัน · เวลา","รอบ / คู่แข่งขัน","สนาม","สถานะ",...(admin?["จัดการ"]:[])].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{visibleS.map(s=>{const e=byId.get(s.event_id);return <tr key={s.id} className="border-b border-slate-100 align-top"><>{admin&&<td className="p-3"><input aria-label={`เลือก ${s.session_number}`} type="checkbox" disabled={busy||s.esports||s.status!=="draft"||!s.session_date} checked={selected.includes(s.id)} onChange={ev=>setSelected(old=>ev.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/></td>}</><td className="p-3"><b>{s.session_number}</b><p className="mt-1 font-semibold">{e?.sport_name||"ไม่พบรายการ"}</p>{admin&&s.source_ref&&<p className="mt-1 text-xs text-slate-500">{s.source_ref}</p>}</td><td className="p-3 whitespace-nowrap">{thaiDate(s.session_date)}<p className="text-xs text-slate-600">{s.report_time&&`รายงานตัว ${shortTime(s.report_time)}`}</p><p className="font-bold">{shortTime(s.start_time)||"รอกำหนดเวลา"}{s.end_time&&`–${shortTime(s.end_time)}`}</p></td><td className="p-3"><p className="font-semibold">{s.round_name}</p><p className="mt-1 whitespace-pre-wrap">{s.participants||"—"}</p>{admin&&s.review_note&&<details className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><summary className="cursor-pointer font-bold">ข้อควรตรวจสอบ</summary><p className="mt-1">{s.review_note}</p></details>}</td><td className="p-3 text-xs">{s.venue_name||"รอยืนยันสนาม"}</td><td className="p-3"><Status status={s.status}/></td>{admin&&<td className="p-3">{s.esports ? <Link className="font-bold text-blue-700" href="/group-sports/esports">จัดการ E-Sport</Link> : <div className="flex flex-wrap gap-1"><button className={secondary} disabled={busy} onClick={()=>openSession(s)}>แก้ไข</button>{s.status==="draft"&&<><button className={secondary} disabled={busy||!s.session_date} onClick={()=>void publish([s.id])}>เผยแพร่</button><button className="rounded-lg px-2 text-xs font-bold text-red-700" disabled={busy} onClick={()=>void remove(s)}>ลบ</button></>}</div>}</td>}</tr>})}</tbody></table></div>:<div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600">{["รหัส / ชื่อ","ประเภท / รุ่น","สนาม / รูปแบบ","สถานะ",...(admin?["จัดการ"]:[])].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{visibleE.map(e=><tr key={e.id} className="border-b border-slate-100 align-top"><td className="p-3"><p className="text-xs text-slate-500">{e.event_code}</p><b>{e.sport_name}</b>{admin&&e.notes&&<p className="mt-1 text-xs text-amber-800">{e.notes}</p>}</td><td className="p-3">{types[e.event_type]||e.event_type}<p className="text-xs text-slate-600">{e.level_rule} · {e.gender_rule}</p></td><td className="p-3">{e.venue_name||"รอยืนยัน"}<p className="text-xs text-slate-500">{formats[e.competition_format]||e.competition_format}</p></td><td className="p-3"><Status status={e.status}/></td>{admin&&<td className="p-3"><button className={secondary} disabled={busy} onClick={()=>openEvent(e)}>แก้ไข / ปิด</button></td>}</tr>)}</tbody></table></div>}
   <div className="flex items-center justify-between"><button className={secondary} disabled={activePage<=1} onClick={()=>setPage(activePage-1)}>ก่อนหน้า</button><span className="text-xs text-slate-500">หน้า {activePage} / {pages}</span><button className={secondary} disabled={activePage>=pages} onClick={()=>setPage(activePage+1)}>ถัดไป</button></div></section>
   <p className="text-xs text-slate-500">เวลาท้องถิ่นประเทศไทย · โปรแกรมเผยแพร่ได้เมื่อคณะกรรมการตรวจสอบแล้ว · ผลการแข่งขันและการคำนวณรางวัลเป็นขั้นตอนถัดไป</p>
  </section>
 </div>
}
