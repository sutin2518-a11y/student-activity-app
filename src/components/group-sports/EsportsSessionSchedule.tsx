"use client";

import { useMemo, useState } from "react";

type EventRow = {
  id: string;
  event_code: string;
};

type GroupRow = {
  id: string;
  event_id: string;
  group_code: string;
  sort_order: number;
};

type TeamRow = {
  id: string;
  group_id: string;
  school_name: string;
  seed_order: number;
};

type MatchRow = {
  id: string;
  event_id: string;
  group_id: string | null;
  match_no: string;
  stage: string;
  team1_id: string | null;
  team2_id: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  match_status: string;
  score1: number | null;
  score2: number | null;
};

export type Bundle = {
  events: EventRow[];
  groups: GroupRow[];
  teams: TeamRow[];
  matches: MatchRow[];
};

type Fixture = {
  match: MatchRow;
  date: string;
  session: number;
  start: string;
  end: string;
  station: number;
  gender: string;
  groupCode: string;
  school1: string;
  school2: string;
  team1: string;
  team2: string;
};

const SLOTS = [
  { start: "09:00", end: "10:30" },
  { start: "10:30", end: "12:00" },
  { start: "13:00", end: "14:30" },
  { start: "14:30", end: "16:00" },
];

const panel =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

function pairKey(
  groupId: string,
  first: string,
  second: string
) {
  return [
    groupId,
    ...[first, second].sort(),
  ].join("|");
}

// สร้างคู่พบกันหมด โดย 1 ทีมแข่งขันได้ 1 คู่ต่อ Session
function roundRobin(ids: string[]): [string, string][][] {
  const rotating: (string | null)[] = [...ids];

  if (rotating.length % 2) rotating.push(null);

  const result: [string, string][][] = [];
  const size = rotating.length;

  for (let round = 0; round < size - 1; round++) {
    const pairs: [string, string][] = [];

    for (let i = 0; i < size / 2; i++) {
      const a = rotating[i];
      const b = rotating[size - 1 - i];

      if (a && b) pairs.push([a, b]);
    }

    result.push(pairs);

    const last = rotating.pop() ?? null;
    rotating.splice(1, 0, last);
  }

  return result;
}

export function makePlan(data: Bundle) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: Fixture[] = [];

  const eventById = new Map(
    data.events.map(e => [e.id, e])
  );

  const teamById = new Map(
    data.teams.map(t => [t.id, t])
  );

  const matchByPair = new Map<string, MatchRow>();

  const groupMatches = data.matches.filter(
    m => m.stage === "group"
  );

  for (const m of groupMatches) {
    if (!m.group_id || !m.team1_id || !m.team2_id) {
      errors.push(`คู่ ${m.match_no} มีข้อมูลทีมไม่ครบ`);
      continue;
    }

    const key = pairKey(
      m.group_id,
      m.team1_id,
      m.team2_id
    );

    if (matchByPair.has(key)) {
      errors.push(`พบคู่แข่งขันซ้ำ: ${m.match_no}`);
    }

    matchByPair.set(key, m);
  }

  const orderedGroups = [...data.groups].sort((a, b) => {
    const aCode = eventById.get(a.event_id)?.event_code;
    const bCode = eventById.get(b.event_id)?.event_code;

    const aRank = aCode === "GS3-ES-SM" ? 0 : 1;
    const bRank = bCode === "GS3-ES-SM" ? 0 : 1;

    return aRank - bRank ||
      a.sort_order - b.sort_order;
  });

  orderedGroups.forEach((group, groupIndex) => {
    const roster = data.teams
      .filter(t => t.group_id === group.id)
      .sort((a, b) => a.seed_order - b.seed_order);

    const gender =
      eventById.get(group.event_id)?.event_code ===
      "GS3-ES-SM" ? "ชาย" : "หญิง";

    if (![4, 5].includes(roster.length)) {
      errors.push(
        `ทีม${gender} กลุ่ม ${group.group_code}: ` +
        `มี ${roster.length} ทีม (ต้องมี 4 หรือ 5 ทีม)`
      );
      return;
    }

    const rounds = roundRobin(roster.map(t => t.id));

    rounds.forEach((pairs, roundIndex) => {
      const date =
        roundIndex < 4 ? "2026-12-05" : "2026-12-06";

      const session = (roundIndex % 4) + 1;
      const slot = SLOTS[session - 1];

      pairs.forEach(([team1, team2], pairIndex) => {
        const match = matchByPair.get(
          pairKey(group.id, team1, team2)
        );

        if (!match) {
          errors.push(
            `ไม่พบคู่แข่งขัน ทีม${gender} ` +
            `กลุ่ม ${group.group_code}: ` +
            `${teamById.get(team1)?.school_name} / ` +
            `${teamById.get(team2)?.school_name}`
          );
          return;
        }

        const station = groupIndex * 2 + pairIndex + 1;

        rows.push({
          match,
          date,
          session,
          start: slot.start,
          end: slot.end,
          station,
          gender,
          groupCode: group.group_code,
          school1: teamById.get(team1)?.school_name ?? "—",
          school2: teamById.get(team2)?.school_name ?? "—",
          team1,
          team2,
        });

        // ตรวจข้อมูลเดิม แต่ไม่แก้ไขวันเวลาและผล
        if (
          match.scheduled_date &&
          match.start_time &&
          (
            match.scheduled_date !== date ||
            match.start_time.slice(0, 5) !== slot.start
          )
        ) {
          warnings.push(
            `${match.match_no}: เวลาเดิม ` +
            `${match.scheduled_date} ` +
            `${match.start_time.slice(0, 5)} ` +
            `ต่างจากแผน Stage 9 ${date} ${slot.start}`
          );
        }
      });
    });
  });

  rows.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.session - b.session ||
    a.station - b.station
  );

  // ตรวจทีมซ้ำภายใน Session เดียวกัน
  const used = new Map<string, Set<string>>();
  const stationUsed = new Set<string>();
  const matchIds = new Set<string>();

  for (const row of rows) {
    const key = `${row.date}|${row.session}`;
    const occupied = used.get(key) ?? new Set<string>();

    if (occupied.has(row.team1) || occupied.has(row.team2)) {
      errors.push(
        `มีทีมแข่งขันซ้ำในรอบที่ ${row.session}: ` +
        row.match.match_no
      );
    }

    occupied.add(row.team1);
    occupied.add(row.team2);
    used.set(key, occupied);

    const stationKey = `${key}|${row.station}`;

    if (stationUsed.has(stationKey)) {
      errors.push(`สถานีแข่งขันซ้ำ: ${stationKey}`);
    }

    stationUsed.add(stationKey);

    if (matchIds.has(row.match.id)) {
      errors.push(`รหัสคู่ซ้ำ: ${row.match.match_no}`);
    }

    matchIds.add(row.match.id);
  }

  if (rows.length !== groupMatches.length) {
    errors.push(
      `สร้างแผนได้ ${rows.length} คู่ ` +
      `แต่ฐานข้อมูลมี ${groupMatches.length} คู่`
    );
  }

  const firstSession = rows.filter(
    r => r.date === "2026-12-05" && r.session === 1
  );

  if (firstSession.length !== 12) {
    errors.push(
      `Session 1 ต้องมี 12 คู่ ` +
      `แต่พบ ${firstSession.length} คู่`
    );
  }

  if (orderedGroups.length !== 6) {
    errors.push(
      `ต้องมี 6 สาย แต่พบ ${orderedGroups.length} สาย`
    );
  }

  return { rows, errors, warnings };
}

function thaiDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

const scheduleHeaders = [
  "วันที่", "แมตช์", "เวลา", "คู่ที่", "ประเภท", "กลุ่ม", "รหัสคู่", "คู่แข่งขัน", "สถานะเดิม",
];

export function fixtureStatus(row: Fixture) {
  if (row.match.match_status !== "completed") return row.match.match_status;
  const { score1, score2 } = row.match;
  const score = row.team1 === row.match.team1_id ? `${score1}–${score2}` : `${score2}–${score1}`;
  return `บันทึกผลแล้ว ${score}`;
}

async function exportExcel(rows: Fixture[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([
    scheduleHeaders,
    ...rows.map(r => [
      thaiDate(r.date), r.session, `${r.start}–${r.end}`, r.station, r.gender,
      r.groupCode, r.match.match_no, `${r.school1} พบ ${r.school2}`, fixtureStatus(r),
    ]),
  ]);
  sheet["!cols"] = [18, 10, 18, 10, 10, 10, 12, 65, 24].map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "โปรแกรมการแข่งขัน");
  XLSX.writeFile(workbook, "โปรแกรมการแข่งขัน-E-Sport.xlsx");
}

export default function EsportsSessionSchedule({ events, groups, teams, matches, showSummary = false }: Bundle & { showSummary?: boolean }) {
  const plan = useMemo(() => makePlan({ events, groups, teams, matches }), [events, groups, teams, matches]);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");

  const visible = useMemo(() =>
    plan.rows.filter(r =>
      (dateFilter === "all" || r.date === dateFilter) &&
      (sessionFilter === "all" ||
        r.session === Number(sessionFilter))
    ), [plan, dateFilter, sessionFilter]
  );

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {showSummary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["คู่แข่งขัน", plan.rows.length],
            ["Session แรก", plan.rows.filter(row => row.date === "2026-12-05" && row.session === 1).length],
            ["ข้อผิดพลาด", plan.errors.length],
            ["ข้อมูลเดิมที่ต้องตรวจ", plan.warnings.length],
          ].map(([label, value]) => (
            <div className={panel} key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}
      {plan.errors.length > 0 && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4">
          <h3 className="font-black text-red-800">
            ข้อผิดพลาดในแผน
          </h3>
          {plan.errors.map((v, i) => (
            <p key={i} className="mt-1 text-sm">{v}</p>
          ))}
        </section>
      )}

      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">
            โปรแกรมการแข่งขันรวมทุกสาย
          </h2>

          <button
            className="rounded-xl bg-[#217346] px-4 py-2 text-sm font-bold text-white hover:bg-[#185c37] disabled:opacity-50"
            onClick={() => void exportExcel(visible).catch(() => setError("ส่งออก Excel ไม่สำเร็จ กรุณาลองอีกครั้ง"))}
            disabled={plan.errors.length > 0 || visible.length === 0}
          >
            ส่งออก Excel
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-xl border p-3"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          >
            <option value="all">ทุกวัน</option>
            <option value="2026-12-05">5 ธ.ค. 2569</option>
            <option value="2026-12-06">6 ธ.ค. 2569</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
          >
            <option value="all">ทุกแมตช์</option>
            {SLOTS.map((s, i) => (
              <option key={i} value={i + 1}>
                แมตช์ {i + 1} · {s.start}–{s.end}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                {scheduleHeaders.map(h => (
                  <th key={h} className="p-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.map(r => (
                <tr
                  key={r.match.id}
                  className="border-b even:bg-slate-50"
                >
                  <td className="whitespace-nowrap p-3">
                    {thaiDate(r.date)}
                  </td>
                  <td className="p-3 font-bold">
                    {r.session}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {r.start}–{r.end}
                  </td>
                  <td className="p-3 font-bold">
                    {r.station}
                  </td>
                  <td className="p-3">
                    {r.gender}
                  </td>
                  <td className="p-3">
                    {r.groupCode}
                  </td>
                  <td className="p-3 font-semibold">
                    {r.match.match_no}
                  </td>
                  <td className="min-w-56 p-3">
                    {r.school1}
                    <span className="mx-2 text-slate-400">พบ</span>
                    {r.school2}
                  </td>
                  <td className="p-3">
                    {fixtureStatus(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
