"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./print.css";

type PrintedAthlete = {
  student_code?: string | null;
  full_name: string;
  team_role?: string | null;
  ign?: string | null;
  play_position?: string | null;
};

type PrintedCoach = { name: string; phone?: string | null };

type PrintedApplication = {
  entry: { id: string; entry_name: string; coach_name?: string | null; assistant_coach?: string | null; status: string; created_at?: string | null; return_reason?: string | null };
  event: { sport_name: string; event_code?: string | null; event_type: string; gender_rule?: string | null; level_rule?: string | null };
  school: { name: string; school_code?: string | null };
  competition: { name: string; academic_year?: string | null };
  athletes: PrintedAthlete[];
  coaches: PrintedCoach[];
};

const ROV_CODES = new Set(["GS3-ES-SM", "GS3-ES-SF"]);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function entryStatus(value: string): string {
  const names: Record<string, string> = {
    submitted: "ส่งใบสมัครแล้ว · รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ส่งคืนให้แก้ไข",
    withdrawn: "ถอนใบสมัคร",
  };
  return names[value] || value || "ไม่ระบุ";
}

function applicationType(event: PrintedApplication["event"]): string {
  if (ROV_CODES.has(event.event_code || "")) return "อีสปอร์ต (RoV)";
  if (event.event_type === "athletics") return "กรีฑา";
  if (event.event_type === "individual") return "กีฬาเดี่ยว / คู่";
  return "กีฬาทีม";
}

function formatThaiDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(parsed);
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

/**
 * Official two-page RoV form, matching the supplied school competition forms.
 * All IGN, lane, telephone and student-ID evidence remains in Supabase; only
 * the names, team roles, school and confirmation signatures are printed.
 */
function SimpleRovApplication({ application }: { application: PrintedApplication }) {
  const gender = application.event.event_code === "GS3-ES-SM" ? "ชาย" :
    application.event.event_code === "GS3-ES-SF" ? "หญิง" :
      (application.event.gender_rule || "");
  const tournament = "กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30";
  const academicYear = application.competition.academic_year || "2569";

  // Captain first, then other starting players, then optional substitutes.
  // A stable index breaks ties so the order of the stored roster is preserved.
  const captainFirst = (role?: string | null): number => role === "หัวหน้าทีม" ? 0 : role === "ตัวสำรอง" ? 2 : 1;
  const athletes = application.athletes
    .map((person, index) => ({ person, index }))
    .sort((a, b) => captainFirst(a.person.team_role) - captainFirst(b.person.team_role) || a.index - b.index)
    .slice(0, 7)
    .map(({ person }) => person);

  const coach = application.coaches[0]?.name || "";
  const assistant = application.coaches[1]?.name || "";
  const roles = ["ผู้จัดการทีม", "ผู้ฝึกสอน", "ผู้ช่วยผู้ฝึกสอน", "นักกีฬา (กัปตันทีม)",
    "นักกีฬา", "นักกีฬา", "นักกีฬา", "นักกีฬา", "นักกีฬา", "นักกีฬา"];
  const names = ["", coach, assistant, ...Array.from({ length: 7 }, (_, index) => athletes[index]?.full_name || "")];
  const notes = ["", "", "", ...Array.from({ length: 7 }, (_, index) =>
    athletes[index]?.team_role === "ตัวสำรอง" ? "สำรอง" : "")];

  return (
    <div className="gs-rov-two-page" aria-label="ใบสมัคร RoV สองหน้า พร้อมผังรูปนักกีฬา">
      <article className="gs-application gs-rov-sheet gs-rov-roster-page" aria-label="หน้า 1 ใบสมัครรายชื่อทีม RoV">
        <header className="gs-rov-official-header">
          <p className="gs-rov-school-top">โรงเรียน {application.school.name}</p>
          <h1>นักกีฬาชนิดกีฬา E-SPORT ทีม{gender} ( ARENA OF VALOR )</h1>
          <p>{tournament}</p>
          <p>ปีการศึกษา {academicYear}</p>
          <p>ณ .......................................................................................</p>
          <p>โรงเรียน {application.school.name}</p>
        </header>
        <table className="gs-rov-official-table" aria-label="รายชื่อผู้ควบคุมและนักกีฬา">
          <colgroup><col className="gs-rov-col-no"/><col className="gs-rov-col-name"/><col className="gs-rov-col-position"/><col className="gs-rov-col-note"/></colgroup>
          <thead><tr><th scope="col">ที่</th><th scope="col">ชื่อ - สกุล</th><th scope="col">ตำแหน่ง</th><th scope="col">หมายเหตุ</th></tr></thead>
          <tbody>{roles.map((position, index) => (
            <tr key={index}>
              <td className="gs-rov-official-number">{index + 1}</td>
              <td>{names[index] || " "}</td>
              <td>{position}</td>
              <td>{notes[index] || " "}</td>
            </tr>
          ))}</tbody>
        </table>
      </article>

      <article className="gs-application gs-rov-sheet gs-rov-photo-page" aria-label="หน้า 2 ผังรูปนักกีฬา RoV">
        <header className="gs-rov-photo-header">
          <p>โรงเรียน {application.school.name}</p>
          <div className="gs-rov-photo-kind">ผังรูป <span className="gs-rov-checkmark">☑</span> นักกีฬา <span className="gs-rov-checkbox">□</span> เจ้าหน้าที่ทีม</div>
          <h2>นักกีฬาชนิดกีฬา E-SPORT ทีม{gender} ( ARENA OF VALOR )</h2>
          <p>{tournament}</p>
          <p>ปีการศึกษา {academicYear}</p>
        </header>
        <section className="gs-rov-photo-grid" aria-label="ช่องติดรูปนักกีฬา 7 คน">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="gs-rov-photo-item" key={index}>
              <div className="gs-rov-photo-frame" aria-label={`ช่องติดรูปนักกีฬาคนที่ ${index + 1}`}>
                <span>{index + 1}</span>
              </div>
              <p className="gs-rov-photo-signature">ลงชื่อ................................................</p>
              <p className="gs-rov-photo-athlete-name">{athletes[index]?.full_name || " "}</p>
            </div>
          ))}
        </section>
        <section className="gs-rov-photo-certifications" aria-label="ช่องลงนามครูและผู้อำนวยการ">
          <div className="gs-rov-photo-staff-signatures">
            <div>
              <p>ลงชื่อ....................................................</p>
              <p>( {coach || "................................................"} )</p>
              <p>ผู้ฝึกสอน</p>
            </div>
            <div>
              <p>ลงชื่อ....................................................</p>
              <p>( {assistant || "................................................"} )</p>
              <p>ผู้ช่วยผู้ฝึกสอน</p>
            </div>
          </div>
          <div className="gs-rov-photo-director">
            <p>ลงชื่อ....................................................</p>
            <p>( .................................................... )</p>
            <p>ผู้อำนวยการโรงเรียน {application.school.name}</p>
          </div>
        </section>
      </article>
    </div>
  );
}

export default function GroupSportsPrintPage() {
  const [application, setApplication] = useState<PrintedApplication | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchApplication = async () => {
      try {
        const entryId = new URLSearchParams(window.location.search).get("entry")?.trim() || "";
        if (!ID_PATTERN.test(entryId)) throw new Error("ลิงก์ใบสมัครไม่ถูกต้อง กรุณาเปิดใบสมัครจากเมนูลงทะเบียน");

        // Supabase Auth credentials are kept by the existing client. Do not
        // use the service-role key or put roster data in a query string.
        const auth = await supabase.auth.getUser();
        if (auth.error || !auth.data.user) {
          throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนหรือผู้ดูแลการแข่งขันก่อนพิมพ์ใบสมัคร");
        }

        // This existing security-definer RPC checks that the signed-in user
        // belongs to the application school or is a competition administrator.
        const roster = await supabase.rpc("sports_roster_details", { p_entry: entryId, p_team: null });
        if (roster.error) throw new Error(roster.error.message);
        if (!roster.data || !Array.isArray(roster.data.players)) {
          throw new Error("ไม่พบใบสมัคร หรือบัญชีนี้ไม่มีสิทธิ์พิมพ์ใบสมัครรายการนี้");
        }

        const entryResult = await supabase.from("sports_entries")
          .select("id,entry_name,coach_name,assistant_coach,status,created_at,return_reason,school_id,event_id,competition_id")
          .eq("id", entryId).maybeSingle();
        if (entryResult.error || !entryResult.data) throw new Error("ไม่สามารถอ่านข้อมูลใบสมัคร กรุณาตรวจสอบสิทธิ์บัญชีผู้ใช้");
        const entry = entryResult.data;

        const [eventResult, schoolResult, competitionResult] = await Promise.all([
          supabase.from("sports_events").select("id,competition_id,sport_name,event_code,event_type,gender_rule,level_rule")
            .eq("id", entry.event_id).maybeSingle(),
          supabase.from("sports_schools").select("id,name,school_code")
            .eq("id", entry.school_id).maybeSingle(),
          supabase.from("sports_competitions").select("id,name,academic_year")
            .eq("id", entry.competition_id).maybeSingle(),
        ]);
        if (eventResult.error || schoolResult.error || competitionResult.error ||
            !eventResult.data || !schoolResult.data || !competitionResult.data ||
            eventResult.data.competition_id !== entry.competition_id) {
          throw new Error("ไม่สามารถอ่านรายละเอียดโรงเรียนหรือรายการแข่งขันได้");
        }

        // Keep RPC data unknown until the values pass the runtime guard. This
        // also preserves strong typing under TypeScript strict/noImplicitAny.
        const rawCoaches: unknown[] = Array.isArray(roster.data.coaches) ? roster.data.coaches : [];
        const validCoaches: PrintedCoach[] = rawCoaches
          .filter((coach: unknown): coach is PrintedCoach =>
            typeof coach === "object" && coach !== null &&
            "name" in coach && typeof coach.name === "string" && Boolean(coach.name.trim()) &&
            (!("phone" in coach) || coach.phone == null || typeof coach.phone === "string"))
          .map((coach: PrintedCoach) => ({ name: coach.name.trim(), phone: coach.phone || null }));
        const fallbackCoaches = [entry.coach_name, entry.assistant_coach]
          .filter((name): name is string => Boolean(name && name.trim()))
          .map((name) => ({ name, phone: null }));
        const athletes: PrintedAthlete[] = roster.data.players.map((person: PrintedAthlete) => ({
          student_code: person.student_code || null,
          full_name: String(person.full_name || ""),
          team_role: person.team_role || null,
          ign: person.ign || null,
          play_position: person.play_position || null,
        }));
        if (!active) return;
        setApplication({
          entry: { id: entry.id, entry_name: entry.entry_name, coach_name: entry.coach_name,
            assistant_coach: entry.assistant_coach, status: entry.status, created_at: entry.created_at,
            return_reason: entry.return_reason },
          event: eventResult.data,
          school: schoolResult.data,
          competition: competitionResult.data,
          athletes,
          coaches: validCoaches.length ? validCoaches : fallbackCoaches,
        });
        document.title = safeFilename(`ใบสมัคร-${schoolResult.data.name}-${eventResult.data.sport_name}`);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดใบสมัครได้");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchApplication();
    return () => { active = false; };
  }, []);

  const isRov = application ? ROV_CODES.has(application.event.event_code || "") : false;
  return (
    <main className="gs-print-shell">
      <div className="gs-print-toolbar" aria-label="เครื่องมือพิมพ์ใบสมัคร">
        <Link href="/group-sports" className="gs-print-back">← กลับสู่ระบบกีฬากลุ่ม</Link>
        <div className="gs-print-toolbar-actions">
          <span className="gs-print-instruction">เลือกเครื่องพิมพ์หรือ “Save as PDF” ในหน้าต่างพิมพ์</span>
          <button type="button" disabled={!application} onClick={() => window.print()} className="gs-print-button">
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      {loading && <div role="status" className="gs-print-message">กำลังโหลดใบสมัครและตรวจสอบสิทธิ์...</div>}
      {!loading && error && (
        <div role="alert" className="gs-print-error">
          <strong>ไม่สามารถแสดงใบสมัครได้</strong>
          <p>{error}</p>
          <Link href="/group-sports/login">เข้าสู่ระบบโรงเรียน</Link>
        </div>
      )}

      {application && (isRov ? <SimpleRovApplication application={application} /> : (
        <article className="gs-application" aria-label="ใบสมัครการแข่งขันสำหรับพิมพ์ A4">
          <div className="gs-application-accent" aria-hidden="true" />
          <header className="gs-application-header">
            <p className="gs-application-kicker">ระบบบริหารจัดการแข่งขันกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา</p>
            <h1>ใบสมัครเข้าร่วมการแข่งขันกีฬา</h1>
            <p className="gs-application-competition">{application.competition.name}
              {application.competition.academic_year ? ` · ปีการศึกษา ${application.competition.academic_year}` : ""}
            </p>
          </header>

          <div className="gs-application-summary">
            <table className="gs-summary-table">
              <tbody>
                <tr><th>โรงเรียน</th><td colSpan={3}>{application.school.name}</td></tr>
                <tr><th>รายการแข่งขัน</th><td colSpan={3}>{application.event.sport_name}</td></tr>
                <tr><th>ประเภท</th><td>{applicationType(application.event)}</td><th>เพศ / รุ่น</th><td>{application.event.gender_rule || "—"} · {application.event.level_rule || "—"}</td></tr>
                <tr><th>สถานะใบสมัคร</th><td>{entryStatus(application.entry.status)}</td><th>วันที่ส่งใบสมัคร</th><td>{formatThaiDate(application.entry.created_at)}</td></tr>
                <tr><th>ชื่อใบสมัคร</th><td colSpan={3}>{application.entry.entry_name || "—"}</td></tr>
              </tbody>
            </table>
          </div>

          {application.entry.status === "rejected" && application.entry.return_reason &&
            <div className="gs-application-warning">เหตุผลที่ส่งคืน: {application.entry.return_reason}</div>}

          <section className="gs-application-section">
            <h2>รายชื่อนักกีฬา <span>({application.athletes.length} คน)</span></h2>
            <table className="gs-application-table">
              <thead><tr>
                <th className="gs-number">ที่</th>
                <th className="gs-code">รหัสนักเรียน</th>
                <th>คำนำหน้า ชื่อ–สกุล</th>
                {isRov && <><th>บทบาท</th><th>ชื่อในเกม (IGN)</th><th>ตำแหน่ง</th></>}
              </tr></thead>
              <tbody>{application.athletes.map((athlete, index) =>
                <tr key={`${athlete.student_code || ""}-${index}`}>
                  <td className="gs-number">{index + 1}</td>
                  <td>{athlete.student_code || "—"}</td>
                  <td>{athlete.full_name || "—"}</td>
                  {isRov && <><td>{athlete.team_role || "—"}</td><td>{athlete.ign || "—"}</td><td>{athlete.play_position === "Mid" ? "Midlane" : athlete.play_position || "—"}</td></>}
                </tr>)}</tbody>
            </table>
          </section>

          <section className="gs-application-section">
            <h2>ครูผู้ควบคุมทีม <span>({application.coaches.length} คน)</span></h2>
            <table className="gs-application-table gs-coaches-table">
              <thead><tr><th className="gs-number">ที่</th><th>ชื่อ–สกุลครูผู้ควบคุม</th><th>เบอร์โทรศัพท์</th></tr></thead>
              <tbody>{application.coaches.map((coach, index) =>
                <tr key={`${coach.name}-${index}`}><td className="gs-number">{index + 1}</td><td>{coach.name}</td><td>{coach.phone || "—"}</td></tr>)}</tbody>
            </table>
          </section>

          <section className="gs-application-declaration">
            <h2>คำรับรองข้อมูล</h2>
            <p>ข้าพเจ้าขอรับรองว่ารายชื่อและข้อมูลในใบสมัครฉบับนี้ตรงกับข้อมูลที่โรงเรียนส่งลงทะเบียน
              และผู้เข้าร่วมการแข่งขันจะปฏิบัติตามระเบียบการแข่งขันที่ฝ่ายจัดการแข่งขันกำหนด</p>
            <div className="gs-signatures">
              <div><div className="gs-sign-line">ลงชื่อ .......................................................</div>
                <div>( {application.coaches[0]?.name || "..................................................."} )</div>
                <strong>ครูผู้ควบคุมทีม</strong>
                <div>วันที่ .......... / .......... / ..........</div></div>
              <div><div className="gs-sign-line">ลงชื่อ .......................................................</div>
                <div>( ....................................................... )</div>
                <strong>ผู้อำนวยการโรงเรียน / ผู้ได้รับมอบหมาย</strong>
                <div>วันที่ .......... / .......... / ..........</div></div>
            </div>
          </section>
          <footer className="gs-application-footer">
            <span>รหัสอ้างอิงใบสมัคร: {application.entry.id}</span>
            <span>ออกเอกสารจากระบบ · {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date())}</span>
          </footer>
        </article>
      ))}
    </main>
  );
}
