"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import CertificatePrintSheets from "./CertificatePrintSheets";
import {
  certificateAward, certificateNumber, emptyPlacements, resultStatusLabel,
  type CertificateContext, type CertificateDocument, type CertificateEntry,
  type CertificateEvent, type CertificatePlacement, type CertificateResult,
} from "@/lib/group-sports/certificates";

type Screen = "record" | "review" | "print" | "settings";
type Official = {email:string;is_active:boolean};
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const primary = "rounded-xl bg-[#a00018] px-4 py-2.5 font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "rounded-xl border border-rose-200 bg-white px-4 py-2.5 font-bold text-red-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45";
const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-rose-100";
function errorText(error:unknown) {return error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ โปรดลองอีกครั้ง";}
function awardLabel(rank:number,slot:number) {
  return rank===3 && slot===2 ? "รองชนะเลิศอันดับที่ 2 (ร่วม)" : certificateAward(rank,"award");
}

export default function CertificatesDashboard({mode="print"}:{mode?:"print"|"manage"}) {
  const [context,setContext]=useState<CertificateContext|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [eventId,setEventId]=useState("");
  const [search,setSearch]=useState("");
  const [screen,setScreen]=useState<Screen>(mode==="print"?"print":"record");
  const [entries,setEntries]=useState<CertificateEntry[]>([]);
  const [placements,setPlacements]=useState<CertificatePlacement[]>([]);
  const [result,setResult]=useState<CertificateResult>(null);
  const [documents,setDocuments]=useState<CertificateDocument[]>([]);
  const [selectedIds,setSelectedIds]=useState<number[]>([]);
  const [kindFilter,setKindFilter]=useState("all");
  const [personFilter,setPersonFilter]=useState("all");
  const [reason,setReason]=useState("");
  const [officialEmail,setOfficialEmail]=useState("");
  const [officials,setOfficials]=useState<Official[]>([]);
  const [signer,setSigner]=useState("");
  const [position,setPosition]=useState("");
  const [title,setTitle]=useState("เกียรติบัตร");
  const [printIds,setPrintIds]=useState<number[]>([]);

  const loadContext=useCallback(async () => {
    const auth=await supabase.auth.getUser();
    if(auth.error || !auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนหรือบัญชีผู้ดูแลการแข่งขัน");
    const response=await supabase.rpc("sports_cert_context");
    if(response.error) throw response.error;
    const payload=response.data as CertificateContext;
    setContext(payload);
    setSigner(payload.settings.signer_name);
    setPosition(payload.settings.signer_position);
    setTitle(payload.settings.title);
    setEventId(current => payload.events.some(e=>e.id===current)?current:(payload.events[0]?.id || ""));
    setScreen(mode==="print"?"print":payload.role==="admin"?"review":"record");
    return payload;
  },[mode]);

  const loadEvent=useCallback(async (event:CertificateEvent,role:CertificateContext["role"])=>{
    // Only assigned officials and principal admins can list entries/results.
    const canRecord=mode==="manage" && role!=="school" && event.can_record;
    const requestsTyped = [
      canRecord ? supabase.rpc("sports_cert_event_entries",{p_event:event.id}) : Promise.resolve({data:[],error:null}),
      canRecord ? supabase.rpc("sports_cert_result_details",{p_event:event.id}) : Promise.resolve({data:null,error:null}),
      mode==="print" ? supabase.rpc("sports_cert_my_documents",{p_event:event.id}) : Promise.resolve({data:[],error:null}),
      mode==="manage" && role==="admin" ? supabase.rpc("sports_cert_officials",{p_event:event.id}) : Promise.resolve({data:[],error:null}),
    ];
    const [a,b,c,d]=await Promise.all(requestsTyped);
    for(const response of [a,b,c,d]) if(response.error) throw response.error;
    setEntries((a.data||[]) as CertificateEntry[]);
    const details=(b.data||null) as CertificateResult;
    setResult(details);
    const defaults=emptyPlacements(event.event_type==="athletics");
    setPlacements(defaults.map(def=>({
      ...def,entry_id:details?.placements.find(p=>p.rank===def.rank&&p.slot===def.slot)?.entry_id||"",
    })));
    const docs=(c.data||[]) as CertificateDocument[];
    setDocuments(docs);
    setSelectedIds(docs.map(doc=>doc.id));
    setOfficials((d.data||[]) as Official[]);
  },[mode]);

  useEffect(()=>{
    let active=true;
    loadContext().catch(err=>{if(active)setError(errorText(err));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[loadContext]);

  const event=context?.events.find(e=>e.id===eventId);
  useEffect(()=>{
    if(!event||!context||(mode==="manage"&&context.role==="school"))return;
    let alive=true;
    setError("");
    loadEvent(event,context.role).catch(err=>{if(alive)setError(errorText(err));});
    return ()=>{alive=false;};
    // Selected event and role are the only dependencies needed; reload is explicit after mutations.
  },[eventId,context?.role,loadEvent,mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mutate(action:()=>PromiseLike<{error:unknown;data?:unknown}>,success:string) {
    if(busy||!event||!context)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response=await action();
      if(response.error)throw response.error;
      setNotice(success);
      const updated=await loadContext();
      const selected=updated.events.find(e=>e.id===eventId);
      if(selected) await loadEvent(selected,updated.role);
    } catch(err) {setError(errorText(err));}
    finally {setBusy(false);}
  }

  const entryOptions=useMemo(()=>entries.map(row=>({
    id:row.id,label:`${row.school_name} — ${row.entry_name}${row.athlete_count>0?` (${row.athlete_count} คน)`:""}`,
  })),[entries]);
  const canSend=Boolean(event?.can_record&&placements.length>0&&placements.every(p=>p.entry_id)
    &&new Set(placements.map(p=>p.entry_id)).size===placements.length
    &&!(["approved","published"] as string[]).includes(event?.result_status||""));

  async function submitResults(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!canSend||!event)return;
    if(!window.confirm("ยืนยันการส่งผลอันดับ 1–3 ให้ผู้ดูแลตรวจสอบ?"))return;
    await mutate(()=>supabase.rpc("sports_cert_submit",{p_event:event.id,p_awards:placements}),"ส่งผลการแข่งขันให้ผู้ดูแลตรวจสอบแล้ว");
  }
  async function review(action:"approve"|"reject"|"publish") {
    if(!event)return;
    if(action==="reject"&&!reason.trim()){setError("กรุณาระบุเหตุผลที่ส่งกลับแก้ไข");return;}
    const prompt=action==="publish"?"เผยแพร่ผลและออกเกียรติบัตรรางวัลทันที ยืนยันหรือไม่?":action==="approve"?"ยืนยันอนุมัติผลนี้?":"ยืนยันส่งผลกลับแก้ไข?";
    if(!window.confirm(prompt))return;
    await mutate(()=>supabase.rpc("sports_cert_review",{p_event:event.id,p_action:action,p_reason:reason}),
      action==="publish"?"เผยแพร่ผลพร้อมออกเกียรติบัตรรางวัลแล้ว":action==="approve"?"อนุมัติผลแล้ว":"ส่งกลับแก้ไขแล้ว");
    setReason("");
  }
  const eligibleDocs=documents.filter(doc=>(kindFilter==="all"||doc.kind===kindFilter)
    &&(personFilter==="all"||doc.recipient_type===personFilter));
  const printable=eligibleDocs.filter(doc=>selectedIds.includes(doc.id));
  const printing=documents.filter(doc=>printIds.includes(doc.id));
  const eventNames=context?.events.filter(e=>`${e.sport_name} ${e.event_code||""}`.toLowerCase().includes(search.toLowerCase()))||[];
  function startPrint(ids:number[]) {
    if(ids.length===0){setError("กรุณาเลือกเกียรติบัตรอย่างน้อย 1 ฉบับ");return;}
    setError("");setPrintIds(ids);
    // QR data URLs are generated client-side before printing; allow browser paint.
    window.setTimeout(()=>window.print(),1100);
  }

  return <main className="min-h-screen bg-[#f2f5fa] pb-12 text-slate-900">
    <div className="print:hidden bg-[#08142e] px-4 py-2 text-xs text-white">
      <div className="mx-auto flex max-w-6xl justify-between gap-3">
        <Link href="/group-sports" className="font-bold hover:underline">← กลับหน้ากีฬากลุ่ม</Link>
        <div className="flex flex-wrap gap-4">
          {mode==="manage"?<Link href="/group-sports/certificates" className="hover:underline">พิมพ์เกียรติบัตร</Link>:<Link href="/group-sports/login" className="hover:underline">เข้าสู่ระบบโรงเรียน</Link>}
          {mode==="print"&&(context?.role==="admin"||context?.role==="official")&&<Link href="/group-sports/certificates/manage" className="font-semibold hover:underline">สำหรับกรรมการ / ผู้ดูแล</Link>}
        </div>
      </div>
    </div>
    <header className="print:hidden bg-gradient-to-r from-[#820d16] via-[#a90918] to-[#20274a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-widest text-amber-300">PHULANGKA GAMES 2026 · CERTIFICATES V1.1</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{mode==="print"?"พิมพ์เกียรติบัตร":"จัดการผลเพื่อออกเกียรติบัตร"}</h1>
        <p className="mt-2 text-sm text-white/90">{mode==="print"?"สำหรับโรงเรียน · เลือกรายการ ดาวน์โหลด PDF หรือพิมพ์เกียรติบัตรได้ด้วยตนเอง":"สำหรับกรรมการแต่ละกีฬาและผู้ดูแล · บันทึกผล ตรวจสอบ อนุมัติ และตั้งค่าการออกเอกสาร"}</p>
      </div>
    </header>
    <div className="print:hidden mx-auto mt-5 max-w-6xl space-y-4 px-4">
      {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</div>}
      {notice&&<div role="status" className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-900">{notice}</div>}
      {loading&&<div className={panel}>กำลังตรวจสอบบัญชีและรายการแข่งขัน...</div>}
      {!loading&&!context&&<div className={panel}>
        <p className="mb-3 text-sm">ใช้บัญชีโรงเรียนที่ผู้จัดออกให้ หรือบัญชี Google Workspace ของผู้ดูแลการแข่งขัน</p>
        <Link href="/group-sports/login" className={primary}>เข้าสู่ระบบโรงเรียน</Link>
      </div>}
      {context&&mode==="manage"&&context.role==="school"&&<section className={panel}>
        <h2 className="font-extrabold text-red-900">หน้านี้สำหรับกรรมการและผู้ดูแลการแข่งขัน</h2>
        <p className="mt-2 text-sm text-slate-600">บัญชีโรงเรียนมีสิทธิ์พิมพ์เกียรติบัตรของโรงเรียนตนเอง แต่ไม่มีสิทธิ์บันทึกหรืออนุมัติผลการแข่งขัน</p>
        <Link href="/group-sports/certificates" className={`mt-4 inline-block ${primary}`}>ไปหน้าพิมพ์เกียรติบัตร</Link>
      </section>}
      {context&&(mode==="print"||context.role!=="school")&&<>
        <div className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-extrabold text-[#89051b]">{mode==="print"?"ค้นหาเกียรติบัตรของโรงเรียน":"เลือกกีฬาและรายการที่รับผิดชอบ"}</h2>
              <p className="mt-1 text-xs text-slate-500">สิทธิ์: {context.role==="admin"?"ผู้ดูแลการแข่งขัน":context.role==="official"?"กรรมการบันทึกผล":"บัญชีโรงเรียน"} · รายการที่เข้าถึงได้ {context.events.length} รายการ</p></div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-red-800">{mode==="print"?"รางวัล / เข้าร่วม":"สำหรับผู้ได้รับมอบหมายเท่านั้น"}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <label className="text-xs font-bold text-slate-600">ค้นหารายการ<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ชื่อกีฬา / รหัสรายการ" className={`mt-1 ${input}`}/></label>
            <label className="text-xs font-bold text-slate-600">รายการแข่งขัน
              <select className={`mt-1 ${input}`} value={eventId} onChange={e=>{setEventId(e.target.value);setNotice("");setPrintIds([]);}}>
                {!eventNames.some(e=>e.id===eventId)&&event&&<option value={event.id}>{event.sport_name}</option>}
                {eventNames.map(e=><option key={e.id} value={e.id}>{e.sport_name}</option>)}
              </select>
            </label>
          </div>
          {!context.events.length&&<p className="mt-3 text-sm text-slate-500">ยังไม่มีใบสมัครหรือรายการที่บัญชีนี้มีสิทธิ์เข้าถึง</p>}
          {event&&<div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1">ผล: {resultStatusLabel(event.result_status)}</span>
            <span className={`rounded-full px-3 py-1 ${event.participation_released?"bg-green-100 text-green-900":"bg-amber-100 text-amber-900"}`}>{event.participation_released?"เปิดพิมพ์เข้าร่วมแล้ว":"ยังไม่เปิดพิมพ์เข้าร่วม"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{event.event_type==="athletics"?"กรีฑา: 3 อันดับ":"กีฬา: อันดับ 3 ร่วม 2 ทีม/รายการ"}</span>
          </div>}
        </div>
        {event&&<>
          {mode==="manage"&&<div className="flex flex-wrap gap-2" role="tablist" aria-label="จัดการผลเกียรติบัตร">
            {(context.role==="official"?([{id:"record",label:"บันทึกผลการแข่งขัน"}] as const):[
              {id:"review",label:"ตรวจสอบ / อนุมัติผล"},
              {id:"settings",label:"ตั้งค่าและมอบหมายกรรมการ"}
            ] as const).map(tab=><button key={tab.id} role="tab" aria-selected={screen===tab.id} onClick={()=>setScreen(tab.id)}
              className={screen===tab.id?primary:secondary}>{tab.label}</button>)}
          </div>}
          {mode==="manage"&&screen==="record"&&context.role==="official"&&event.can_record&& <section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">ฟอร์มส่งผลรายการ {event.sport_name}</h2>
            <p className="mt-1 text-sm text-slate-600">เลือกจากทีม/นักกีฬาที่โรงเรียนลงทะเบียนไว้แล้ว โดยไม่มีการเปลี่ยนผลการแข่งขันส่วนกลาง</p>
            {event.result_status==="rejected"&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">เหตุผลที่ส่งกลับ: {event.rejection_reason}</p>}
            <form onSubmit={submitResults} className="mt-4 space-y-3">
              {placements.map((item,i)=><label key={`${item.rank}-${item.slot}`} className="block rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <span className="mb-2 block text-sm font-bold text-rose-900">{awardLabel(item.rank,item.slot)}</span>
                <select className={input} disabled={busy||event.result_status==="approved"||event.result_status==="published"}
                  value={item.entry_id} onChange={e=>setPlacements(current=>current.map((p,j)=>j===i?{...p,entry_id:e.target.value}:p))}>
                  <option value="">— เลือกโรงเรียน / ผู้แข่งขัน —</option>
                  {entryOptions.map(entry=><option key={entry.id} value={entry.id}
                    disabled={placements.some((p,j)=>j!==i&&p.entry_id===entry.id)}>{entry.label}</option>)}
                </select>
              </label>)}
              <p className="text-xs text-slate-500">{event.event_type==="athletics"?"กรีฑาไม่มีอันดับ 3 ร่วม และใช้ใบสมัครรายบุคคลของแต่ละรายการ":"กีฬาทั่วไปมีรองชนะเลิศอันดับที่ 2 สองทีม/รายการ โดยไม่ต้องจัดแข่งขันชิงอันดับ 3"}</p>
              <button type="submit" disabled={!canSend||busy} className={primary}>{busy?"กำลังบันทึก...":"ส่งผลให้ผู้ดูแลตรวจสอบ"}</button>
              {event.result_status==="published"&&<p className="text-xs font-semibold text-green-800">ผลนี้เผยแพร่แล้ว หากต้องแก้ไขต้องใช้กระบวนการแก้ผลอย่างเป็นทางการในเวอร์ชันถัดไป</p>}
            </form>
          </section>}
          {mode==="manage"&&screen==="review"&&context.role==="admin"&&<section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">ตรวจสอบผลก่อนออกเกียรติบัตร</h2>
            <p className="mt-1 text-sm text-slate-500">สถานะ: {resultStatusLabel(event.result_status)}</p>
            {result?<div className="mt-4 space-y-2">
              {result.placements.map(p=><div key={`${p.rank}-${p.slot}`} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <strong>{awardLabel(p.rank,p.slot)}</strong><span>{entryOptions.find(en=>en.id===p.entry_id)?.label||p.entry_id}</span>
              </div>)}
              {event.result_status==="submitted"&&<div className="flex flex-wrap gap-2 pt-3">
                <button className={primary} disabled={busy} onClick={()=>review("approve")}>อนุมัติผล</button>
              </div>}
              {(event.result_status==="submitted"||event.result_status==="approved")&&<div className="flex flex-wrap items-end gap-2 pt-2">
                <label className="min-w-[220px] flex-1 text-xs font-bold text-slate-700">เหตุผลส่งกลับแก้ไข<input className={`mt-1 ${input}`} value={reason} onChange={e=>setReason(e.target.value)} placeholder="ระบุเหตุผลที่ตรวจพบ"/></label>
                <button className={secondary} disabled={busy||!reason.trim()} onClick={()=>review("reject")}>ส่งกลับแก้ไข</button>
              </div>}
              {event.result_status==="approved"&&<div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 text-sm text-amber-900">เมื่อเผยแพร่ ระบบจะออกเลขเกียรติบัตรรางวัลให้นักกีฬาและครูผู้ควบคุมของทีมที่ได้รับรางวัลโดยอัตโนมัติ</p>
                <button className={primary} disabled={busy} onClick={()=>review("publish")}>เผยแพร่ผลและสร้างเกียรติบัตรรางวัล</button>
              </div>}
            </div>:<p className="mt-4 text-sm text-slate-500">ยังไม่มีการส่งผลสำหรับรายการนี้</p>}
          </section>}
          {mode==="print"&&screen==="print"&&<section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">พิมพ์เกียรติบัตร — {event.sport_name}</h2>
            <p className="mt-1 text-sm text-slate-600">แสดงเฉพาะเอกสารที่ผู้ดูแลเปิดเผยแพร่แล้ว และสำหรับบัญชีโรงเรียนจะแสดงเฉพาะโรงเรียนของตนเอง</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">ประเภทเกียรติบัตร
                <select className={`mt-1 ${input}`} value={kindFilter} onChange={e=>setKindFilter(e.target.value)}>
                  <option value="all">ทั้งหมด</option><option value="award">รางวัล</option><option value="participation">เข้าร่วมการแข่งขัน</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">ประเภทผู้รับ
                <select className={`mt-1 ${input}`} value={personFilter} onChange={e=>setPersonFilter(e.target.value)}>
                  <option value="all">นักกีฬาและครูผู้ควบคุม</option><option value="athlete">เฉพาะนักกีฬา</option><option value="coach">เฉพาะครูผู้ควบคุม</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">มีเกียรติบัตร {eligibleDocs.length} ฉบับ · เลือก {printable.length} ฉบับ</span>
              <div className="flex flex-wrap gap-2"><button className={secondary} onClick={()=>setSelectedIds(Array.from(new Set([...selectedIds,...eligibleDocs.map(d=>d.id)])))}>เลือกทั้งหมด</button>
                <button className={secondary} onClick={()=>setSelectedIds(selectedIds.filter(id=>!eligibleDocs.some(d=>d.id===id)))}>ล้างที่เลือก</button>
                <button className={primary} disabled={!printable.length} onClick={()=>startPrint(printable.map(d=>d.id))}>พิมพ์ที่เลือก / บันทึก PDF ({printable.length})</button></div>
            </div>
            {eligibleDocs.length?<div className="mt-4 max-h-[500px] overflow-y-auto rounded-xl border border-slate-200">
              {eligibleDocs.map(doc=><label key={doc.id} className="flex cursor-pointer flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 hover:bg-rose-50">
                <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={e=>setSelectedIds(current=>e.target.checked?[...current,doc.id]:current.filter(id=>id!==doc.id))} className="size-4 accent-red-800"/>
                <div className="min-w-0 flex-1"><div className="font-semibold">{doc.recipient_name} <span className="ml-2 text-xs font-normal text-slate-500">{doc.recipient_type==="coach"?"ครูผู้ควบคุม":"นักกีฬา"}</span></div>
                  <div className="text-xs text-slate-500">{doc.school_name} · {certificateAward(doc.rank,doc.kind)} · {certificateNumber(doc.id)}</div></div>
                <button className={secondary} onClick={e=>{e.preventDefault();startPrint([doc.id]);}}>พิมพ์ใบนี้</button>
              </label>)}
            </div>:<p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">ยังไม่มีเกียรติบัตรในเงื่อนไขนี้ — โปรดตรวจว่าผู้ดูแลอนุมัติและเปิดเผยแพร่ผล/การเข้าร่วมแล้ว</p>}
            <p className="mt-3 text-xs text-slate-500">เมื่อเปิดหน้าพิมพ์ ให้เลือกกระดาษ A4 แนวนอน แล้วเลือก “บันทึกเป็น PDF” หรือพิมพ์กระดาษจริง · เกียรติบัตรมีเลขที่และ QR สำหรับตรวจสอบ</p>
          </section>}
          {mode==="manage"&&screen==="settings"&&context.role==="admin"&&<div className="space-y-4">
            <section className={panel}>
              <h2 className="text-lg font-extrabold text-red-900">เปิดพิมพ์เกียรติบัตรเข้าร่วมการแข่งขัน</h2>
              <p className="mt-2 text-sm text-slate-600">เมื่อตรวจว่ารายชื่อนักกีฬาได้รับการรับสมัครถูกต้องแล้ว ให้เปิดพิมพ์สำหรับทุกรายชื่อในรายการนี้ การเปิดหรือปิดจะไม่แก้ไขฐานข้อมูลผลการแข่งขัน</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={event.participation_released?secondary:primary} disabled={busy} onClick={()=>{
                  if(window.confirm(`ยืนยัน${event.participation_released?"ปิด":"เปิด"}การพิมพ์เกียรติบัตรเข้าร่วมสำหรับ ${event.sport_name}?`))
                    void mutate(()=>supabase.rpc("sports_cert_participation",{p_event:event.id,p_enable:!event.participation_released}),event.participation_released?"ปิดพิมพ์เกียรติบัตรเข้าร่วมแล้ว":"เปิดพิมพ์เกียรติบัตรเข้าร่วมแล้ว");
                }}>{event.participation_released?"ปิดพิมพ์เกียรติบัตรเข้าร่วม":"เปิดพิมพ์เกียรติบัตรเข้าร่วม"}</button>
                <button className={secondary} disabled={busy} onClick={()=>void mutate(()=>supabase.rpc("sports_cert_sync",{p_event:event.id}),"ซิงค์เอกสารจากใบสมัครที่ได้รับแล้ว โดยไม่เขียนทับเอกสารเดิม")}>ซิงค์รายชื่อที่ลงทะเบียนเพิ่มเติม</button>
              </div>
              <p className="mt-3 text-xs text-amber-800">โปรดเปิดหลังการแข่งขันจริง เพื่อไม่ให้นักกีฬาที่เพิ่งสมัครได้รับเกียรติบัตรก่อนเข้าร่วม</p>
            </section>
            <section className={panel}>
              <h2 className="text-lg font-extrabold text-red-900">ตั้งค่าแม่แบบเกียรติบัตร</h2>
              <p className="mt-1 text-xs text-slate-500">ค่านี้ใช้กับเอกสารที่ออกใหม่เท่านั้น เพื่อรักษาข้อมูลและลายเซ็นของเกียรติบัตรที่ออกไปแล้ว</p>
              <form className="mt-4 grid gap-3" onSubmit={e=>{e.preventDefault();void mutate(()=>supabase.rpc("sports_cert_save_settings",{p_comp:context.competition_id,p_signer:signer,p_position:position,p_title:title}),"บันทึกแม่แบบแล้ว");}}>
                <label className="text-xs font-bold text-slate-700">หัวเกียรติบัตร<input className={`mt-1 ${input}`} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} required/></label>
                <label className="text-xs font-bold text-slate-700">ชื่อผู้ลงนาม<input className={`mt-1 ${input}`} value={signer} maxLength={200} onChange={e=>setSigner(e.target.value)} placeholder="ชื่อ–สกุลผู้ลงนาม"/></label>
                <label className="text-xs font-bold text-slate-700">ตำแหน่งผู้ลงนาม<input className={`mt-1 ${input}`} value={position} maxLength={250} onChange={e=>setPosition(e.target.value)} placeholder="ตำแหน่ง / หน่วยงาน"/></label>
                <div><button className={primary} disabled={busy}>บันทึกข้อมูลแม่แบบ</button></div>
              </form>
            </section>
            <section className={panel}>
              <h2 className="text-lg font-extrabold text-red-900">มอบหมายกรรมการกรอกผล — เฉพาะรายการนี้</h2>
              <p className="mt-1 text-sm text-slate-600">กรรมการต้องเข้าสู่ระบบด้วยบัญชี Google ที่ยืนยันตัวตนแล้ว และได้รับสิทธิ์เฉพาะรายการที่มอบหมาย</p>
              <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();const mail=officialEmail.trim();void mutate(()=>supabase.rpc("sports_cert_set_official",{p_event:event.id,p_email:mail,p_active:true}),"มอบหมายกรรมการแล้ว").then(()=>setOfficialEmail(""));}}>
                <label className="min-w-[220px] flex-1 text-xs font-bold">อีเมล Google ของกรรมการ<input type="email" className={`mt-1 ${input}`} value={officialEmail} onChange={e=>setOfficialEmail(e.target.value)} placeholder="name@school.ac.th" required/></label>
                <button className={primary} disabled={busy||!officialEmail.trim()}>เพิ่มผู้กรอกผล</button>
              </form>
              {officials.length>0&&<div className="mt-3 space-y-2">{officials.map(o=><div key={o.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span>{o.email} <span className="text-xs text-slate-500">({o.is_active?"ใช้งาน":"ระงับ"})</span></span>
                <button className={secondary} disabled={busy} onClick={()=>void mutate(()=>supabase.rpc("sports_cert_set_official",{p_event:event.id,p_email:o.email,p_active:!o.is_active}),"ปรับสิทธิ์กรรมการแล้ว")}>{o.is_active?"ระงับสิทธิ์":"เปิดสิทธิ์"}</button>
              </div>)}</div>}
            </section>
          </div>}
        </>}
      </>}
      <div className="pt-3 text-xs text-slate-500">{mode==="print"?"โรงเรียนพิมพ์ได้เฉพาะเอกสารที่ออกแล้วตามสิทธิ์บัญชีของตนเอง":"ผลที่กรรมการส่งต้องผ่านการตรวจสอบและเผยแพร่โดยผู้ดูแลก่อนออกเกียรติบัตร"} · เกียรติบัตร V1.1 ไม่แก้ผลกีฬาในระบบกลาง</div>
    </div>
    {mode==="print"&&<CertificatePrintSheets documents={printing}/>}
  </main>;
}
