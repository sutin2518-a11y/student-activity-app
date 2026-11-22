"use client";

import EsportsSessionSchedule from "@/components/group-sports/EsportsSessionSchedule";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const SLUG = "phayao-secondary-group-sports-2569";
const EVENT_CODES = ["GS3-ES-SM", "GS3-ES-SF"] as const;
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600";
const primary = "rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const danger = "rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50";

type Gender = "ชาย" | "หญิง";
type Tab = "groups" | "matches" | "schedule" | "standings" | "knockout" | "history" | "prelaunch";

// แยกสีเมนูแต่ละส่วนให้เห็นชัดทั้งสถานะที่เลือกและยังไม่เลือก
const tabPalette: Record<Tab, { active: string; idle: string }> = {
  groups: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  matches: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  schedule: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  standings: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  knockout: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  history: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  },
  prelaunch: {
    active: "border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200",
    idle: "border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50"
  }
};

function tabButtonClass(key: Tab, current: Tab) {
  const stateClass = key === current ? tabPalette[key].active : tabPalette[key].idle;
  return `inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-extrabold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${stateClass}`;
}

type EventRow = { id: string; event_code: string; sport_name: string; gender_rule: Gender; status: string };
type GroupRow = { id: string; event_id: string; group_code: string; sort_order: number };
type TeamRow = { id: string; event_id: string; group_id: string; school_name: string; seed_order: number };
type MatchStatus = "draft" | "scheduled" | "completed" | "cancelled";
type MatchRow = {
  id: string; event_id: string; group_id: string | null; match_no: string; stage: string; play_order: number | null;
  team1_id: string | null; team2_id: string | null; scheduled_date: string | null; start_time: string | null;
  venue_name: string; match_status: MatchStatus; score1: number | null; score2: number | null;
  duration_minutes: number | null; team1_kills: number | null; team2_kills: number | null; notes: string;
  winner_next_match_id: string | null; winner_next_slot: number | null;
  loser_next_match_id: string | null; loser_next_slot: number | null;
};
type MatchForm = {
  scheduled_date: string; start_time: string; venue_name: string; match_status: MatchStatus;
  score1: string; score2: string; duration_minutes: string; team1_kills: string; team2_kills: string;
};
type Standing = {
  team: TeamRow; played: number; wins: number; losses: number; points: number;
  gamesFor: number; gamesAgainst: number; time: number; timeRecordedMatches: number;
  kills: number; killRecordedMatches: number;
};
type HistoryRow = {
  id: number; event_id: string; match_id: string | null; match_no: string; action: "INSERT" | "UPDATE" | "DELETE";
  reason: string; changed_at: string; changed_by: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null;
};
type PendingBracketEdit = { matchId: string; team1Id: string; team2Id: string; reason: string };
type PendingResultSave = { matchId: string; form: MatchForm; reason: string };

const statusLabel: Record<MatchStatus, string> = {
  draft: "ฉบับร่าง", scheduled: "กำหนดการแข่งขันแล้ว", completed: "แข่งขันเสร็จสิ้น", cancelled: "ยกเลิก"
};
const stageLabel: Record<string, string> = {
  knockout: "รอบ 8 ทีมสุดท้าย", semifinal: "รอบรองชนะเลิศ", final: "รอบชิงชนะเลิศ", third_place: "ชิงอันดับ 3"
};

function errorText(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error ? String(error.message) : "ไม่สามารถดำเนินการได้";
}
function thaiDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`)) : "รอกำหนดวัน";
}
function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
function shortTime(value: string | null) { return value ? value.slice(0, 5) : "รอกำหนดเวลา"; }
function formFromMatch(match: MatchRow): MatchForm {
  return {
    scheduled_date: match.scheduled_date || "", start_time: match.start_time?.slice(0, 5) || "",
    venue_name: match.venue_name || "หอประชุมโรงเรียนเชียงคำวิทยาคม", match_status: match.match_status,
    score1: match.score1 == null ? "" : String(match.score1), score2: match.score2 == null ? "" : String(match.score2),
    duration_minutes: match.duration_minutes == null ? "" : String(match.duration_minutes),
    team1_kills: match.team1_kills == null ? "" : String(match.team1_kills),
    team2_kills: match.team2_kills == null ? "" : String(match.team2_kills)
  };
}
function getDownstreamMatches(sourceId: string, matches: MatchRow[]) {
  const byId = new Map(matches.map(match => [match.id, match]));
  const found = new Set<string>();
  const queue = [sourceId];
  while (queue.length) {
    const current = byId.get(queue.shift()!);
    if (!current) continue;
    for (const nextId of [current.winner_next_match_id, current.loser_next_match_id]) {
      if (nextId && !found.has(nextId)) {
        found.add(nextId);
        queue.push(nextId);
      }
    }
  }
  return [...found].map(id => byId.get(id)).filter((match): match is MatchRow => Boolean(match));
}
function teamLabel(team: TeamRow, groups: Map<string, GroupRow>) {
  const group = groups.get(team.group_id)?.group_code || "?";
  return `${team.school_name} (กลุ่ม ${group})`;
}
function snapshotLine(data: Record<string, unknown> | null, teams: Map<string, TeamRow>) {
  if (!data) return "—";
  const name = (id: unknown) => typeof id === "string" ? teams.get(id)?.school_name || "ทีมที่ไม่อยู่ในรายการปัจจุบัน" : "ยังไม่กำหนดทีม";
  const pair = `${name(data.team1_id)} พบ ${name(data.team2_id)}`;
  const score = data.score1 != null && data.score2 != null ? `ผล ${String(data.score1)}–${String(data.score2)}` : "ยังไม่มีผล";
  const status = typeof data.match_status === "string" && data.match_status in statusLabel ? statusLabel[data.match_status as MatchStatus] : "ไม่ระบุสถานะ";
  const schedule = `${typeof data.scheduled_date === "string" ? data.scheduled_date : "ไม่กำหนดวัน"} ${typeof data.start_time === "string" ? data.start_time.slice(0,5) : ""}`.trim();
  const duration = data.duration_minutes != null ? `เวลา ${String(data.duration_minutes)} นาที` : "ไม่บันทึกเวลา";
  const kills = data.team1_kills != null || data.team2_kills != null ? `Kill ${String(data.team1_kills ?? "—")}–${String(data.team2_kills ?? "—")}` : "ไม่บันทึก Kill";
  return `${pair} · ${score} · ${status} · ${schedule} · ${duration} · ${kills}`;
}

function buildStandings(group: GroupRow, teams: TeamRow[], matches: MatchRow[]): Standing[] {
  const stats = new Map<string, Standing>();
  teams.filter(team => team.group_id === group.id).forEach(team => stats.set(team.id, {
    team, played: 0, wins: 0, losses: 0, points: 0, gamesFor: 0, gamesAgainst: 0,
    time: 0, timeRecordedMatches: 0, kills: 0, killRecordedMatches: 0
  }));
  matches.filter(match => match.group_id === group.id && match.match_status === "completed" && match.score1 != null && match.score2 != null).forEach(match => {
    if (!match.team1_id || !match.team2_id) return;
    const a = stats.get(match.team1_id); const b = stats.get(match.team2_id);
    if (!a || !b) return;
    a.played += 1; b.played += 1;
    a.gamesFor += match.score1 as number; a.gamesAgainst += match.score2 as number;
    b.gamesFor += match.score2 as number; b.gamesAgainst += match.score1 as number;
    if (match.duration_minutes != null) {
      a.time += Number(match.duration_minutes); b.time += Number(match.duration_minutes);
      a.timeRecordedMatches += 1; b.timeRecordedMatches += 1;
    }
    if (match.team1_kills != null && match.team2_kills != null) {
      a.kills += Number(match.team1_kills); b.kills += Number(match.team2_kills);
      a.killRecordedMatches += 1; b.killRecordedMatches += 1;
    }
    if ((match.score1 as number) > (match.score2 as number)) {
      a.wins += 1; b.losses += 1; a.points += match.score2 === 0 ? 3 : 2; b.points += match.score2 === 0 ? 0 : 1;
    } else {
      b.wins += 1; a.losses += 1; b.points += match.score1 === 0 ? 3 : 2; a.points += match.score1 === 0 ? 0 : 1;
    }
  });

  const seedOrder = (a: Standing, b: Standing) => a.team.seed_order - b.team.seed_order;
  const all = Array.from(stats.values());
  const pointGroups = [...new Set(all.map(row => row.points))].sort((a, b) => b - a);
  const ranked: Standing[] = [];

  for (const points of pointGroups) {
    const samePoints = all.filter(row => row.points === points);
    const hasCompleteTime = samePoints.every(row => row.played > 0 && row.timeRecordedMatches === row.played);
    if (!hasCompleteTime) {
      ranked.push(...samePoints.sort(seedOrder));
      continue;
    }
    const timeKeys = [...new Set(samePoints.map(row => Math.round(row.time * 100)))].sort((a, b) => a - b);
    for (const timeKey of timeKeys) {
      const sameTime = samePoints.filter(row => Math.round(row.time * 100) === timeKey);
      const hasCompleteKills = sameTime.every(row => row.played > 0 && row.killRecordedMatches === row.played);
      if (hasCompleteKills) sameTime.sort((a, b) => b.kills - a.kills || seedOrder(a, b));
      else sameTime.sort(seedOrder);
      ranked.push(...sameTime);
    }
  }
  return ranked;
}


// โปรแกรมรอบแบ่งกลุ่ม: แยก "รหัสคู่" ออกจาก "ลำดับลงสนาม" เพื่อไม่กระทบผลเดิม
function scheduleCompare(a: MatchRow, b: MatchRow) {
  const aOrder = a.play_order;
  const bOrder = b.play_order;
  if (aOrder != null && bOrder != null) return aOrder - bOrder || a.match_no.localeCompare(b.match_no);
  if (aOrder != null) return -1;
  if (bOrder != null) return 1;
  // ถ้ายังไม่มีลำดับลงสนาม ให้ใช้เวลาจริงก่อน และคงรหัสคู่เดิมเป็น fallback
  if (a.scheduled_date && b.scheduled_date && a.start_time && b.start_time) {
    const diff = `${a.scheduled_date}T${a.start_time}`.localeCompare(`${b.scheduled_date}T${b.start_time}`);
    if (diff !== 0) return diff;
  }
  return a.match_no.localeCompare(b.match_no, "en", { numeric: true });
}
function groupSchedule(matches: MatchRow[], groupId: string) {
  return matches.filter(match => match.stage === "group" && match.group_id === groupId).sort(scheduleCompare);
}
function MatchCard({
  match, groupCode, team1Name, team2Name, admin, saving, onSave
}: {
  match: MatchRow; groupCode: string; team1Name: string; team2Name: string;
  admin: boolean; saving: boolean; onSave: (id: string, form: MatchForm) => void;
}) {
  const [form, setForm] = useState<MatchForm>(() => formFromMatch(match));
  useEffect(() => { setForm(formFromMatch(match)); }, [match]);
  const change = (key: keyof MatchForm, value: string) => setForm(old => ({ ...old, [key]: value }));
  const completed = match.match_status === "completed";
  return <article className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs font-bold text-slate-500">{groupCode} · คู่ {match.match_no}</p><p className="mt-1 text-sm font-bold text-slate-900">{team1Name} <span className="px-1 text-slate-400">พบ</span> {team2Name}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${completed ? "bg-emerald-100 text-emerald-800" : match.match_status === "scheduled" ? "bg-rose-100 text-red-800" : match.match_status === "cancelled" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{statusLabel[match.match_status]}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      <span>{thaiDate(match.scheduled_date)}</span><span>{shortTime(match.start_time)}</span><span>{match.venue_name || "รอยืนยันสนาม"}</span>
      {completed && <strong className="text-base text-slate-900">ผล {match.score1}–{match.score2}</strong>}
    </div>
    {admin && <form className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(match.id, form); }}>
      <label className="text-xs font-semibold text-slate-600">วันที่แข่งขัน<input className={input} type="date" value={form.scheduled_date} onChange={e => change("scheduled_date", e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600">เวลาเริ่ม<input className={input} type="time" value={form.start_time} onChange={e => change("start_time", e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">สนาม<input className={input} value={form.venue_name} onChange={e => change("venue_name", e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600">ผลทีมแรก<input className={input} type="number" min="0" max="2" step="1" value={form.score1} onChange={e => change("score1", e.target.value)} placeholder="0–2" /></label>
      <label className="text-xs font-semibold text-slate-600">ผลทีมที่สอง<input className={input} type="number" min="0" max="2" step="1" value={form.score2} onChange={e => change("score2", e.target.value)} placeholder="0–2" /></label>
      <label className="text-xs font-semibold text-slate-600">เวลาแข่งขันรวม (นาที)<input className={input} type="number" min="0" step="0.01" value={form.duration_minutes} onChange={e => change("duration_minutes", e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-600">Kill ทีมแรก / ทีมสอง<div className="grid grid-cols-2 gap-1"><input className={input} type="number" min="0" step="1" value={form.team1_kills} onChange={e => change("team1_kills", e.target.value)} placeholder="ทีมแรก"/><input className={input} type="number" min="0" step="1" value={form.team2_kills} onChange={e => change("team2_kills", e.target.value)} placeholder="ทีมสอง"/></div></label>
      <label className="text-xs font-semibold text-slate-600">สถานะ<select className={input} value={form.match_status} onChange={e => change("match_status", e.target.value as MatchStatus)}><option value="draft">ฉบับร่าง</option><option value="scheduled">กำหนดการแข่งขันแล้ว</option><option value="completed">แข่งขันเสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></label>
      <div className="flex items-end"><button className={`${primary} w-full`} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกโปรแกรม / ผล"}</button></div>
    </form>}
  </article>;
}

function KnockoutPairingEditor({
  match, teams, groups, team1Name, team2Name, admin, saving, onRequestEdit, onSave
}: {
  match: MatchRow; teams: TeamRow[]; groups: Map<string, GroupRow>; team1Name: string; team2Name: string;
  admin: boolean; saving: boolean;
  onRequestEdit: (matchId: string, team1Id: string, team2Id: string) => void;
  onSave: (id: string, form: MatchForm) => void;
}) {
  const [team1Id, setTeam1Id] = useState(match.team1_id || "");
  const [team2Id, setTeam2Id] = useState(match.team2_id || "");
  useEffect(() => {
    setTeam1Id(match.team1_id || "");
    setTeam2Id(match.team2_id || "");
  }, [match.id, match.team1_id, match.team2_id]);

  return <div className="space-y-2">
    {admin && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">ทีมช่องที่ 1
          <select className={input} value={team1Id} onChange={e => setTeam1Id(e.target.value)}>
            <option value="">— เลือกทีม —</option>
            {teams.map(team => <option key={team.id} value={team.id} disabled={team.id === team2Id}>{teamLabel(team, groups)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">ทีมช่องที่ 2
          <select className={input} value={team2Id} onChange={e => setTeam2Id(e.target.value)}>
            <option value="">— เลือกทีม —</option>
            {teams.map(team => <option key={team.id} value={team.id} disabled={team.id === team1Id}>{teamLabel(team, groups)}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">การเปลี่ยนทีมจะเปิดขั้นตอนยืนยันและตรวจสอบผลรอบถัดไปก่อนบันทึก</p>
        <button type="button" className={secondary} disabled={saving || !team1Id || !team2Id || (team1Id === match.team1_id && team2Id === match.team2_id)} onClick={() => onRequestEdit(match.id, team1Id, team2Id)}>ตรวจสอบและแก้ไขสาย</button>
      </div>
    </div>}
    <MatchCard
      match={match}
      groupCode={stageLabel[match.stage] || "Knockout"}
      team1Name={team1Name}
      team2Name={team2Name}
      admin={admin}
      saving={saving}
      onSave={onSave}
    />
  </div>;
}

type ResetPreview = {
  matches: number; group_matches: number; knockout_matches: number;
  cancelled: number; completed: number; scheduled: number; draft: number;
  male_matches: number; female_matches: number;
  history_entries: number; fingerprint: string;
};

/** Admin-only pre-competition cleanup: preview, archive and reset RoV test state. */
function PrelaunchResetPanel({ onReset }: { onReset: () => Promise<void> }) {
  const confirmationText = "รีเซต ROV 2569";
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [archiveId, setArchiveId] = useState("");

  async function inspect() {
    setBusy(true); setProblem(""); setArchiveId(""); setPreview(null);
    setConfirmation(""); setAcknowledged(false);
    try {
      const { data, error } = await supabase.rpc("sports_esports_prelaunch_reset", {
        p_action: "preview", p_confirmation: null, p_expected_fingerprint: null
      });
      if (error) throw error;
      if (!data || typeof data !== "object" || typeof data.fingerprint !== "string") {
        throw new Error("ไม่ได้รับข้อมูลตรวจสอบจาก Supabase กรุณาตรวจสอบว่าได้รัน SQL 0024 แล้ว");
      }
      setPreview(data as ResetPreview);
    } catch (e) { setProblem(errorText(e)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (busy || !preview || !acknowledged || confirmation !== confirmationText) return;
    if (!window.confirm("ยืนยันรีเซตข้อมูลทดสอบ RoV ทั้งทีมชายและทีมหญิง?\n\nระบบจะสำรองก่อนล้างคะแนน ผลแข่งขัน สถานะยกเลิก และประวัติทดสอบ โดยเก็บรายชื่อทีม กลุ่ม และโปรแกรมวันเวลาเดิมไว้ และเปลี่ยนโปรแกรมเป็นฉบับร่างที่ยังไม่เผยแพร่")) return;
    setBusy(true); setProblem("");
    try {
      const { data, error } = await supabase.rpc("sports_esports_prelaunch_reset", {
        p_action: "reset", p_confirmation: confirmationText,
        p_expected_fingerprint: preview.fingerprint
      });
      if (error) throw error;
      if (!data || data.reset_complete !== true || typeof data.archive_id !== "string") {
        throw new Error("ระบบไม่ยืนยันการสำรองและรีเซต กรุณาตรวจสอบฐานข้อมูลก่อนทำซ้ำ");
      }
      setArchiveId(data.archive_id);
      setPreview(null); setConfirmation(""); setAcknowledged(false);
      await onReset();
    } catch (e) {
      setProblem(errorText(e));
      setPreview(null); // A changed database must be inspected again; do not retry blind.
    } finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm sm:p-6">
    <div>
      <h2 className="text-xl font-black text-red-900">เตรียมระบบ RoV ก่อนแข่งขันจริง</h2>
      <p className="mt-2 text-sm text-slate-700">ล้างเฉพาะข้อมูลทดสอบการแข่งขัน ทั้งทีมชายและทีมหญิง ไม่ลบโรงเรียน ทีม นักกีฬา การแบ่งกลุ่ม หรือคู่แข่งขันเดิม</p>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-extrabold">ข้อควรระวังก่อนรีเซต</p>
      <p className="mt-1">ระบบจะสำรองข้อมูลเดิมไว้ในคลังข้อมูลผู้ดูแลก่อนทุกครั้ง แล้วล้างคะแนน ผลแพ้–ชนะ เวลาที่ใช้แข่งขัน Kill สถานะยกเลิก ผลรอบ Knockout และประวัติทดลองที่แสดงในหน้าเว็บ</p>
      <p className="mt-1">วันเวลาและคู่แข่งขันรอบแบ่งกลุ่มยังอยู่ แต่โปรแกรมทั้งหมดจะกลับเป็น <strong>ฉบับร่าง</strong> เพื่อไม่ให้เผยแพร่ข้อมูลโดยไม่ตั้งใจ หลังตรวจสอบแล้วให้กด “เผยแพร่โปรแกรม” อีกครั้ง</p>
      <p className="mt-1 font-bold">เพื่อความปลอดภัย คำสั่งนี้จะหยุดทำงานตั้งแต่วันที่ 5 ธันวาคม 2569</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-900 hover:bg-rose-50 disabled:opacity-50" onClick={() => void inspect()} disabled={busy}>
        {busy ? "กำลังตรวจสอบ…" : "1. ตรวจสอบข้อมูลที่จะรีเซต"}
      </button>
      <span className="text-xs text-slate-500">ไม่ล้างข้อมูลจนกว่าจะยืนยันขั้นสุดท้าย</span>
    </div>
    {problem && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{problem}</p>}
    {archiveId && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
      <p className="font-black">รีเซตเรียบร้อยแล้ว และสร้างสำเนาข้อมูลทดสอบก่อนรีเซตแล้ว</p>
      <p className="mt-1 break-all text-xs">รหัสชุดสำรอง: {archiveId}</p>
      <p className="mt-1 text-xs">กรุณาเปิดแท็บตารางโปรแกรม ตรวจสอบคู่แข่งขัน แล้วจึงเผยแพร่ตามที่ยืนยันจริง</p>
    </div>}
    {preview && <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-black">ผลการตรวจสอบข้อมูล RoV ทั้ง 2 ประเภท</h3>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {([
          ["คู่ทั้งหมด",preview.matches], ["ทีมชาย",preview.male_matches],
          ["ทีมหญิง",preview.female_matches], ["คู่ยกเลิก",preview.cancelled],
          ["คู่บันทึกผลแล้ว",preview.completed], ["คู่เผยแพร่แล้ว",preview.scheduled],
          ["คู่ Knockout",preview.knockout_matches], ["ประวัติทดสอบ",preview.history_entries]
        ] as [string, number][]).map(([title,value]) => <div key={title} className="rounded-lg bg-white p-3">
          <div className="text-xs text-slate-600">{title}</div><strong className="text-xl text-red-900">{value}</strong>
        </div>)}
      </div>
      <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-1 accent-red-800" />
        <span>รับทราบว่าจะรีเซตข้อมูลแข่งขันทั้งสองประเภท และระบบจะเก็บสำเนาก่อนล้าง แต่ไม่สามารถย้อนกลับได้ด้วยปุ่มเดียว</span>
      </label>
      <label className="block text-sm font-bold text-slate-800">
        <span>2. พิมพ์ <code className="rounded bg-rose-100 px-2 py-1 text-red-900">{confirmationText}</code> เพื่อยืนยัน</span>
        <input className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-red-700 sm:max-w-md" value={confirmation}
          onChange={e => setConfirmation(e.target.value)} placeholder="พิมพ์ข้อความยืนยันตามตัวอย่าง" autoComplete="off" />
      </label>
      <button type="button" className="rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => void reset()} disabled={busy || !acknowledged || confirmation !== confirmationText}>
        {busy ? "กำลังสำรองและรีเซต…" : "3. สำรองข้อมูลและรีเซต RoV ทั้งระบบการแข่งขัน"}
      </button>
    </div>}
  </section>;
}

export default function EsportsPage() {
  const [competitionId, setCompetitionId] = useState("");
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [gender, setGender] = useState<Gender>("ชาย");
  const [tab, setTab] = useState<Tab>("groups");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingEdit, setPendingEdit] = useState<PendingBracketEdit | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResultSave | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const auth = await supabase.auth.getUser();
      const user = auth.data.user; setEmail(user?.email || "");
      const comp = await supabase.from("sports_competitions").select("id").eq("slug", SLUG).single();
      if (comp.error) throw comp.error;
      const id = comp.data.id as string; setCompetitionId(id);
      let allowed = false;
      if (user) {
        const role = await supabase.rpc("sports_stage3_admin", { p_comp: id });
        if (role.error) throw role.error;
        allowed = role.data === true;
      }
      const eventResult = await supabase.from("sports_events").select("id,event_code,sport_name,gender_rule,status")
        .eq("competition_id", id).in("event_code", [...EVENT_CODES]).order("event_code");
      if (eventResult.error) throw eventResult.error;
      const eventRows = (eventResult.data || []) as EventRow[];
      const ids = eventRows.map(row => row.id);
      let groupRows: GroupRow[] = []; let teamRows: TeamRow[] = []; let matchRows: MatchRow[] = []; let history: HistoryRow[] = [];
      if (ids.length) {
        const [g, t, m] = await Promise.all([
          supabase.from("sports_esports_groups").select("id,event_id,group_code,sort_order").eq("competition_id", id).in("event_id", ids).order("sort_order"),
          supabase.from("sports_esports_group_teams").select("id,event_id,group_id,school_name,seed_order").eq("competition_id", id).in("event_id", ids).order("seed_order"),
          supabase.from("sports_esports_matches").select("id,event_id,group_id,match_no,stage,play_order,team1_id,team2_id,scheduled_date,start_time,venue_name,match_status,score1,score2,duration_minutes,team1_kills,team2_kills,notes,winner_next_match_id,winner_next_slot,loser_next_match_id,loser_next_slot").eq("competition_id", id).in("event_id", ids).order("match_no")
        ]);
        if (g.error) throw g.error; if (t.error) throw t.error; if (m.error) throw m.error;
        groupRows = (g.data || []) as GroupRow[]; teamRows = (t.data || []) as TeamRow[]; matchRows = (m.data || []) as MatchRow[];
        if (allowed) {
          const h = await supabase.from("sports_esports_match_history")
            .select("id,event_id,match_id,match_no,action,reason,changed_at,changed_by,old_data,new_data")
            .eq("competition_id", id).in("event_id", ids).order("changed_at", { ascending: false }).limit(150);
          if (h.error) throw h.error;
          history = (h.data || []) as HistoryRow[];
        }
      }
      setAdmin(allowed); setEvents(eventRows); setGroups(groupRows); setTeams(teamRows); setMatches(matchRows); setHistoryRows(history);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) window.setTimeout(() => void load(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const currentEvent = useMemo(() => events.find(event => event.gender_rule === gender), [events, gender]);
  const currentGroups = useMemo(() => groups.filter(group => group.event_id === currentEvent?.id).sort((a,b) => a.sort_order-b.sort_order), [groups, currentEvent]);
  const currentTeams = useMemo(() => teams.filter(team => team.event_id === currentEvent?.id), [teams, currentEvent]);
  const currentMatches = useMemo(() => matches.filter(match => match.event_id === currentEvent?.id), [matches, currentEvent]);
  const currentKnockoutMatches = useMemo(() => currentMatches.filter(match => match.stage !== "group").sort((a,b) => {
    const order: Record<string, number> = { knockout: 1, semifinal: 2, third_place: 3, final: 4 };
    return (order[a.stage] || 9) - (order[b.stage] || 9) || a.match_no.localeCompare(b.match_no);
  }), [currentMatches]);
  const currentHistory = useMemo(() => historyRows.filter(row => row.event_id === currentEvent?.id), [historyRows, currentEvent]);
  const teamById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const groupById = useMemo(() => new Map(groups.map(group => [group.id, group])), [groups]);
  const completedCount = currentMatches.filter(match => match.match_status === "completed").length;

  const groupedFixtures = useMemo(() => currentGroups.map(group => ({
    group,
    actual: groupSchedule(currentMatches, group.id)
  })), [currentGroups, currentMatches]);

  const unpublishedGroupMatches = currentMatches.filter(match => match.stage === "group" && match.match_status === "draft");

  // RLS hides draft fixtures from public readers. Publishing a confirmed group
  // schedule must update match_status rather than relaxing the read policy.
  async function publishGroupSchedule() {
    if (!admin || !competitionId || !currentEvent || busyId) return;
    setError(""); setNotice("");
    if (currentEvent.status === "draft") {
      setError("ต้องเผยแพร่รายการกีฬา E-Sport จากหน้าจัดการรายการแข่งขันก่อน จึงจะให้ผู้ชมทั่วไปเห็นโปรแกรมได้");
      return;
    }
    const groupMatches = currentMatches.filter(match => match.stage === "group");
    const expectedPairs = currentGroups.reduce((total, group) => {
      const count = currentTeams.filter(team => team.group_id === group.id).length;
      return total + count * (count - 1) / 2;
    }, 0);
    if (groupMatches.length !== expectedPairs || expectedPairs === 0) {
      setError(`จำนวนคู่รอบแบ่งกลุ่มไม่ครบ: มี ${groupMatches.length} คู่ จากที่ควรมี ${expectedPairs} คู่ กรุณาตรวจข้อมูลก่อนเผยแพร่`);
      return;
    }
    const seen = new Set<string>();
    for (const match of groupMatches) {
      if (!match.group_id || !match.team1_id || !match.team2_id || match.team1_id === match.team2_id) {
        setError(`คู่ ${match.match_no} มีข้อมูลกลุ่มหรือทีมไม่ครบ กรุณาตรวจสอบก่อนเผยแพร่`);
        return;
      }
      const pair = `${match.group_id}|${[match.team1_id, match.team2_id].sort().join("|")}`;
      if (seen.has(pair)) {
        setError(`พบคู่แข่งขันซ้ำที่ ${match.match_no} กรุณาตรวจสอบก่อนเผยแพร่`);
        return;
      }
      seen.add(pair);
    }
    const drafts = groupMatches.filter(match => match.match_status === "draft");
    if (!drafts.length) { setNotice("โปรแกรมประเภทนี้ไม่มีคู่ฉบับร่างที่รอเผยแพร่แล้ว"); return; }
    const missingSchedule = drafts.filter(match => !match.scheduled_date || !match.start_time);
    if (missingSchedule.length) {
      setError(`ยังเผยแพร่ไม่ได้: มี ${missingSchedule.length} คู่ที่ไม่ได้กำหนดวันหรือเวลา กรุณากำหนดให้ครบก่อน`);
      return;
    }
    if (!window.confirm(`ยืนยันเผยแพร่คู่แข่งขันรอบแบ่งกลุ่ม ${drafts.length} คู่ (ทีม${gender}) ให้โรงเรียนและผู้ชมทั่วไปเห็น?\n\nระบบจะเปลี่ยนเฉพาะคู่ฉบับร่างเป็น “กำหนดการแข่งขันแล้ว” โดยไม่แก้คู่ที่ยกเลิกหรือบันทึกผลแล้ว`)) return;
    setBusyId("publish-group-schedule");
    try {
      const result = await supabase.from("sports_esports_matches")
        .update({ match_status: "scheduled" })
        .eq("competition_id", competitionId)
        .eq("event_id", currentEvent.id)
        .eq("stage", "group")
        .eq("match_status", "draft")
        .in("id", drafts.map(match => match.id))
        .select("id");
      if (result.error) throw result.error;
      if ((result.data || []).length !== drafts.length) {
        throw new Error(`เผยแพร่ได้ ${(result.data || []).length}/${drafts.length} คู่ กรุณารีเฟรชและตรวจสถานะทุกคู่`);
      }
      await load();
      setNotice(`เผยแพร่โปรแกรมทีม${gender}สำเร็จ ${drafts.length} คู่ ผู้ชมทั่วไปสามารถเห็นคู่เหล่านี้ได้แล้ว`);
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(""); }
  }

  async function generateKnockout() {
    if (!admin || !currentEvent || currentEvent.event_code !== "GS3-ES-SM" || busyId) return;
    setError(""); setNotice(""); setBusyId("generate-knockout");
    try {
      const result = await supabase.rpc("sports_esports_generate_knockout", { p_event_id: currentEvent.id });
      if (result.error) throw result.error;
      setNotice("สร้างโครงสาย Knockout ทีมชายแล้ว โปรดเลือกทีมเข้าคู่ตามผลรอบแบ่งกลุ่มและผังที่คณะกรรมการยืนยัน");
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(""); }
  }

  function requestBracketEdit(matchId: string, team1Id: string, team2Id: string) {
    if (!team1Id || !team2Id || team1Id === team2Id) {
      setError("โปรดเลือกทีมให้ครบทั้งสองช่อง และห้ามเลือกทีมซ้ำกัน");
      return;
    }
    setError(""); setNotice("");
    setPendingEdit({ matchId, team1Id, team2Id, reason: "" });
  }

  async function confirmBracketEdit() {
    if (!pendingEdit || !admin || busyId) return;
    if (!pendingEdit.reason.trim()) { setError("โปรดระบุเหตุผลในการแก้ไขสายก่อนยืนยัน"); return; }
    setBusyId(pendingEdit.matchId); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("sports_esports_update_knockout_teams", {
        p_match_id: pendingEdit.matchId,
        p_team1_id: pendingEdit.team1Id,
        p_team2_id: pendingEdit.team2Id,
        p_reason: pendingEdit.reason.trim()
      });
      if (result.error) throw result.error;
      setPendingEdit(null);
      setNotice("แก้ไขสาย Knockout แล้ว ระบบเก็บประวัติเดิมและจัดการผลรอบถัดไปที่ได้รับผลกระทบเรียบร้อย");
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(""); }
  }

  async function persistMatch(id: string, form: MatchForm, reason = "บันทึกหรือแก้ไขโปรแกรมและผลการแข่งขัน") {
    if (!admin || !competitionId || busyId) return false;
    setError(""); setNotice("");
    const score1 = form.score1.trim() === "" ? null : Number(form.score1);
    const score2 = form.score2.trim() === "" ? null : Number(form.score2);
    if (form.match_status === "scheduled" && (!form.scheduled_date || !form.start_time)) {
      setError("โปรดระบุวันที่และเวลา ก่อนกำหนดสถานะแข่งขัน"); return false;
    }
    if (form.match_status === "completed" && !((score1 === 2 && (score2 === 0 || score2 === 1)) || (score2 === 2 && (score1 === 0 || score1 === 1)))) {
      setError("ผลการแข่งขันต้องเป็น 2–0, 2–1, 0–2 หรือ 1–2 ตามกติกา Best of Three"); return false;
    }
    setBusyId(id);
    try {
      const match = matches.find(row => row.id === id);
      const payload = {
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        venue_name: form.venue_name.trim(),
        match_status: form.match_status,
        score1: form.match_status === "completed" ? score1 : null,
        score2: form.match_status === "completed" ? score2 : null,
        duration_minutes: form.duration_minutes.trim() === "" ? null : Number(form.duration_minutes),
        team1_kills: form.team1_kills.trim() === "" ? null : Number(form.team1_kills),
        team2_kills: form.team2_kills.trim() === "" ? null : Number(form.team2_kills)
      };

      if (match && match.stage !== "group") {
        const result = await supabase.rpc("sports_esports_save_knockout_match", {
          p_match_id: id,
          p_scheduled_date: payload.scheduled_date,
          p_start_time: payload.start_time,
          p_venue_name: payload.venue_name,
          p_match_status: payload.match_status,
          p_score1: payload.score1,
          p_score2: payload.score2,
          p_duration_minutes: payload.duration_minutes,
          p_team1_kills: payload.team1_kills,
          p_team2_kills: payload.team2_kills,
          p_reason: reason
        });
        if (result.error) throw result.error;
        setNotice("บันทึกผล Knockout แล้ว ระบบส่งผู้ชนะ/ผู้แพ้ไปยังรอบถัดไปและตรวจสอบผลกระทบแล้ว");
      } else {
        const result = await supabase.from("sports_esports_matches").update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", id).eq("competition_id", competitionId).select("id").single();
        if (result.error) throw result.error;
        setNotice("บันทึกโปรแกรมและผลการแข่งขันแล้ว");
      }
      await load();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusyId("");
    }
  }

  function saveMatch(id: string, form: MatchForm) {
    const score1Check = form.score1.trim() === "" ? null : Number(form.score1);
    const score2Check = form.score2.trim() === "" ? null : Number(form.score2);
    if (form.match_status === "scheduled" && (!form.scheduled_date || !form.start_time)) {
      setError("โปรดระบุวันที่และเวลา ก่อนกำหนดสถานะแข่งขัน"); return;
    }
    if (form.match_status === "completed" && !((score1Check === 2 && (score2Check === 0 || score2Check === 1)) || (score2Check === 2 && (score1Check === 0 || score1Check === 1)))) {
      setError("ผลการแข่งขันต้องเป็น 2–0, 2–1, 0–2 หรือ 1–2 ตามกติกา Best of Three"); return;
    }
    const match = matches.find(row => row.id === id);
    if (match && match.stage !== "group") {
      const score1 = form.score1.trim() === "" ? null : Number(form.score1);
      const score2 = form.score2.trim() === "" ? null : Number(form.score2);
      const oldWinner = match.match_status === "completed" && match.score1 != null && match.score2 != null
        ? (match.score1 > match.score2 ? match.team1_id : match.team2_id) : null;
      const oldLoser = match.match_status === "completed" && match.score1 != null && match.score2 != null
        ? (match.score1 > match.score2 ? match.team2_id : match.team1_id) : null;
      const newWinner = form.match_status === "completed" && score1 != null && score2 != null
        ? (score1 > score2 ? match.team1_id : match.team2_id) : null;
      const newLoser = form.match_status === "completed" && score1 != null && score2 != null
        ? (score1 > score2 ? match.team2_id : match.team1_id) : null;
      const outcomeChanged = oldWinner !== newWinner || oldLoser !== newLoser;
      const downstream = getDownstreamMatches(id, matches);
      const downstreamHasData = downstream.some(row => row.match_status === "completed" || row.match_status === "scheduled" || row.team1_id || row.team2_id);
      if (downstream.length > 0 && outcomeChanged && (match.match_status === "completed" || downstreamHasData)) {
        setError(""); setNotice("");
        setPendingResult({ matchId: id, form, reason: "" });
        return;
      }
    }
    void persistMatch(id, form);
  }

  async function confirmResultEdit() {
    if (!pendingResult || !pendingResult.reason.trim() || busyId) return;
    const saved = await persistMatch(pendingResult.matchId, pendingResult.form, pendingResult.reason.trim());
    if (saved) setPendingResult(null);
  }

  const [roster,setRoster] = useState<{school:string;coach:string;players:string[]} | null>(null);
  async function showApprovedRoster(team: TeamRow) {
    setError("");setRoster(null);setBusyId(team.id);
    try {
      const result=await supabase.rpc("sports_roster_details",{p_entry:null,p_team:team.id});
      if(result.error) throw result.error;
      if(!result.data){setNotice("ยังไม่มีรายชื่อที่อนุมัติให้บัญชีนี้เปิดดูได้");return;}
      setRoster({school:team.school_name,coach:(result.data.coaches?.map((c:{name:string})=>c.name) || [result.data.coach,result.data.assistant]).filter(Boolean).join(" · "),players:result.data.players.map((p:{full_name:string;ign?:string;team_role?:string;play_position?:string})=>[p.full_name,p.team_role,p.ign,p.play_position].filter(Boolean).join(" · "))});
    } catch(err){setError(errorText(err));} finally{setBusyId("");}
  }

  const groupSummary = gender === "ชาย" ? "18 ทีม · 4 กลุ่ม (4 / 4 / 5 / 5 ทีม)" : "10 ทีม · 2 กลุ่ม (กลุ่มละ 5 ทีม)";
  const pendingMatch = pendingEdit ? currentMatches.find(match => match.id === pendingEdit.matchId) : null;
  const pendingDownstream = pendingEdit ? getDownstreamMatches(pendingEdit.matchId, currentMatches) : [];
  const pendingAffected = pendingMatch ? [pendingMatch, ...pendingDownstream].filter(match => match.match_status === "completed") : [];
  const pendingResultDownstream = pendingResult ? getDownstreamMatches(pendingResult.matchId, currentMatches) : [];

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="no-print bg-[#090f27] text-white">
      {/* Keep navigation and account status accessible; replace only the old text banner. */}
      <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <nav aria-label="ลิงก์นำทาง E-Sport" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/group-sports?section=results" className="text-xs font-bold text-rose-200 underline-offset-4 hover:text-white hover:underline sm:text-sm">← กลับหน้าผลการแข่งขัน</Link>
            <Link href="/group-sports/schedule" className="text-xs font-bold text-rose-200 underline-offset-4 hover:text-white hover:underline sm:text-sm">โปรแกรมกีฬาทั้งหมด</Link>
          </nav>
          <div className="text-xs text-rose-100">{email ? `${email} · ${admin ? "ผู้ดูแลการแข่งขัน" : "ผู้เข้าชม"}` : <Link href="/login" className="rounded-lg bg-white px-3 py-2 font-bold text-slate-900">เข้าสู่ระบบ</Link>}</div>
        </div>
      </div>

      <h1 className="sr-only">ระบบจัดการแข่งขัน E-Sport (RoV) · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30</h1>
      <div className="mx-auto max-w-[1440px] lg:px-6 lg:pb-5">
        {/* On desktop, show the full 3:1 artwork, including all Thai text, without cropping. */}
        <div className="hidden overflow-hidden rounded-2xl ring-1 ring-white/10 lg:block">
          <Image
            src="/images/esports-rov-banner-2569.webp"
            alt="แบนเนอร์การแข่งขัน E-Sport RoV ภูลังกาเกมส์ 2569 พร้อมภาพนักรบแฟนตาซีและข้อความการแข่งขัน"
            width={2172}
            height={724}
            className="h-auto w-full"
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1440px) 1392px, 100vw"
          />
        </div>

        {/* Small screens: focus on the artwork and keep a readable live-text title. */}
        <div
          className="relative isolate flex min-h-[255px] flex-col justify-center overflow-hidden px-5 py-8 sm:min-h-[300px] sm:px-8 lg:hidden"
          style={{
            backgroundImage: "linear-gradient(90deg, rgba(7,13,35,.96) 0%, rgba(10,18,48,.88) 45%, rgba(11,18,46,.30) 100%), url('/images/esports-rov-banner-2569.webp')",
            backgroundPosition: "82% center",
            backgroundSize: "cover"
          }}
        >
          <div className="relative z-10 max-w-lg">
            <p className="text-[11px] font-extrabold tracking-[.12em] text-amber-300 sm:text-xs">PHULANGKA GAMES 2026 · ARENA OF VALOR</p>
            <p className="mt-4 text-3xl font-black leading-tight drop-shadow-lg sm:text-4xl" aria-hidden="true">ระบบจัดการแข่งขัน E-Sport</p>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-100 drop-shadow-md sm:text-base">กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 · 5–7 ธันวาคม 2569</p>
            <span className="mt-5 inline-flex rounded-full border border-amber-300/60 bg-slate-950/45 px-3 py-1 text-xs font-extrabold tracking-widest text-amber-200">RoV · 5v5</span>
          </div>
        </div>
      </div>
    </header>

    <style>{`@media print {
      .no-print { display: none !important; }
      #esport-print-schedule { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
      #esport-print-schedule table { font-size: 11px !important; }
      #esport-print-schedule thead { display: table-header-group; }
      #esport-print-schedule tr { break-inside: avoid; }
      @page { size: A4 landscape; margin: 10mm; }
    }`}</style>
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
      {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}
      {admin && currentEvent?.status === "draft" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">ข้อมูล E-Sport ยังเป็นฉบับร่าง ผู้ดูแลสามารถจัดโปรแกรมและบันทึกผลได้ แต่ผู้ชมทั่วไปจะเห็นเมื่อเผยแพร่รายการจากหน้าโปรแกรมการแข่งขันแล้ว</div>}

      <section className={`${panel} no-print flex flex-wrap items-center justify-between gap-3`}>
        <div><p className="text-sm font-black">ประเภทการแข่งขัน</p><p className="mt-1 text-xs text-slate-500">{groupSummary}</p></div>
        <div className="flex gap-2"><button className={gender === "ชาย" ? primary : secondary} onClick={() => { setGender("ชาย"); }}>ทีมชาย</button><button className={gender === "หญิง" ? primary : secondary} onClick={() => { setGender("หญิง"); }}>ทีมหญิง</button></div>
      </section>

      <section className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["โรงเรียน / ทีม", currentTeams.length], ["กลุ่ม", currentGroups.length], ["คู่แข่งขัน", currentMatches.length], ["บันทึกผลแล้ว", completedCount]].map(([label,value]) => <div className={panel} key={label as string}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div>)}
      </section>

      <div className="no-print flex flex-wrap items-center gap-2.5" aria-label="เมนูจัดการการแข่งขัน">
        <button type="button" className={tabButtonClass("groups", tab)} aria-pressed={tab === "groups"} onClick={() => setTab("groups")}>แบ่งกลุ่ม</button>
        <button type="button" className={tabButtonClass("matches", tab)} aria-pressed={tab === "matches"} onClick={() => setTab("matches")}>โปรแกรม / ผล</button>
        <button type="button" className={tabButtonClass("schedule", tab)} aria-pressed={tab === "schedule"} onClick={() => setTab("schedule")}>ตารางโปรแกรม</button>
        <button type="button" className={tabButtonClass("standings", tab)} aria-pressed={tab === "standings"} onClick={() => setTab("standings")}>ตารางคะแนน</button>
        <button type="button" className={tabButtonClass("knockout", tab)} aria-pressed={tab === "knockout"} onClick={() => setTab("knockout")}>สาย Knockout</button>
        {admin && <button type="button" className={tabButtonClass("history", tab)} aria-pressed={tab === "history"} onClick={() => setTab("history")}>ประวัติการแก้ไข</button>}
        {admin && <button type="button" className={tabButtonClass("prelaunch", tab)} aria-pressed={tab === "prelaunch"} onClick={() => setTab("prelaunch")}>เตรียมใช้จริง / รีเซตทดสอบ</button>}
        <div className="flex-1" />
        <button type="button" className={secondary} disabled={loading || !!busyId} onClick={() => void load()}>รีเฟรชข้อมูล</button>
      </div>

      {!loading && !currentEvent && <div className={`${panel} text-center text-sm text-slate-600`}>ยังไม่มีรายการ E-Sport ที่เผยแพร่ หรือไม่พบข้อมูลรายการแข่งขันในฐานข้อมูล {admin ? "โปรดตรวจสอบ event_code GS3-ES-SM / GS3-ES-SF" : "โปรดกลับมาตรวจสอบเมื่อผู้จัดเผยแพร่ข้อมูล"}</div>}

      {currentEvent && tab === "groups" && <section className="grid gap-4 md:grid-cols-2">
        {email && roster && <section className={`${panel} md:col-span-2`}><div className="flex justify-between"><strong>รายชื่อที่อนุมัติ · {roster.school}</strong><button onClick={()=>setRoster(null)}>ปิด</button></div><p>{roster.coach}</p><ol className="list-decimal pl-6">{roster.players.map((name,i)=><li key={i}>{name}</li>)}</ol></section>}
        {currentGroups.map(group => <div className={`${panel} space-y-3`} key={group.id}>
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">กลุ่ม {group.group_code}</h2><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-red-800">{currentTeams.filter(team => team.group_id === group.id).length} ทีม</span></div>
          <ol className="space-y-2">{currentTeams.filter(team => team.group_id === group.id).sort((a,b)=>a.seed_order-b.seed_order).map((team,index) => <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm" key={team.id}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500">{index+1}</span><span className="font-semibold">{team.school_name}</span>{email && <button type="button" className="ml-auto text-xs font-bold text-red-700" disabled={!!busyId} onClick={()=>void showApprovedRoster(team)}>ดูรายชื่อ</button>}</li>)}</ol>
        </div>)}
        <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">ข้อกำหนดก่อนจัดรอบ Knockout</p>
          <p className="mt-1">ประเภททีมชาย: ระเบียบระบุอันดับ 1–2 ของกลุ่ม A–D รวม 8 ทีมเข้าสู่รอบถัดไป ผู้ดูแลจะเลือกทีมลงคู่ตามผัง/ผลการจับสลากที่คณะกรรมการยืนยัน ส่วนประเภททีมหญิงยังไม่เปิดสร้างสายจนกว่าจะยืนยันจำนวนทีมที่ผ่านเข้ารอบ</p>
        </div>
      </section>}

      {currentEvent && tab === "matches" && <section className={`${panel} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">โปรแกรมและผลรอบแบ่งกลุ่ม · {gender === "ชาย" ? "ทีมชาย" : "ทีมหญิง"}</h2><p className="text-xs text-slate-500">ระบบสร้างคู่พบกันหมดตามรายชื่อในแต่ละกลุ่ม เวลาแข่งขันกำหนดภายหลังได้</p></div><span className="text-xs text-slate-500">{currentMatches.filter(match => match.stage === "group").length} คู่</span></div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950">
          <strong>ดูรอบ เวลา และสถานีแข่งขันของทีมชายและทีมหญิงได้ที่เมนู “ตารางโปรแกรม”</strong>
          <button type="button" className={`${secondary} ml-3 mt-2`} onClick={() => setTab("schedule")}>ดูตารางโปรแกรมรวมทุกสาย</button>
        </div>
        {groupedFixtures.map(item => <div className="space-y-2" key={item.group.id}>
          <h3 className="rounded-xl bg-orange-50 p-3 font-black text-orange-900">กลุ่ม {item.group.group_code} · {item.actual.length} คู่</h3>
          {item.actual.map(match => <MatchCard key={match.id} match={match} groupCode={item.group.group_code} team1Name={teamById.get(match.team1_id || "")?.school_name || "ไม่พบทีม"} team2Name={teamById.get(match.team2_id || "")?.school_name || "ไม่พบทีม"} admin={admin} saving={busyId === match.id} onSave={saveMatch}/>)}
        </div>)}
        {currentMatches.filter(match => match.stage === "group").length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">ยังไม่มีคู่แข่งขันในฐานข้อมูล</div>}
      </section>}


      {events.length > 0 && tab === "schedule" && <div className="space-y-3">
        {admin && currentEvent && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div>
              <p className="font-black text-red-900">เผยแพร่ตารางโปรแกรมให้โรงเรียนและผู้ชมทั่วไป</p>
              <p className="mt-1 text-sm text-slate-700">ทีม{gender}: มีคู่ฉบับร่าง {unpublishedGroupMatches.length} คู่ · เมื่อยืนยันวันและเวลาแล้วจึงกดเผยแพร่ได้</p>
              <p className="mt-1 text-xs text-slate-500">ระบบไม่แก้คู่ที่ยกเลิกหรือบันทึกผลแล้ว และไม่เปิดสิทธิ์แก้ไขให้ผู้ชม</p>
            </div>
            <button type="button" className={primary} disabled={loading || !!busyId || unpublishedGroupMatches.length === 0} onClick={() => void publishGroupSchedule()}>
              {busyId === "publish-group-schedule" ? "กำลังเผยแพร่…" : unpublishedGroupMatches.length ? `เผยแพร่โปรแกรมทีม${gender} (${unpublishedGroupMatches.length} คู่)` : "เผยแพร่ครบแล้ว"}
            </button>
          </div>
        )}
        <EsportsSessionSchedule events={events} groups={groups} teams={teams} matches={matches} publicView={!admin} />
      </div>}

      {currentEvent && tab === "standings" && <section className="space-y-4">
        {currentGroups.map(group => {
          const rows = buildStandings(group,currentTeams,currentMatches);
          return <div className={`${panel} space-y-3`} key={group.id}>
            <h2 className="text-lg font-black">ตารางคะแนน · กลุ่ม {group.group_code}</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600">{["อันดับ","โรงเรียน","แข่ง","ชนะ","แพ้","ได้–เสียเกม","คะแนน","เวลา (นาที)","Kill"].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr className="border-b border-slate-100" key={row.team.id}><td className="p-2 font-bold">{index+1}</td><td className="p-2 font-semibold">{row.team.school_name}</td><td className="p-2">{row.played}</td><td className="p-2">{row.wins}</td><td className="p-2">{row.losses}</td><td className="p-2">{row.gamesFor}–{row.gamesAgainst}</td><td className="p-2 font-black text-red-800">{row.points}</td><td className="p-2">{row.played > 0 && row.timeRecordedMatches === row.played ? row.time.toFixed(2) : "—"}</td><td className="p-2">{row.played > 0 && row.killRecordedMatches === row.played ? row.kills : "—"}</td></tr>)}</tbody></table></div>
          </div>;
        })}
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-red-900"><p className="font-bold">หลักเกณฑ์คะแนนและจัดอันดับทีมชาย</p><p className="mt-1">แข่งขันแบบ BO3: ชนะ 2–0 ได้ 3 คะแนน, ชนะ 2–1 ได้ 2 คะแนน และทีมแพ้ได้ 1 คะแนน</p><p className="mt-1">เมื่อคะแนนเท่ากัน ใช้เวลาแข่งขันรวมสะสมน้อยกว่าเป็นเกณฑ์ก่อน และหากเวลาเท่ากันจึงพิจารณา Kill รวมมากกว่า</p><p className="mt-1 text-xs">ระบบจะใช้เวลาและ Kill จัดอันดับเมื่อบันทึกข้อมูลครบทุกแมตช์ที่ทีมลงแข่งขัน หากข้อมูลยังไม่ครบ จะแสดงลำดับชั่วคราวตามลำดับทีมในสาย</p></div>
      </section>}

      {currentEvent && tab === "knockout" && <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-black">ผังการแข่งขันรอบ Knockout · {gender === "ชาย" ? "ทีมชาย" : "ทีมหญิง"}</h2><p className="mt-1 text-xs text-slate-500">แก้ไขทีมได้ตลอดเวลา แม้มีผลแล้ว โดยระบบจะเก็บประวัติและรีเซ็ตเฉพาะผลที่ได้รับผลกระทบ</p></div>
          {admin && gender === "ชาย" && <button className={primary} onClick={() => void generateKnockout()} disabled={!!busyId || loading}>{busyId === "generate-knockout" ? "กำลังสร้างสาย…" : currentKnockoutMatches.length ? "ตรวจสอบ / โหลดสาย Knockout" : "สร้างสาย Knockout 8 ทีม"}</button>}
        </div>
        {gender === "หญิง" ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ยังไม่เปิดสร้างสาย Knockout สำหรับทีมหญิง เนื่องจากต้องยืนยันจำนวนทีมที่ผ่านเข้ารอบจาก 2 กลุ่มก่อน เพื่อไม่ให้ระบบสร้างผังผิดจากระเบียบการแข่งขัน</div> : <>
          {currentKnockoutMatches.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">{admin ? "ยังไม่มีผัง Knockout กดปุ่มสร้างสายเพื่อเตรียมคู่แข่งขัน 8 ทีม" : "ยังไม่มีการเผยแพร่ผัง Knockout"}</div>}
          {currentKnockoutMatches.length > 0 && <>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-red-900">ระบบเตรียมคู่รอบ 8 ทีม 4 คู่ รอบรองชนะเลิศ 2 คู่ รอบชิงชนะเลิศ และชิงอันดับ 3 ให้แล้ว การจับคู่เริ่มต้นยังเว้นว่างเพื่อให้ผู้ดูแลใส่ทีมตามผังที่คณะกรรมการยืนยัน</div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-3 sm:p-4"><h3 className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-4 py-2.5 text-base font-black text-amber-950 shadow-sm"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />รอบ 8 ทีมสุดท้าย</h3>{currentKnockoutMatches.filter(match => match.stage === "knockout").map(match => <KnockoutPairingEditor key={match.id} match={match} teams={currentTeams} groups={groupById} team1Name={teamById.get(match.team1_id || "")?.school_name || "รอทีมเข้ารอบ"} team2Name={teamById.get(match.team2_id || "")?.school_name || "รอทีมเข้ารอบ"} admin={admin} saving={busyId === match.id} onRequestEdit={requestBracketEdit} onSave={saveMatch}/>)}</div>
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-3 sm:p-4"><h3 className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-100 px-4 py-2.5 text-base font-black text-red-950 shadow-sm"><span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />รอบรองชนะเลิศ</h3>{currentKnockoutMatches.filter(match => match.stage === "semifinal").map(match => <KnockoutPairingEditor key={match.id} match={match} teams={currentTeams} groups={groupById} team1Name={teamById.get(match.team1_id || "")?.school_name || "รอผู้ชนะจากรอบ 8 ทีม"} team2Name={teamById.get(match.team2_id || "")?.school_name || "รอผู้ชนะจากรอบ 8 ทีม"} admin={admin} saving={busyId === match.id} onRequestEdit={requestBracketEdit} onSave={saveMatch}/>)}</div>
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4"><h3 className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-base font-black text-emerald-950 shadow-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />รอบชิงชนะเลิศ</h3>{currentKnockoutMatches.filter(match => match.stage === "final").map(match => <KnockoutPairingEditor key={match.id} match={match} teams={currentTeams} groups={groupById} team1Name={teamById.get(match.team1_id || "")?.school_name || "รอผู้ชนะรอบรองฯ"} team2Name={teamById.get(match.team2_id || "")?.school_name || "รอผู้ชนะรอบรองฯ"} admin={admin} saving={busyId === match.id} onRequestEdit={requestBracketEdit} onSave={saveMatch}/>)}</div>
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-3 sm:p-4"><h3 className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-100 px-4 py-2.5 text-base font-black text-red-950 shadow-sm"><span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />ชิงอันดับ 3</h3>{currentKnockoutMatches.filter(match => match.stage === "third_place").map(match => <KnockoutPairingEditor key={match.id} match={match} teams={currentTeams} groups={groupById} team1Name={teamById.get(match.team1_id || "")?.school_name || "รอผู้แพ้รอบรองฯ"} team2Name={teamById.get(match.team2_id || "")?.school_name || "รอผู้แพ้รอบรองฯ"} admin={admin} saving={busyId === match.id} onRequestEdit={requestBracketEdit} onSave={saveMatch}/>)}</div>
            </div>
          </>}
        </>}
      </section>}

      {admin && tab === "prelaunch" && <PrelaunchResetPanel onReset={load} />}

      {admin && currentEvent && tab === "history" && <section className={`${panel} space-y-3`}>
        <div><h2 className="text-lg font-black">ประวัติการแก้ไขผลและสายการแข่งขัน</h2><p className="mt-1 text-xs text-slate-500">แสดงประวัติ 150 รายการล่าสุดของประเภทการแข่งขันที่เลือก พร้อมข้อมูลก่อนและหลังแก้ไข</p></div>
        {currentHistory.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">ยังไม่มีประวัติการแก้ไข</div>}
        <div className="space-y-3">{currentHistory.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">คู่ {row.match_no} · {row.action === "INSERT" ? "สร้างรายการ" : row.action === "DELETE" ? "ลบรายการ" : "แก้ไขรายการ"}</p><time className="text-xs text-slate-500">{thaiDateTime(row.changed_at)}</time></div>
          <p className="mt-1 text-sm text-slate-700">เหตุผล: {row.reason}</p><p className="text-xs text-slate-500">ผู้แก้ไข (User ID): {row.changed_by || "ข้อมูลตั้งต้น"}</p>
          {row.action === "UPDATE" && <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-red-50 p-2"><p className="font-bold text-red-800">ข้อมูลเดิม</p><p className="mt-1 text-slate-700">{snapshotLine(row.old_data, teamById)}</p></div><div className="rounded-lg bg-emerald-50 p-2"><p className="font-bold text-emerald-800">ข้อมูลใหม่</p><p className="mt-1 text-slate-700">{snapshotLine(row.new_data, teamById)}</p></div></div>}
          {row.action === "INSERT" && <p className="mt-2 text-xs text-slate-600">{snapshotLine(row.new_data, teamById)}</p>}
        </article>)}</div>
      </section>}

      <p className="text-xs text-slate-500">สนามแข่งขัน: หอประชุมโรงเรียนเชียงคำวิทยาคม · ข้อมูลกลุ่มและโปรแกรมอ้างอิงระเบียบ E-Sport ภูลังกาเกมส์ 2569</p>
    </main>

    {pendingEdit && pendingMatch && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="knockout-edit-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-red-700">ยืนยันการเปลี่ยนสาย</p><h2 id="knockout-edit-title" className="mt-1 text-xl font-black">ตรวจสอบผลการแข่งขันที่ได้รับผลกระทบ</h2></div><button type="button" className={secondary} onClick={() => setPendingEdit(null)}>ปิด</button></div>
        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">คู่ที่แก้ไข: {pendingMatch.match_no} · {stageLabel[pendingMatch.stage]}</p><p className="mt-1">ทีมใหม่: {teamById.get(pendingEdit.team1Id)?.school_name || "—"} พบ {teamById.get(pendingEdit.team2Id)?.school_name || "—"}</p><p className="mt-1 text-xs text-slate-500">ผลเดิมของคู่นี้: {pendingMatch.match_status === "completed" ? `${pendingMatch.score1}–${pendingMatch.score2}` : "ยังไม่มีผลที่บันทึก"}</p></div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-bold">ระบบจะดำเนินการเมื่อยืนยัน</p>
          <ul className="mt-1 list-disc space-y-1 pl-5"><li>เก็บข้อมูลเดิมของคู่ที่แก้ไขและคู่รอบถัดไปไว้ในประวัติ</li><li>ล้างผลของคู่ที่แก้ไข หากมีการบันทึกผลไว้แล้ว</li><li>ล้างเฉพาะช่องทีมและผลของคู่ถัดไปที่รับผลจากสายนี้ ส่วนอีกช่องที่ไม่เกี่ยวข้องจะคงเดิม</li><li>ให้กรรมการบันทึกผลใหม่ตามสายที่แก้ไข</li></ul>
        </div>
        <div className="mt-3 space-y-2"><p className="text-sm font-bold">คู่รอบถัดไปที่เชื่อมโยง ({pendingDownstream.length} คู่)</p>{pendingDownstream.length === 0 ? <p className="text-xs text-slate-500">ไม่มีคู่รอบถัดไปที่เชื่อมโยง</p> : <ul className="space-y-1 text-sm">{pendingDownstream.map(match => <li key={match.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span>{match.match_no} · {stageLabel[match.stage]}</span><span className={match.match_status === "completed" ? "font-bold text-red-700" : "text-slate-500"}>{match.match_status === "completed" ? `มีผลแล้ว ${match.score1}–${match.score2}` : statusLabel[match.match_status]}</span></li>)}</ul>}</div>
        {pendingAffected.length > 0 && <p className="mt-2 text-xs font-bold text-red-700">มีผลการแข่งขันที่บันทึกแล้ว {pendingAffected.length} คู่ ซึ่งจะถูกยกเลิกผลในสายปัจจุบันและเก็บสำเนาไว้ในประวัติ</p>}
        <label className="mt-4 block text-sm font-bold text-slate-700">เหตุผลในการแก้ไขสาย <span className="text-red-600">*</span><textarea className={`${input} mt-1 min-h-20`} value={pendingEdit.reason} onChange={e => setPendingEdit(old => old ? { ...old, reason: e.target.value } : old)} placeholder="เช่น คณะกรรมการปรับผลการจับสลาก / แก้ไขรายชื่อทีมที่ผ่านเข้ารอบ" /></label>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={secondary} onClick={() => setPendingEdit(null)} disabled={!!busyId}>ยกเลิก</button><button type="button" className={danger} onClick={() => void confirmBracketEdit()} disabled={!!busyId || !pendingEdit.reason.trim()}>{busyId === pendingEdit.matchId ? "กำลังบันทึก…" : "ยืนยันและปรับสาย Knockout"}</button></div>
      </div>
    </div>}

    {pendingResult && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="knockout-result-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-red-700">ยืนยันการแก้ไขผล</p><h2 id="knockout-result-title" className="mt-1 text-xl font-black">ผลรอบถัดไปอาจได้รับผลกระทบ</h2></div><button type="button" className={secondary} onClick={() => setPendingResult(null)}>ปิด</button></div>
        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">คู่ที่กำลังแก้ไข: {matches.find(match => match.id === pendingResult.matchId)?.match_no}</p><p className="mt-1">ผลเดิม: {matches.find(match => match.id === pendingResult.matchId)?.score1 ?? "—"}–{matches.find(match => match.id === pendingResult.matchId)?.score2 ?? "—"}</p><p className="mt-1">ผลใหม่: {pendingResult.form.match_status === "completed" ? `${pendingResult.form.score1}–${pendingResult.form.score2}` : `เปลี่ยนสถานะเป็น ${statusLabel[pendingResult.form.match_status]}`}</p></div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">เมื่อยืนยัน ระบบจะ</p><ul className="mt-1 list-disc space-y-1 pl-5"><li>เก็บผลเดิมและข้อมูลคู่ที่ได้รับผลกระทบไว้ในประวัติ</li><li>คำนวณผู้ชนะ/ผู้แพ้จากผลใหม่ แล้วส่งทีมไปยังช่องรอบถัดไป</li><li>หากผู้ชนะหรือผู้แพ้เปลี่ยน จะรีเซ็ตผลของคู่ที่ได้รับผลกระทบเพื่อให้กรรมการบันทึกใหม่</li><li>คงช่องทีมที่มาจากสายอื่นและไม่ได้รับผลกระทบไว้</li></ul></div>
        <div className="mt-3 space-y-2"><p className="text-sm font-bold">คู่รอบถัดไปที่เชื่อมโยง ({pendingResultDownstream.length} คู่)</p>{pendingResultDownstream.length === 0 ? <p className="text-xs text-slate-500">ไม่มีคู่รอบถัดไปที่เชื่อมโยง</p> : <ul className="space-y-1 text-sm">{pendingResultDownstream.map(match => <li key={match.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span>{match.match_no} · {stageLabel[match.stage]}</span><span className={match.match_status === "completed" ? "font-bold text-red-700" : "text-slate-500"}>{match.match_status === "completed" ? `มีผลแล้ว ${match.score1}–${match.score2}` : statusLabel[match.match_status]}</span></li>)}</ul>}</div>
        <label className="mt-4 block text-sm font-bold text-slate-700">เหตุผลในการแก้ไขผล <span className="text-red-600">*</span><textarea className={`${input} mt-1 min-h-20`} value={pendingResult.reason} onChange={e => setPendingResult(old => old ? { ...old, reason: e.target.value } : old)} placeholder="เช่น กรรมการตรวจสอบผลการแข่งขันและแก้ไขคะแนนให้ถูกต้อง" /></label>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className={secondary} onClick={() => setPendingResult(null)} disabled={!!busyId}>ยกเลิก</button><button type="button" className={danger} onClick={() => void confirmResultEdit()} disabled={!!busyId || !pendingResult.reason.trim()}>{busyId === pendingResult.matchId ? "กำลังบันทึก…" : "ยืนยันและปรับผลรอบถัดไป"}</button></div>
      </div>
    </div>}
  </div>;
}
