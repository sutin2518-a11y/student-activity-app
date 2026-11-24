"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { CertificateContext, CertificateEvent } from "@/lib/group-sports/certificates";

type Scope = "certificate" | "esports" | "both";
type Access = {
  email: string;
  certificate_active: boolean;
  esports_active: boolean;
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
  return err instanceof Error ? err.message : "ไม่สามารถดำเนินการได้";
}

/** One administrator page; permissions are still independently scoped in Supabase. */
export default function SportsOfficialsAccessManager() {
  const [context, setContext] = useState<CertificateContext | null>(null);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Access[]>([]);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<Scope>("certificate");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEvent = useMemo(() => context?.events.find(e => e.id === eventId), [context, eventId]);
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
    const result = await supabase.rpc("sports_officials_access_overview", { p_event: id });
    if (result.error) throw result.error;
    setRows((result.data || []) as Access[]);
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

  useEffect(() => { setScope(isEsports ? "both" : "certificate"); }, [isEsports, eventId]);

  async function assign(targetEmail: string, assignedScope: Scope, active: boolean) {
    if (!eventId || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("sports_officials_assign", {
        p_event: eventId, p_email: targetEmail.trim().toLowerCase(),
        p_scope: assignedScope, p_active: active,
      });
      if (result.error) throw result.error;
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
        <h1 className="mt-3 text-2xl font-black">มอบหมายกรรมการกีฬา</h1>
        <p className="mt-1 text-sm text-white/85">ศูนย์จัดการสิทธิ์จุดเดียว · แยกหน้าที่บันทึกผลเกียรติบัตรและดูแลโปรแกรม RoV อย่างชัดเจน</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</p>}
      {loading && <p className="rounded-xl bg-white p-4">กำลังตรวจสอบสิทธิ์ผู้ดูแล...</p>}
      {!loading && context?.role === "admin" && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="block text-sm font-extrabold text-red-900" htmlFor="official-event">รายการแข่งขันที่รับผิดชอบ</label>
          <select id="official-event" className={`mt-2 ${field}`} value={eventId} onChange={e => setEventId(e.target.value)}>
            {context.events.map((e: CertificateEvent) => <option key={e.id} value={e.id}>{e.sport_name} ({e.event_code})</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-600">สิทธิ์บันทึกผลเกียรติบัตรกำหนดแยกตามรายการที่เลือก ส่วนผู้ดูแล RoV มีสิทธิ์จัดการแข่งขันทั้งชายและหญิง</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold text-red-900">เพิ่ม / เปิดสิทธิ์กรรมการ</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px_auto] sm:items-end" onSubmit={submit}>
            <label className="text-xs font-bold">อีเมล Google ของกรรมการ
              <input className={`mt-1 ${field}`} type="email" required autoComplete="email" placeholder="name@school.ac.th" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label className="text-xs font-bold">ประเภทสิทธิ์
              <select className={`mt-1 ${field}`} value={scope} onChange={e => setScope(e.target.value as Scope)}>
                <option value="certificate">บันทึกผลเกียรติบัตรรายการนี้</option>
                {isEsports && <option value="esports">ดูแลโปรแกรมและผล RoV ชาย/หญิง</option>}
                {isEsports && <option value="both">ทั้งสองหน้าที่</option>}
              </select>
            </label>
            <button className="min-h-11 rounded-xl bg-red-800 px-4 font-bold text-white disabled:opacity-50" disabled={busy || !email.trim()}>มอบหมายสิทธิ์</button>
          </form>
          <p className="mt-3 text-xs text-slate-600">ผู้ได้รับสิทธิ์ต้องใช้บัญชี Google อีเมลตรงกับที่มอบหมาย ระบบจะยืนยันบัญชีหลังเข้าสู่ระบบครั้งแรก · การเลือก “ทั้งสองหน้าที่” ใช้ได้เฉพาะ RoV</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold text-red-900">รายชื่อและสถานะสิทธิ์ ({rows.length} บัญชี)</h2>
          {isEsports && <p className="mt-1 text-xs text-slate-600">รายชื่อผู้ดูแล RoV จะปรากฏทั้งสองประเภท เพราะสิทธิ์นี้ครอบคลุม RoV ชายและหญิง แต่สิทธิ์กรอกผลเกียรติบัตรแยกตามรายการ</p>}
          {rows.length === 0 && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">ยังไม่มีรายชื่อกรรมการในรายการนี้</p>}
          <div className="mt-3 space-y-3">
            {rows.map(row => <div key={row.email} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-sm font-bold">{row.email}</p>
                  <p className={`mt-1 text-xs ${row.login_ready ? "text-emerald-800" : "text-amber-800"}`}>{loginStatus[row.login_status] || "ตรวจสอบบัญชีไม่ได้"}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {row.certificate_active && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-900">กรรมการเกียรติบัตร</span>}
                  {row.esports_active && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-900">ผู้ดูแล RoV</span>}
                  {!row.certificate_active && !row.esports_active && <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">สิทธิ์ถูกระงับ</span>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={button} disabled={busy} onClick={() => void assign(row.email,"certificate",!row.certificate_active)}>{row.certificate_active ? "ระงับสิทธิ์เกียรติบัตร" : "เปิดสิทธิ์เกียรติบัตร"}</button>
                {isEsports && <button className={button} disabled={busy} onClick={() => void assign(row.email,"esports",!row.esports_active)}>{row.esports_active ? "ระงับสิทธิ์ RoV" : "เปิดสิทธิ์ RoV"}</button>}
              </div>
            </div>)}
          </div>
        </section>
        <p className="text-xs leading-6 text-slate-600">กรรมการเข้าสู่ระบบด้วย Google ที่ <Link href="/login" className="font-bold text-red-800 underline">หน้าเข้าสู่ระบบ</Link> แล้วใช้เมนูจัดการแข่งขัน → จัดการผลเกียรติบัตร หรือหน้า E-Sport ตามสิทธิ์ · ไม่มีการมอบสิทธิ์ดูแลกีฬาประเภทอื่นโดยอัตโนมัติ</p>
      </>}
    </div>
  </main>;
}
