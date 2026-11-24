"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { CertificateContext, CertificateEvent } from "@/lib/group-sports/certificates";

type Scope = "results" | "certificate" | "esports" | "both";
type Access = {
  email: string;
  certificate_active: boolean;
  esports_active: boolean;
  results_active: boolean;
  login_ready: boolean;
  login_status: "ready" | "not_signed_in" | "unconfirmed_email" | "not_google";
};
const eSportCodes = new Set(["GS3-ES-SM", "GS3-ES-SF"]);
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-rose-100";
const button = "min-h-10 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-rose-50 disabled:opacity-50";
const loginStatus: Record<Access["login_status"], string> = {
  ready: "บัญชี Google พร้อมใช้งาน",
  not_signed_in: "ยังไม่พบบัญชีที่เข้าสู่ระบบ",
  unconfirmed_email: "ยังไม่ยืนยันอีเมล",
  not_google: "ยังไม่ได้เชื่อมบัญชี Google",
};
function errorText(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const issue = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    return [issue.message, issue.code, issue.details, issue.hint].filter(v => typeof v === "string" && v.trim()).join(" · ") || "ไม่สามารถดำเนินการได้";
  }
  return "ไม่สามารถดำเนินการได้";
}

/** One administrator page; permissions are still independently scoped in Supabase. */
export default function SportsOfficialsAccessManager() {
  const [context, setContext] = useState<CertificateContext | null>(null);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Access[]>([]);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<Scope>("results");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEvent = useMemo(() => context?.events.find(e => e.id === eventId), [context, eventId]);
  const filteredEvents = useMemo(() => (context?.events || []).filter(e => {
    const search = filter.trim().toLowerCase();
    return !search || `${e.sport_name} ${e.event_code || ""}`.toLowerCase().includes(search);
  }), [context, filter]);
  const isEsports = typeof selectedEvent?.event_code === "string" && eSportCodes.has(selectedEvent.event_code);

  const loadContext = useCallback(async () => {
    const auth = await supabase.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Admin หลักก่อน");
    const result = await supabase.rpc("sports_cert_context");
    if (result.error) throw result.error;
    const data = result.data as CertificateContext;
    if (data.role !== "admin") throw new Error("หน้านี้สำหรับผู้ดูแลการแข่งขันหลักเท่านั้น");
    setContext(data);
    setEventId(current => data.events.some(e => e.id === current) ? current : data.events[0]?.id || "");
  }, []);

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    const [legacy, resultOfficials] = await Promise.all([
      supabase.rpc("sports_officials_access_overview", { p_event: id }),
      supabase.rpc("sports_event_referee_roster", { p_event: id }),
    ]);
    if (legacy.error) throw new Error(`อ่านสิทธิ์กรรมการบันทึกอันดับรางวัล/ผู้ดูแล RoV ไม่สำเร็จ: ${errorText(legacy.error)}`);
    if (resultOfficials.error) throw new Error(`อ่านสิทธิ์กรรมการประจำรายการไม่สำเร็จ: ${errorText(resultOfficials.error)}`);
    const combined = new Map<string, Access>();
    for (const item of (legacy.data || []) as Access[]) {
      combined.set(item.email, { ...item, results_active: false });
    }
    for (const item of (resultOfficials.data || []) as Access[]) {
      const current = combined.get(item.email);
      combined.set(item.email, current
        ? { ...current, results_active: item.results_active }
        : { ...item, results_active: item.results_active, certificate_active: false, esports_active: false });
    }
    setRows(Array.from(combined.values()).sort((a, b) => a.email.localeCompare(b.email)));
  }, []);

  useEffect(() => {
    let active = true;
    void loadContext().catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadContext]);

  useEffect(() => {
    if (!eventId || context?.role !== "admin") return;
    let active = true;
    setRows([]); setError(""); setNotice("");
    void refresh(eventId).catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, [eventId, context?.role, refresh]);

  useEffect(() => { setScope("results"); }, [eventId]);

  async function assign(targetEmail: string, assignedScope: Scope, active: boolean) {
    if (!eventId || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = assignedScope === "results"
        ? await supabase.rpc("sports_event_referee_assign", {
            p_event: eventId, p_email: targetEmail.trim().toLowerCase(), p_active: active,
          })
        : await supabase.rpc("sports_officials_assign", {
            p_event: eventId, p_email: targetEmail.trim().toLowerCase(),
            p_scope: assignedScope, p_active: active,
          });
      if (result.error) throw new Error(`มอบหมายสิทธิ์ไม่สำเร็จ: ${errorText(result.error)}`);
      await refresh(eventId);
      setNotice(`${active ? "มอบหมาย" : "ระงับ"}สิทธิ์เรียบร้อยแล้ว`);
      if (active) setEmail("");
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("โปรดระบุอีเมล Google ให้ถูกต้อง"); return;
    }
    void assign(normalized, scope, true);
  }

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-2xl bg-gradient-to-r from-red-900 to-blue-900 p-5 text-white sm:p-7">
        <Link href="/group-sports" className="text-xs font-semibold text-white/80 underline">← กลับหน้ากีฬากลุ่ม</Link>
        <Link href="/group-sports/certificates/central" className="ml-4 text-xs font-semibold text-white underline">มอบหมายกรรมการพิมพ์เกียรติบัตรส่วนกลาง</Link>
        <h1 className="mt-3 text-2xl font-black">มอบหมายกรรมการกีฬา</h1>
        <p className="mt-1 text-sm text-white/85">ศูนย์มอบหมายกรรมการทุกกีฬา · แยกสิทธิ์กรรมการประจำรายการ / บันทึกอันดับรางวัล / ผู้ดูแล RoV</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</p>}
      {loading && <p className="rounded-xl bg-white p-4">กำลังตรวจสอบสิทธิ์ผู้ดูแล...</p>}
      {!loading && context?.role === "admin" && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="block text-sm font-extrabold text-red-900" htmlFor="official-filter">ค้นหาประเภทกีฬา / รุ่น / รหัสรายการ</label>
          <input id="official-filter" className={`mt-2 ${field}`} value={filter} onChange={e => setFilter(e.target.value)} placeholder="เช่น กรีฑา ฟุตบอล GS3-FB" />
          <label className="mt-3 block text-sm font-extrabold text-red-900" htmlFor="official-event">รายการแข่งขันที่มอบหมาย</label>
          <select id="official-event" className={`mt-2 ${field}`} value={eventId} onChange={e => setEventId(e.target.value)}>
            {selectedEvent && !filteredEvents.some(e => e.id === selectedEvent.id) && <option value={selectedEvent.id}>{selectedEvent.sport_name} ({selectedEvent.event_code}) — รายการปัจจุบัน</option>}
            {filteredEvents.map((e: CertificateEvent) => <option key={e.id} value={e.id}>{e.sport_name} ({e.event_code})</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-600">พบ {filteredEvents.length} รายการ · กรรมการกีฬาทั่วไปกำหนดแยกรายการ ส่วนผู้ดูแล RoV ครอบคลุมชายและหญิงตามระบบเดิม</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold text-red-900">เพิ่ม / เปิดสิทธิ์กรรมการ</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px_auto] sm:items-end" onSubmit={submit}>
            <label className="text-xs font-bold">อีเมล Google ของกรรมการ
              <input className={`mt-1 ${field}`} type="email" required autoComplete="email" placeholder="name@school.ac.th" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label className="text-xs font-bold">ประเภทสิทธิ์
              <select className={`mt-1 ${field}`} value={scope} onChange={e => setScope(e.target.value as Scope)}>
                <option value="results">กรรมการประจำรายการ / บันทึกอันดับรางวัล</option>
                <option value="certificate">บันทึกอันดับรางวัลรายการนี้</option>
                {isEsports && <option value="esports">ดูแลโปรแกรมและผล RoV ชาย/หญิง</option>}
                {isEsports && <option value="both">ทั้งสองหน้าที่</option>}
              </select>
            </label>
            <button className="min-h-11 rounded-xl bg-red-800 px-4 font-bold text-white disabled:opacity-50" disabled={busy || !email.trim()}>มอบหมายสิทธิ์</button>
          </form>
          <p className="mt-3 text-xs text-slate-600">กรรมการต้องเข้าสู่ระบบด้วย Google อีเมลตรงกับที่มอบหมาย · กรรมการประจำรายการบันทึกอันดับรางวัลได้เฉพาะรายการที่ได้รับมอบหมาย (Migration 038) ไม่ได้รับสิทธิ์พิมพ์ส่วนกลางหรือ Admin ทั้งระบบ</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold text-red-900">รายชื่อและสถานะสิทธิ์ ({rows.length} บัญชี)</h2>
          {isEsports && <p className="mt-1 text-xs text-slate-600">รายชื่อผู้ดูแล RoV จะปรากฏทั้งสองประเภท เพราะสิทธิ์นี้ครอบคลุม RoV ชายและหญิง แต่สิทธิ์บันทึกอันดับรางวัลแยกตามรายการ</p>}
          {rows.length === 0 && !error && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">ยังไม่มีรายชื่อกรรมการในรายการนี้</p>}
          <div className="mt-3 space-y-3">
            {rows.map(row => <div key={row.email} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-sm font-bold">{row.email}</p>
                  <p className={`mt-1 text-xs ${row.login_ready ? "text-emerald-800" : "text-amber-800"}`}>{loginStatus[row.login_status] || "ตรวจสอบบัญชีไม่ได้"}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {row.results_active && <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-900">กรรมการประจำรายการ</span>}
                  {row.certificate_active && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-900">กรรมการบันทึกอันดับรางวัล</span>}
                  {row.esports_active && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">ผู้ดูแล RoV</span>}
                  {!row.results_active && !row.certificate_active && !row.esports_active && <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">สิทธิ์ถูกระงับ</span>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={button} disabled={busy} onClick={() => void assign(row.email,"results",!row.results_active)}>{row.results_active ? "ระงับสิทธิ์กรรมการรายการนี้" : "เปิดสิทธิ์กรรมการรายการนี้"}</button>
                <button className={button} disabled={busy} onClick={() => void assign(row.email,"certificate",!row.certificate_active)}>{row.certificate_active ? "ระงับสิทธิ์บันทึกอันดับรางวัล" : "เปิดสิทธิ์บันทึกอันดับรางวัล"}</button>
                {isEsports && <button className={button} disabled={busy} onClick={() => void assign(row.email,"esports",!row.esports_active)}>{row.esports_active ? "ระงับสิทธิ์ RoV" : "เปิดสิทธิ์ RoV"}</button>}
              </div>
            </div>)}
          </div>
        </section>
        <p className="text-xs leading-6 text-slate-600">กรรมการเข้าสู่ระบบด้วย Google ที่ <Link href="/login" className="font-bold text-red-800 underline">หน้าเข้าสู่ระบบ</Link> · กรรมการกีฬาทั่วไปใช้หน้า <Link href="/group-sports/officials/my" className="font-bold text-red-800 underline">รายการที่ได้รับมอบหมาย</Link> · กรรมการบันทึกอันดับรางวัลและผู้ดูแล RoV ยังคงใช้หน้าปฏิบัติงานเฉพาะเดิม การระงับสิทธิ์บันทึกอันดับต้องปิดทั้งกรรมการประจำรายการและกรรมการบันทึกอันดับรางวัล หากบัญชีได้รับทั้งสองสิทธิ์</p>
      </>}
    </div>
  </main>;
}
