"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import SchoolParadeReference, { getSchoolParadeReference, hasSchoolParadeReference, type ParadeReferenceOverride } from "@/components/group-sports/SchoolParadeReference";

export const SCHOOL_INFORMATION_SECTIONS = [
  { key: "parade_map", label: "แผนผังการยืนขบวนในสนาม", hint: "แผนผังตำแหน่งแถวและจุดยืนในพิธีเปิด" },
  { key: "cheer_stands", label: "อัฒจันทร์กองเชียร์", hint: "ตำแหน่งอัฒจันทร์และพื้นที่เชียร์ที่คณะกรรมการจัดสรร" },
  { key: "parade_order", label: "ลำดับขบวน", hint: "ลำดับการเดินเข้าสนามและข้อมูลกำหนดเวลา" },
  { key: "assembly_points", label: "จุดตั้งขบวน", hint: "พื้นที่รวมพลและตำแหน่งเตรียมขบวนก่อนเข้าสนาม" },
  { key: "navigation", label: "แผนที่และการนำทาง", hint: "ลิงก์นำทาง Google Maps ไปยังสนามแข่งขัน จุดจอดรถ จุดส่งขบวน และสถานที่นัดหมาย" },
  { key: "announcements", label: "ประกาศและเอกสารอื่น ๆ", hint: "ข้อมูลเพิ่มเติมสำหรับทุกโรงเรียน" },
] as const;

export type SchoolInformationSection = "submission" | (typeof SCHOOL_INFORMATION_SECTIONS)[number]["key"];

type Bulletin = {
  id: string;
  competition_id: string;
  section: Exclude<SchoolInformationSection, "submission">;
  title: string;
  details: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  maps_url: string | null;
  is_published: boolean;
  is_primary: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type Editor = { id?: string; title: string; details: string; mapsUrl: string; file: File | null; isPrimary: boolean; removeFile: boolean; wasPublished: boolean };
const EMPTY_EDITOR: Editor = { title: "", details: "", mapsUrl: "", file: null, isPrimary: false, removeFile: false, wasPublished: false };
const BUCKET = "sports-school-information";
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Validate Maps links before saving and again before displaying them.
// Accept Google Maps Directions links and official shortened Share links only.
function safeGoogleMapsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.href.length > 2048) return null;
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const isGoogleMaps = (host === "google.com" || host === "www.google.com" || host === "google.co.th" || host === "www.google.co.th") && (path === "/maps" || path.startsWith("/maps/"));
    const isMapsSubdomain = (host === "maps.google.com" || host === "maps.google.co.th");
    const isShortLink = (host === "maps.app.goo.gl" && path.length > 1) || (host === "goo.gl" && path.startsWith("/maps/"));
    return (isGoogleMaps || isMapsSubdomain || isShortLink) ? parsed.href : null;
  } catch { return null; }
}

function thaiDate(value: string | null): string {
  if (!value) return "ยังไม่เผยแพร่";
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as {message: unknown}).message);
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

export default function SchoolInformationHub({ competitionId, section, canManage }: {
  competitionId: string | null;
  section: Exclude<SchoolInformationSection, "submission">;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<Bulletin[]>([]);
  const [fileLinks, setFileLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const category = SCHOOL_INFORMATION_SECTIONS.find((item) => item.key === section);

  const refresh = useCallback(async (silent = false) => {
    if (!competitionId) return;
    if (!silent) { setLoading(true); setError(""); }
    try {
      const response = await supabase.from("sports_school_information")
        .select("id,competition_id,section,title,details,attachment_path,attachment_name,attachment_mime,maps_url,is_published,is_primary,published_at,created_at,updated_at")
        .eq("competition_id", competitionId).eq("section", section)
        .order("created_at", { ascending: false });
      if (response.error) throw response.error;
      const items = (response.data ?? []) as Bulletin[];
      setRows(items);
      const links: Record<string,string> = {};
      await Promise.all(items.filter((item) => item.attachment_path).map(async (item) => {
        if (!item.attachment_path) return;
        const result = await supabase.storage.from(BUCKET).createSignedUrl(item.attachment_path, 600);
        if (result.data?.signedUrl) links[item.id] = result.data.signedUrl;
      }));
      setFileLinks(links);
    } catch (reason: unknown) {
      setError(`ไม่สามารถโหลดประกาศได้: ${errorMessage(reason)} (ตรวจว่าติดตั้ง Migration v33.13 เพิ่มคอลัมน์ is_primary แล้ว)`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [competitionId,section]);

  // Refresh when another administrator edits content in another tab/device.
  // The public view checks periodically and when the tab becomes active again.
  useEffect(() => {
    void refresh();
    const refreshVisible = () => { if (document.visibilityState === "visible") void refresh(true); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(true); }, 30000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("focus", refreshVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!editor?.file || !editor.file.type.startsWith("image/")) { setDraftPreview(""); return; }
    const url = URL.createObjectURL(editor.file);
    setDraftPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editor?.file]);

  const checkFile = (file: File | null) => {
    if (!file) return;
    if (!EXTENSIONS[file.type] || (editor?.isPrimary && !file.type.startsWith("image/"))) { setError(editor?.isPrimary ? "ภาพหลักรองรับเฉพาะ JPG, PNG หรือ WebP" : "รองรับเฉพาะ PDF, JPG, PNG หรือ WebP"); return; }
    if (file.size > MAX_FILE_SIZE) { setError("ไฟล์ต้องไม่เกิน 12 MB"); return; }
    setError("");
    setEditor((previous) => previous ? { ...previous, file, removeFile: false } : previous);
  };

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => checkFile(event.target.files?.[0] ?? null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !competitionId || !editor || busy) return;
    setError(""); setSuccess("");
    const title = editor.title.trim();
    const details = editor.details.trim();
    if (!title || title.length > 160 || details.length > 5000) {
      setError("ระบุหัวข้อไม่เกิน 160 ตัวอักษร และรายละเอียดไม่เกิน 5,000 ตัวอักษร"); return;
    }
    const rawMapsUrl = editor.mapsUrl.trim();
    const mapsUrl = safeGoogleMapsUrl(rawMapsUrl);
    if ((rawMapsUrl && !mapsUrl) || (section === "navigation" && !mapsUrl)) {
      setError(section === "navigation" ? "กรุณาใส่ลิงก์นำทาง Google Maps ที่ถูกต้อง" : "ลิงก์ต้องเป็น HTTPS จาก Google Maps เท่านั้น"); return;
    }
    if (editor.file && (!EXTENSIONS[editor.file.type] || editor.file.size > MAX_FILE_SIZE || (editor.isPrimary && !editor.file.type.startsWith("image/")))) {
      setError("ชนิดไฟล์หรือขนาดไฟล์ไม่ถูกต้อง (ไม่เกิน 12 MB)"); return;
    }
    setBusy(true);
    try {
      let recordId = editor.id;
      if (!recordId) {
        // Create an unpublished row so a failed upload cannot accidentally publish incomplete content.
        const created = await supabase.from("sports_school_information").insert({
          competition_id: competitionId, section, title, details, maps_url: mapsUrl,
          is_primary: editor.isPrimary, is_published: false,
        }).select("id").single();
        if (created.error) throw created.error;
        recordId = String(created.data.id);
      }
      const changes: Record<string, string | boolean | null> = {
        title, details, maps_url: mapsUrl,
      };
      if (editor.file && recordId) {
        // Upload before updating the row: editing a published record must not change
        // what the public sees when the storage upload fails.
        const extension = EXTENSIONS[editor.file.type];
        const uniqueId = crypto.randomUUID();
        const path = `${competitionId}/${recordId}/${uniqueId}.${extension}`;
        const uploaded = await supabase.storage.from(BUCKET).upload(path, editor.file, {
          contentType: editor.file.type, cacheControl: "3600", upsert: false,
        });
        if (uploaded.error) throw uploaded.error;
        changes.attachment_path = path;
        changes.attachment_name = editor.file.name;
        changes.attachment_mime = editor.file.type;
      } else if (editor.removeFile && editor.isPrimary) {
        // Unlink the custom image and show the bundled official reference again.
        // Old objects are deliberately kept in private storage for audit.
        changes.attachment_path = null;
        changes.attachment_name = null;
        changes.attachment_mime = null;
      }
      if (editor.isPrimary) changes.is_published = true;
      const updated = await supabase.from("sports_school_information")
        .update(changes).eq("id", recordId).eq("competition_id", competitionId).eq("section", section)
        .select("id,is_published").single();
      if (updated.error) throw updated.error;
      setSuccess(editor.isPrimary || updated.data.is_published
        ? "บันทึกแล้ว ข้อมูลที่เผยแพร่ได้รับการอัปเดตทันที (ผู้ชมที่เปิดค้างไว้จะรีเฟรชอัตโนมัติ)"
        : "บันทึกฉบับร่างแล้ว กดเผยแพร่เมื่อพร้อมให้โรงเรียนเห็น");
      setEditor(null);
      await refresh(true);
    } catch (reason: unknown) {
      setError(`บันทึกไม่สำเร็จ: ${errorMessage(reason)} (หากเกิดข้อผิดพลาดเกี่ยวกับ is_primary ให้รัน Migration v33.13 ก่อน)`);
    } finally { setBusy(false); }
  };

  const setPublication = async (item: Bulletin, published: boolean) => {
    if (!competitionId || !canManage || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await supabase.from("sports_school_information")
        .update({ is_published: published })
        .eq("id", item.id).eq("competition_id", competitionId).select("id").single();
      if (result.error) throw result.error;
      setSuccess(published ? "เผยแพร่ให้ทุกโรงเรียนแล้ว" : "ถอนประกาศกลับเป็นฉบับร่างแล้ว");
      await refresh();
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const isReference = hasSchoolParadeReference(section);
  const primary = isReference ? rows.find(item => item.is_primary) : undefined;
  const visibleRows = rows.filter(item => !item.is_primary && (!canManage || filter === "all" || (filter === "published" ? item.is_published : !item.is_published)));
  const visiblePrimary = primary && (canManage || primary.is_published) ? primary : undefined;
  const primaryImage = visiblePrimary?.attachment_mime?.startsWith("image/") && visiblePrimary?.attachment_path
    ? fileLinks[visiblePrimary.id] : undefined;
  const primaryOverride: ParadeReferenceOverride | undefined = visiblePrimary ? {
    title: visiblePrimary.title,
    note: visiblePrimary.details,
    ...(primaryImage ? { file: primaryImage, preview: primaryImage } : {}),
  } : undefined;

  const editPrimary = () => {
    if (!isReference || !canManage) return;
    const reference = getSchoolParadeReference(section);
    setEditor({
      id: primary?.id,
      title: primary?.title ?? reference.title,
      details: primary?.details ?? reference.note,
      mapsUrl: primary?.maps_url ?? "",
      file: null, isPrimary: true, removeFile: false,
      wasPublished: primary?.is_published ?? false,
    });
    setError(""); setSuccess("");
  };

  return <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-black text-[#7f1d1d]">{category?.label ?? "ข้อมูลสำหรับโรงเรียน"}</h2>
        <p className="mt-1 text-sm text-slate-600">{category?.hint}</p>
        <p className="mt-1 text-xs text-slate-500">รายการที่ยังไม่เผยแพร่จะไม่ปรากฏสำหรับโรงเรียน</p>
      </div>
      {canManage && <div className="flex flex-wrap gap-2">
        {isReference && <button type="button" onClick={editPrimary} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">✎ เปลี่ยนภาพหลัก / หัวเรื่อง / คำอธิบาย</button>}
        <button type="button" onClick={() => { setEditor({...EMPTY_EDITOR});setSuccess("");setError(""); }} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50">{section === "navigation" ? "+ เพิ่มจุดหมาย" : "+ เพิ่มข้อมูลเพิ่มเติม"}</button>
      </div>}
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {success && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {editor && canManage && <form onSubmit={save} className="mb-5 grid gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <h3 className="text-base font-bold text-rose-900">{editor.isPrimary ? "จัดการภาพและข้อความหลักของหัวข้อนี้" : editor.id ? "แก้ไขข้อมูล (รวมถึงรายการที่เผยแพร่แล้ว)" : "เพิ่มข้อมูลเบื้องต้น (ฉบับร่าง)"}</h3>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">{section === "navigation" ? "ชื่อสถานที่ / จุดหมาย" : "ชื่อเรื่อง"}
        <input value={editor.title} required maxLength={160} onChange={e => setEditor({...editor, title:e.target.value})} className="rounded-lg border border-rose-200 bg-white p-2.5 outline-red-600" placeholder={section === "navigation" ? "เช่น จุดรวมพลขบวนพาเหรด หรือ ลานจอดรถโรงเรียน" : "เช่น แผนผังขบวนพิธีเปิด (ฉบับร่าง)"} />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">รายละเอียด / คำชี้แจง
        <textarea value={editor.details} maxLength={5000} rows={4} onChange={e => setEditor({...editor, details:e.target.value})} className="rounded-lg border border-rose-200 bg-white p-2.5 outline-red-600" placeholder="คำชี้แจง วัน เวลา จุดนัดหมาย หรือหมายเหตุการเปลี่ยนแปลง" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">ลิงก์ Google Maps {section === "navigation" ? "*" : "(ถ้ามี)"}
        <input type="url" maxLength={2048} required={section === "navigation"} value={editor.mapsUrl} onChange={e => setEditor({...editor, mapsUrl:e.target.value})} className="rounded-lg border border-rose-200 bg-white p-2.5 font-normal outline-red-600" placeholder="https://www.google.com/maps/dir/?api=1&destination=..." />
        <span className="text-xs font-normal text-slate-600">ผู้ดูแลเปิด Google Maps → เลือกจุดหมาย → เส้นทาง → แชร์ → คัดลอกลิงก์ แล้ววางที่นี่ (รองรับ maps.app.goo.gl ด้วย) โรงเรียนจะกดเปิดแผนที่จากปุ่มนำทางได้ ไม่ต้องใช้ Google Maps API Key</span>
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-800">{editor.isPrimary ? "เปลี่ยนภาพหลัก (JPG/PNG/WebP ไม่เกิน 12 MB)" : "แนบภาพหรือเอกสาร (PDF/JPG/PNG/WebP ไม่เกิน 12 MB)"}
        <input type="file" accept={editor.isPrimary ? ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" : ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"} onChange={onPickFile} className="rounded-lg border border-rose-200 bg-white p-2 text-sm" />
        <span className="text-xs font-normal text-slate-600">{editor.file?.name ?? (editor.removeFile ? "จะกลับไปใช้ภาพต้นแบบเมื่อบันทึก" : editor.id ? "ไม่เลือกไฟล์ = เก็บไฟล์เดิม" : "ไม่เลือกไฟล์ = แสดงภาพต้นแบบสำหรับหัวข้อนี้") }</span>
      </label>
      {editor.isPrimary && <div className="rounded-lg border border-blue-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-blue-900">ตัวอย่างก่อนบันทึก</p>
        <h4 className="mb-1 text-base font-extrabold text-blue-950">{editor.title || "ชื่อเรื่อง"}</h4>
        <p className="mb-3 whitespace-pre-wrap text-xs text-slate-600">{editor.details || "คำอธิบายของภาพ"}</p>
        <img src={draftPreview || (!editor.removeFile && primaryImage) || (isReference ? getSchoolParadeReference(section).preview : "")} alt="ตัวอย่างภาพหลัก" className="max-h-[280px] w-full object-contain" />
        {primary?.attachment_path && <button type="button" className="mt-2 rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900" onClick={() => setEditor(old => old ? {...old, file:null, removeFile:true} : old)}>ใช้ภาพต้นแบบแทนภาพที่อัปโหลด</button>}
        <p className="mt-2 text-xs text-slate-500">ภาพเดิมใน Storage จะเก็บไว้เป็นประวัติ แต่จะไม่แสดงบนหน้าเว็บเมื่อเปลี่ยนภาพแล้ว</p>
      </div>}
      <div className="flex flex-wrap gap-2"><button disabled={busy} type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?"กำลังบันทึก...":editor.isPrimary || editor.wasPublished ? "บันทึกและอัปเดตหน้าเว็บ" : "บันทึกฉบับร่าง"}</button>
        <button type="button" disabled={busy} onClick={() => setEditor(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">ยกเลิก</button></div>
    </form>}
    {canManage && <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-slate-500">มี {rows.length} รายการ ({rows.filter(item => item.is_published).length} เผยแพร่แล้ว)</span>
      <select aria-label="กรองสถานะประกาศ" value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm">
        <option value="all">ทั้งหมด</option><option value="published">เผยแพร่แล้ว</option><option value="draft">ฉบับร่าง</option>
      </select>
    </div>}
    {isReference && <div className="mb-5">
      <SchoolParadeReference section={section} override={primaryOverride} />
      {visiblePrimary && safeGoogleMapsUrl(visiblePrimary.maps_url) && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
        <a href={safeGoogleMapsUrl(visiblePrimary.maps_url) ?? undefined} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-800 underline underline-offset-2">📍 เปิดลิงก์ Google Maps สำหรับหัวข้อนี้ ↗</a>
      </div>}
      {canManage && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">ภาพและข้อความส่วนนี้ผูกกับหัวข้อถาวร แม้เปลี่ยนชื่อเรื่อง ข้อมูลที่แก้จะไม่ย้ายไปหัวข้ออื่น</p>}
    </div>}
    {loading ? <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
      : visibleRows.length === 0 && isReference ? null
      : visibleRows.length === 0 ? <div className="rounded-xl border border-dashed border-rose-200 bg-[#fffafa] p-8 text-center">
          <div className="text-3xl">📋</div><p className="mt-2 font-semibold text-rose-900">ยังไม่มีข้อมูลเผยแพร่ในหัวข้อนี้</p>
          <p className="mt-1 text-sm text-slate-500">ผู้ดูแลจะเพิ่มข้อมูลและเผยแพร่เมื่อได้รับการยืนยันจากคณะกรรมการ</p>
        </div>
      : <div className="grid gap-3">{isReference && <h3 className="text-base font-extrabold text-blue-900">ประกาศและเอกสารเพิ่มเติม</h3>}{visibleRows.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <div><h3 className="text-base font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.is_published ? `เผยแพร่ ${thaiDate(item.published_at)}` : "ฉบับร่าง · โรงเรียนยังมองไม่เห็น"}</p></div>
            {canManage && <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${item.is_published?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}`}>{item.is_published?"เผยแพร่แล้ว":"ฉบับร่าง"}</span>}
          </div>
          {item.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.details}</p>}
          {safeGoogleMapsUrl(item.maps_url) &&
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
              <span aria-hidden="true" className="text-2xl">📍</span>
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">จุดหมายที่ผู้จัดการแข่งขันกำหนด · เปิด Google Maps เพื่อดูเส้นทางจากตำแหน่งของคุณ</span>
              <a href={safeGoogleMapsUrl(item.maps_url) ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`นำทางไปยัง ${item.title} ด้วย Google Maps`} className="inline-flex items-center justify-center rounded-xl bg-[#991b1b] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">📍 นำทาง Google Maps ↗</a>
            </div>}
          {item.attachment_path && fileLinks[item.id] && item.attachment_mime?.startsWith("image/") &&
            <a href={fileLinks[item.id]} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-rose-100 bg-slate-50 p-2" aria-label={`ดูภาพขนาดเต็ม: ${item.attachment_name ?? item.title}`}>
              <img src={fileLinks[item.id]} alt={item.attachment_name ?? item.title} loading="lazy" className="mx-auto max-h-[460px] w-full object-contain" />
            </a>}
          {item.attachment_path && <div className="mt-3 flex flex-wrap items-center gap-2">
            {fileLinks[item.id] ? <a href={fileLinks[item.id]} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-red-800 hover:bg-rose-100">ดู / ดาวน์โหลดไฟล์ {item.attachment_name ?? "เอกสาร"}</a>
              : <button type="button" onClick={() => void refresh()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">ต่ออายุลิงก์ไฟล์</button>}
            <span className="text-xs text-slate-500">ลิงก์เอกสารชั่วคราว ใช้เฉพาะรายการที่มีสิทธิ์เข้าถึง</span>
          </div>}
          {canManage && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button type="button" disabled={busy} title={item.is_published ? "แก้ไขและอัปเดตหน้าโรงเรียน" : "แก้ไขฉบับร่าง"} onClick={() => { setEditor({id:item.id,title:item.title,details:item.details,mapsUrl:item.maps_url ?? "",file:null,isPrimary:false,removeFile:false,wasPublished:item.is_published});setError("");setSuccess(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50">แก้ไข</button>
            <button type="button" disabled={busy} onClick={() => { if (window.confirm(item.is_published ? "ถอนข้อมูลนี้ออกจากหน้าโรงเรียน?" : "ยืนยันว่าแผนผัง/ข้อมูลนี้ตรวจสอบแล้ว และพร้อมเผยแพร่ให้ทุกโรงเรียนหรือไม่?")) void setPublication(item,!item.is_published); }} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${item.is_published?"border border-amber-300 bg-amber-50 text-amber-900":"bg-emerald-700 text-white"}`}>{item.is_published?"ถอนเผยแพร่":"เผยแพร่ให้โรงเรียนเห็น"}</button>
          </div>}
        </article>)}</div>}
  </section>;
}
