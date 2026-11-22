"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type School = { school_id: string; school_name: string; can_review: boolean };
type Submission = {
  school_id: string; contact_name: string; contact_phone: string; director_name: string;
  school_intro: string; parade_details: string; parade_count: number | null;
  word_path: string | null; word_name: string | null; pdf_path: string | null; pdf_name: string | null;
  status: "submitted" | "accepted" | "returned"; review_note: string; revision: number; submitted_at: string;
};
type Form = { contact_name: string; contact_phone: string; director_name: string; school_intro: string; parade_details: string; parade_count: string };
const empty: Form = {contact_name:"",contact_phone:"",director_name:"",school_intro:"",parade_details:"",parade_count:""};
const BUCKET = "sports-school-submissions";
const SLUG = "phayao-secondary-group-sports-2569";
const field = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:bg-slate-100";
const button = "rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-50";
const secondary = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const labels = {submitted:"ส่งแล้ว · รอตรวจ",accepted:"รับรองแล้ว",returned:"ส่งคืนแก้ไข"};
function errorText(e: unknown) { return typeof e === "object" && e !== null && "message" in e ? String(e.message) : "ไม่สามารถดำเนินการได้"; }
function dateText(value: string) {return new Date(value).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"});}
function Status({row}: {row?: Submission}) {return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${!row?"bg-slate-100 text-slate-600":row.status==="accepted"?"bg-emerald-100 text-emerald-800":row.status==="returned"?"bg-rose-100 text-rose-800":"bg-amber-100 text-amber-900"}`}>{row?labels[row.status]:"ยังไม่ส่ง"}</span>;}

export default function SchoolSubmissionsContent({ embedded = false }: { embedded?: boolean }) {
  const [competition,setCompetition]=useState<{id:string;name:string}|null>(null);
  const [schools,setSchools]=useState<School[]>([]);
  const [rows,setRows]=useState<Submission[]>([]);
  const [selected,setSelected]=useState("");
  const [form,setForm]=useState<Form>(empty);
  const [word,setWord]=useState<File|null>(null);
  const [pdf,setPdf]=useState<File|null>(null);
  const [keepWord,setKeepWord]=useState(true);
  const [keepPdf,setKeepPdf]=useState(true);
  const [note,setNote]=useState("");
  const [email,setEmail]=useState("");
  const [reviewer,setReviewer]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [fileKey,setFileKey]=useState(0);
  const row=rows.find(r=>r.school_id===selected);
  const selectedSchool=schools.find(s=>s.school_id===selected);
  const locked=busy||row?.status==="accepted";

  const load=useCallback(async()=>{
    setLoading(true);setError("");setSchools([]);setRows([]);setEmail("");setReviewer(false);setCompetition(null);
    try {
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user) return;
      setEmail(auth.user.app_metadata?.sports_school_account ? "บัญชีโรงเรียน" : auth.user.email||"บัญชีที่เข้าสู่ระบบ");
      const comp=await supabase.from("sports_competitions").select("id,name").eq("slug",SLUG).maybeSingle();
      if(comp.error) throw comp.error;
      if(!comp.data) throw new Error("ไม่พบการแข่งขันปี 2569 กรุณาตรวจ SQL Patch เดิม");
      setCompetition(comp.data);
      const [list,submissions,permission]=await Promise.all([
        supabase.rpc("sports_submission_school_list",{p_comp:comp.data.id}),
        supabase.from("sports_school_submissions").select("*").eq("competition_id",comp.data.id),
        supabase.rpc("sports_submission_reviewer",{p_comp:comp.data.id}),
      ]);
      if(list.error) throw list.error;if(submissions.error) throw submissions.error;if(permission.error) throw permission.error;
      const available=(list.data||[]) as School[];
      setSchools(available);setRows((submissions.data||[]) as Submission[]);setReviewer(permission.data===true);
      setSelected(old=>available.some(s=>s.school_id===old)?old:available[0]?.school_id||"");
    } catch(e) {setError(errorText(e));setSelected("");} finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();const {data}=supabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){setEmail("");setSchools([]);setRows([]);setSelected("");setReviewer(false);setCompetition(null);setNotice("");}});return ()=>data.subscription.unsubscribe();},[load]);
  useEffect(()=>{
    const existing=rows.find(r=>r.school_id===selected);
    setForm(existing?{contact_name:existing.contact_name,contact_phone:existing.contact_phone,director_name:existing.director_name,school_intro:existing.school_intro,parade_details:existing.parade_details,parade_count:existing.parade_count===null?"":String(existing.parade_count)}:empty);
    setWord(null);setPdf(null);setKeepWord(true);setKeepPdf(true);setNote("");setFileKey(k=>k+1);
  },[selected,rows]);

  async function upload(file:File,kind:"word"|"pdf",comp:string,school:string) {
    const ext=file.name.split(".").pop()?.toLowerCase();
    if(!ext||(kind==="word"?!["doc","docx"].includes(ext):ext!=="pdf")) throw new Error("ชนิดไฟล์ไม่ถูกต้อง");
    if(file.size===0||file.size>10*1024*1024||file.name.length>255) throw new Error("ไฟล์ต้องมีข้อมูล ขนาดไม่เกิน 10 MB และชื่อไม่เกิน 255 ตัวอักษร");
    const mime=ext==="pdf"?"application/pdf":ext==="doc"?"application/msword":"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const path=`${comp}/${school}/${crypto.randomUUID()}.${ext}`;
    const result=await supabase.storage.from(BUCKET).upload(path,file,{contentType:mime,upsert:false});
    if(result.error) throw result.error;
    return {path,name:file.name};
  }
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!competition||!selectedSchool||locked)return;
    setError("");setNotice("");
    if(!(word||pdf||(keepWord&&row?.word_path)||(keepPdf&&row?.pdf_path))){setError("กรุณาแนบ Word หรือ PDF อย่างน้อยหนึ่งไฟล์");return;}
    if(!form.contact_name.trim()){setError("กรุณาระบุชื่อผู้ประสานงาน");return;}
    const count=form.parade_count===""?null:Number(form.parade_count);
    if(count!==null&&(!Number.isInteger(count)||count<0||count>10000)){setError("จำนวนผู้ร่วมขบวนต้องเป็นจำนวนเต็ม 0–10,000");return;}
    setBusy(true);
    try {
      const w=word?await upload(word,"word",competition.id,selected):keepWord&&row?.word_path?{path:row.word_path,name:row.word_name}:null;
      const p=pdf?await upload(pdf,"pdf",competition.id,selected):keepPdf&&row?.pdf_path?{path:row.pdf_path,name:row.pdf_name}:null;
      const result=await supabase.rpc("sports_submit_school_info",{p_comp:competition.id,p_school:selected,p_expected_revision:row?.revision||0,p_contact_name:form.contact_name,p_contact_phone:form.contact_phone,p_director_name:form.director_name,p_school_intro:form.school_intro,p_parade_details:form.parade_details,p_parade_count:count,p_word_path:w?.path||null,p_word_name:w?.name||null,p_pdf_path:p?.path||null,p_pdf_name:p?.name||null});
      if(result.error)throw result.error;
      setNotice("ส่งข้อมูลโรงเรียนเรียบร้อยแล้ว · รอกรรมการตรวจรับ");await load();
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function review(status:"accepted"|"returned") {
    if(!competition||!row||!reviewer||busy)return;
    if(status==="returned"&&!note.trim()){setError("กรุณาระบุเหตุผลส่งคืนแก้ไข");return;}
    if(!window.confirm(status==="accepted"?"ยืนยันรับรองเอกสารโรงเรียนนี้?":"ยืนยันส่งคืนเอกสารให้โรงเรียนแก้ไข?"))return;
    setBusy(true);setError("");setNotice("");
    try {const result=await supabase.rpc("sports_review_school_info",{p_comp:competition.id,p_school:selected,p_expected_revision:row.revision,p_status:status,p_note:note});if(result.error)throw result.error;setNotice(status==="accepted"?"รับรองข้อมูลเรียบร้อย":"ส่งคืนข้อมูลให้โรงเรียนแก้ไขแล้ว");await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function download(path:string,name:string) {
    setError("");
    try {const {data,error}=await supabase.storage.from(BUCKET).download(path);if(error)throw error;const url=URL.createObjectURL(data);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(errorText(e));}
  }
  function update(key:keyof Form,value:string){setForm(old=>({...old,[key]:value}));}
  return <div className={embedded ? "w-full min-w-0 text-slate-900" : "min-h-screen bg-slate-100 text-slate-900"}>
    {!embedded && <header className="bg-gradient-to-r from-red-950 via-red-800 to-red-700 text-white"><div className="mx-auto max-w-6xl px-4 py-7 md:px-8"><Link href="/group-sports" className="text-sm text-red-100 hover:underline">← กลับระบบกีฬากลุ่ม</Link><h1 className="mt-4 text-2xl font-black md:text-3xl">ส่งข้อมูลโรงเรียนและขบวนพิธีเปิด</h1><p className="mt-2 text-sm text-red-100">ภูลังกาเกมส์ 2026 · {competition?.name||"การแข่งขันกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา"}</p>{email&&<p className="mt-3 text-xs">{email} · {reviewer?"ผู้ตรวจรับ":"ผู้ประสานงาน"}</p>}</div></header>}
    {embedded && <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6"><h2 className="text-xl font-black text-slate-900">ส่งข้อมูลโรงเรียนและขบวนพิธีเปิด</h2><p className="mt-1 text-sm text-slate-500">{competition?.name || "ภูลังกาเกมส์ 2569"} · {email ? reviewer ? "กรรมการตรวจรับ" : "ผู้ประสานงาน" : "กรุณาเข้าสู่ระบบ"}</p></section>}
    <div className={embedded ? "w-full space-y-4" : "mx-auto max-w-6xl space-y-4 p-4 md:p-8"}>
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice&&<div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {loading?<p className="rounded-xl bg-white p-6">กำลังตรวจสอบสิทธิ์และข้อมูล...</p>:!email?<section className="rounded-2xl bg-white p-6"><h2 className="font-bold">กรุณาเข้าสู่ระบบก่อนส่งเอกสาร</h2><p className="my-3 text-sm text-slate-600">โรงเรียนเข้าด้วย Username และ Password ที่ได้รับจากผู้ดูแล ส่วนกรรมการสามารถใช้ Google Workspace เดิมได้</p><Link className={button} href="/group-sports/login">เข้าสู่ระบบโรงเรียน</Link> <Link className={secondary} href="/login">เข้าสู่ระบบกรรมการ</Link></section>:!schools.length?<section className="rounded-2xl bg-white p-6"><h2 className="font-bold">{reviewer?"ยังไม่มีโรงเรียนที่เข้าร่วมในทะเบียนการแข่งขัน":"ยังไม่ได้รับสิทธิ์ส่งข้อมูลโรงเรียน"}</h2><p className="my-3 text-sm text-slate-600">กรุณาตรวจทะเบียนโรงเรียน สิทธิ์ผู้ประสานงาน และ SQL Migration</p><button className={secondary} onClick={()=>void load()}>ตรวจสอบอีกครั้ง</button></section>:<>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{reviewer?"สถานะการส่งข้อมูลทุกโรงเรียน":"โรงเรียนที่รับผิดชอบ"}</h2><button disabled={busy} className={secondary} onClick={()=>void load()}>รีเฟรช</button></div>
      <div className="my-4 grid grid-cols-2 gap-2 md:grid-cols-4">{[["ทั้งหมด",schools.length],["ยังไม่ส่ง",schools.filter(s=>!rows.some(r=>r.school_id===s.school_id)).length],["รอตรวจ / ส่งคืน",rows.filter(r=>r.status!=="accepted").length],["รับรองแล้ว",rows.filter(r=>r.status==="accepted").length]].map(([label,num])=><div key={label} className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-600">{label}</p><p className="text-2xl font-bold">{num}</p></div>)}</div>
      {reviewer&&<div className="max-h-72 overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">โรงเรียน</th><th className="p-3">สถานะ</th><th className="p-3">ส่งล่าสุด</th></tr></thead><tbody>{schools.map(s=>{const r=rows.find(x=>x.school_id===s.school_id);return <tr key={s.school_id} className="border-t border-slate-100"><td className="p-3"><button type="button" disabled={busy} onClick={()=>setSelected(s.school_id)} className="text-left font-semibold text-blue-800 underline">{s.school_name}</button></td><td className="p-3"><Status row={r}/></td><td className="p-3 whitespace-nowrap text-xs">{r?dateText(r.submitted_at):"—"}</td></tr>;})}</tbody></table></div>}
      <label className="mt-4 block text-sm font-semibold">เลือกโรงเรียน<select className={field+" mt-1"} value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}>{schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></label></section>
      {selectedSchool&&<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{selectedSchool.school_name}</h2><Status row={row}/></div>
      {row?.review_note&&<p className="mb-4 whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm text-amber-900">หมายเหตุกรรมการ: {row.review_note}</p>}
      <form onSubmit={submit} className="space-y-5"><fieldset disabled={locked} className="space-y-4"><legend className="mb-3 font-bold text-red-800">ข้อมูลโรงเรียน</legend><div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">ชื่อผู้ประสานงาน *<input className={field+" mt-1"} required maxLength={200} value={form.contact_name} onChange={e=>update("contact_name",e.target.value)}/></label>
      <label className="text-sm font-semibold">เบอร์ติดต่อ<input className={field+" mt-1"} type="tel" maxLength={100} value={form.contact_phone} onChange={e=>update("contact_phone",e.target.value)}/></label>
      <label className="text-sm font-semibold">ชื่อผู้อำนวยการโรงเรียน<input className={field+" mt-1"} maxLength={200} value={form.director_name} onChange={e=>update("director_name",e.target.value)}/></label>
      <label className="text-sm font-semibold">จำนวนผู้ร่วมขบวน (ถ้าทราบ)<input className={field+" mt-1"} type="number" min={0} max={10000} step={1} value={form.parade_count} onChange={e=>update("parade_count",e.target.value)}/></label></div>
      <label className="block text-sm font-semibold">ข้อมูลแนะนำโรงเรียน / คำกล่าวพิธีกร<textarea className={field+" mt-1"} rows={4} maxLength={10000} value={form.school_intro} onChange={e=>update("school_intro",e.target.value)}/></label>
      <label className="block text-sm font-semibold">รายละเอียดขบวนต่าง ๆ / ลำดับขบวน / คำบรรยาย<textarea className={field+" mt-1"} rows={6} maxLength={20000} value={form.parade_details} onChange={e=>update("parade_details",e.target.value)} placeholder="เช่น ป้ายโรงเรียน ธง ขบวนเกียรติยศ ขบวนพาเหรด วงโยธวาทิต หรือขบวนอื่น ๆ ตามจริง"/></label>
      <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold">เอกสารแนบ *</h3><p className="mb-3 text-xs text-slate-600">แนบ Word (.doc/.docx) หรือ PDF อย่างน้อย 1 ไฟล์ แนบทั้งสองได้ ขนาดไม่เกิน 10 MB ต่อไฟล์</p><div className="grid gap-3 md:grid-cols-2"><div><label className="block text-sm font-semibold">ไฟล์ Word<input key={`w${fileKey}`} type="file" accept=".doc,.docx" className={field+" mt-1 text-xs"} onChange={e=>setWord(e.target.files?.[0]||null)}/></label>{row?.word_path&&<label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={keepWord} onChange={e=>setKeepWord(e.target.checked)}/> เก็บไฟล์เดิมหากไม่เลือกไฟล์ใหม่</label>}</div><div><label className="block text-sm font-semibold">ไฟล์ PDF<input key={`p${fileKey}`} type="file" accept=".pdf" className={field+" mt-1 text-xs"} onChange={e=>setPdf(e.target.files?.[0]||null)}/></label>{row?.pdf_path&&<label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={keepPdf} onChange={e=>setKeepPdf(e.target.checked)}/> เก็บไฟล์เดิมหากไม่เลือกไฟล์ใหม่</label>}</div></div></div></fieldset>
      {row&&<div className="flex flex-wrap gap-2 text-sm">{row.word_path&&<button type="button" className={secondary} onClick={()=>void download(row.word_path!,row.word_name||"school.docx")}>ดาวน์โหลด Word: {row.word_name}</button>}{row.pdf_path&&<button type="button" className={secondary} onClick={()=>void download(row.pdf_path!,row.pdf_name||"school.pdf")}>ดาวน์โหลด PDF: {row.pdf_name}</button>}</div>}
      <button className={button} disabled={locked} type="submit">{busy?"กำลังดำเนินการ...":row?.status==="accepted"?"รับรองแล้ว · ล็อกการแก้ไข":row?"ส่งข้อมูลฉบับปรับปรุง":"ส่งข้อมูลโรงเรียน"}</button></form>
      {reviewer&&row&&row.status!=="returned"&&<div className="mt-6 space-y-3 border-t border-slate-200 pt-5"><h3 className="font-bold">สำหรับกรรมการตรวจรับ</h3><label className="block text-sm">หมายเหตุ (จำเป็นเมื่อส่งคืน)<textarea className={field+" mt-1"} rows={3} maxLength={2000} value={note} disabled={busy} onChange={e=>setNote(e.target.value)}/></label><div className="flex flex-wrap gap-2">{row.status==="submitted"&&<button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-bold text-white disabled:opacity-50" disabled={busy} onClick={()=>void review("accepted")}>รับรองข้อมูล</button>}<button className={secondary} disabled={busy} onClick={()=>void review("returned")}>ส่งคืนแก้ไข</button></div></div>}
      </section>}
      </>}
      <p className="text-xs text-slate-500">ไฟล์และข้อมูลติดต่อไม่แสดงต่อสาธารณะ · ไม่ควรแนบข้อมูลส่วนบุคคลที่ไม่จำเป็นต่อพิธีเปิด</p>
    </div></div>;
}
