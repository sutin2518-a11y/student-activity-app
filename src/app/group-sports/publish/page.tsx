"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FOOTBALL_CONFIG } from "@/lib/group-sports/football-config";

const SLUG = "phayao-secondary-group-sports-2569";
const SPORTS = [
  ["BB", "บาสเกตบอล", "basketball"], ["VB", "วอลเลย์บอล", "volleyball"],
  ["FB", "ฟุตบอล", "football"], ["FS", "ฟุตซอล", "futsal"],
  ["TT", "เทเบิลเทนนิส", "table-tennis"], ["PT", "เปตอง", "petanque"],
  ["ST", "เซปักตะกร้อ", "takraw"], ["ES", "อีสปอร์ต (RoV)", "esports"],
  ["AT", "กรีฑา", "athletics"], ["BX", "มวยสากลสมัครเล่น", "boxing"],
] as const;
type Sport = typeof SPORTS[number][0];
type EventRow = { id: string; event_code: string | null; sport_name: string; status: string };
type ScheduleRow = { id: string; updated_at?: string; preliminary?: boolean; match_no?: number; stage?: string; basketball_review_note?: string; volleyball_review_note?: string; takraw_review_note?: string; petanque_review_note?: string; tt_review_note?: string; event_id: string; status: string; date: string | null; start: string | null; venue: string | null; team1_name?: string | null; team2_name?: string | null; basketball_end_time?: string | null; basketball_reviewed?: boolean | null; volleyball_reviewed?: boolean | null; takraw_reviewed?: boolean | null; petanque_reviewed?: boolean | null; petanque_bye?: boolean | null; tt_reviewed?: boolean | null; tt_end_time?: string | null; tt_best_of?: number | null };
type View = { event: EventRow; sport: Sport; rows: ScheduleRow[]; drafts: ScheduleRow[]; issues: string[]; first: string; published: number };
type Result = { id: string; title: string; ok: boolean; message: string };
const statusText: Record<string,string> = { registration: "เปิดรับสมัคร", closed: "ปิดรับสมัคร", scheduled: "กำหนดการแข่งขันแล้ว", draft: "ฉบับร่าง", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" };
const expected: Record<string, number> = {
  ...Object.fromEntries(Object.entries(FOOTBALL_CONFIG).map(([code,cfg]) => [code,cfg.matches])),
  "GS3-FS-15M":17,"GS3-FS-UM":22,"GS3-FS-UF":12,
  "GS3-BB-15M":7,"GS3-BB-15F":11,"GS3-BB-UM":25,"GS3-BB-UF":11,
  "GS3-VB-15M":15,"GS3-VB-15F":25,"GS3-VB-OM":31,"GS3-VB-OF":22,
  "GS3-ST-15M":19,"GS3-ST-15F":9,"GS3-ST-UM":19,"GS3-ST-UF":15,
  "GS3-PT-15M":23,"GS3-PT-15F":25,"GS3-PT-UM":23,"GS3-PT-UF":25,
  "GS3-TT-13M-S":7,"GS3-TT-13F-S":6,"GS3-TT-13M-D":5,"GS3-TT-13F-D":4,"GS3-TT-13X-X":5,
  "GS3-TT-15M-S":7,"GS3-TT-15F-S":4,"GS3-TT-15M-D":5,"GS3-TT-15F-D":3,"GS3-TT-15X-X":3,
  "GS3-TT-UM-S":6,"GS3-TT-UF-S":6,"GS3-TT-UM-D":5,"GS3-TT-UF-D":5,"GS3-TT-UX-X":4,
};
function errText(e: unknown) {return typeof e === "object" && e !== null && "message" in e ? String(e.message) : "ดำเนินการไม่สำเร็จ";}
function sportOf(code: string | null): Sport | undefined { return SPORTS.find(([key]) => code?.startsWith(`GS3-${key}-`))?.[0]; }
function thaiDate(date: string) { return date ? new Intl.DateTimeFormat("th-TH", { day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Bangkok" }).format(new Date(`${date}T12:00:00+07:00`)) : "ยังไม่กำหนดวัน"; }
function toView(event: EventRow, sport: Sport, rows: ScheduleRow[]): View {
  const drafts = rows.filter(r=>r.status==="draft"), issues: string[]=[];
  const first=rows.map(r=>r.date||"").filter(Boolean).sort()[0]||"";
  const published=rows.filter(r=>["published","scheduled","completed"].includes(r.status)).length;
  if(sport==="BX") issues.push("จัดการสายมวยจากหน้าเฉพาะกีฬา ไม่เผยแพร่รวมและไม่ปิดรับสมัครอัตโนมัติ");
  if(drafts.length && sport!=="BX") {
    if(!["registration","scheduled","closed"].includes(event.status)) issues.push("สถานะรายการไม่รองรับ (ระบบจะไม่เปลี่ยนสถานะให้อัตโนมัติ)");
    if(drafts.length>500) issues.push("เกินขีดจำกัด 500 รายการต่อรุ่น");
    const active=rows.filter(r=>r.status!=="cancelled");
    const relevant=sport==="AT"||sport==="ES"?drafts:["FB","FS","TT","PT"].includes(sport)?rows:active;
    const timed=relevant.filter(r=>!(sport==="PT"&&r.petanque_bye));
    const missing=timed.filter(r=>!r.date||(sport!=="AT"&&(!r.start||!r.venue?.trim()))).length;
    if(missing) issues.push(`${missing} รายการยังขาดวัน${sport==="AT"?"":" เวลา หรือสนาม"}`);
    if(["FB","FS","BB"].includes(sport)) {
      const incomplete=relevant.filter(r=>!r.team1_name?.trim()||!r.team2_name?.trim()).length;
      if(incomplete) issues.push(`${incomplete} คู่ยังขาดชื่อทีม`);
    }
    const checkedField: Partial<Record<Sport,keyof ScheduleRow>>={BB:"basketball_reviewed",VB:"volleyball_reviewed",ST:"takraw_reviewed",PT:"petanque_reviewed",TT:"tt_reviewed"};
    const field=checkedField[sport];
    if(field){const unchecked=relevant.filter(r=>r[field]!==true).length;if(unchecked)issues.push(`${unchecked} คู่ยังไม่ยืนยันตรวจสอบจากหน้ากีฬา`);}
    if(sport==="BB"||sport==="TT"){
      const invalid=relevant.filter(r=>{const end=sport==="BB"?r.basketball_end_time:r.tt_end_time;return !r.start||!end||end<=r.start||(sport==="TT"&&![3,5,7].includes(Number(r.tt_best_of)));}).length;
      if(invalid)issues.push(`${invalid} คู่ยังขาดเวลาเลิก${sport==="TT"?"หรือจำนวนเกมที่ถูกต้อง":""}`);
    }
    const exp=expected[event.event_code||""];
    const count=sport==="PT"?rows.filter(r=>!r.petanque_bye).length:["BB","VB","ST"].includes(sport)?active.length:rows.length;
    if(exp!==undefined&&exp!==count) issues.push(`จำนวนคู่ ${count}/${exp} ไม่ตรงโปรแกรมเดิม`);
  }
  return {event,sport,rows,drafts,issues,first,published};
}
const btn="rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40";
const blue=`${btn} bg-[#0755ce] text-white`;
const outline=`${btn} border border-blue-200 bg-white text-blue-900`;
const panel="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5";

type PartialAction = "review"|"publish"|"preview"|"unpreview";
const partialSports: Sport[]=["FB","FS","BB","VB","ST","TT"];
const reviewedField: Partial<Record<Sport,keyof ScheduleRow>>={BB:"basketball_reviewed",VB:"volleyball_reviewed",ST:"takraw_reviewed",PT:"petanque_reviewed",TT:"tt_reviewed"};
const noteField: Partial<Record<Sport,keyof ScheduleRow>>={BB:"basketball_review_note",VB:"volleyball_review_note",ST:"takraw_review_note",PT:"petanque_review_note",TT:"tt_review_note"};
const actionLabels:Record<PartialAction,string>={review:"ยืนยันตรวจสอบข้อสังเกต",publish:"เผยแพร่เฉพาะคู่ที่พร้อม",preview:"แสดงโปรแกรมเบื้องต้น",unpreview:"ถอนประกาศเบื้องต้น"};
const stageLabel:Record<string,string>={group:"แบ่งกลุ่ม",quarter:"ก่อนรองชนะเลิศ",semifinal:"รองชนะเลิศ",final:"ชิงชนะเลิศ"};
function rowIssues(v:View,r:ScheduleRow):string[]{
 const a:string[]=[];
 if(!r.date)a.push("ขาดวัน");if(!r.start)a.push("รอกำหนดเวลา");if(!r.venue?.trim())a.push("ขาดสนาม");
 if(!r.team1_name?.trim()||!r.team2_name?.trim())a.push("ขาดชื่อทีม");if(r.petanque_bye)a.push("BYE — จัดการจากหน้าเฉพาะกีฬา");
 if(v.sport==="BB"&&(!r.start||!r.basketball_end_time||r.basketball_end_time<=r.start))a.push("เวลาเลิกไม่ครบ/ไม่ถูกต้อง");
 if(v.sport==="TT"&&(!r.start||!r.tt_end_time||r.tt_end_time<=r.start||![3,5,7].includes(Number(r.tt_best_of))))a.push("เวลาเลิก/จำนวนเกมไม่ครบ");
 return a;
}
// Mirror the earlier-round guard in migration 061. Unknown times must not
// silently qualify a knockout fixture, but review/preview remain independent.
const roundOrder=["group","quarter","semifinal","final"];
function publishIssues(v:View,r:ScheduleRow):string[]{
 const issues=rowIssues(v,r);
 const rank=roundOrder.indexOf(r.stage||"");
 if(rank>0){
  const missing=v.rows.filter(o=>o.status!=="cancelled"&&roundOrder.indexOf(o.stage||"")>=0&&roundOrder.indexOf(o.stage||"")<rank&&(!o.date||!o.start||(v.sport==="BB"&&!o.basketball_end_time)||(v.sport==="TT"&&!o.tt_end_time)));
  if(missing.length)issues.push(`รอรอบก่อนหน้ากำหนดเวลา (คู่ ${missing.map(o=>o.match_no??"?").join(", ")})`);
 }
 return issues;
}
function allowed(v:View,r:ScheduleRow,action:PartialAction):boolean {
 if(!["registration","scheduled","closed"].includes(v.event.status)||r.status!=="draft"||!r.updated_at)return false;
 const field=reviewedField[v.sport];
 if(action==="review")return !!field&&r[field]!==true&&!rowIssues(v,r).length;
 if(action==="publish")return partialSports.includes(v.sport)&&!publishIssues(v,r).length&&(!field||r[field]===true);
 if(action==="preview")return [...partialSports,"PT"].includes(v.sport)&&!!r.date&&!r.start&&!r.petanque_bye&&!!r.team1_name?.trim()&&!!r.team2_name?.trim()&&!r.preliminary;
 return [...partialSports,"PT"].includes(v.sport)&&r.preliminary===true;
}
function PartialPanel({v,disabled,run}:{v:View;disabled:boolean;run:(v:View,rows:ScheduleRow[],action:PartialAction)=>Promise<void>}){
 const [open,setOpen]=useState(false),[mode,setMode]=useState<PartialAction>(v.sport==="PT"?"review":"publish"),[chosen,setChosen]=useState<string[]>([]);
 const rows=[...v.drafts].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")||(a.start||"99").localeCompare(b.start||"99")||(a.match_no||0)-(b.match_no||0));
 const options=rows.filter(r=>allowed(v,r,mode));const picked=options.filter(r=>chosen.includes(r.id));
 const ready=rows.filter(r=>allowed(v,r,"publish"));const needReview=rows.filter(r=>allowed(v,r,"review"));const preview=rows.filter(r=>allowed(v,r,"preview"));
 if(![...partialSports,"PT"].includes(v.sport)||!rows.length)return null;
 return <div className="mt-3 border-t border-blue-100 pt-3"><div className="flex flex-wrap gap-2 items-center">
 <button type="button" className={outline} disabled={disabled} onClick={()=>setOpen(x=>!x)}>{open?"ปิดรายละเอียดคู่":"จัดการรายคู่ / ดูข้อสังเกต"} ({rows.length})</button>
 <button type="button" className={blue} disabled={disabled||!ready.length} onClick={()=>void run(v,ready,"publish")}>เผยแพร่คู่ที่ผ่านเบื้องต้น ({ready.length})</button>
 <span className="text-xs text-slate-600">รอยืนยันข้อสังเกตที่ข้อมูลครบ {needReview.length} · รอกำหนดเวลาที่ยังไม่ประกาศ {preview.length}</span></div>
 {v.sport==="PT"&&<p className="mt-2 text-xs text-amber-800">เปตองยืนยันข้อสังเกต/ประกาศเบื้องต้นได้ แต่เผยแพร่จริงทั้งรุ่นเท่านั้นเพื่อรักษาการจัดสายและ BYE</p>}
 {open&&<div className="mt-3 rounded-xl border border-blue-100 bg-slate-50 p-3"><div className="flex flex-wrap gap-2 items-end"><label className="text-xs font-bold">การดำเนินการ<select className="mt-1 block rounded-lg border border-blue-200 bg-white p-2 text-sm" value={mode} disabled={disabled} onChange={e=>{setMode(e.target.value as PartialAction);setChosen([])}}>{(Object.keys(actionLabels) as PartialAction[]).filter(a=>a!=="publish"||v.sport!=="PT").filter(a=>a!=="review"||!!reviewedField[v.sport]).map(a=><option key={a} value={a}>{actionLabels[a]}</option>)}</select></label><button className={outline} disabled={disabled||!options.length} onClick={()=>setChosen(options.map(r=>r.id))}>เลือกคู่ที่ทำได้ ({options.length})</button><button className={outline} disabled={disabled||!chosen.length} onClick={()=>setChosen([])}>ล้าง</button><button className={blue} disabled={disabled||!picked.length} onClick={()=>void run(v,picked,mode)}>{actionLabels[mode]} ({picked.length})</button></div>
 <p className="my-2 text-xs text-slate-600">อ่านข้อสังเกตและตรวจเอกสารก่อนยืนยัน · การยืนยันไม่เติมวันเวลาให้เอง · คู่ที่ยังไม่พร้อมจะคงฉบับร่าง · เผยแพร่รายคู่แยกธุรกรรม · แสดงเบื้องต้นเป็นประกาศแยก ไม่ใช่ LIVE</p>
 <div className="max-h-[440px] overflow-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="sticky top-0 bg-blue-50"><tr>{["เลือก","คู่ / รอบ","คู่แข่งขัน","วัน / เวลา / สนาม","ข้อสังเกต / ความพร้อม"].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=>{const can=allowed(v,r,mode),issues=mode==="publish"?publishIssues(v,r):rowIssues(v,r),field=reviewedField[v.sport],note=noteField[v.sport];return <tr key={r.id} className="border-t border-slate-200 bg-white align-top"><td className="p-2"><input aria-label={`เลือกคู่ ${r.match_no}`} type="checkbox" checked={chosen.includes(r.id)&&can} disabled={disabled||!can} onChange={e=>setChosen(old=>e.target.checked?[...old,r.id]:old.filter(id=>id!==r.id))}/></td><td className="p-2 font-bold">{r.match_no} · {stageLabel[r.stage||""]||r.stage}</td><td className="p-2">{r.team1_name||"—"} พบ {r.team2_name||"—"}</td><td className="p-2">{thaiDate(r.date||"")} · {r.start?.slice(0,5)||"รอกำหนดเวลา"}<br/>{r.venue||"รอยืนยันสนาม"}</td><td className="p-2"><p className={issues.length?"text-amber-800":"text-emerald-700"}>{issues.join(" · ")||"ข้อมูลพื้นฐานครบ"}</p>{field&&<p>{r[field]===true?"ยืนยันแล้ว":"ยังไม่ยืนยัน"}</p>}{r.preliminary&&<p className="font-bold text-blue-800">ประกาศเบื้องต้นแล้ว</p>}{note&&r[note]&&<p className="mt-1 whitespace-pre-wrap text-amber-900">{String(r[note])}</p>}</td></tr>})}</tbody></table></div></div>}
 </div>;
}
export default function CentralPublishPage(){
  const [loading,setLoading]=useState(true), [authorized,setAuthorized]=useState(false), [error,setError]=useState("");
  const [views,setViews]=useState<View[]>([]), [filter,setFilter]=useState("all"), [statusFilter,setStatusFilter]=useState("draft");
  const [selected,setSelected]=useState<string[]>([]), [results,setResults]=useState<Result[]>([]), [busy,setBusy]=useState(false), [progress,setProgress]=useState("");
  const running=useRef(false);
  const load=useCallback(async()=>{
    setLoading(true);setError("");setSelected([]);setAuthorized(false);setViews([]);
    try{
      const auth=await supabase.auth.getUser();if(!auth.data.user)throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลการแข่งขัน");if(auth.error)throw auth.error;
      const c=await supabase.from("sports_competitions").select("id").eq("slug",SLUG).single();if(c.error)throw c.error;
      const comp=c.data.id;
      const role=await supabase.rpc("sports_stage3_admin",{p_comp:comp});if(role.error)throw role.error;if(role.data!==true)throw new Error("บัญชีนี้ไม่มีสิทธิ์เผยแพร่โปรแกรม");
      // Page in stable ID order; no silent truncation at Supabase's row cap.
      async function all(table:string, columns:string){
        const out:Record<string,unknown>[]=[];
        for(let offset=0;offset<20000;offset+=500){
          const r=await supabase.from(table).select(columns).eq("competition_id",comp).order("id").range(offset,offset+499);
          if(r.error)throw r.error;const batch=(r.data||[]) as unknown as Record<string,unknown>[];out.push(...batch);if(batch.length<500)return out;
        }
        throw new Error("ข้อมูลเกินขีดจำกัดการโหลด กรุณาตรวจสอบก่อนเผยแพร่");
      }
      const [ev,match,sessions,es,notice]=await Promise.all([
        all("sports_events","id,event_code,sport_name,status"),
        all("sports_football_matches","id,event_id,status,scheduled_date,start_time,venue_name,team1_name,team2_name,basketball_end_time,basketball_reviewed,volleyball_reviewed,takraw_reviewed,petanque_reviewed,petanque_bye,tt_reviewed,tt_end_time,tt_best_of,updated_at,match_no,stage,basketball_review_note,volleyball_review_note,takraw_review_note,petanque_review_note,tt_review_note"),
        all("sports_schedule_sessions","id,event_id,status,session_date,start_time,venue_name"),
        all("sports_esports_matches","id,event_id,stage,match_status,scheduled_date,start_time,venue_name"),
        supabase.rpc("sports_public_preliminary_matches")
      ]);
      if(notice.error)throw notice.error;const noticeIds=new Set(((notice.data||[]) as {id:string}[]).map(r=>r.id));
      const eRows=ev as unknown as EventRow[];
      const normalize=(r:Record<string,unknown>,kind:"match"|"session"|"es")=>({...r,status:kind==="es"?r.match_status:r.status,date:kind==="session"?r.session_date:r.scheduled_date,start:r.start_time,venue:r.venue_name}) as unknown as ScheduleRow;
      const mRows=match.map(r=>normalize({...r,preliminary:noticeIds.has(String(r.id))},"match")), sRows=sessions.map(r=>normalize(r,"session")), esRows=es.filter(r=>r.stage==="group").map(r=>normalize(r,"es"));
      const next=eRows.flatMap(e=>{const sport=sportOf(e.event_code);if(!sport)return [];const pool=sport==="AT"?sRows:sport==="ES"?esRows:sport==="BX"?[]:mRows;return [toView(e,sport,pool.filter(r=>r.event_id===e.id))];});
      next.sort((a,b)=>(a.first||"9999").localeCompare(b.first||"9999")||a.event.sport_name.localeCompare(b.event.sport_name,"th"));
      setViews(next);setAuthorized(true);
    }catch(e){setError(errText(e));}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const filtered=useMemo(()=>views.filter(v=>(filter==="all"||v.sport===filter)&&(statusFilter==="all"||v.drafts.length>0||v.sport==="BX")),[views,filter,statusFilter]);
  const ready=filtered.filter(v=>v.drafts.length>0&&v.issues.length===0);
  const selectedViews=views.filter(v=>selected.includes(v.event.id)&&v.drafts.length>0&&v.issues.length===0);
  const allDrafts=views.reduce((n,v)=>n+v.drafts.length,0);
  async function publish(list:View[]){
    if(running.current||loading||!authorized||!list.length)return;
    if(!(await sportsConfirm(`ยืนยันว่าตรวจเทียบโปรแกรมกับเอกสารต้นฉบับแล้ว และเผยแพร่ ${list.length} รายการ/รุ่น (${list.reduce((n,v)=>n+v.drafts.length,0)} คู่/ช่วง)?\n\nรายการที่ไม่ผ่านการตรวจของฐานข้อมูลจะไม่ถูกเผยแพร่ ระบบจะไม่เปลี่ยนสถานะรับสมัคร`)))return;
    running.current=true;setBusy(true);setResults([]);setError("");
    try{
      for(let i=0;i<list.length;i++){
        const v=list[i];setProgress(`${i+1}/${list.length} · ${v.event.sport_name}`);
        try{
          const r=await supabase.rpc("sports_central_publish_event",{p_event:v.event.id,p_draft_ids:v.drafts.map(d=>d.id)});
          if(r.error)throw r.error;if(Number(r.data)!==v.drafts.length)throw new Error("ผลตอบกลับไม่ตรงจำนวนที่เลือก กรุณารีเฟรชก่อนดำเนินการซ้ำ");
          setResults(prev=>[...prev,{id:v.event.id,title:v.event.sport_name,ok:true,message:`จัดการฉบับร่าง ${r.data} คู่/ช่วงสำเร็จ`}]);
        }catch(e){setResults(prev=>[...prev,{id:v.event.id,title:v.event.sport_name,ok:false,message:errText(e)}]);}
      }
    }finally{setProgress("");await load();setBusy(false);running.current=false;}
  }
  async function partial(v:View,rows:ScheduleRow[],action:PartialAction){
    if(running.current||loading||!authorized||!rows.length)return;
    const chosen=rows.filter(r=>allowed(v,r,action));if(chosen.length!==rows.length)return;
    if(!(await sportsConfirm(`${actionLabels[action]} ${v.event.sport_name} จำนวน ${rows.length} คู่?\nยืนยันว่าได้ตรวจเอกสารและข้อสังเกตทุกคู่ที่เลือกแล้ว\n${action==="preview"?"คู่จะปรากฏในหน้าประกาศเบื้องต้นสำหรับผู้ชม โดยยังไม่เผยแพร่ทางการ":action==="publish"?"ระบบตรวจซ้ำทีละคู่ คู่ที่ไม่ผ่านจะคงฉบับร่าง และคู่ที่ผ่านจะเผยแพร่ได้":"ไม่เปลี่ยนสถานะรับสมัครหรือข้อมูลนักกีฬา"}`)))return;
    running.current=true;setBusy(true);setError("");setResults([]);
    let total=0;
    try{
      if(action==="publish"){
        // Each RPC is its own transaction. Keep all database checks intact.
        // Continue only for explicit, match-specific validation failures.
        // Permission, network, global guards and unexpected errors stop the run.
        const ordered=[...chosen].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.start||"").localeCompare(b.start||"")||(a.match_no||0)-(b.match_no||0));
        const blocked:Result[]=[];
        for(let i=0;i<ordered.length;i++){
          const m=ordered[i];setProgress(`${v.event.sport_name} · ${i+1}/${ordered.length} · คู่ ${m.match_no??"?"}`);
          const r=await supabase.rpc("sports_central_partial_action",{p_event:v.event.id,p_rows:[{id:m.id,version:m.updated_at}],p_action:action});
          if(r.error){
            const msg=r.error.message;
            if(r.error.code==="P0001"&&/^คู่ที่ \d+ (เปลี่ยนแปลงแล้ว|ข้อมูลวัน|ยังไม่ได้ยืนยันข้อสังเกต|วันเวลาและสนามซ้อนกัน|ลำดับรอบไม่ถูกต้อง|ยังมีรอบก่อนหน้าที่ไม่กำหนดเวลา|เวลาไม่สอดคล้องกับคู่ต้นทาง\/ปลายทาง)/.test(msg)){
              blocked.push({id:m.id,title:`${v.event.sport_name} · คู่ ${m.match_no??"?"}`,ok:false,message:msg});
              setResults([...(total?[{id:v.event.id,title:v.event.sport_name,ok:true,message:`เผยแพร่แล้ว ${total} คู่`}]:[]),...blocked]);
              continue;
            }
            setResults([...(total?[{id:v.event.id,title:v.event.sport_name,ok:true,message:`เผยแพร่แล้ว ${total} คู่`}]:[]),...blocked]);
            throw new Error(`${msg} — หยุดที่คู่ ${m.match_no??"?"} กรุณาตรวจสอบและรีเฟรชก่อนทำต่อ`);
          }
          if(Number(r.data)!==1)throw new Error(`ผลตอบกลับคู่ ${m.match_no??"?"} ไม่ตรงจำนวน กรุณาตรวจสอบและรีเฟรชก่อนทำต่อ`);
          total++;
          setResults([{id:v.event.id,title:v.event.sport_name,ok:true,message:`เผยแพร่แล้ว ${total} คู่`},...blocked]);
        }
      }else{
        for(let i=0;i<rows.length;i+=100){const batch=rows.slice(i,i+100);setProgress(`${v.event.sport_name} · ${i+1}–${i+batch.length}/${rows.length}`);const r=await supabase.rpc("sports_central_partial_action",{p_event:v.event.id,p_rows:batch.map(m=>({id:m.id,version:m.updated_at})),p_action:action});if(r.error)throw new Error(r.error.message);if(Number(r.data)!==batch.length)throw new Error("ผลตอบกลับไม่ตรงจำนวน กรุณารีเฟรชก่อนทำต่อ");total+=Number(r.data);}
        setResults([{id:v.event.id,title:v.event.sport_name,ok:true,message:`${actionLabels[action]} ${total} คู่สำเร็จ`}]);
      }
    }catch(e){setResults(prev=>[...prev,{id:`${v.event.id}-stop`,title:v.event.sport_name,ok:false,message:`${errText(e)} (ยืนยันสำเร็จก่อนหน้า ${total} คู่)`}]);}finally{setProgress("");await load();setBusy(false);running.current=false;}
  }
  const disabled=busy||loading||!authorized;
  return <main className="min-h-screen bg-[#eaf5ed] text-[#0b174b] pb-12">
    <header className="bg-gradient-to-r from-[#07123d] via-[#124bd3] to-[#078de9] px-5 py-5 text-white border-b-4 border-yellow-300"><div className="mx-auto max-w-[1500px]"><Link href="/group-sports" className="text-sm font-bold text-blue-100">← กลับหน้าหลักกีฬากลุ่ม</Link><p className="mt-3 text-xs font-black tracking-widest text-yellow-200">PHULANGKA GAMES 2026 · ADMIN</p><h1 className="mt-1 text-2xl font-black">ศูนย์เผยแพร่โปรแกรมการแข่งขัน</h1><p className="mt-1 text-sm text-blue-100">เผยแพร่เป็นรายรุ่นหรือรายคู่ · ไม่เปลี่ยนสถานะรับสมัครนักกีฬา</p></div></header>
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {loading&&<div className={panel} role="status">กำลังตรวจสิทธิ์และโหลดโปรแกรมล่าสุด…</div>}
      {!loading&&!authorized&&<div className={panel}><Link href="/group-sports/login" className={blue}>เข้าสู่ระบบ</Link><button className={`${outline} ml-2`} onClick={()=>void load()}>ตรวจสอบอีกครั้ง</button></div>}
      {authorized&&<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["ฉบับร่างที่โหลด",allDrafts],["เผยแพร่/กำหนดแล้ว/จบ",views.reduce((n,v)=>n+v.published,0)],["รุ่นผ่านตรวจเบื้องต้น",views.filter(v=>v.drafts.length&&!v.issues.length).length],["รุ่นเปิดรับสมัคร",views.filter(v=>v.event.status==="registration").length]].map(([label,n])=><div key={label} className={panel}><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{n}</p></div>)}</div>
        <section className={panel}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">รักษาสถานะรับสมัครเดิม · ไม่เปิด/ปิดรับสมัคร · ไม่ล็อกรายชื่อกรีฑา · ไม่จัดสายมวยอัตโนมัติ · <Link href="/group-sports/preliminary" className="font-bold underline">เปิดโปรแกรมเบื้องต้นสำหรับผู้ชม ↗</Link></div>
          <p className="my-3 text-xs text-slate-600">ตรวจเบื้องต้นจากวัน เวลา สนาม จำนวนคู่และการยืนยันข้อสังเกตตามกีฬา การเผยแพร่จริงยังต้องผ่านเงื่อนไขฐานข้อมูลเดิม โปรดตรวจเอกสารต้นฉบับก่อนยืนยัน · RoV เฉพาะรอบแบ่งกลุ่ม · กรีฑาเฉพาะโปรแกรม</p>
          <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold">ประเภทกีฬา<select disabled={disabled} value={filter} onChange={e=>{setFilter(e.target.value);setSelected([]);}} className="mt-1 block w-full rounded-xl border border-blue-200 bg-white p-2.5 text-sm"><option value="all">ทุกประเภทกีฬา</option>{SPORTS.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs font-bold">สถานะโปรแกรม<select disabled={disabled} value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setSelected([]);}} className="mt-1 block w-full rounded-xl border border-blue-200 bg-white p-2.5 text-sm"><option value="draft">ฉบับร่าง / มวยสากล</option><option value="all">ทุกสถานะ</option></select></label><div className="flex items-end"><button disabled={disabled} onClick={()=>void load()} className={outline}>รีเฟรชข้อมูล</button></div></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><button disabled={disabled||!ready.length} className={outline} onClick={()=>setSelected(ready.map(v=>v.event.id))}>เลือกทั้งหมดที่ผ่านเบื้องต้น ({ready.length})</button><button disabled={disabled||!selected.length} className={outline} onClick={()=>setSelected([])}>ล้างที่เลือก</button><button disabled={disabled||!selectedViews.length} className={blue} onClick={()=>void publish(selectedViews)}>ตรวจสอบและเผยแพร่ที่เลือก ({selectedViews.length})</button><span className="text-xs text-slate-600">{selectedViews.reduce((n,v)=>n+v.drafts.length,0)} คู่/ช่วง</span></div>
          {busy&&<div role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-bold text-blue-900">กำลังดำเนินการ {progress||"โหลดผลล่าสุด"} — กรุณาอย่าปิดหน้านี้</div>}
          <div className="mt-4 space-y-2">{filtered.map(v=>{const meta=SPORTS.find(([key])=>key===v.sport)!;const eligible=!!v.drafts.length&&!v.issues.length;return <article key={v.event.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-start gap-3"><input type="checkbox" aria-label={`เลือก ${v.event.sport_name}`} className="mt-1 h-4 w-4" disabled={disabled||!eligible} checked={selected.includes(v.event.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,v.event.id]:old.filter(id=>id!==v.event.id))}/><div className="min-w-[220px] flex-1"><h2 className="font-black">{v.event.sport_name}</h2><p className="mt-1 text-xs text-slate-600">{v.event.event_code} · {thaiDate(v.first)} · <span className={v.event.status==="registration"?"font-bold text-emerald-700":""}>{statusText[v.event.status]||v.event.status}</span></p><p className="mt-1 text-xs">{v.sport==="BX"?"ใช้หน้าเฉพาะกีฬา":`ฉบับร่าง ${v.drafts.length} · เผยแพร่/กำหนดแล้ว/จบ ${v.published}`}</p>{v.issues.length>0&&<p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">{v.issues.join(" · ")}</p>}{eligible&&<p className="mt-1 text-xs font-bold text-emerald-700">ผ่านการตรวจเบื้องต้น · รอตรวจจริงก่อนเผยแพร่</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/group-sports/${meta[2]}${v.event.event_code?`?code=${encodeURIComponent(v.event.event_code)}`:""}`} className={outline}>ตรวจในหน้ากีฬา ↗</Link>{v.sport!=="BX"&&<button disabled={disabled||!eligible} onClick={()=>void publish([v])} className={blue}>เผยแพร่รุ่นนี้</button>}</div></div><PartialPanel v={v} disabled={disabled} run={partial}/></article>;})}{!filtered.length&&<p className="p-4 text-center text-sm text-slate-500">ไม่พบรายการตามตัวกรอง</p>}</div>
        </section>
      </>}
      {results.length>0&&<section className={panel}><h2 className="font-black">ผลดำเนินการ: สำเร็จ {results.filter(r=>r.ok).length} · ต้องตรวจสอบ {results.filter(r=>!r.ok).length}</h2><p className="mt-1 text-xs text-slate-600">เผยแพร่รายคู่หรือรายรุ่นตามที่เลือก · รายการที่ไม่ผ่านจะคงฉบับร่าง · รายการที่สำเร็จแล้วจะยังคงเผยแพร่อยู่</p>{results.map(r=><div key={r.id} className={`mt-2 rounded-lg p-3 text-sm ${r.ok?"bg-emerald-50 text-emerald-900":"bg-rose-50 text-rose-900"}`}><b>{r.ok?"สำเร็จ":"ตรวจสอบ"} · {r.title}</b><p>{r.message}</p></div>)}</section>}
    </div>
  </main>;
}
