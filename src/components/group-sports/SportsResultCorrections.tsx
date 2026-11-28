"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { certificateAward, emptyPlacements, type CertificateContext, type CertificatePlacement } from "@/lib/group-sports/certificates";

type Entry = { id: string; entry_name: string; school_name: string; athlete_count: number };
type CorrectionHistory = {
  id: string;
  reason: string;
  corrected_at: string;
  corrected_by_email?: string | null;
  revoked: number;
  issued: number;
  previous: CertificatePlacement[];
  corrected: CertificatePlacement[];
};
type CorrectionContext = {
  event_id: string;
  updated_at: string;
  published_at: string;
  entries: Entry[];
  placements: CertificatePlacement[];
  live_award_certificates: number;
  history: CorrectionHistory[];
};
type CorrectionResult = { correction_id: string; revoked_award_certificates: number; new_award_certificates: number };

const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const input = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-rose-100";
const primary = "rounded-xl bg-red-800 px-5 py-3 text-sm font-extrabold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40";

function message(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String((error as {message: unknown}).message)
    : "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบสิทธิ์และ SQL Migration v33.9";
}
function rankLabel(rank: number, slot: number) {
  return rank === 3 && slot === 2 ? "รองชนะเลิศอันดับที่ 2 (ร่วม)" : certificateAward(rank, "award");
}
function slotKey(p: CertificatePlacement) { return `${p.rank}-${p.slot}`; }

export default function SportsResultCorrections() {
  const [context, setContext] = useState<CertificateContext | null>(null);
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<CorrectionContext | null>(null);
  const [placements, setPlacements] = useState<CertificatePlacement[]>([]);
  const [reason, setReason] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const loadEvent = useCallback(async (id: string) => {
    if (!id) { setData(null); setPlacements([]); return; }
    const response = await supabase.rpc("sports_admin_correction_context", { p_event: id });
    if (response.error) throw response.error;
    const info = response.data as CorrectionContext;
    setData(info);
    setPlacements(info.placements.map(p => ({...p})));
    setReason("");
    setAcknowledge(false);
  }, []);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const auth = await supabase.auth.getUser();
        if (auth.error || !auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Admin หลัก");
        const response = await supabase.rpc("sports_cert_context");
        if (response.error) throw response.error;
        const payload = response.data as CertificateContext;
        if (payload.role !== "admin") throw new Error("เฉพาะ Admin หลักของการแข่งขันเท่านั้นที่เข้าหน้านี้ได้");
        if (!current) return;
        setContext(payload);
        setEventId(payload.events.find(e => e.result_status === "published")?.id || "");
      } catch (e) { if (current) setError(message(e)); }
      finally { if (current) setLoading(false); }
    }
    void load();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setData(null);
    if (eventId) void loadEvent(eventId).catch(e => { if (current) setError(message(e)); });
    return () => { current = false; };
  }, [eventId, loadEvent]);

  const publishedEvents = context?.events.filter(e => e.result_status === "published") || [];
  const visibleEvents = publishedEvents.filter(e => `${e.sport_name} ${e.event_code || ""}`.toLowerCase().includes(query.toLowerCase()));
  const event = publishedEvents.find(e => e.id === eventId);
  const entriesById = useMemo(() => new Map((data?.entries || []).map(e => [e.id, e])), [data]);
  const valid = Boolean(data && placements.length > 0 && placements.every(p => p.entry_id)
    && new Set(placements.map(p => p.entry_id)).size === placements.length
    && reason.trim().length >= 8 && reason.trim().length <= 1000 && acknowledge);
  const changed = Boolean(data && placements.some(p =>
    data.placements.find(old => slotKey(old) === slotKey(p))?.entry_id !== p.entry_id));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data || !valid || !changed || busy || !eventId) return;
    if (!(await sportsConfirm(
      `ยืนยันแก้ไขผลที่ประกาศแล้วสำหรับ ${event?.sport_name || "รายการนี้"}?\n\n` +
      `เกียรติบัตรรางวัลเดิม ${data.live_award_certificates} ฉบับจะถูกยกเลิก (QR เดิมไม่ผ่านการตรวจสอบ) ` +
      `และจะออกเอกสารชุดใหม่ทันที พร้อมปรับตารางเหรียญ\n\nเหตุผล: ${reason.trim()}`
    ))) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await supabase.rpc("sports_admin_correct_published_result", {
        p_event: eventId,
        p_awards: placements,
        p_reason: reason.trim(),
        p_expected_updated_at: data.updated_at,
      });
      if (response.error) throw response.error;
      const result = response.data as CorrectionResult;
      await loadEvent(eventId);
      setNotice(`แก้ไขและประกาศผลใหม่แล้ว ยกเลิกเอกสารเดิม ${result.revoked_award_certificates} ฉบับ และออกเกียรติบัตรรางวัลใหม่ ${result.new_award_certificates} ฉบับ โดยเก็บประวัติไว้ครบ`);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f2f5fa] pb-14 text-slate-900">
    <div className="bg-[#08142e] px-4 py-3 text-xs text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3">
        <Link href="/group-sports" className="font-semibold underline">← กลับระบบกีฬากลุ่ม</Link>
        <nav className="flex gap-4">
          <Link href="/group-sports/officials" className="hover:underline">มอบหมายกรรมการ</Link>
          <Link href="/group-sports/certificates/manage" className="hover:underline">จัดการเกียรติบัตร</Link>
        </nav>
      </div>
    </div>
    <header className="bg-gradient-to-r from-[#8b0011] to-[#20264a] px-4 py-7 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold tracking-widest text-amber-300">PHULANGKA GAMES 2026 · ADMIN CORRECTIONS v33.9</p>
        <h1 className="mt-2 text-2xl font-black">แก้ไขผลการแข่งขันหลังประกาศ</h1>
        <p className="mt-2 text-sm text-white/90">สำหรับ Admin หลักเท่านั้น · แก้ไขเมื่อกรรมการแจ้งความผิดพลาด · ไม่ใช่ขั้นตอนอนุมัติผลตามปกติ</p>
      </div>
    </header>
    <div className="mx-auto mt-5 max-w-5xl space-y-4 px-4">
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-900">{notice}</div>}
      {loading && <section className={panel}>กำลังตรวจสอบสิทธิ์ Admin...</section>}
      {!loading && context?.role === "admin" && <>
        <section className={panel}>
          <h2 className="text-lg font-extrabold text-red-900">1. เลือกรายการที่ประกาศผลแล้ว</h2>
          <p className="mt-1 text-xs text-slate-600">ผลที่กรรมการประกาศยังมีผลตามปกติ Admin ใช้หน้านี้เฉพาะกรณีขอแก้ไขเป็นพิเศษ</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">ค้นหารายการ
              <input className={`mt-1 ${input}`} value={query} onChange={e => setQuery(e.target.value)} placeholder="ชื่อกีฬา / รหัสรายการ"/>
            </label>
            <label className="text-xs font-bold">รายการแข่งขัน
              <select className={`mt-1 ${input}`} value={eventId} onChange={e => {setEventId(e.target.value);setError("");setNotice("");}}>
                {!visibleEvents.some(e => e.id === eventId) && event && <option value={event.id}>{event.sport_name}</option>}
                {visibleEvents.map(e => <option key={e.id} value={e.id}>{e.sport_name} {e.event_code ? `(${e.event_code})` : ""}</option>)}
              </select>
            </label>
          </div>
          {!publishedEvents.length && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">ยังไม่มีรายการที่กรรมการประกาศผลแล้ว จึงไม่มีผลที่ต้องแก้ไข</p>}
        </section>

        {event && data && <>
          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-red-900">2. แก้ไขอันดับผู้ได้รับรางวัล</h2>
                <p className="mt-1 text-xs text-slate-600">{event.sport_name} · ประกาศครั้งล่าสุด {new Date(data.published_at).toLocaleString("th-TH")}</p>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-red-800">เกียรติบัตรรางวัลเดิม {data.live_award_certificates} ฉบับ</span>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
              {placements.map((placement, index) => {
                const old = data.placements.find(p => slotKey(p) === slotKey(placement));
                const isChanged = old?.entry_id !== placement.entry_id;
                return <div key={slotKey(placement)} className={`rounded-xl border p-3 ${isChanged ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                  <label className="text-sm font-extrabold text-red-900" htmlFor={`rank-${slotKey(placement)}`}>{rankLabel(placement.rank, placement.slot)}</label>
                  <p className="mt-1 text-xs text-slate-500">เดิม: {old ? `${entriesById.get(old.entry_id)?.school_name || "โรงเรียน"} — ${entriesById.get(old.entry_id)?.entry_name || old.entry_id}` : "ไม่มีข้อมูล"}</p>
                  <select id={`rank-${slotKey(placement)}`} className={`mt-2 ${input}`} value={placement.entry_id} disabled={busy}
                    onChange={e => setPlacements(current => current.map((p, i) => i === index ? {...p,entry_id:e.target.value} : p))}>
                    <option value="">— เลือกผู้ชนะ / โรงเรียน —</option>
                    {data.entries.map(entry => <option key={entry.id} value={entry.id}
                      disabled={placements.some((p,i)=>i!==index && p.entry_id===entry.id)}>
                      {entry.school_name} — {entry.entry_name}{entry.athlete_count ? ` (${entry.athlete_count} คน)` : ""}
                    </option>)}
                  </select>
                  {isChanged && <p className="mt-1 text-xs font-bold text-amber-800">อันดับนี้ถูกเปลี่ยนจากผลเดิม</p>}
                </div>;
              })}
              <label className="block text-sm font-bold text-red-900">เหตุผลที่กรรมการร้องขอให้แก้ไข
                <textarea className={`mt-2 ${input} min-h-28`} maxLength={1000} value={reason} disabled={busy}
                  onChange={e => setReason(e.target.value)} placeholder="เช่น กรรมการยืนยันผลอันดับ 2 ผิดรายการ พร้อมอ้างอิงใบรายงานผลตัวจริง" required/>
                <span className="mt-1 block text-right text-xs font-normal text-slate-500">{reason.trim().length} / 1,000 ตัวอักษร · อย่างน้อย 8 ตัวอักษร</span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <input type="checkbox" checked={acknowledge} disabled={busy} onChange={e => setAcknowledge(e.target.checked)} className="mt-1 size-4 accent-red-800"/>
                <span>ยืนยันว่าได้รับคำร้องแก้ไขจากกรรมการและตรวจสอบเอกสารประกอบแล้ว ยอมรับว่าผลใหม่จะประกาศทันที พร้อมยกเลิก QR เกียรติบัตรรางวัลเดิมและออกเอกสารชุดใหม่</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy || !valid || !changed} className={primary}>{busy ? "กำลังแก้ไขผลและออกเอกสาร..." : "ยืนยันแก้ไขผลและประกาศทันที"}</button>
                <button type="button" disabled={busy} className={secondary} onClick={()=>{setPlacements(data.placements.map(p=>({...p})));setReason("");setAcknowledge(false);}}>คืนค่าผลเดิม</button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-600">การแก้ไขนี้ปรับอันดับผู้ชนะ ตารางผล/เหรียญ และเกียรติบัตรรางวัลเท่านั้น ไม่แก้คะแนนแต่ละแมตช์ฟุตบอลหรือ RoV และไม่ยกเลิกเกียรติบัตรเข้าร่วม</p>
          </section>
          <section className={panel}>
            <h2 className="text-lg font-extrabold text-red-900">3. ประวัติแก้ไขผลรายการนี้</h2>
            {!data.history.length ? <p className="mt-3 text-sm text-slate-500">ยังไม่มีการแก้ไขโดย Admin</p> :
              <div className="mt-3 space-y-2">{data.history.map(h => <article key={h.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-bold">{new Date(h.corrected_at).toLocaleString("th-TH")}</p>
                <p className="mt-1 text-slate-700">{h.reason}</p>
                {h.corrected_by_email && <p className="mt-1 text-xs text-slate-500">แก้ไขโดย: {h.corrected_by_email}</p>}
                <p className="mt-1 text-xs text-slate-500">ยกเลิกเกียรติบัตร {h.revoked} ฉบับ · ออกใหม่ {h.issued} ฉบับ · รหัสรายการ {h.id.slice(0,8)}</p>
              </article>)}</div>}
          </section>
        </>}
      </>}
    </div>
  </main>;
}
