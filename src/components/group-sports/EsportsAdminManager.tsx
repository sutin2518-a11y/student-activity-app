"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type DelegatedAdmin = { id: string; email: string; is_active: boolean; granted_at: string; updated_at: string };

type Props = { competitionId: string };

function messageOf(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message) : "ไม่สามารถดำเนินการได้";
}

export default function EsportsAdminManager({ competitionId }: Props) {
  const [rows, setRows] = useState<DelegatedAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await supabase.from("sports_esports_admins")
      .select("id,email,is_active,granted_at,updated_at")
      .eq("competition_id", competitionId).order("email");
    if (result.error) setError(result.error.message);
    else setRows((result.data || []) as DelegatedAdmin[]);
    setLoading(false);
  }, [competitionId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(targetEmail: string, active: boolean) {
    if (busy) return;
    setBusy(targetEmail); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("sports_esports_set_admin", {
        p_comp: competitionId,
        p_email: targetEmail,
        p_active: active,
      });
      if (result.error) throw result.error;
      setNotice(`${active ? "เปิดสิทธิ์" : "ถอนสิทธิ์"} ${targetEmail} เรียบร้อยแล้ว`);
      await refresh();
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(""); }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง"); return;
    }
    await save(normalized, true);
    setEmail("");
  }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="จัดการผู้ดูแล E-Sport">
    <div>
      <h2 className="text-lg font-black text-slate-900">จัดการผู้ดูแล E-Sport</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">เพิ่มหรือถอนสิทธิ์ผู้ดูแล RoV ได้ตลอดเวลา บัญชีที่ได้รับสิทธิ์จัดการได้เฉพาะกีฬา E-Sport ไม่สามารถจัดการกีฬาอื่นหรือแต่งตั้งผู้ดูแลระบบหลักได้</p>
    </div>

    <form onSubmit={event => void add(event)} className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 sm:p-4">
      <label htmlFor="new-esports-admin" className="mb-2 block text-sm font-bold text-red-900">เพิ่มอีเมลผู้ดูแล</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="new-esports-admin" type="email" required autoComplete="email" value={email}
          onChange={event => setEmail(event.target.value)} placeholder="กรรมการ@gmail.com หรือ @โรงเรียนอื่น"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-rose-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-rose-200" />
        <button type="submit" disabled={!!busy} className="min-h-11 rounded-lg bg-red-800 px-4 py-2 text-sm font-black text-white hover:bg-red-900 disabled:opacity-50">เพิ่ม / เปิดสิทธิ์</button>
      </div>
      <p className="mt-2 text-xs text-slate-600">เพิ่มอีเมลล่วงหน้าได้ แม้กรรมการยังไม่เคยเข้าสู่ระบบ เมื่อเจ้าของอีเมลล็อกอินด้วย Google ที่ยืนยันแล้วจึงจะได้รับสิทธิ์</p>
    </form>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p className="text-sm text-slate-500">กำลังโหลดรายชื่อผู้ดูแล...</p> :
      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-800">บัญชีที่ได้รับสิทธิ์ ({rows.filter(row => row.is_active).length} คน)</p>
        {rows.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-slate-600">ยังไม่มีรายชื่อกรรมการ E-Sport</p>}
        {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="break-all text-sm font-bold text-slate-900">{row.email}</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{row.is_active ? "ใช้งานได้" : "ถอนสิทธิ์แล้ว"}</span>
          </div>
          <button type="button" disabled={!!busy}
            onClick={() => void save(row.email, !row.is_active)}
            className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 ${row.is_active ? "border-red-300 bg-white text-red-800 hover:bg-red-50" : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"}`}>
            {busy === row.email ? "กำลังบันทึก..." : row.is_active ? "ถอนสิทธิ์" : "เปิดสิทธิ์อีกครั้ง"}
          </button>
        </div>)}
      </div>
    }
    <div className="border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">
      กรรมการเข้าสู่ระบบที่ <a className="font-bold text-red-800 underline" href="/login">/login</a> ด้วย Google แล้วเปิดหน้า <a className="font-bold text-red-800 underline" href="/group-sports/esports">/group-sports/esports</a> บัญชีผู้ดูแลหลักเท่านั้นที่แก้ไขรายชื่อในหน้านี้ได้
    </div>
  </section>;
}
