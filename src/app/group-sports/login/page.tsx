"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function SportsSchoolLoginPage() {
  const router = useRouter();
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setBusy(true);
    try {
      const result = await fetch("/api/group-sports/login",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({username,password}),cache:"no-store",
      });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "เข้าสู่ระบบไม่สำเร็จ");
      if (!json.access_token || !json.refresh_token) throw new Error("ไม่พบข้อมูลเซสชัน");
      const stored = await supabase.auth.setSession({access_token:json.access_token,refresh_token:json.refresh_token});
      if (stored.error || !stored.data.user) throw stored.error || new Error("บันทึกการเข้าสู่ระบบไม่สำเร็จ");
      setPassword("");
      router.replace("/group-sports");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถเข้าสู่ระบบได้");
    } finally { setBusy(false); }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4ff] p-4 text-slate-900">
    <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-pink-300/50 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-sky-300/50 blur-3xl" />
    <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_24px_70px_-25px_rgba(30,58,138,0.32)]">
      <div className="h-2 bg-gradient-to-r from-pink-500 via-orange-400 via-emerald-400 to-blue-600" />
      <header className="bg-gradient-to-br from-[#142e75] via-[#1e40af] to-[#4f46e5] px-7 py-9 text-center text-white">
        <p className="text-xs font-black tracking-[0.2em] text-yellow-300">PHULANGKA GAMES 2569</p>
        <h1 className="mt-3 text-2xl font-black leading-tight">เข้าสู่ระบบกีฬากลุ่ม</h1>
        <p className="mt-2 text-sm leading-relaxed text-blue-100">สำหรับโรงเรียนที่เข้าร่วมการแข่งขันกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา</p>
      </header>
      <div className="p-7">
        <p className="mb-5 text-sm text-slate-600">ใช้ชื่อผู้ใช้และรหัสผ่านที่ผู้ดูแลการแข่งขันออกให้ <strong>ไม่ต้องใช้บัญชี Google</strong></p>
        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}
        <form onSubmit={login} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อผู้ใช้ (Username)</span>
            <input autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} value={username} onChange={e=>setUsername(e.target.value)} placeholder="เช่น py001" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">รหัสผ่าน</span>
            <input autoComplete="current-password" required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="กรอกรหัสผ่านที่ได้รับ" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200/60 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{busy?"กำลังตรวจสอบบัญชี...":"เข้าสู่ระบบโรงเรียน"}</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">ลืมรหัสผ่าน? ติดต่อผู้ดูแลการแข่งขันเพื่อขอรหัสใหม่</p>
        <div className="mt-6 grid gap-2 border-t border-slate-100 pt-5 text-center text-sm font-semibold">
          <Link href="/group-sports" className="rounded-xl bg-slate-100 px-4 py-2.5 text-slate-700 hover:bg-slate-200">← ดูข้อมูลกีฬากลุ่ม (ไม่ต้องล็อกอิน)</Link>
          <Link href="/login" className="text-xs text-slate-500 hover:text-blue-700">ผู้ดูแลที่ใช้ Google Workspace เข้าสู่ระบบที่นี่</Link>
        </div>
      </div>
    </div>
  </main>;
}
