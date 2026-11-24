"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { certificateAward, certificateNumber, type CertificateDocument } from "@/lib/group-sports/certificates";
import CertificatePrintSheets from "./CertificatePrintSheets";

type Event = {id:string; sport_name:string; event_code:string|null};
type Context = {admin:boolean; events:Event[]};
type Official = {email:string; is_active:boolean};
const field="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const button="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40";
const primary="rounded-xl bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
function errorText(e:unknown) {
  if(e && typeof e === "object" && "message" in e) return String(e.message);
  return "ดำเนินการไม่สำเร็จ";
}
export default function CentralCertificatePrint() {
  const [context,setContext]=useState<Context|null>(null);
  const [eventId,setEventId]=useState("");
  const [docs,setDocs]=useState<CertificateDocument[]>([]);
  const [printing,setPrinting]=useState<CertificateDocument[]>([]);
  const [selected,setSelected]=useState<number[]>([]);
  const [school,setSchool]=useState("");
  const [kind,setKind]=useState("");
  const [person,setPerson]=useState("");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [email,setEmail]=useState("");
  const [officials,setOfficials]=useState<Official[]>([]);
  const [reload,setReload]=useState(0);
  const [readyEvent,setReadyEvent]=useState("");
  useEffect(()=>{
    let alive=true;
    async function init(){
      const auth=await supabase.auth.getUser();
      if(auth.error||!auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับมอบหมาย");
      const res=await supabase.rpc("sports_central_cert_context");
      if(res.error) throw res.error;
      const data=res.data as Context;
      if(!alive)return;
      setContext(data);setEventId(data.events[0]?.id||"");
      if(data.admin){const r=await supabase.rpc("sports_central_cert_roster");if(r.error)throw r.error;if(alive)setOfficials(r.data||[]);}
    }
    void init().catch(e=>{if(alive)setError(errorText(e));}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(!context||!eventId)return;
    let alive=true;
    setReadyEvent("");setDocs([]);setSelected([]);setPrinting([]);setSchool("");setError("");
    void (async()=>{
      const r=await supabase.rpc("sports_central_cert_documents",{p_event:eventId});
      if(r.error)throw r.error;
      if(alive){setDocs(r.data||[]);setReadyEvent(eventId);}
    })().catch(e=>{if(alive)setError(errorText(e));});
    return()=>{alive=false;};
  },[context,eventId,reload]);
  const schools=useMemo(()=>Array.from(new Set(docs.map(d=>d.school_name))).sort((a,b)=>a.localeCompare(b,"th")),[docs]);
  const filtered=useMemo(()=>docs.filter(d=>(!school||d.school_name===school)&&(!kind||d.kind===kind)&&(!person||d.recipient_type===person)&&`${d.recipient_name} ${certificateNumber(d.id)}`.toLowerCase().includes(query.trim().toLowerCase())),[docs,school,kind,person,query]);
  const chosen=filtered.filter(d=>selected.includes(d.id));
  async function print(){
    if(busy||readyEvent!==eventId||!chosen.length)return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await supabase.rpc("sports_central_cert_documents",{p_event:eventId});
      if(r.error)throw r.error;
      const fresh=(r.data||[]) as CertificateDocument[];
      const ids=new Set(chosen.map(d=>d.id));
      const valid=fresh.filter(d=>ids.has(d.id));
      setDocs(fresh);
      if(valid.length!==chosen.length){setPrinting([]);setSelected(valid.map(d=>d.id));throw new Error("มีเอกสารที่ถูกเพิกถอนหรือเปลี่ยนแปลง กรุณาตรวจสอบรายการก่อนพิมพ์อีกครั้ง");}
      setPrinting(valid);
      window.setTimeout(()=>{window.print();setPrinting([]);setBusy(false);},1100);
    }catch(e){setPrinting([]);setError(errorText(e));setBusy(false);}
  }
  async function assign(target:string,active:boolean){
    if(!context?.admin||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await supabase.rpc("sports_central_cert_assign",{p_email:target,p_active:active});if(r.error)throw r.error;
      const roster=await supabase.rpc("sports_central_cert_roster");if(roster.error)throw roster.error;
      setOfficials(roster.data||[]);setEmail("");setNotice(active?"มอบหมายสิทธิ์พิมพ์ส่วนกลางแล้ว":"ระงับสิทธิ์แล้ว");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  function submit(e:FormEvent){e.preventDefault();void assign(email,true);}
  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <div className="print:hidden mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="rounded-2xl bg-gradient-to-r from-blue-950 to-blue-700 p-5 text-white">
        <div className="flex flex-wrap justify-between gap-3 text-sm"><Link href="/group-sports" className="underline">กลับหน้ากีฬากลุ่ม</Link><button disabled={busy} onClick={async()=>{await supabase.auth.signOut();window.location.assign('/login');}} className="underline">ออกจากระบบ</button></div>
        <h1 className="mt-3 text-2xl font-black">พิมพ์เกียรติบัตรส่วนกลาง</h1><p className="mt-1 text-sm text-white/85">สำหรับกรรมการส่วนกลาง · พิมพ์เอกสารที่ออกแล้วของทุกโรงเรียน</p>
      </header>
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {notice&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {loading&&<p className="rounded-xl bg-white p-4">กำลังตรวจสอบสิทธิ์...</p>}
      {!loading&&!context&&<Link href="/login" className={primary}>เข้าสู่ระบบ Google</Link>}
      {context&&<>
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-bold">รายการแข่งขัน<select className={field} value={eventId} disabled={busy} onChange={e=>setEventId(e.target.value)}><option value="" disabled>เลือกรายการ</option>{context.events.map(e=><option key={e.id} value={e.id}>{e.sport_name} {e.event_code||""}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold">โรงเรียน<select className={field} value={school} disabled={busy} onChange={e=>setSchool(e.target.value)}><option value="">ทุกโรงเรียน</option>{schools.map(s=><option key={s}>{s}</option>)}</select></label>
            <label className="text-sm font-bold">ประเภทเกียรติบัตร<select className={field} value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}><option value="">ทั้งหมด</option><option value="award">รางวัล</option><option value="participation">เข้าร่วม</option></select></label>
            <label className="text-sm font-bold">ผู้รับ<select className={field} value={person} disabled={busy} onChange={e=>setPerson(e.target.value)}><option value="">ทั้งหมด</option><option value="athlete">นักกีฬา</option><option value="coach">ครูผู้ควบคุมทีม</option></select></label>
            <label className="text-sm font-bold">ค้นหาชื่อ / เลขที่<input className={field} value={query} disabled={busy} onChange={e=>setQuery(e.target.value)} placeholder="พิมพ์คำค้น"/></label>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{filtered.length} ฉบับ · เลือก {chosen.length} ฉบับ</h2><div className="flex flex-wrap gap-2">
            <button className={button} disabled={busy||!filtered.length} onClick={()=>setSelected(old=>Array.from(new Set([...old,...filtered.map(d=>d.id)])))}>เลือกทั้งหมดที่แสดง</button>
            <button className={button} disabled={busy} onClick={()=>setSelected([])}>ล้างที่เลือก</button>
            <button className={button} disabled={busy} onClick={()=>setReload(n=>n+1)}>รีเฟรช</button>
            <button className={primary} disabled={busy||!chosen.length||readyEvent!==eventId} onClick={()=>void print()}>พิมพ์ / PDF ({chosen.length})</button>
          </div></div>
          {readyEvent!==eventId&&eventId&&!error&&<p className="mt-4 text-sm">กำลังโหลดรายการ...</p>}
          {readyEvent===eventId&&!filtered.length&&<p className="mt-4 text-sm text-slate-500">ไม่พบเกียรติบัตรที่ออกแล้วตามตัวกรอง</p>}
          <div className="mt-3 divide-y divide-slate-100">{filtered.map(d=><label key={d.id} className="flex cursor-pointer items-center gap-3 py-3 text-sm"><input type="checkbox" className="size-4" checked={selected.includes(d.id)} disabled={busy} onChange={e=>setSelected(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id))}/><div className="min-w-0 flex-1"><p className="font-bold">{d.recipient_name}</p><p className="text-xs text-slate-600">{d.school_name} · {d.recipient_type==='coach'?'ครูผู้ควบคุมทีม':'นักกีฬา'} · {certificateNumber(d.id)}</p></div><span className="text-xs text-blue-900">{certificateAward(d.rank,d.kind)}</span></label>)}</div>
        </section>
        {context.admin&&<details className="rounded-2xl bg-white p-4 shadow-sm"><summary className="cursor-pointer font-bold">มอบหมายกรรมการพิมพ์ส่วนกลาง (Admin)</summary><form onSubmit={submit} className="mt-4 flex flex-wrap gap-2"><input aria-label="อีเมล Google ของกรรมการ" type="email" required className={field+" sm:flex-1"} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="อีเมล Google ของกรรมการ"/><button className={primary} disabled={busy}>มอบหมาย</button></form><p className="mt-2 text-xs text-slate-600">สิทธิ์นี้ใช้พิมพ์เท่านั้น ไม่ให้สิทธิ์บันทึกผลหรือจัดการโรงเรียน</p>{officials.map(o=><div key={o.email} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm"><span>{o.email} · {o.is_active?'ใช้งาน':'ระงับ'}</span><button className={button} disabled={busy} onClick={()=>void assign(o.email,!o.is_active)}>{o.is_active?'ระงับ':'เปิดสิทธิ์'}</button></div>)}</details>}
      </>}
    </div>
    <CertificatePrintSheets documents={printing}/>
  </main>;
}
