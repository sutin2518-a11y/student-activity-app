"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AssignedEvent = { id: string; sport_name: string; event_code: string | null; event_type: string | null };

export default function MySportsOfficialAssignmentsPage() {
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    async function load() {
      const auth = await supabase.auth.getUser();
      if (auth.error || !auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วย Google ก่อน");
      const result = await supabase.rpc("sports_event_referee_my_events");
      if (result.error) throw result.error;
      if (mounted) setEvents((result.data || []) as AssignedEvent[]);
    }
    void load().catch(e => { if (mounted) setError(e instanceof Error ? e.message : "ไม่สามารถอ่านสิทธิ์กรรมการได้"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="rounded-2xl bg-gradient-to-r from-blue-950 to-blue-700 p-6 text-white">
        <Link href="/group-sports" className="text-xs font-semibold underline">← กลับสู่กีฬากลุ่ม</Link>
        <h1 className="mt-3 text-2xl font-black">รายการที่ได้รับมอบหมาย — กรรมการกีฬา</h1>
        <p className="mt-1 text-sm text-white/80">แสดงเฉพาะรายการแข่งขันที่บัญชี Google นี้ได้รับสิทธิ์</p>
      </header>
      {loading && <p className="rounded-xl bg-white p-5">กำลังตรวจสอบสิทธิ์...</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">{error}</p>}
      {!loading && !error && events.length === 0 && <p className="rounded-xl bg-white p-5">ยังไม่มีรายการที่ได้รับมอบหมาย กรุณาติดต่อแม่แอดมิน</p>}
      {!loading && !error && events.length > 0 && <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">รายการแข่งขันที่รับผิดชอบ ({events.length})</h2>
        <div className="mt-4 space-y-2">{events.map(event => <div key={event.id} className="rounded-xl border border-slate-200 p-4">
          <p className="font-bold">{event.sport_name}</p>
          <p className="mt-1 text-xs text-slate-600">รหัสรายการ {event.event_code || "—"}</p><Link href={`/group-sports/certificates/manage?event=${encodeURIComponent(event.id)}`} className="mt-3 inline-block rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">บันทึกอันดับรางวัล</Link>
        </div>)}</div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">บันทึกอันดับรางวัลเพียงครั้งเดียว ระบบเชื่อมผลการแข่งขัน เหรียญและเกียรติบัตรโดยไม่ต้องรอแม่แอดมินอนุมัติ (ต้องติดตั้ง Migration 038)</p>
      </section>}
    </div>
  </main>;
}
