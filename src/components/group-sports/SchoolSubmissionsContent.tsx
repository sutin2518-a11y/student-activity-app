"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type School = { school_id: string; school_name: string; can_review: boolean };
type SubmissionStatus = "submitted" | "accepted" | "returned";
type Submission = {
  school_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  director_name: string | null;
  school_intro: string | null;
  parade_details: string | null;
  parade_count: number | null;
  word_path: string | null;
  word_name: string | null;
  pdf_path: string | null;
  pdf_name: string | null;
  status: SubmissionStatus;
  review_note: string | null;
  revision: number;
  submitted_at: string;
};
type Progress = {
  school_id: string;
  school_name: string;
  submission_status: SubmissionStatus | "not_submitted";
  submitted_at: string | null;
};
type Filter = "all" | "sent" | "not_sent" | "returned";

const BUCKET = "sports-school-submissions";
const SLUG = "phayao-secondary-group-sports-2569";
const TEMPLATE_URL = "/templates/school-information-phulangka-games-2569.docx";
const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100";
const PRIMARY = "inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY = "inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-50 disabled:opacity-50";

function displayError(e: unknown): string {
  return e && typeof e === "object" && "message" in e ? String(e.message) : "ไม่สามารถดำเนินการได้ กรุณาติดต่อผู้ดูแลระบบ";
}
function dateText(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
}
function Status({ status }: { status?: Progress["submission_status"] }) {
  const cls = status === "accepted" ? "bg-emerald-100 text-emerald-800" : status === "returned" ? "bg-orange-100 text-orange-900" : status === "submitted" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600";
  const name = status === "accepted" ? "รับรองแล้ว" : status === "returned" ? "ส่งคืนแก้ไข" : status === "submitted" ? "ส่งแล้ว · รอตรวจ" : "ยังไม่ส่ง";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{name}</span>;
}

/** Shared UI: used both on the standalone page and inside GroupSportsDashboard. */
export default function SchoolSubmissionsContent({ embedded = false }: { embedded?: boolean }) {
  const [competition, setCompetition] = useState<{ id: string; name: string } | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState("");
  const [reviewer, setReviewer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedSchool = schools.find((s) => s.school_id === selected);
  const row = submissions.find((s) => s.school_id === selected);
  const locked = busy || row?.status === "accepted";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSchools([]); setSubmissions([]); setProgress([]); setReviewer(false);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        setCompetition(null); setSchools([]); setSubmissions([]); setProgress([]); setEmail(""); setSelected(""); setReviewer(false);
        return;
      }
      setEmail(auth.user.app_metadata?.sports_school_account ? "บัญชีโรงเรียน" : auth.user.email || "บัญชีที่เข้าสู่ระบบ");
      const comp = await supabase.from("sports_competitions").select("id,name").eq("slug", SLUG).maybeSingle();
      if (comp.error) throw comp.error;
      if (!comp.data) throw new Error("ไม่พบทะเบียนการแข่งขันปี 2569");
      setCompetition(comp.data);
      const [schoolList, existing, permission, allProgress] = await Promise.all([
        supabase.rpc("sports_submission_school_list", { p_comp: comp.data.id }),
        supabase.from("sports_school_submissions").select("*").eq("competition_id", comp.data.id),
        supabase.rpc("sports_submission_reviewer", { p_comp: comp.data.id }),
        supabase.rpc("sports_school_submission_progress", { p_comp: comp.data.id }),
      ]);
      if (schoolList.error) throw schoolList.error;
      if (existing.error) throw existing.error;
      if (permission.error) throw permission.error;
      if (allProgress.error) {
        throw new Error("ยังไม่พบฟังก์ชันสรุปสถานะโรงเรียน กรุณารัน SQL Migration 0019 ก่อนใช้งาน: " + allProgress.error.message);
      }
      const available = (schoolList.data || []) as School[];
      setSchools(available);
      setSubmissions((existing.data || []) as Submission[]);
      setProgress((allProgress.data || []) as Progress[]);
      setReviewer(permission.data === true);
      setSelected((old) => available.some((s) => s.school_id === old) ? old : (available[0]?.school_id || ""));
    } catch (e) {
      setError(displayError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCompetition(null); setSchools([]); setSubmissions([]); setProgress([]); setEmail(""); setSelected(""); setReviewer(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load]);
  useEffect(() => { setFile(null); setFileKey((key) => key + 1); setNote(""); }, [selected]);

  const counts = useMemo(() => ({
    all: progress.length,
    sent: progress.filter((p) => p.submission_status !== "not_submitted").length,
    not_sent: progress.filter((p) => p.submission_status === "not_submitted").length,
    returned: progress.filter((p) => p.submission_status === "returned").length,
    accepted: progress.filter((p) => p.submission_status === "accepted").length,
  }), [progress]);
  const filtered = useMemo(() => progress.filter((p) => {
    if (query && !p.school_name.toLocaleLowerCase("th-TH").includes(query.toLocaleLowerCase("th-TH"))) return false;
    if (filter === "sent") return p.submission_status !== "not_submitted";
    if (filter === "not_sent") return p.submission_status === "not_submitted";
    if (filter === "returned") return p.submission_status === "returned";
    return true;
  }), [progress, query, filter]);

  function handleFile(next: File | null) {
    setError("");
    if (!next) { setFile(null); return; }
    if (!/\.docx$/i.test(next.name)) {
      setError("กรุณาเลือกไฟล์ Word ชนิด .docx เท่านั้น (ใช้แบบฟอร์มที่ดาวน์โหลดจากระบบ)");
      setFile(null); setFileKey((v) => v + 1); return;
    }
    if (!next.size || next.size > 10 * 1024 * 1024 || next.name.length > 255) {
      setError("ไฟล์ Word ต้องมีขนาดไม่เกิน 10 MB และชื่อไฟล์ไม่เกิน 255 ตัวอักษร");
      setFile(null); setFileKey((v) => v + 1); return;
    }
    setFile(next);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!competition || !selectedSchool || locked) return;
    setNotice(""); setError("");
    if (!file && !row?.word_path) { setError("กรุณาดาวน์โหลดแบบฟอร์ม กรอกข้อมูลใน Word และอัปโหลดไฟล์ .docx ก่อนส่ง"); return; }
    if (row?.status === "returned" && !file) { setError("กรรมการส่งคืนให้แก้ไข กรุณาเลือกไฟล์ Word ฉบับแก้ไขก่อนส่งใหม่"); return; }
    if (!file && row?.status === "submitted") { setError("ข้อมูลนี้ส่งแล้ว หากต้องการส่งฉบับปรับปรุง กรุณาเลือกไฟล์ Word ใหม่"); return; }
    if (!(await sportsConfirm(`ยืนยันส่งแบบฟอร์มข้อมูลโรงเรียน ${selectedSchool.school_name} ใช่หรือไม่?`))) return;
    setBusy(true);
    let newPath: string | null = null;
    try {
      if (file) {
        const path = `${competition.id}/${selected}/${crypto.randomUUID()}.docx`;
        const uploaded = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: false,
        });
        if (uploaded.error) throw uploaded.error;
        newPath = path;
      }
      // Preserve legacy structured fields to avoid deleting historical submissions.
      // Existing RPC requires a contact_name; the document itself is the source of truth.
      const result = await supabase.rpc("sports_submit_school_info", {
        p_comp: competition.id,
        p_school: selected,
        p_expected_revision: row?.revision || 0,
        p_contact_name: row?.contact_name?.trim() || "ข้อมูลตามแบบฟอร์ม Word",
        p_contact_phone: row?.contact_phone || "",
        p_director_name: row?.director_name || "",
        p_school_intro: row?.school_intro || "",
        p_parade_details: row?.parade_details || "",
        p_parade_count: row?.parade_count ?? null,
        p_word_path: newPath || row?.word_path || null,
        p_word_name: file?.name || row?.word_name || null,
        p_pdf_path: row?.pdf_path || null,
        p_pdf_name: row?.pdf_name || null,
      });
      if (result.error) throw result.error;
      setFile(null); setFileKey((v) => v + 1);
      setNotice("ส่งไฟล์ Word ของโรงเรียนเรียบร้อยแล้ว · ระบบบันทึกวันและเวลาที่ส่งไว้แล้ว");
      await load();
    } catch (e) {
      // Avoid leaving an unused private file if the metadata transaction failed.
      if (newPath) await supabase.storage.from(BUCKET).remove([newPath]);
      setError("ส่งไฟล์ไม่สำเร็จ: " + displayError(e));
    } finally {
      setBusy(false);
    }
  }

  async function download(path: string, name: string) {
    setError("");
    try {
      const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
      if (downloadError) throw downloadError;
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { setError("ดาวน์โหลดไฟล์ไม่สำเร็จ: " + displayError(e)); }
  }

  async function review(next: "accepted" | "returned") {
    if (!competition || !row || !reviewer || busy) return;
    if (next === "returned" && !note.trim()) { setError("กรุณาระบุเหตุผลที่ส่งคืนแก้ไข"); return; }
    if (!(await sportsConfirm(next === "accepted" ? "ยืนยันรับรองไฟล์ Word โรงเรียนนี้?" : "ยืนยันส่งคืนให้โรงเรียนแก้ไขไฟล์ Word?"))) return;
    setError(""); setNotice(""); setBusy(true);
    try {
      const result = await supabase.rpc("sports_review_school_info", {
        p_comp: competition.id, p_school: selected, p_expected_revision: row.revision, p_status: next, p_note: note,
      });
      if (result.error) throw result.error;
      setNote("");
      setNotice(next === "accepted" ? "รับรองเอกสารเรียบร้อยแล้ว" : "ส่งคืนเอกสารให้โรงเรียนแก้ไขแล้ว");
      await load();
    } catch (e) { setError(displayError(e)); } finally { setBusy(false); }
  }

  return <div className={embedded ? "w-full min-w-0 text-slate-900" : "min-h-screen bg-red-50/30 text-slate-900"}>
    {!embedded && <header className="bg-gradient-to-r from-red-950 via-red-800 to-red-700 text-white"><div className="mx-auto max-w-6xl px-4 py-7 md:px-8"><Link href="/group-sports" className="text-sm text-red-100 hover:underline">← กลับระบบกีฬากลุ่ม</Link><h1 className="mt-3 text-2xl font-black md:text-3xl">ส่งข้อมูลโรงเรียน</h1><p className="mt-1 text-sm text-red-100">ดาวน์โหลดแบบฟอร์ม Word · กรอกข้อมูล · อัปโหลดเอกสาร · ติดตามสถานะ</p></div></header>}
    <div className={embedded ? "space-y-5" : "mx-auto max-w-6xl space-y-5 p-4 md:p-8"}>
      {!loading && Boolean(email) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">ภาพรวมการส่งข้อมูลโรงเรียน</h2><button className={SECONDARY} type="button" onClick={() => void load()} disabled={busy}>↻ รีเฟรชสถานะ</button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {([{ label: "โรงเรียนทั้งหมด", value: counts.all, color: "text-slate-900", filter: "all" }, { label: "ส่งแล้ว", value: counts.sent, color: "text-emerald-800", filter: "sent" }, { label: "ยังไม่ส่ง", value: counts.not_sent, color: "text-red-800", filter: "not_sent" }, { label: "ส่งคืนแก้ไข", value: counts.returned, color: "text-orange-700", filter: "returned" }, { label: "รับรองแล้ว", value: counts.accepted, color: "text-emerald-700", filter: "sent" }] as const).map((item) => <button type="button" key={item.label} onClick={() => setFilter(item.filter)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-red-300 hover:bg-red-50"><p className="text-xs text-slate-600">{item.label}</p><p className={`mt-1 text-2xl font-black ${item.color}`}>{item.value}</p></button>)}
          </div>
          {counts.all > 0 && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${Math.round((counts.sent / counts.all) * 100)}%` }}/></div>}
          <p className="mt-2 text-xs text-slate-500">“ส่งแล้ว” รวมเอกสารที่รอตรวจ รับรองแล้ว และส่งคืนให้แก้ไข ส่วน “ยังไม่ส่ง” คือโรงเรียนที่ไม่มีประวัติการส่งเอกสาร</p>
        </section>
      )}
      <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-red-900">ส่งแบบฟอร์มข้อมูลโรงเรียน</h2><p className="mt-1 text-sm text-slate-600">ภูลังกาเกมส์ ปีการศึกษา 2569 · กรอกข้อมูลทั้ง 18 หัวข้อใน Word เท่านั้น ไม่ต้องพิมพ์ซ้ำบนเว็บไซต์</p></div>{email && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-900">{reviewer ? "ผู้ดูแล/กรรมการ" : email}</span>}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5"><p className="mb-1 text-xs font-black uppercase tracking-widest text-red-700">ขั้นตอนที่ 1</p><h3 className="text-lg font-bold">ดาวน์โหลดแบบฟอร์ม Word</h3><p className="mt-2 text-sm leading-6 text-slate-600">ใช้แบบฟอร์มต้นฉบับที่ผู้จัดการแข่งขันกำหนด กรอกข้อมูลทั้ง 18 หัวข้อ แล้วบันทึกเป็นไฟล์ .docx</p><a className={`${PRIMARY} mt-4`} href={TEMPLATE_URL} download="แบบฟอร์มข้อมูลโรงเรียน-ภูลังกาเกมส์-2569.docx">↓ ดาวน์โหลดแบบฟอร์ม Word (.docx)</a></div>
          <div className="rounded-2xl border border-red-200 bg-white p-5"><p className="mb-1 text-xs font-black uppercase tracking-widest text-red-700">ขั้นตอนที่ 2</p><h3 className="text-lg font-bold">อัปโหลดไฟล์เพื่อส่งข้อมูล</h3><p className="mt-2 text-sm leading-6 text-slate-600">เลือกโรงเรียนและแนบไฟล์ Word ที่กรอกครบถ้วน ผู้ดูแลจะตรวจรับไฟล์ในระบบ</p>{email ? <p className="mt-4 text-xs font-semibold text-emerald-700">เข้าสู่ระบบแล้ว · พร้อมส่งไฟล์ตามสิทธิ์โรงเรียน</p> : <Link href="/group-sports/login" className={`${PRIMARY} mt-4`}>เข้าสู่ระบบโรงเรียน</Link>}</div>
        </div>
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
      {loading ? <section className="rounded-2xl bg-white p-6">กำลังโหลดข้อมูลโรงเรียนและสถานะการส่ง...</section> : !email ? <section className="rounded-2xl bg-white p-6"><p className="font-bold">กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์</p><p className="mt-1 text-sm text-slate-600">โรงเรียนใช้ Username/Password ส่วนผู้ดูแลใช้บัญชีกรรมการตามสิทธิ์เดิม</p></section> : <>

        {schools.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">{reviewer ? "รับเอกสารของโรงเรียน" : "ส่งเอกสารของโรงเรียน"}</h2><Status status={row?.status}/></div>
          {reviewer ? <label className="mb-4 block text-sm font-bold">เลือกโรงเรียนที่ต้องการตรวจรับ<select className={`${INPUT} mt-2`} value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy}>{schools.map((s) => <option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></label> : <p className="mb-4 rounded-lg bg-red-50 p-3 font-semibold text-red-900">{selectedSchool?.school_name || "โรงเรียนของคุณ"}</p>}
          {row?.review_note && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">หมายเหตุผู้ตรวจ: {row.review_note}</p>}
          <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">ไฟล์แบบฟอร์ม Word ของโรงเรียน (.docx) *<input key={fileKey} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className={`${INPUT} mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-red-100 file:px-3 file:py-2 file:font-semibold file:text-red-900`} onChange={(e) => handleFile(e.target.files?.[0] || null)} disabled={locked}/></label>
            {file && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">เลือกไฟล์แล้ว: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)</p>}
            {row?.word_path && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex-1 text-sm"><p className="font-semibold">ไฟล์ล่าสุด: {row.word_name || "ข้อมูลโรงเรียน.docx"}</p><p className="mt-1 text-xs text-slate-600">ส่งเมื่อ {dateText(row.submitted_at)} · ครั้งที่ {row.revision}</p></div><button type="button" className={SECONDARY} onClick={() => void download(row.word_path!, row.word_name || "ข้อมูลโรงเรียน.docx")}>↓ ดู/ดาวน์โหลดไฟล์</button></div>}
            <div className="flex flex-wrap items-center gap-3"><button className={PRIMARY} disabled={locked || !file} type="submit">{busy ? "กำลังอัปโหลดและบันทึก..." : row?.status === "accepted" ? "เอกสารรับรองแล้ว" : row?.status === "returned" ? "↑ ส่งไฟล์ฉบับแก้ไข" : row ? "↑ ส่งไฟล์ฉบับปรับปรุง" : "↑ ส่งข้อมูลโรงเรียน"}</button><p className="text-xs text-slate-500">รับเฉพาะ .docx · ไม่เกิน 10 MB · การส่งซ้ำจะอัปเดตไฟล์ล่าสุดโดยเก็บไฟล์เดิมใน Storage ไว้</p></div>
          </form>
          {reviewer && row && row.status === "submitted" && <div className="mt-6 border-t border-slate-200 pt-5"><h3 className="font-bold">ตรวจรับเอกสาร (กรรมการ)</h3><label className="mt-3 block text-sm">เหตุผลส่งคืนแก้ไข<textarea rows={2} maxLength={2000} className={`${INPUT} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}/></label><div className="mt-3 flex flex-wrap gap-2">{row.status === "submitted" && <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="button" onClick={() => void review("accepted")}>✓ รับรองเอกสาร</button>}<button className={SECONDARY} disabled={busy} type="button" onClick={() => void review("returned")}>ส่งคืนแก้ไข</button></div></div>}
        </section>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">ติดตามสถานะการส่งข้อมูลทุกโรงเรียน</h2><p className="mt-1 text-sm text-slate-500">ดูได้ว่าโรงเรียนใดส่งเอกสารแล้ว และโรงเรียนใดยังไม่ได้ส่ง</p></div><span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-800">แสดง {filtered.length} / {counts.all} โรงเรียน</span></div>
          <div className="my-4 flex flex-wrap gap-2">{([{ label: "ทั้งหมด", key: "all" }, { label: "ส่งแล้ว", key: "sent" }, { label: "ยังไม่ส่ง", key: "not_sent" }, { label: "ส่งคืนแก้ไข", key: "returned" }] as const).map((o) => <button type="button" key={o.key} onClick={() => setFilter(o.key)} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${filter === o.key ? "border-red-700 bg-red-700 text-white" : "border-red-100 bg-white text-red-800 hover:bg-red-50"}`}>{o.label}</button>)}</div>
          <label className="block text-sm font-semibold">ค้นหาชื่อโรงเรียน<input className={`${INPUT} mt-1`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="พิมพ์ชื่อโรงเรียนเพื่อค้นหา"/></label>
          <div className="mt-4 max-h-[440px] overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[570px] text-left text-sm"><thead className="sticky top-0 z-10 bg-red-50 text-red-950"><tr><th className="p-3">ลำดับ</th><th className="p-3">โรงเรียน</th><th className="p-3">สถานะ</th><th className="p-3">วันที่ส่งล่าสุด</th></tr></thead><tbody>{filtered.map((p, i) => <tr key={p.school_id} className="border-t border-slate-100 hover:bg-red-50/40"><td className="p-3 text-slate-500">{i + 1}</td><td className="p-3 font-semibold">{reviewer && schools.some((s) => s.school_id === p.school_id) ? <button className="text-left text-red-800 underline underline-offset-2" type="button" onClick={() => setSelected(p.school_id)}>{p.school_name}</button> : p.school_name}</td><td className="p-3"><Status status={p.submission_status}/></td><td className="p-3 whitespace-nowrap text-slate-600">{dateText(p.submitted_at)}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">ไม่พบโรงเรียนตามตัวกรอง</p>}</div>
          <p className="mt-3 text-xs text-slate-500">ตารางนี้แสดงเฉพาะชื่อโรงเรียน สถานะ และเวลาส่ง ไม่มีการเปิดเผยไฟล์ Word หรือข้อมูลภายในเอกสารของโรงเรียนอื่น</p>
        </section>
      </>}
    </div>
  </div>;
}
