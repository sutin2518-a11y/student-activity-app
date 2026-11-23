"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Scope = "entry" | "event" | "competition";
type Competition = { id: string; name: string };
type School = { id: string; name: string };
type Event = { id: string; sport_name: string; event_code: string | null };
type Entry = { id: string; event_id: string; school_id: string; entry_name: string; status: string };
type Counts = {
  entries: number; athletes: number; photos: number; matches: number;
  match_results: number; event_results: number; medals: number;
  football_matches: number; esports_matches: number; issued_certificates: number;
};
type Preview = {
  scope: Scope; target: string | null; counts: Counts; fingerprint: string;
  can_reset: boolean; note?: string;
};
type ResetResult = { success: boolean; archive_id: string; pending_photos: number; counts: Counts };

const SLUG = "phayao-secondary-group-sports-2569";
const CONFIRMATION = "ลบข้อมูลทดสอบ 2569";
const countName: [keyof Counts, string][] = [
  ["entries", "ใบสมัคร"], ["athletes", "นักกีฬา"], ["photos", "รูปนักกีฬาและเจ้าหน้าที่"],
  ["match_results", "ผลคู่แข่งขันทั่วไป"], ["event_results", "ผลกีฬาเดี่ยว / กรีฑา"],
  ["medals", "เหรียญรางวัล"], ["football_matches", "คู่ฟุตบอล (คงโปรแกรมเดิม)"],
  ["esports_matches", "คู่ RoV (คงโปรแกรมเดิม)"], ["issued_certificates", "เกียรติบัตรที่เคยออก"],
];
const cls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-red-700 focus:outline-none";
const button = "rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45";

function message(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบสิทธิ์และการติดตั้ง SQL";
}

export default function SportsResetManager() {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [scope, setScope] = useState<Scope>("entry");
  const [entryId, setEntryId] = useState("");
  const [eventId, setEventId] = useState("");
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState<ResetResult | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [cleanupArchiveId, setCleanupArchiveId] = useState("");
  const [archives, setArchives] = useState<{id:string;reset_at:string;reset_scope:string;counts:Counts}[]>([]);

  const load = useCallback(async () => {
    try {
      setError("");
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลการแข่งขันก่อน");
      const { data: comp, error: compError } = await supabase.from("sports_competitions")
        .select("id,name").eq("slug", SLUG).single();
      if (compError || !comp) throw compError || new Error("ไม่พบการแข่งขันปี 2569");
      setCompetition(comp);
      const { data: admin, error: adminError } = await supabase.rpc("sports_stage3_admin", { p_comp: comp.id });
      if (adminError || admin !== true) throw new Error("หน้านี้สำหรับ Admin หลักของการแข่งขันเท่านั้น (กรรมการและบัญชีโรงเรียนไม่มีสิทธิ์)");
      setAuthorized(true);
      const [e, s] = await Promise.all([
        supabase.from("sports_events").select("id,sport_name,event_code")
          .eq("competition_id", comp.id).order("sport_name").limit(2000),
        supabase.from("sports_schools").select("id,name").order("name").limit(1000),
      ]);
      if (e.error) throw e.error;
      if (s.error) throw s.error;
      const entryRows: Entry[] = [];
      // Supabase often caps each response at 1,000 rows; load every page for admin deletion.
      for (let offset = 0; offset < 20000; offset += 1000) {
        const page = await supabase.from("sports_entries")
          .select("id,event_id,school_id,entry_name,status")
          .eq("competition_id", comp.id).order("id").range(offset,offset+999);
        if (page.error) throw page.error;
        entryRows.push(...((page.data || []) as Entry[]));
        if ((page.data || []).length < 1000) break;
      }
      setEvents(e.data || []);
      setEntries(entryRows);
      setSchools(s.data || []);
      const archivesQuery = await supabase.from("sports_admin_reset_archives")
        .select("id,reset_at,reset_scope,counts").eq("competition_id",comp.id)
        .order("reset_at",{ascending:false}).limit(50);
      if (archivesQuery.error) throw archivesQuery.error;
      setArchives((archivesQuery.data || []) as {id:string;reset_at:string;reset_scope:string;counts:Counts}[]);
      if (!eventId && (e.data || []).length) setEventId(e.data![0].id);
      if (!entryId && entryRows.length) setEntryId(entryRows[0].id);
      // Direct "ลบ" link in registrations selects the exact entry without deleting it.
      const urlEntry = new URLSearchParams(window.location.search).get("entry");
      if (urlEntry && entryRows.some(x => x.id === urlEntry)) {
        setScope("entry"); setEntryId(urlEntry);
      }
    } catch (err) { setError(message(err)); }
    finally { setReady(true); }
  }, []); // intentionally load once; refreshing after reset reloads the page
  useEffect(() => { void load(); }, [load]);

  const eventById = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const schoolById = useMemo(() => new Map(schools.map(s => [s.id, s])), [schools]);
  const visibleEntries = useMemo(() => {
    const q = filter.toLocaleLowerCase().trim();
    return entries.filter(e => !q || `${e.entry_name} ${schoolById.get(e.school_id)?.name || ""} ${eventById.get(e.event_id)?.sport_name || ""}`.toLocaleLowerCase().includes(q));
  }, [entries, filter, eventById, schoolById]);
  const target = scope === "competition" ? null : scope === "event" ? eventId : entryId;

  const clearPreview = () => { setPreview(null); setConfirmation(""); setError(""); setNotice(""); };
  async function inspect() {
    if (!authorized || (scope !== "competition" && !target)) return;
    setBusy(true); setError(""); setNotice(""); setPreview(null); setConfirmation("");
    try {
      const { data, error: rpcError } = await supabase.rpc("sports_admin_reset", {
        p_action: "preview", p_scope: scope, p_target: target,
        p_confirmation: null, p_expected_fingerprint: null,
      });
      if (rpcError) throw rpcError;
      setPreview(data as Preview);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function cleanPhotos(archiveId: string) {
    const { data, error: pendingError } = await supabase.rpc("sports_admin_reset_pending_photos", { p_archive: archiveId });
    if (pendingError) throw pendingError;
    const paths = (data || []) as string[];
    setPendingPhotos(paths);
    if (!paths.length) return;
    const failed: string[] = [];
    for (let i = 0; i < paths.length; i += 50) {
      const group = paths.slice(i, i + 50);
      const { error: photoError } = await supabase.storage.from("sports-athlete-photos").remove(group);
      if (photoError) { failed.push(...group); continue; }
      const { error: ackError } = await supabase.rpc("sports_admin_reset_ack_photos", {
        p_archive: archiveId, p_paths: group,
      });
      if (ackError) failed.push(...group);
    }
    setPendingPhotos(failed);
    if (failed.length) setError(`ข้อมูลทะเบียนรีเซตแล้ว แต่รูป ${failed.length} ไฟล์ยังรอลบจาก Storage กรุณากด “ลบรูปที่ค้าง” อีกครั้ง`);
    else setNotice("รีเซตข้อมูลและลบไฟล์รูปทดสอบจาก Storage เรียบร้อยแล้ว");
  }
  async function execute() {
    if (!authorized || !preview || !preview.can_reset || confirmation !== CONFIRMATION || busy) return;
    if (!window.confirm(`ยืนยันรีเซตข้อมูลจริงหรือไม่?\n\nขอบเขต: ${scope}\nใบสมัคร: ${preview.counts.entries} รายการ\nนักกีฬา: ${preview.counts.athletes} คน\nผลกีฬาและรูปภาพจะถูกลบจากระบบ\n\nระบบเก็บข้อมูลสำรองไว้สำหรับให้ผู้ดูแลฐานข้อมูลกู้คืนด้วยตนเอง`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: rpcError } = await supabase.rpc("sports_admin_reset", {
        p_action: "reset", p_scope: preview.scope, p_target: preview.target,
        p_confirmation: confirmation, p_expected_fingerprint: preview.fingerprint,
      });
      if (rpcError) throw rpcError;
      const result = data as ResetResult;
      setDone(result); setPreview(null); setConfirmation("");
      setCleanupArchiveId(result.archive_id);
      setNotice("รีเซตทะเบียนและผลแข่งขันสำเร็จ มีสำเนาในคลัง Archive ของผู้ดูแล — ยังไม่ได้ลบไฟล์ภาพจริงจาก Storage");
      const {data: photoList, error: photoError} = await supabase.rpc("sports_admin_reset_pending_photos",{p_archive:result.archive_id});
      if (photoError) setError("อ่านรายการไฟล์ภาพค้างไม่สำเร็จ: "+message(photoError));
      else setPendingPhotos((photoList || []) as string[]);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function selectArchive(id: string) {
    setCleanupArchiveId(id); setPendingPhotos([]); setError("");
    if (!id) return;
    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("sports_admin_reset_pending_photos", {p_archive:id});
      if (rpcError) throw rpcError;
      setPendingPhotos((data || []) as string[]);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function retryPhotos() {
    if (!cleanupArchiveId || busy || !pendingPhotos.length) return;
    if (!window.confirm(`รูปภาพ ${pendingPhotos.length} ไฟล์จะถูกลบออกจาก Supabase Storage อย่างถาวร\n\nข้อมูล Archive สำรองเฉพาะตาราง ไม่ได้เก็บตัวไฟล์รูป!\n\nคุณได้สำรองไฟล์รูปถ่ายจริงไว้แล้ว และยืนยันให้ลบใช่หรือไม่?`)) return;
    setBusy(true); setError("");
    try { await cleanPhotos(cleanupArchiveId); } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-100 px-3 py-6 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#8b0011] to-[#20264a] p-5 text-white shadow">
        <Link href="/group-sports" className="text-sm font-semibold underline underline-offset-4">← กลับหน้าระบบกีฬากลุ่ม</Link>
        <h1 className="mt-3 text-2xl font-black">จัดการข้อมูลทดสอบ / รีเซตระบบ</h1>
        <p className="mt-2 text-sm text-white/90">สำหรับผู้ดูแลหลักเท่านั้น · ปีการแข่งขัน 2569 · ตรวจสอบและสำรองก่อนลบ</p>
      </header>
      {!ready && <div className="rounded-xl bg-white p-6">กำลังตรวจสิทธิ์ผู้ดูแลระบบ...</div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</div>}
      {ready && authorized && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-red-900">1. เลือกขอบเขตที่ต้องการรีเซต</h2>
          <p className="mt-1 text-sm text-slate-600">{competition?.name} — ระบบจะไม่ลบรายชื่อโรงเรียน บัญชีผู้ใช้ สิทธิ์กรรมการ หรือโปรแกรมการแข่งขันต้นฉบับ</p>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {([
              ["entry", "ลบใบสมัครเฉพาะรายการ", "ลบใบสมัครนักกีฬาและรูปของรายการที่เลือก"],
              ["event", "รีเซตประเภทการแข่งขัน", "ลบทุกใบสมัครและผลของประเภทกีฬาที่เลือก"],
              ["competition", "รีเซตทั้งระบบกีฬากลุ่ม", "ลบทุกใบสมัครและผลทดลองทั้งหมดของปี 2569"],
            ] as [Scope,string,string][]).map(([key,label,desc]) =>
              <label key={key} className={`cursor-pointer rounded-xl border p-4 ${scope===key?"border-red-700 bg-rose-50":"border-slate-200"}`}>
                <span className="flex items-center gap-2 font-bold"><input type="radio" name="scope" checked={scope===key} onChange={()=>{setScope(key);clearPreview();}} /> {label}</span>
                <span className="mt-2 block text-xs text-slate-600">{desc}</span>
              </label>)}
          </div>
          {scope === "entry" && <div className="mt-5 grid gap-2">
            <label htmlFor="entry-search" className="text-sm font-bold">ค้นหาชื่อโรงเรียน ชื่อนักกีฬา หรือประเภทการแข่งขัน</label>
            <input id="entry-search" className={cls} value={filter} onChange={e=>{
              const query=e.target.value.toLocaleLowerCase().trim();
              const first=entries.find(item=>!query || `${item.entry_name} ${schoolById.get(item.school_id)?.name || ""} ${eventById.get(item.event_id)?.sport_name || ""}`.toLocaleLowerCase().includes(query));
              setFilter(e.target.value);setEntryId(first?.id || "");clearPreview();
            }} placeholder="ค้นหาใบสมัคร..." />
            <label htmlFor="reset-entry" className="text-sm font-bold">เลือกใบสมัครที่จะลบ</label>
            <select id="reset-entry" className={cls} value={entryId} onChange={e=>{setEntryId(e.target.value);clearPreview();}}>
              {visibleEntries.length===0 && <option value="">ไม่พบใบสมัคร</option>}
              {visibleEntries.map(e=><option value={e.id} key={e.id}>{schoolById.get(e.school_id)?.name || "โรงเรียน"} · {eventById.get(e.event_id)?.sport_name || "กีฬา"} · {e.entry_name}</option>)}
            </select>
          </div>}
          {scope === "event" && <div className="mt-5">
            <label htmlFor="reset-event" className="text-sm font-bold">เลือกรายการแข่งขันที่จะรีเซต</label>
            <select id="reset-event" className={`${cls} mt-2`} value={eventId} onChange={e=>{setEventId(e.target.value);clearPreview();}}>
              {events.map(e=><option value={e.id} key={e.id}>{e.sport_name} ({e.event_code || "ไม่ระบุรหัส"})</option>)}
            </select>
          </div>}
          {scope === "competition" && <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">การรีเซตทั้งระบบจะลบใบสมัครและคะแนนทดลองทุกกีฬา (รวมฟุตบอลและ RoV) แต่คงโครงการแข่งขันและบัญชีไว้ ต้องสำรอง Supabase ก่อนใช้งาน</p>}
          <button className="mt-5 rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white hover:bg-red-900 disabled:opacity-50" disabled={busy || (scope!=="competition"&&!target)} onClick={()=>void inspect()}>
            {busy ? "กำลังตรวจสอบ..." : "ตรวจสอบจำนวนข้อมูลก่อนลบ"}
          </button>
        </section>
        {preview && <section className="rounded-2xl border border-rose-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-red-900">2. ตรวจสอบผลกระทบก่อนยืนยัน</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {countName.map(([key,label])=><div key={key} className="rounded-xl bg-slate-50 p-3">
              <span className="block text-xs text-slate-600">{label}</span><strong className="mt-1 block text-xl tabular-nums">{preview.counts[key].toLocaleString("th-TH")}</strong>
            </div>)}
          </div>
          {preview.note && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{preview.note}</p>}
          <p className="mt-3 text-sm text-slate-600">จะเก็บข้อมูลก่อนลบไว้ใน Archive สำหรับผู้ดูแลฐานข้อมูล แต่ยังไม่มีปุ่มกู้คืนอัตโนมัติ</p>
          <label htmlFor="reset-confirmation" className="mt-5 block text-sm font-bold text-red-900">พิมพ์ข้อความนี้ทุกตัวอักษรเพื่อยืนยัน: <code className="select-all rounded bg-rose-100 px-2 py-1">{CONFIRMATION}</code></label>
          <input id="reset-confirmation" className={`${cls} mt-3`} value={confirmation} autoComplete="off" onChange={e=>setConfirmation(e.target.value)} placeholder="พิมพ์ข้อความยืนยัน" />
          <button className="mt-4 rounded-xl bg-red-800 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || !preview.can_reset || confirmation !== CONFIRMATION} onClick={()=>void execute()}>
            {busy ? "กำลังทำรายการ..." : "ยืนยันลบข้อมูลตามที่ตรวจสอบ"}
          </button>
          {!preview.can_reset && <p className="mt-2 text-xs text-red-700">ระบบปิดการรีเซตเมื่อมีเกียรติบัตรออกแล้ว หรือเมื่อถึงวันเริ่มแข่งขัน 30 พ.ย. 2569</p>}
        </section>}
        {done && <section className="rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
          <h2 className="font-black text-emerald-800">รีเซตข้อมูลสำเร็จ</h2>
          <p className="mt-2 break-all text-xs text-slate-600">รหัสสำรอง Archive: {done.archive_id}</p>
          <p className="mt-2 text-sm text-slate-700">ลบใบสมัคร {done.counts.entries} รายการ นักกีฬา {done.counts.athletes} คน · คงโปรแกรมการแข่งขันต้นฉบับ</p>
          {pendingPhotos.length>0 && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">มีรูปถ่าย {pendingPhotos.length} ไฟล์รอการลบจาก Storage กรุณาสำรองไฟล์รูปจริงก่อนดำเนินการ (Archive เก็บแค่ชื่อไฟล์ ไม่เก็บภาพ)</p>}
          {pendingPhotos.length>0 && <button className={`mt-3 ${button}`} disabled={busy} onClick={()=>void retryPhotos()}>ยืนยันลบรูปภาพหลังสำรองแล้ว ({pendingPhotos.length} ไฟล์)</button>}
          <button className={`mt-3 ml-2 ${button}`} onClick={()=>window.location.reload()}>โหลดรายการใหม่</button>
        </section>}
        {archives.length>0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-red-900">3. ประวัติการรีเซตและจัดการรูปที่ค้าง</h2>
          <p className="mt-1 text-xs text-slate-600">เลือกครั้งที่เคยรีเซตเพื่อดูรูปที่ยังไม่ได้ลบจาก Storage (ดูได้เฉพาะ Admin หลัก)</p>
          <select className={`${cls} mt-3`} value={cleanupArchiveId} onChange={e=>void selectArchive(e.target.value)}>
            <option value="">เลือกรายการรีเซตย้อนหลัง</option>
            {archives.map(a=><option key={a.id} value={a.id}>{new Date(a.reset_at).toLocaleString("th-TH")} · {a.reset_scope} · {a.counts.entries} ใบสมัคร · {a.id.slice(0,8)}</option>)}
            {cleanupArchiveId && !archives.some(a=>a.id===cleanupArchiveId) && <option value={cleanupArchiveId}>ครั้งล่าสุด · {cleanupArchiveId.slice(0,8)}</option>}
          </select>
          {!!cleanupArchiveId && <p className="mt-3 text-sm text-slate-700">รูปที่ยังค้าง: <strong>{pendingPhotos.length}</strong> ไฟล์</p>}
          {!!cleanupArchiveId && pendingPhotos.length>0 && <button className={`mt-3 ${button}`} disabled={busy} onClick={()=>void retryPhotos()}>ยืนยันลบรูปถ่ายที่สำรองไว้แล้ว</button>}
        </section>}
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">เพื่อความปลอดภัย ระบบจะไม่รีเซตหลังวันที่ 29 พฤศจิกายน 2569 ไม่ลบเกียรติบัตรที่ออกแล้ว และไม่อนุญาตให้บัญชีโรงเรียนหรือกรรมการกีฬาเรียกคำสั่งลบโดยตรง</p>
      </>}
    </div>
  </main>;
}
