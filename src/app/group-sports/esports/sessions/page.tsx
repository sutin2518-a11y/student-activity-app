
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import EsportsSessionSchedule, { type Bundle } from "@/components/group-sports/EsportsSessionSchedule";

const CODES = ["GS3-ES-SM", "GS3-ES-SF"];

const panel =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

const button =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50";

export default function EsportsSessionsPage() {
  const [data, setData] = useState<Bundle | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const auth = await supabase.auth.getUser();

      const comp = await supabase
        .from("sports_competitions")
        .select("id")
        .eq("slug", "phayao-secondary-group-sports-2569")
        .single();

      if (comp.error) throw comp.error;

      if (auth.data.user) {
        const role = await supabase.rpc(
          "sports_stage3_admin",
          { p_comp: comp.data.id }
        );

        if (role.error) throw role.error;
        setAdmin(role.data === true);
      } else {
        setAdmin(false);
      }

      const eventsResult = await supabase
        .from("sports_events")
        .select("id,event_code")
        .eq("competition_id", comp.data.id)
        .in("event_code", CODES);

      if (eventsResult.error) throw eventsResult.error;

      const events = eventsResult.data as Bundle["events"];
      const eventIds = events.map(e => e.id);

      if (!eventIds.length) {
        throw new Error(
          "ไม่พบข้อมูล E-Sport ที่มีสิทธิ์เข้าถึง " +
          "โปรดตรวจสอบบัญชีผู้ดูแลการแข่งขัน"
        );
      }

      const [g, t, m] = await Promise.all([
        supabase.from("sports_esports_groups")
          .select("id,event_id,group_code,sort_order")
          .eq("competition_id", comp.data.id)
          .in("event_id", eventIds),

        supabase.from("sports_esports_group_teams")
          .select("id,group_id,school_name,seed_order")
          .eq("competition_id", comp.data.id)
          .in("event_id", eventIds),

        supabase.from("sports_esports_matches")
          .select(
            "id,event_id,group_id,match_no,stage,team1_id,team2_id,scheduled_date,start_time,match_status,score1,score2"
          )
          .eq("competition_id", comp.data.id)
          .in("event_id", eventIds)
          .eq("stage", "group"),
      ]);

      if (g.error) throw g.error;
      if (t.error) throw t.error;
      if (m.error) throw m.error;

      setData({
        events,
        groups: g.data as Bundle["groups"],
        teams: t.data as Bundle["teams"],
        matches: m.data,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message :
        "ไม่สามารถโหลดข้อมูลการแข่งขันได้"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(event => {
        if (
          ["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"]
            .includes(event)
        ) {
          window.setTimeout(() => void load(), 0);
        }
      });

    return () => authListener.subscription.unsubscribe();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 px-5 py-6 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/group-sports/esports"
            className="text-sm text-rose-200 hover:text-white"
          >
            ← กลับระบบ E-Sport
          </Link>

          <p className="mt-4 text-xs font-bold tracking-widest text-amber-300">
            PHULANGKA GAMES 2026 · STAGE 9
          </p>

          <h1 className="mt-2 text-2xl font-black">
            ตารางแข่งขันตามรอบเวลา
          </h1>

          <p className="mt-1 text-sm text-slate-300">
            RoV ชาย–หญิง · 6 สาย · หลายสถานีพร้อมกัน
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-4">
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">
                แผนการแข่งขัน Stage 9
              </h2>
              <p className="text-sm text-slate-500">
                แสดงแผนจากข้อมูลเดิมเท่านั้น
                ยังไม่มีการเปลี่ยนวันเวลา ผล หรือรหัสคู่ใน Supabase
              </p>
            </div>

            <button
              className={button}
              onClick={() => void load()}
              disabled={loading}
            >
              รีเฟรชข้อมูล
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {loading && <div className={panel}>กำลังโหลดข้อมูล…</div>}

        {data && (
          <>
            <EsportsSessionSchedule {...data} showSummary />
            <p className="text-xs text-slate-600">
              สถานีแข่งขัน 1–12 เป็นหมายเลขเสนอสำหรับจัดคู่พร้อมกัน
              ต้องตรวจยืนยันจำนวนสถานีจริงก่อนประกาศ
              {admin ? " · เข้าสู่ระบบในฐานะผู้ดูแลการแข่งขัน" : ""}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
