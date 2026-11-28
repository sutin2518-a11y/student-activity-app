"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import CertificatePrintSheets from "./CertificatePrintSheets";
import {
  certificateAward, certificateNumber, emptyPlacements, resultStatusLabel,
  type CertificateContext, type CertificateDocument, type CertificateEntry,
  type CertificateEvent, type CertificatePlacement, type CertificateResult,
} from "@/lib/group-sports/certificates";

type Suggestion = {status: "ready"|"manual"|"incomplete"|"ambiguous"; source?: "football"|"esports"; placements: CertificatePlacement[]};
type Receipt = {published_at:string; placements:number; ranks:number; medals:number; certificates:number; missing_award_entries:number; consistent:boolean};
type Screen = "record" | "review" | "print" | "settings";
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const primary = "rounded-xl bg-[#a00018] px-4 py-2.5 font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "rounded-xl border border-rose-200 bg-white px-4 py-2.5 font-bold text-red-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45";
const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-rose-100";
function errorText(error:unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "ทำรายการไม่สำเร็จ โปรดลองอีกครั้ง";
}
function singleBronze(event:CertificateEvent){return event.event_type==="athletics" || ["GS3-BB-15M","GS3-BB-15F","GS3-BB-UF"].includes(event.event_code||"");}
function awardLabel(rank:number,slot:number) {
  return rank===3 && slot===2 ? "รองชนะเลิศอันดับที่ 2 (ร่วม)" : certificateAward(rank,"award");
}

export default function CertificatesDashboard({mode="print"}:{mode?:"print"|"manage"}) {
  const [context,setContext]=useState<CertificateContext|null>(null);
  const [loading,setLoading]=useState(true);
  const [suggestion,setSuggestion]=useState<Suggestion|null>(null);
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const [syncWarning,setSyncWarning]=useState("");
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
  const [loadedEventId,setLoadedEventId]=useState("");
  const eventRequest=useRef(0);
  const [signer,setSigner]=useState("");
  const [position,setPosition]=useState("");
  const [title,setTitle]=useState("เกียรติบัตร");
  const [printIds,setPrintIds]=useState<number[]>([]);
  const printRequest=useRef(false);

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
    setEventId(current => { const requested=current || (typeof window!=="undefined" ? new URLSearchParams(window.location.search).get("event") : ""); return payload.events.some(e=>e.id===requested)?requested!:(payload.events[0]?.id || ""); });
    setScreen(previous=>mode==="print"?"print":payload.role==="admin"?(previous==="settings"||previous==="review"?previous: "review"):"record");
    return payload;
  },[mode]);

  const loadEvent=useCallback(async (event:CertificateEvent,role:CertificateContext["role"])=>{
    const request=++eventRequest.current;
    setLoadedEventId("");setSuggestion(null);setReceipt(null);setSyncWarning("");
    // Only explicitly assigned officials can list entries/results under migration 031.
    const canRecord=mode==="manage" && role!=="school" && event.can_record;
    const canInspect=mode==="manage" && (role==="admin" || canRecord);
    const requestsTyped = [
      canInspect ? supabase.rpc("sports_cert_event_entries",{p_event:event.id}) : Promise.resolve({data:[],error:null}),
      canInspect ? supabase.rpc("sports_cert_result_details",{p_event:event.id}) : Promise.resolve({data:null,error:null}),
      mode==="print" ? supabase.rpc("sports_cert_my_documents",{p_event:event.id}) : Promise.resolve({data:[],error:null}),
    ] as const;
    const [a,b,c,d,f]=await Promise.all([...requestsTyped,
      canRecord && event.result_status!=="published" ? supabase.rpc("sports_award_suggestions",{p_event:event.id}) : Promise.resolve({data:null,error:null}),
      canInspect && event.result_status==="published" ? supabase.rpc("sports_award_receipt",{p_event:event.id}) : Promise.resolve({data:null,error:null})
    ]);
    if(request!==eventRequest.current)return;
    for(const response of [a,b,c]) if(response.error) throw response.error;
    setEntries((a.data||[]) as CertificateEntry[]);
    const details=(b.data||null) as CertificateResult;
    setResult(details);
    setSuggestion((d.data||null) as Suggestion|null);
    setReceipt((f.data||null) as Receipt|null);
    if(d.error||f.error)setSyncWarning("ไม่สามารถอ่านข้อมูลเชื่อมโยงได้ กรุณาตรวจสอบ Migration 038 หรือโหลดใหม่");
    const defaults=event.event_code?.startsWith("GS3-BX-") ? (details?.placements.length?details.placements:(d.data as Suggestion|null)?.placements||[]) : emptyPlacements(singleBronze(event));
    setPlacements(defaults.map(def=>({
      ...def,entry_id:details?.placements.find(p=>p.rank===def.rank&&p.slot===def.slot)?.entry_id||"",
    })));
    const docs=(c.data||[]) as CertificateDocument[];
    setDocuments(docs);
    setSelectedIds(docs.map(doc=>doc.id));
    setLoadedEventId(event.id);
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
    return ()=>{alive=false;eventRequest.current++;};
    // Selected event and role are the only dependencies needed; reload is explicit after mutations.
  },[eventId,context?.role,loadEvent,mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mutate(action:()=>PromiseLike<{error:unknown;data?:unknown}>,success:string|((data:unknown)=>string)) {
    if(busy||!event||!context)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response=await action();
      if(response.error)throw response.error;
      setNotice(typeof success==="function"?success(response.data):success);
      const updated=await loadContext();
      const selected=updated.events.find(e=>e.id===eventId);
      if(selected) await loadEvent(selected,updated.role);
    } catch(err) {setError(errorText(err));}
    finally {setBusy(false);}
  }

  const entryOptions=useMemo(()=>entries.map(row=>({
    id:row.id,label:`${row.school_name} — ${row.entry_name}${row.athlete_count>0?` (${row.athlete_count} คน)`:""}`,
  })),[entries]);
  const eventReady=Boolean(event && loadedEventId===event.id);
  const published=event?.result_status==="published";
  const canSend=Boolean((!event?.event_code?.startsWith("GS3-BX-")||suggestion?.status==="ready")&&eventReady&&event?.can_record&&placements.length>0&&placements.every(p=>p.entry_id)
    &&new Set(placements.map(p=>p.entry_id)).size===placements.length&&!published);

  async function submitResults(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!canSend||!event||busy)return;
    if(!(await sportsConfirm(`ยืนยันบันทึกอันดับรางวัลของ ${event.sport_name}? เมื่อบันทึกสำเร็จ ระบบจะประกาศอันดับ อัปเดตเหรียญรางวัล และออกเกียรติบัตรทันที กรุณาตรวจสอบรายชื่อให้ถูกต้อง`)))return;
    await mutate(()=>supabase.rpc("sports_cert_submit",{p_event:event.id,p_awards:placements}),data=>{
      const status=(data as {status?:string}|null)?.status;
      return status==="published"?"บันทึกอันดับรางวัลและออกเกียรติบัตรแล้ว":
        "บันทึกข้อมูลแล้ว กรุณาตรวจสอบสถานะผลรางวัล (หากยังไม่ประกาศ ให้ผู้ดูแลตรวจสอบ SQL Migration 031)";
    });
  }
  const eligibleDocs=(eventReady?documents:[]).filter(doc=>(kindFilter==="all"||doc.kind===kindFilter)
    &&(personFilter==="all"||doc.recipient_type===personFilter));
  const printable=eligibleDocs.filter(doc=>selectedIds.includes(doc.id));
  const printing=(eventReady?documents:[]).filter(doc=>printIds.includes(doc.id));
  const eventNames=context?.events.filter(e=>`${e.sport_name} ${e.event_code||""}`.toLowerCase().includes(search.toLowerCase()))||[];
  // Refresh only the currently selected school-print event; do not reset selections
  // or interrupt a print dialog. RLS/RPC continues to enforce the school's scope.
  useEffect(()=>{
    if(mode!=="print"||!eventReady||!eventId||busy)return;
    let active=true; let running=false;
    async function refreshDocuments(){
      if(!active||running||printRequest.current||document.visibilityState!=="visible")return;
      running=true;
      try {
        const response=await supabase.rpc("sports_cert_my_documents",{p_event:eventId});
        if(!active||printRequest.current)return;
        if(response.error)throw response.error;
        const fresh=(response.data||[]) as CertificateDocument[];
        setDocuments(fresh);
        setSelectedIds(previous=>previous.filter(id=>fresh.some(doc=>doc.id===id)));
      } catch(err){if(active&&!printRequest.current){setDocuments([]);setSelectedIds([]);setError(errorText(err));}}
      finally{running=false;}
    }
    const timer=window.setInterval(()=>void refreshDocuments(),45_000);
    const focus=()=>void refreshDocuments();window.addEventListener("focus",focus);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",focus);};
  },[mode,eventReady,eventId,busy]);

  async function startPrint(ids:number[]) {
    if(busy||printRequest.current||!eventReady||!eventId)return;
    if(ids.length===0){setError("กรุณาเลือกเกียรติบัตรอย่างน้อย 1 ฉบับ");return;}
    printRequest.current=true;setBusy(true);setError("");setPrintIds([]);
    try{
      const response=await supabase.rpc("sports_cert_my_documents",{p_event:eventId});
      if(response.error)throw response.error;
      const fresh=(response.data||[]) as CertificateDocument[];
      const valid=fresh.filter(doc=>ids.includes(doc.id));
      setDocuments(fresh);
      if(valid.length!==ids.length){setSelectedIds(valid.map(doc=>doc.id));throw new Error("มีเกียรติบัตรที่ถูกเพิกถอนหรือเปลี่ยนแปลง กรุณาเลือกเอกสารล่าสุดก่อนพิมพ์");}
      setPrintIds(valid.map(doc=>doc.id));
      window.setTimeout(()=>{try{window.print();}finally{setPrintIds([]);printRequest.current=false;setBusy(false);}},1100);
    }catch(err){setPrintIds([]);setError(errorText(err));printRequest.current=false;setBusy(false);}
  }

  return <main className="min-h-screen bg-[#f2f5fa] pb-12 text-slate-900">
    <div className="print:hidden bg-[#08142e] px-4 py-2 text-xs text-white">
      <div className="mx-auto flex max-w-6xl justify-between gap-3">
        <Link href="/group-sports" className="font-bold hover:underline">← กลับหน้ากีฬากลุ่ม</Link>
        <div className="flex flex-wrap gap-4">
          {mode==="manage"?<Link href="/group-sports/certificates" className="hover:underline">พิมพ์เกียรติบัตร</Link>:<Link href="/group-sports/login" className="hover:underline">เข้าสู่ระบบโรงเรียน</Link>}
          {mode==="print"&&(context?.role==="admin"||context?.role==="official")&&<Link href="/group-sports/certificates/manage" className="font-semibold hover:underline">บันทึกอันดับรางวัล</Link>}
        </div>
      </div>
    </div>
    <header className="print:hidden bg-gradient-to-r from-[#820d16] via-[#a90918] to-[#20274a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-widest text-amber-300">PHULANGKA GAMES 2026 · CERTIFICATES V1.1</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{mode==="print"?"พิมพ์เกียรติบัตร":"บันทึกอันดับรางวัล"}</h1>
        <p className="mt-2 text-sm text-white/90">{mode==="print"?"สำหรับโรงเรียน · เลือกรายการ ดาวน์โหลด PDF หรือพิมพ์เกียรติบัตรได้ด้วยตนเอง":"สำหรับกรรมการบันทึกอันดับผู้ชนะเพื่อออกเกียรติบัตร · ผู้ดูแลตรวจสอบสถานะและตั้งค่าเอกสาร"}</p>
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
        <p className="mt-2 text-sm text-slate-600">บัญชีโรงเรียนมีสิทธิ์พิมพ์เกียรติบัตรของโรงเรียนตนเอง แต่ไม่มีสิทธิ์บันทึกอันดับรางวัล</p>
        <Link href="/group-sports/certificates" className={`mt-4 inline-block ${primary}`}>ไปหน้าพิมพ์เกียรติบัตร</Link>
      </section>}
      {context&&(mode==="print"||context.role!=="school")&&<>
        <div className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-extrabold text-[#89051b]">{mode==="print"?"ค้นหาเกียรติบัตรของโรงเรียน":"รายการแข่งขันที่รับผิดชอบ"}</h2>
              <p className="mt-1 text-xs text-slate-500">สิทธิ์: {context.role==="admin"?"ผู้ดูแลการแข่งขัน":context.role==="official"?"กรรมการบันทึกอันดับรางวัล":"บัญชีโรงเรียน"} · รายการที่เข้าถึงได้ {context.events.length} รายการ</p></div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-red-800">{mode==="print"?"รางวัล / เข้าร่วม":"สำหรับผู้ได้รับมอบหมายเท่านั้น"}</span><button type="button" disabled={busy||!event} className={secondary} onClick={async ()=>{if(mode==="manage"&&!published&&screen==="record"&&placements.some(p=>p.entry_id)&&!(await sportsConfirm("โหลดข้อมูลใหม่และล้างอันดับที่ยังไม่ได้บันทึก?")))return;void mutate(async()=>({error:null}),"โหลดข้อมูลล่าสุดแล้ว");}}>โหลดข้อมูลล่าสุด</button></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <label className="text-xs font-bold text-slate-600">ค้นหารายการ<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ชื่อกีฬา / รหัสรายการ" className={`mt-1 ${input}`}/></label>
            <label className="text-xs font-bold text-slate-600">รายการแข่งขัน
              <select className={`mt-1 ${input}`} value={eventId} disabled={busy} onChange={e=>{setLoadedEventId("");setEventId(e.target.value);setNotice("");setPrintIds([]);}}>
                {!eventNames.some(e=>e.id===eventId)&&event&&<option value={event.id}>{event.sport_name}</option>}
                {eventNames.map(e=><option key={e.id} value={e.id}>{e.sport_name}</option>)}
              </select>
            </label>
          </div>
          {!context.events.length&&<p className="mt-3 text-sm text-slate-500">ยังไม่มีใบสมัครหรือรายการที่บัญชีนี้มีสิทธิ์เข้าถึง</p>}
          {event&&<div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1">ผล: {resultStatusLabel(event.result_status)}</span>
            <span className={`rounded-full px-3 py-1 ${event.participation_released?"bg-green-100 text-green-900":"bg-amber-100 text-amber-900"}`}>{event.participation_released?"เปิดพิมพ์เข้าร่วมแล้ว":"ยังไม่เปิดพิมพ์เข้าร่วม"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{singleBronze(event)?"3 อันดับ (1 ทองแดง)":"กีฬา: อันดับ 3 ร่วม 2 ทีม/รายการ"}</span>
          </div>}
        </div>
        {event&&<>
          {syncWarning&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{syncWarning}</p>}
          {eventReady&&receipt&&<section className={panel}><h2 className="font-bold">สถานะการเชื่อมโยงผลรางวัล</h2><div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["อันดับ",receipt.placements],["ผลการแข่งขัน",receipt.ranks],["เหรียญ",receipt.medals],["เกียรติบัตร",receipt.certificates]].map(([label,count])=><div key={label} className="rounded-lg bg-slate-50 p-3"><p>{label}</p><strong className="text-xl">{count}</strong></div>)}</div><p className={`mt-3 text-sm ${receipt.consistent?"text-emerald-800":"text-red-800"}`}>{receipt.consistent?"ผลรางวัล เหรียญ และเอกสารที่ตรวจได้สอดคล้องกัน":"พบข้อมูลไม่สอดคล้องหรือบางอันดับยังไม่มีเอกสาร กรุณาให้ผู้ดูแลตรวจสอบก่อนพิมพ์"}</p></section>}
          {mode==="manage"&&<div className="flex flex-wrap gap-2" role="tablist" aria-label="บันทึกอันดับรางวัลและตั้งค่า">
            {(context.role==="official"?([{id:"record",label:"บันทึกอันดับรางวัล"}] as const):[
              ...(event.can_record?[{id:"record" as const,label:"บันทึกอันดับรางวัล"}]:[]),
              {id:"review",label:"สถานะผลรางวัล"},
              {id:"settings",label:"ตั้งค่าและมอบหมายกรรมการ"}
            ] as const).map(tab=><button key={tab.id} role="tab" aria-selected={screen===tab.id} onClick={()=>setScreen(tab.id)}
              className={screen===tab.id?primary:secondary}>{tab.label}</button>)}
          </div>}
          {mode==="manage"&&screen==="record"&&(context.role==="official"||context.role==="admin")&&event.can_record&& <section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">บันทึกอันดับรางวัล — {event.sport_name}</h2>
            <p className="mt-1 text-sm text-slate-600">เลือกโรงเรียนหรือผู้แข่งขันจากใบสมัครที่ได้รับแล้ว ระบบใช้ข้อมูลนี้สำหรับสรุปอันดับ เหรียญรางวัล และออกเกียรติบัตร ไม่ใช่การบันทึกคะแนนรายคู่</p>
            {event.result_status==="rejected"&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">เหตุผลที่ส่งกลับ: {event.rejection_reason}</p>}
            {!eventReady?<p role="status" className="mt-4 text-sm text-slate-600">{error?"โหลดรายการไม่สำเร็จ กรุณาโหลดหน้าใหม่":"กำลังโหลดรายชื่อผู้แข่งขัน..."}</p>:<form onSubmit={submitResults} className="mt-4 space-y-3">
              {!published&&suggestion?.status==="ready"&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p>พบผลรอบชิงและรอบรองชนะเลิศครบ สามารถนำอันดับจากคะแนนเดิมมาใช้ได้ กรุณาตรวจสอบก่อนยืนยัน</p><button type="button" disabled={busy} className={`${secondary} mt-2`} onClick={async ()=>{if((await sportsConfirm("นำอันดับจากผลการแข่งขันที่โหลดล่าสุดมาแทนค่าที่เลือกอยู่?")))setPlacements(suggestion.placements);}}>นำอันดับจากผลการแข่งขัน</button></div>}
              {!published&&suggestion&&(suggestion.status==="incomplete"||suggestion.status==="ambiguous")&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ยังดึงอันดับจากคะแนนรายคู่ไม่ได้ (ผลไม่ครบหรือชื่อทีมไม่ตรงกับใบสมัคร) ตรวจสอบผลจริงก่อนเลือกอันดับด้วยตนเอง</p>}
              {placements.map((item,i)=><label key={`${item.rank}-${item.slot}`} className={`block rounded-xl border p-3 ${item.rank===1?"border-amber-200 bg-amber-50":item.rank===2?"border-slate-200 bg-slate-50":"border-orange-200 bg-orange-50"}`}>
                <span className="mb-2 flex items-center gap-3">
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.rank===1?"bg-amber-200 text-amber-900":item.rank===2?"bg-slate-200 text-slate-700":"bg-orange-200 text-orange-900"}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m8 3 4 5 4-5M9.5 8 7 12M14.5 8 17 12"/><circle cx="12" cy="16" r="5"/><path d="m10.8 16 1 1 1.8-2"/></svg></span>
                  <span><span className={`block text-xs font-extrabold ${item.rank===1?"text-amber-800":item.rank===2?"text-slate-600":"text-orange-800"}`}>อันดับ {item.rank}{item.slot===2?" ร่วม":""}</span><span className="block text-sm font-bold text-slate-900">{awardLabel(item.rank,item.slot)}</span></span>
                </span>
                <select className={input} disabled={busy||published}
                  value={item.entry_id} onChange={e=>setPlacements(current=>current.map((p,j)=>j===i?{...p,entry_id:e.target.value}:p))}>
                  <option value="">— เลือกโรงเรียน / ผู้แข่งขัน —</option>
                  {entryOptions.map(entry=><option key={entry.id} value={entry.id}
                    disabled={placements.some((p,j)=>j!==i&&p.entry_id===entry.id)}>{entry.label}</option>)}
                </select>
              </label>)}
              <p className="text-xs text-slate-500">{event.event_code?.startsWith("GS3-BX-")?"มวย: อันดับตามคู่ชกจริงและกติการางวัลที่ผู้จัดยืนยัน":singleBronze(event)?"รายการนี้มีรองชนะเลิศอันดับที่ 2 หนึ่งรางวัล":"กีฬาทั่วไปมีรองชนะเลิศอันดับที่ 2 สองทีม/รายการ โดยไม่ต้องจัดแข่งขันชิงอันดับ 3"}</p>
              {!published&&<>
                {entryOptions.length<placements.length&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">มีผู้แข่งขันที่ได้รับใบสมัคร {entryOptions.length} รายการ แต่ต้องเลือก {placements.length} อันดับตามกติกาที่ตั้งไว้ กรุณาตรวจสอบข้อมูลลงทะเบียนก่อนบันทึก</p>}
                <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">เมื่อยืนยันบันทึก ระบบจะประกาศอันดับรางวัล อัปเดตเหรียญ และออกเกียรติบัตรทันที โดยไม่ต้องรออนุมัติ โปรดตรวจสอบอันดับให้ถูกต้องก่อนยืนยัน</p>
                <button type="submit" disabled={!canSend||busy} className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">{busy?"กำลังบันทึก...":"ยืนยันบันทึกอันดับรางวัล"}</button>
              </>}
              {published&&<p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">ประกาศอันดับรางวัลแล้ว ไม่สามารถบันทึกซ้ำได้ หากพบข้อมูลผิดพลาดให้ติดต่อผู้ดูแลเพื่อแก้ไขผลหลังประกาศ</p>}
            </form>}
          </section>}
          {mode==="manage"&&screen==="review"&&context.role==="admin"&&<section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">สถานะอันดับรางวัล</h2>
            <p className="mt-1 text-sm text-slate-500">สถานะ: {resultStatusLabel(event.result_status)}</p>
            {eventReady&&result&&<div className="mt-4 space-y-2">
              {result.placements.map(p=><div key={`${p.rank}-${p.slot}`} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <strong>อันดับ {p.rank}{p.slot===2?" ร่วม":""} · {awardLabel(p.rank,p.slot)}</strong><span>{entryOptions.find(en=>en.id===p.entry_id)?.label||p.entry_id}</span>
              </div>)}
            </div>}
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">กรรมการที่ได้รับมอบหมายเป็นผู้บันทึกอันดับรางวัลโดยตรง ผู้ดูแลไม่ต้องอนุมัติซ้ำ</p>
            {published?<Link href="/group-sports/results/corrections" className="mt-3 inline-block font-bold text-blue-800 underline">แก้ไขผลหลังประกาศ (ผู้ดูแล)</Link>:
              event.result_status!=="not_submitted"&&<p className="mt-3 text-sm text-amber-800">ผลเดิมยังไม่ประกาศ ให้กรรมการที่ได้รับมอบหมายตรวจสอบและยืนยันบันทึกใหม่</p>}
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
                <button className={primary} disabled={busy||!printable.length} onClick={()=>startPrint(printable.map(d=>d.id))}>พิมพ์ที่เลือก / บันทึก PDF ({printable.length})</button></div>
            </div>
            {eligibleDocs.length?<div className="mt-4 max-h-[500px] overflow-y-auto rounded-xl border border-slate-200">
              {eligibleDocs.map(doc=><label key={doc.id} className="flex cursor-pointer flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 hover:bg-rose-50">
                <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={e=>setSelectedIds(current=>e.target.checked?[...current,doc.id]:current.filter(id=>id!==doc.id))} className="size-4 accent-red-800"/>
                <div className="min-w-0 flex-1"><div className="font-semibold">{doc.recipient_name} <span className="ml-2 text-xs font-normal text-slate-500">{doc.recipient_type==="coach"?"ครูผู้ควบคุม":"นักกีฬา"}</span></div>
                  <div className="text-xs text-slate-500">{doc.school_name} · {certificateAward(doc.rank,doc.kind)} · {certificateNumber(doc.id)}</div></div>
                <button className={secondary} disabled={busy} onClick={e=>{e.preventDefault();void startPrint([doc.id]);}}>พิมพ์ใบนี้</button>
              </label>)}
            </div>:<p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">ยังไม่มีเกียรติบัตรในเงื่อนไขนี้ — รอกรรมการบันทึกอันดับ หรือผู้ดูแลเปิดเกียรติบัตรเข้าร่วม แล้วกดโหลดข้อมูลล่าสุด</p>}
            <p className="mt-3 text-xs text-slate-500">เมื่อเปิดหน้าพิมพ์ ให้เลือกกระดาษ A4 แนวนอน แล้วเลือก “บันทึกเป็น PDF” หรือพิมพ์กระดาษจริง · เกียรติบัตรมีเลขที่และ QR สำหรับตรวจสอบ</p>
          </section>}
          {mode==="manage"&&screen==="settings"&&context.role==="admin"&&<div className="space-y-4">
            <section className={panel}>
              <h2 className="text-lg font-extrabold text-red-900">เปิดพิมพ์เกียรติบัตรเข้าร่วมการแข่งขัน</h2>
              <p className="mt-2 text-sm text-slate-600">เมื่อตรวจว่ารายชื่อนักกีฬาได้รับการรับสมัครถูกต้องแล้ว ให้เปิดพิมพ์สำหรับทุกรายชื่อในรายการนี้ การเปิดหรือปิดจะไม่แก้ไขฐานข้อมูลผลการแข่งขัน</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={event.participation_released?secondary:primary} disabled={busy} onClick={async ()=>{
                  if((await sportsConfirm(`ยืนยัน${event.participation_released?"ปิด":"เปิด"}การพิมพ์เกียรติบัตรเข้าร่วมสำหรับ ${event.sport_name}?`)))
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
              <h2 className="text-lg font-extrabold text-red-900">มอบหมายกรรมการกีฬา</h2>
              <p className="mt-2 text-sm text-slate-600">ย้ายการมอบหมายสิทธิ์ทั้งหมดไปไว้ในศูนย์กลางหนึ่งเดียว แสดงสิทธิ์บันทึกอันดับรางวัลและสิทธิ์ดูแล RoV แยกตามหน้าที่</p>
              <Link href="/group-sports/certificates/officials" className="mt-3 inline-flex rounded-xl bg-red-800 px-4 py-3 text-sm font-bold text-white hover:bg-red-900">เปิดศูนย์มอบหมายกรรมการ →</Link>
            </section>
          </div>}
        </>}
      </>}
      <div className="pt-3 text-xs text-slate-500">{mode==="print"?"โรงเรียนพิมพ์ได้เฉพาะเอกสารที่ออกแล้วตามสิทธิ์บัญชีของตนเอง":"กรรมการบันทึกอันดับรางวัลตามรายการที่ได้รับมอบหมาย · ไม่ต้องอนุมัติซ้ำ · ไม่แก้คะแนนรายคู่"}</div>
    </div>
    {mode==="print"&&<CertificatePrintSheets documents={printing}/>}
  </main>;
}
