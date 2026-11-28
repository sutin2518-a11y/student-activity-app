"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";
import type { CertificateContext, CertificateEvent, CertificatePlacement } from "@/lib/group-sports/certificates";

type Label=CertificatePlacement & {school:string;entry_name:string};
type Receipt={consistent:boolean;placements:number;ranks:number;medals:number;certificates:number;published_at:string};
type Fixture={id:string;match_no:number;stage:string;team1:string;team2:string;status:string;score1:number|null;score2:number|null;penalty1:number|null;penalty2:number|null;updated_at:string;date:string|null;time:string|null};
type Preview={event_id:string;total:number;done:number;status:string;placements:CertificatePlacement[];labels:Label[];receipt:Receipt|null;can_record:boolean;referee:boolean;rov_access:boolean;football:Fixture[]};
const panel="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const primary="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0755ce] px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
const secondary="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-900 disabled:opacity-40";
const input="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900";
const sports:Record<string,string>={FB:"football",FS:"futsal",BB:"basketball",VB:"volleyball",ST:"takraw",PT:"petanque",TT:"table-tennis",BX:"boxing",AT:"athletics",ES:"esports"};
const sportOptions=[
 {key:"FB",name:"ฟุตบอล",icon:"⚽"},{key:"FS",name:"ฟุตซอล",icon:"⚽"},{key:"BB",name:"บาสเกตบอล",icon:"🏀"},
 {key:"VB",name:"วอลเลย์บอล",icon:"🏐"},{key:"ST",name:"เซปักตะกร้อ",icon:"🏐"},{key:"PT",name:"เปตอง",icon:"🎯"},
 {key:"TT",name:"เทเบิลเทนนิส",icon:"🏓"},{key:"BX",name:"มวยสากล",icon:"🥊"},{key:"AT",name:"กรีฑา",icon:"🏃"},{key:"ES",name:"E-Sport (RoV)",icon:"🎮"},
 {key:"OTHER",name:"รายการอื่น",icon:"🏅"}
];
function sportKey(e:CertificateEvent){const key=(e.event_code||"").split("-")[1];return Object.prototype.hasOwnProperty.call(sports,key)?key:"OTHER";}
const statusLabel:Record<string,string>={ready:"พร้อมยืนยันอันดับ",published:"ประกาศผลแล้ว",incomplete:"ผลยังไม่ครบ",ambiguous:"ต้องตรวจสอบอันดับ / ใบสมัคร",manual:"ต้องตรวจสอบกติกาเฉพาะรายการ",no_permission:"ยังไม่ได้รับสิทธิ์ประกาศ"};
function errorText(e:unknown){return e&&typeof e==="object"&&"message" in e?String(e.message):String(e);}
function sportHref(e:CertificateEvent){const key=(e.event_code||"").split("-")[1];return sports[key]?`/group-sports/${sports[key]}?code=${encodeURIComponent(e.event_code||"")}${key==="ES"?"&tab=matches":""}`:null;}

export default function UnifiedRefereeCenter(){
 const [context,setContext]=useState<CertificateContext|null>(null),[assigned,setAssigned]=useState<string[]>([]),[email,setEmail]=useState("");
 const [selected,setSelected]=useState(""),[sport,setSport]=useState(""),[filter,setFilter]=useState(""),[preview,setPreview]=useState<Preview|null>(null);
 const [loading,setLoading]=useState(true),[checking,setChecking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [edit,setEdit]=useState<Fixture|null>(null),[scores,setScores]=useState(["","","",""]);
 const [target,setTarget]=useState(""),[batch,setBatch]=useState<string[]>([]),[batchSearch,setBatchSearch]=useState("");
 const active=useRef(true),request=useRef(0),mutation=useRef(false);
 const loadContext=useCallback(async()=>{
  const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับมอบหมาย");
  const [c,r]=await Promise.all([supabase.rpc("sports_cert_context"),supabase.rpc("sports_event_referee_my_events")]);
  if(c.error||r.error)throw c.error||r.error;
  const ctx=c.data as CertificateContext;
  if(ctx.role!=="admin"&&ctx.role!=="official")throw new Error("หน้านี้สำหรับกรรมการกีฬาและแม่แอดมินเท่านั้น");
  if(!active.current)return;
  setContext(ctx);setAssigned(((r.data||[]) as {id:string}[]).map(x=>x.id));setEmail(auth.data.user.email||"");
  const requested=new URLSearchParams(window.location.search).get("event");
  const initial=ctx.events.find(e=>e.id===requested)||ctx.events[0];
  setSelected(old=>ctx.events.some(e=>e.id===old)?old:initial?.id||"");
  setSport(old=>ctx.events.some(e=>sportKey(e)===old)?old:initial?sportKey(initial):"");
 },[]);
 const loadPreview=useCallback(async(id:string)=>{
  const seq=++request.current;setChecking(true);setPreview(null);setEdit(null);setError("");
  try{const r=await supabase.rpc("sports_unified_preview_v1",{p_event:id});if(r.error)throw r.error;if(active.current&&seq===request.current)setPreview(r.data as Preview);}
  catch(e){if(active.current&&seq===request.current)setError(errorText(e));}
  finally{if(active.current&&seq===request.current)setChecking(false);}
 },[]);
 useEffect(()=>{active.current=true;void loadContext().catch(e=>{if(active.current)setError(errorText(e));}).finally(()=>{if(active.current)setLoading(false);});return()=>{active.current=false;request.current++;};},[loadContext]);
 useEffect(()=>{if(selected)void loadPreview(selected);return()=>{request.current++;};},[selected,loadPreview]);
 const event=context?.events.find(e=>e.id===selected),current=preview?.event_id===selected?preview:null;
 const isFootball=event?.event_code?.startsWith("GS3-FB-"),isRov=event?.event_code?.startsWith("GS3-ES-");
 const mayScore=!!event&&(context?.role==="admin"||assigned.includes(event.id)||(isRov&&current?.rov_access===true));
 const allEvents=context?.events||[];
 const groups=sportOptions.map(s=>({...s,count:allEvents.filter(e=>sportKey(e)===s.key).length})).filter(s=>s.count>0);
 const events=allEvents.filter(e=>sportKey(e)===sport&&`${e.sport_name} ${e.event_code}`.toLowerCase().includes(filter.toLowerCase().trim()));
 function chooseSport(key:string){if(busy||mutation.current)return;setSport(key);setFilter("");setSelected(allEvents.find(e=>sportKey(e)===key)?.id||"");setNotice("");setError("");setEdit(null);}
 const publishedCount=allEvents.filter(e=>e.result_status==="published").length;
 const recordCount=allEvents.filter(e=>e.can_record).length;
 const batchEvents=(context?.events||[]).filter(e=>`${e.sport_name} ${e.event_code}`.toLowerCase().includes(batchSearch.toLowerCase().trim()));
 async function finalize(){
  if(mutation.current||!event||!current||current.status!=="ready"||!current.can_record)return;
  mutation.current=true;setBusy(true);setError("");setNotice("");
  try{if(!await sportsConfirm(`ยืนยันผลอันดับรางวัล ${event.sport_name}\nระบบจะประกาศอันดับ อัปเดตเหรียญ และออกเกียรติบัตรทันที กรุณาตรวจสอบความถูกต้องก่อนยืนยัน`))return;
   const r=await supabase.rpc("sports_unified_finalize_v1",{p_event:event.id,p_expected:current.placements});if(r.error)throw r.error;
   const receipt=r.data as Receipt;if(!receipt?.consistent)throw new Error("ยังไม่ยืนยันความสอดคล้อง กรุณาโหลดสถานะใหม่");
   setNotice(`ประกาศผลสำเร็จ · ${receipt.medals} เหรียญ · ${receipt.certificates} เกียรติบัตร`);await loadContext();await loadPreview(event.id);
  }catch(e){setError(errorText(e));}finally{mutation.current=false;setBusy(false);}
 }
 async function saveFootball(e:FormEvent){e.preventDefault();if(mutation.current||!event||!edit||!current?.referee)return;
  const [a,b,p,q]=scores;const valid=(v:string)=>/^\d{1,2}$/.test(v);if(!valid(a)||!valid(b)||(Number(a)===Number(b)&&(!valid(p)||!valid(q)||Number(p)===Number(q)))){setError("กรอกคะแนนและผลจุดโทษให้ถูกต้อง");return;}
  mutation.current=true;setBusy(true);setNotice("");setError("");
  try{if(!await sportsConfirm(`ยืนยันผลคู่ที่ ${edit.match_no}: ${edit.team1} ${a} – ${b} ${edit.team2}${Number(a)===Number(b)?` (จุดโทษ ${p} – ${q})`:""}\nเมื่อบันทึกแล้ว กรรมการแก้ไขซ้ำไม่ได้`))return;
   const r=await supabase.rpc("sports_unified_football_score_v1",{p_match:edit.id,p_expected:edit.updated_at,p_score1:Number(a),p_score2:Number(b),p_penalty1:Number(a)===Number(b)?Number(p):null,p_penalty2:Number(a)===Number(b)?Number(q):null});if(r.error)throw r.error;
   setNotice("บันทึกผลฟุตบอลสำเร็จ");await loadPreview(event.id);
  }catch(e){setError(errorText(e));}finally{mutation.current=false;setBusy(false);}
 }
 async function assign(enable:boolean){if(mutation.current||context?.role!=="admin"||!batch.length||!target.trim())return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.trim())){setError("ระบุอีเมล Google ให้ถูกต้อง");return;}
  mutation.current=true;setBusy(true);setError("");setNotice("");try{if(!await sportsConfirm(`${enable?"มอบหมาย":"ระงับ"}สิทธิ์กรรมการ ${target.trim()} จำนวน ${batch.length} รายการ?`))return;
   const r=await supabase.rpc("sports_unified_assign_v1",{p_events:batch,p_email:target.trim().toLowerCase(),p_active:enable});if(r.error)throw r.error;
   setNotice(`ปรับสิทธิ์กรรมการสำเร็จ ${r.data} รายการ`);setBatch([]);await loadContext();if(selected)await loadPreview(selected);
  }catch(e){setError(errorText(e));}finally{mutation.current=false;setBusy(false);}
 }
 return <main className="min-h-screen bg-[#eaf5ed] p-3 text-slate-900 sm:p-6"><div className="mx-auto max-w-6xl space-y-4">
  <header className="rounded-2xl bg-gradient-to-r from-[#07123d] to-[#0755ce] p-5 text-white sm:p-7"><Link href="/group-sports" className="text-sm font-bold underline">← กลับหน้าหลัก</Link><p className="mt-3 text-xs font-bold tracking-wider text-amber-200">PHULANGKA GAMES 2026</p><h1 className="text-2xl font-black sm:text-3xl">ศูนย์ปฏิบัติงานกรรมการกีฬา</h1><p className="mt-2 text-sm text-blue-100">บันทึกผลรายคู่ · ยืนยันอันดับครั้งเดียว · เหรียญและเกียรติบัตร</p>{email&&<p className="mt-2 text-xs text-white">{email}</p>}</header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{notice}</div>}
  {loading?<div className={panel}>กำลังตรวจสอบสิทธิ์...</div>:!context?<div className={panel}><Link href="/login" className={primary}>เข้าสู่ระบบ Google</Link></div>:<>
   <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[[allEvents.length,"รายการที่เข้าถึงได้"],[publishedCount,"ประกาศผลแล้ว"],[allEvents.length-publishedCount,"ยังไม่ประกาศผล"],[recordCount,"ได้รับสิทธิ์ประกาศ"]].map(([v,l])=><div key={l} className={panel}><p className="text-xs font-bold text-slate-600">{l}</p><strong className="text-3xl text-blue-900">{v}</strong></div>)}</section>
   {context.role==="admin"&&<details className={panel}><summary className="cursor-pointer font-bold text-blue-900">มอบหมายกรรมการหลายรายการพร้อมกัน</summary><div className="mt-3 space-y-3"><label className="block text-sm font-bold">อีเมลกรรมการ<input disabled={busy} type="email" className={input} value={target} onChange={e=>setTarget(e.target.value)}/></label><input className={input} placeholder="ค้นหากีฬา / รุ่น" value={batchSearch} onChange={e=>setBatchSearch(e.target.value)} disabled={busy}/><button className={secondary} disabled={busy} onClick={()=>setBatch(old=>Array.from(new Set([...old,...batchEvents.map(e=>e.id)])))}>เลือกทั้งหมดที่ค้นพบ</button> <button className={secondary} disabled={busy} onClick={()=>setBatch([])}>ล้างที่เลือก</button><div className="max-h-64 space-y-2 overflow-auto rounded-xl border p-3">{batchEvents.map(e=><label key={e.id} className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={batch.includes(e.id)} onChange={v=>setBatch(old=>v.target.checked?[...old,e.id]:old.filter(id=>id!==e.id))}/>{e.sport_name}</label>)}</div><p>เลือก {batch.length} รายการ</p><div className="flex flex-wrap gap-2"><button className={primary} disabled={busy||!batch.length||!target.trim()} onClick={()=>void assign(true)}>มอบหมาย</button><button className={secondary} disabled={busy||!batch.length||!target.trim()} onClick={()=>void assign(false)}>ระงับสิทธิ์ที่เลือก</button><Link href="/group-sports/officials" className={secondary}>ตรวจรายชื่อกรรมการเดิม</Link></div><p className="text-xs text-amber-900">มอบหมายเฉพาะทะเบียนกรรมการประจำรายการ ไม่ให้สิทธิ์แม่แอดมินหรือ RoV อัตโนมัติ · กรีฑายังต้องกำหนดหน้าที่สนาม/รายงานตัวตามระบบเดิม</p></div></details>}
   <section className={panel}><h2 className="text-lg font-black text-blue-950">1. เลือกประเภทกีฬาและรุ่น</h2><p className="mt-1 text-sm text-slate-600">แสดงเฉพาะรายการที่บัญชีนี้เข้าถึงได้ · รหัสรายการกำกับเพื่อป้องกันเลือกรุ่นผิด</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{groups.map(g=><button type="button" key={g.key} aria-pressed={sport===g.key} disabled={busy} onClick={()=>chooseSport(g.key)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm font-bold ${sport===g.key?"border-blue-700 bg-[#0755ce] !text-white":"border-blue-100 bg-blue-50 !text-blue-950 hover:bg-blue-100"}`}><span className="text-2xl" aria-hidden="true">{g.icon}</span>{g.name}<span className="text-xs font-normal">{g.count} รายการ</span></button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><input className={input} disabled={busy} placeholder="ค้นหากีฬา / รุ่น / รหัส" value={filter} onChange={e=>setFilter(e.target.value)}/><select className={input} disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setNotice("");}}>{event&&!events.some(e=>e.id===selected)&&<option value={selected}>{event.sport_name}</option>}{events.map(e=><option key={e.id} value={e.id}>{e.sport_name} · {e.event_code||"ไม่ระบุรหัส"} {e.result_status==="published"?" · ประกาศแล้ว":""}</option>)}</select></div>{!events.length&&<p className="mt-3 text-sm text-slate-600">ไม่พบรุ่นตามคำค้น</p>}{!event&&<p className="mt-3">ยังไม่มีรายการที่ได้รับมอบหมาย</p>}{event&&<div className="mt-3 flex flex-wrap gap-2"><button className={secondary} disabled={busy||checking} onClick={()=>void loadPreview(event.id)}>โหลดผลล่าสุด</button>{mayScore&&sportHref(event)&&(!isFootball||context.role==="admin")&&(!isRov||current?.rov_access)&&<Link prefetch={false} target="_blank" rel="noopener noreferrer" className={primary} href={sportHref(event)!}>2. เปิดหน้าบันทึกผลกีฬา ↗</Link>}{context.role==="admin"&&<Link className={secondary} href={`/group-sports/certificates/manage?event=${encodeURIComponent(event.id)}`}>ตรวจสอบข้อมูลรางวัลเดิม (Admin)</Link>}</div>}
   {event&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">ขั้นตอน: เปิดหน้ากีฬาในแท็บใหม่เพื่อบันทึกผล → กลับมาที่แท็บนี้และกดโหลดผลล่าสุด → ยืนยันอันดับ → ตรวจสอบเหรียญและเกียรติบัตร{isFootball&&current?.referee?" · ฟุตบอลสามารถบันทึกผลรายคู่ด้านล่างได้ด้วย":""}</div>}
   {isRov&&current&&!current.rov_access&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">บัญชีนี้ยังไม่มีสิทธิ์บันทึกคะแนน RoV ในระบบเดิม ติดต่อผู้ดูแลเพื่อมอบหมายสิทธิ์ RoV โดยเฉพาะ</p>}
   </section>
   {checking&&<div className={panel}>กำลังอ่านผลจากรายการที่เลือก...</div>}
   {current&&event&&<><section className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-blue-950">3. ตรวจสอบและยืนยันอันดับ · {event.sport_name} <span className="text-xs font-normal text-slate-600">{event.event_code}</span></h2><span className={`rounded-full px-3 py-1 text-sm font-bold ${current.status==="ready"||current.status==="published"?"bg-emerald-100 text-emerald-900":"bg-amber-100 text-amber-900"}`}>{statusLabel[current.status]||"ตรวจสอบข้อมูล"}</span></div>{current.total>0&&<><p className="mt-3 text-sm">ผลที่เสร็จแล้ว {current.done} / {current.total} {event.event_code?.startsWith("GS3-AT-")?"ช่วง":"คู่"}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-600" style={{width:`${Math.min(100,100*current.done/current.total)}%`}}/></div></>}
   {current.status==="ready"&&<div className="mt-4 space-y-3"><h3 className="font-bold">อันดับที่ระบบดึงจากผลการแข่งขัน</h3>{current.labels.map(p=><div key={`${p.rank}-${p.slot}`} className="rounded-xl border border-blue-100 bg-blue-50 p-3"><b>{p.rank===1?"🥇 ชนะเลิศ":p.rank===2?"🥈 รองชนะเลิศอันดับ 1":"🥉 รองชนะเลิศอันดับ 2"}{p.slot===2?" ร่วม":""}</b><p>{p.school}</p><p className="text-xs text-slate-600">{p.entry_name}</p></div>)}<button className={primary} disabled={busy||!current.can_record||current.labels.length===0} onClick={()=>void finalize()}>{busy?"กำลังดำเนินการ...":"ยืนยันผลและออกเกียรติบัตร"}</button><p className="text-xs text-slate-600">ระบบตรวจอันดับจากฐานข้อมูลซ้ำก่อนประกาศ ไม่ต้องกรอกอันดับใหม่</p></div>}
   {current.status==="published"&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-bold text-emerald-900">{current.receipt?.consistent?"ผลอันดับ เหรียญ และเกียรติบัตรสอดคล้องกัน":"ต้องตรวจสอบความสอดคล้องกับผู้ดูแล"}</h3>{current.receipt&&<div className="mt-2 grid grid-cols-3 gap-2 text-center"><div><strong>{current.receipt.ranks}</strong><p className="text-xs">อันดับ</p></div><div><strong>{current.receipt.medals}</strong><p className="text-xs">เหรียญ</p></div><div><strong>{current.receipt.certificates}</strong><p className="text-xs">เกียรติบัตร</p></div></div>}<p className="mt-2 text-sm">ไม่สามารถประกาศซ้ำผ่านศูนย์นี้ หากผิดพลาดให้ผู้ดูแลตรวจสอบ</p>{context.role==="admin"&&<Link className={secondary} href="/group-sports/results/corrections">แก้ไขผลหลังประกาศ</Link>}</div>}
   {!["ready","published"].includes(current.status)&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{current.status==="no_permission"?(context.role==="admin"?"บัญชีผู้ดูแลตรวจสอบรายการได้ทั้งหมด แต่การประกาศอันดับต้องได้รับมอบหมายเป็นกรรมการรายการนั้นโดยตรงตามสิทธิ์เดิม":"บัญชีนี้ยังไม่ได้รับมอบหมายสิทธิ์ประกาศอันดับในรายการนี้"):current.status==="incomplete"?"บันทึกผลให้ครบและตรวจสอบโปรแกรมก่อนประกาศ": "ระบบยังไม่สามารถยืนยันอันดับอัตโนมัติได้ เช่น ผลเสมอ ชื่อทีมไม่ตรงใบสมัคร หรือกติกาพิเศษ โปรดให้ผู้จัดตรวจสอบ ไม่เดาอันดับ"}</p>}
   </section>
   {isFootball&&current.referee&&<section className={panel}><h2 className="font-black text-blue-950">บันทึกผลฟุตบอลรายคู่</h2><p className="mt-2 text-sm text-slate-600">บันทึกเฉพาะคู่ที่เผยแพร่และระบุทีมจริงแล้ว หากต้องจัดทีมเข้ารอบหรือแก้ผล ให้ผู้จัดดำเนินการในหน้าฟุตบอลเดิม</p>{current.football.map(m=><div key={m.id} className="mt-3 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-slate-600">คู่ {m.match_no} · {m.date||"รอวัน"} {m.time?.slice(0,5)}</p><b>{m.team1} — {m.team2}</b>{m.status==="completed"&&<p>{m.score1} : {m.score2}{m.penalty1!=null?` (จุดโทษ ${m.penalty1}:${m.penalty2})`:""}</p>}</div>{m.status==="published"&&current.status!=="published"&&<button className={primary} disabled={busy} onClick={()=>{setEdit(m);setScores(["","","",""]);}}>บันทึกผล</button>}</div>{edit?.id===m.id&&<form className="mt-3 space-y-3" onSubmit={saveFootball}><div className="grid grid-cols-2 gap-2">{[0,1].map(i=><label key={i} className="text-sm font-bold">{i===0?m.team1:m.team2}<input required type="number" min="0" max="99" className={input} value={scores[i]} disabled={busy} onChange={e=>setScores(old=>old.map((v,j)=>j===i?e.target.value:v))}/></label>)}</div>{scores[0]!==""&&scores[1]!==""&&Number(scores[0])===Number(scores[1])&&<div className="grid grid-cols-2 gap-2">{[2,3].map(i=><label key={i} className="text-sm font-bold">จุดโทษ {i===2?m.team1:m.team2}<input required type="number" min="0" max="99" className={input} value={scores[i]} disabled={busy} onChange={e=>setScores(old=>old.map((v,j)=>j===i?e.target.value:v))}/></label>)}</div>}<button type="submit" disabled={busy} className={primary}>ยืนยันบันทึกผล</button> <button type="button" disabled={busy} className={secondary} onClick={()=>setEdit(null)}>ยกเลิก</button></form>}</div>)}{!current.football.length&&<p className="mt-3">ยังไม่มีคู่ที่เผยแพร่</p>}</section>}
   </>}
  </>}
 </div></main>;
}
