"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SchoolInformationHub, { SCHOOL_INFORMATION_SECTIONS } from "@/components/group-sports/SchoolInformationHub";
import { supabase } from "@/lib/supabase";

const SLUG = "phayao-secondary-group-sports-2569";
const SECTIONS = SCHOOL_INFORMATION_SECTIONS.filter(item =>
  item.key === "parade_map" || item.key === "cheer_stands" ||
  item.key === "parade_order" || item.key === "assembly_points"
);
type Section = (typeof SECTIONS)[number]["key"];

export default function SchoolInformationManagePage() {
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("parade_map");

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("กรุณาเข้าสู่ระบบ Google ด้วยบัญชี Admin หลักก่อน");
        const comp = await supabase.from("sports_competitions").select("id").eq("slug", SLUG).single();
        if (comp.error || !comp.data) throw comp.error ?? new Error("ไม่พบรายการแข่งขัน");
        const compId = String(comp.data.id);
        const role = await supabase.from("sports_user_roles")
          .select("role,competition_id").eq("user_id",auth.user.id).eq("is_active",true)
          .in("role",["super_admin","competition_admin"]);
        if (role.error) throw role.error;
        const permitted = (role.data ?? []).some(r =>
          (r.role === "super_admin" && (!r.competition_id || r.competition_id === compId)) ||
          (r.role === "competition_admin" && r.competition_id === compId)
        );
        if (!permitted) throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการภาพและข้อความของการแข่งขัน");
        if (active) { setAuthorized(true);setCompetitionId(compId); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "ไม่สามารถตรวจสิทธิ์ผู้ดูแลได้");
      } finally { if (active) setReady(true); }
    };
    void check();
    return () => { active = false; };
  }, []);

  return <main className="min-h-screen bg-[#eaf1ff] px-3 py-6 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#07153c] via-[#123ea7] to-[#12356c] p-5 text-white shadow-lg">
        <Link href="/group-sports" className="text-sm font-semibold text-yellow-200 underline underline-offset-4">← กลับหน้าระบบกีฬากลุ่ม</Link>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">จัดการภาพและข้อความพิธีเปิด</h1>
        <p className="mt-2 text-sm text-blue-100">Admin หลักเปลี่ยนภาพ หัวข้อ คำอธิบาย และลิงก์ของข้อมูลทั่วไปได้ โดยไม่ต้องแก้โค้ด</p>
      </header>
      {!ready && <div className="rounded-xl bg-white p-5">กำลังตรวจสอบสิทธิ์ Admin...</div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-white p-5 font-semibold text-red-800">{error} <Link href="/login" className="underline">เข้าสู่ระบบ</Link></div>}
      {ready && authorized && competitionId && <>
        <nav aria-label="เลือกข้อมูลที่จะจัดการ" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SECTIONS.map(item => <button key={item.key} type="button" onClick={() => setSection(item.key)}
            className={`min-h-20 rounded-xl border-2 px-4 py-3 text-left text-sm font-extrabold shadow-sm transition ${section===item.key ? "border-yellow-400 bg-blue-900 text-yellow-200" : "border-blue-200 bg-white text-blue-900 hover:bg-blue-50"}`}
            aria-pressed={section === item.key}>{item.label}</button>)}
        </nav>
        <SchoolInformationHub key={section} competitionId={competitionId} section={section} canManage />
        <p className="rounded-xl bg-white p-4 text-sm text-blue-900">การแก้ไขประกาศที่เผยแพร่แล้วจะอัปเดตหน้าเว็บโดยตรง ภาพก่อนเปลี่ยนจะยังเก็บใน Storage สำหรับตรวจสอบประวัติ</p>
      </>}
    </div>
  </main>;
}
