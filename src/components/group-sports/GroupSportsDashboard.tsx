"use client";

import Link from "next/link";
import { REGISTRATION_SPORTS, registrationSport, registrationHref, eventRegistrationSport, allowsRegistrationPhotos, duplicateNames, sameAthlete, type RegistrationSport } from "@/lib/group-sports/registration-hub";
import SportsGamesHome from "@/components/group-sports/SportsGamesHome";
import SchoolSubmissionsContent from "@/components/group-sports/SchoolSubmissionsContent";
import SchoolInformationHub, { SCHOOL_INFORMATION_SECTIONS, type SchoolInformationSection } from "@/components/group-sports/SchoolInformationHub";
import SchoolParadeReference, { hasSchoolParadeReference } from "@/components/group-sports/SchoolParadeReference";
import ParadeRouteShortcut from "@/components/group-sports/ParadeRouteShortcut";
import SportsScheduleContent from "@/components/group-sports/SportsScheduleContent";
import SchoolAccountsManager from "@/components/group-sports/SchoolAccountsManager";
import SchoolDirectorEditor from "@/components/group-sports/SchoolDirectorEditor";
import AthletePhotoManager from "@/components/group-sports/AthletePhotoManager";
import { uploadAthletePhoto, verifyPhotoFile } from "@/lib/group-sports/rov-photos";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type SVGProps } from "react";
import { supabase } from "@/lib/supabase";
import { downloadRosterTemplate, readRosterExcel, supportsIndividualBatch, ATHLETE_NAME_PREFIXES, ROV_PLAY_POSITIONS, type ImportedAthlete } from "@/lib/group-sports/roster-excel";

const SPORTS_COMPETITION_SLUG = "phayao-secondary-group-sports-2569";

type IconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5.5v-5.5h3V20H19V9.5" /></svg>;
}
function FileUploadIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 17V10"/><path d="m9.5 12.5 2.5-2.5 2.5 2.5"/></svg>;
}
function CalendarGearIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3v4M13 3v4M3 10h14"/><circle cx="19" cy="17" r="3"/><path d="M19 12.8v1.2M19 20v1.2M15.8 17H17M21 17h1.2M16.8 14.8l.8.8M20.4 18.4l.8.8M16.8 19.2l.8-.8M20.4 15.6l.8-.8"/></svg>;
}
function SchoolIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M9 21v-5h6v5"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
}
function TrophyIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 6H3a2 2 0 0 0 2 5h2"/><path d="M19 6h2a2 2 0 0 1-2 5h-2"/></svg>;
}
function ClipboardCheckIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1Z"/><path d="m9 13 2 2 4-4"/></svg>;
}
function CalendarCheckIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>;
}
function BarChartIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V8"/></svg>;
}
function MedalIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m8 3 4 5 4-5"/><path d="M9.5 8 7 12"/><path d="M14.5 8 17 12"/><circle cx="12" cy="16" r="5"/><path d="m10.8 16 1 1 1.8-2"/></svg>;
}
function UserShieldIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M15 21a8 8 0 1 0-6 0"/><path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M18.5 11.5 21 12.7v3.1c0 2-1.2 3.8-3 4.5-1.8-.7-3-2.5-3-4.5v-3.1z"/></svg>;
}

type Competition = {
  id: string;
  name: string;
  academic_year: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

type School = {
  id: string;
  school_code?: string | null;
  name: string;
  director_name?: string | null;
  district?: string | null;
  province?: string | null;
  status?: string;
};

type SportEvent = {
  id: string;
  competition_id: string;
  event_code?: string | null;
  stage3_source?: string | null;
  sport_name: string;
  event_type: "team" | "individual" | "athletics";
  gender_rule: string;
  level_rule: string;
  competition_format?: string;
  max_athletes_per_entry?: number | null;
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
  venue_name?: string | null;
  status: string;
};

type Entry = {
  id: string;
  competition_id: string;
  event_id: string;
  school_id: string;
  entry_type: "team" | "individual";
  entry_name: string;
  coach_name?: string | null;
  status: string;
  return_reason?: string;
  assistant_coach?: string;
  coaches?: Coach[];
  athlete_count?: number;
};

type Match = {
  id: string;
  competition_id: string;
  event_id: string;
  match_number?: string | null;
  group_name?: string | null;
  round_name: string;
  school_a_id?: string | null;
  school_b_id?: string | null;
  scheduled_at?: string | null;
  venue_name?: string | null;
  status: string;
};

type MatchResult = {
  id?: string;
  match_id: string;
  score_a: number;
  score_b: number;
  winner_school_id?: string | null;
};

type EventResult = {
  id: string;
  event_id: string;
  entry_id: string;
  school_id: string;
  entry_name: string;
  rank?: number | null;
  performance_value?: number | null;
  performance_unit?: string | null;
  result_text?: string | null;
};

type Medal = {
  id: string;
  competition_id: string;
  event_id: string;
  school_id: string;
  medal_type: "gold" | "silver" | "bronze";
};

type Coach = { name: string; phone: string };
type AthleteInput = {
  prefix?: string;
  ign?: string; team_role?: string; play_position?: string;
  student_code: string | null;
  full_name: string;
  grade_level: string | null;
  gender: string | null;
};

type TabKey = "overview" | "about" | "submissions" | "school_info" | "schedule" | "schools" | "events" | "entries" | "matches" | "standings" | "medals" | "accounts";
type UserRole = { role: string; school_id?: string | null; competition_id?: string | null };

const DEMO_COMPETITION: Competition = {
  id: "demo-competition",
  name: "การแข่งขันกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา",
  academic_year: "2569",
  status: "draft",
};

const DEMO_SCHOOLS: School[] = [
  { id: "demo-school-a", school_code: "DEMO-A", name: "โรงเรียนตัวอย่าง A", district: "อำเภอตัวอย่าง", province: "พะเยา", status: "active" },
  { id: "demo-school-b", school_code: "DEMO-B", name: "โรงเรียนตัวอย่าง B", district: "อำเภอตัวอย่าง", province: "พะเยา", status: "active" },
  { id: "demo-school-c", school_code: "DEMO-C", name: "โรงเรียนตัวอย่าง C", district: "อำเภอตัวอย่าง", province: "พะเยา", status: "active" },
  { id: "demo-school-d", school_code: "DEMO-D", name: "โรงเรียนตัวอย่าง D", district: "อำเภอตัวอย่าง", province: "พะเยา", status: "active" },
];

const DEMO_EVENTS: SportEvent[] = [
  { id: "demo-event-football", competition_id: DEMO_COMPETITION.id, event_code: "FB-MJ", sport_name: "ฟุตบอลชาย ม.ต้น", event_type: "team", gender_rule: "ชาย", level_rule: "ม.ต้น", competition_format: "league", max_athletes_per_entry: 20, points_win: 3, points_draw: 1, points_loss: 0, status: "registration" },
  { id: "demo-event-volleyball", competition_id: DEMO_COMPETITION.id, event_code: "VB-FS", sport_name: "วอลเลย์บอลหญิง ม.ปลาย", event_type: "team", gender_rule: "หญิง", level_rule: "ม.ปลาย", competition_format: "knockout", max_athletes_per_entry: 12, points_win: 3, points_draw: 0, points_loss: 0, status: "registration" },
  { id: "demo-event-run", competition_id: DEMO_COMPETITION.id, event_code: "AT-100M", sport_name: "วิ่ง 100 เมตร ชาย ม.ต้น", event_type: "athletics", gender_rule: "ชาย", level_rule: "ม.ต้น", competition_format: "time", max_athletes_per_entry: 1, status: "scheduled" },
  { id: "demo-event-petanque", competition_id: DEMO_COMPETITION.id, event_code: "PT-MIX", sport_name: "เปตองคู่ผสม ม.ปลาย", event_type: "individual", gender_rule: "ผสม", level_rule: "ม.ปลาย", competition_format: "knockout", max_athletes_per_entry: 2, status: "registration" },
];

const DEMO_ENTRIES: Entry[] = [
  { id: "demo-entry-a", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-football", school_id: "demo-school-a", entry_type: "team", entry_name: "ทีมฟุตบอลชาย", coach_name: "ครูผู้ฝึกสอน A", status: "approved", athlete_count: 18 },
  { id: "demo-entry-b", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-football", school_id: "demo-school-b", entry_type: "team", entry_name: "ทีมฟุตบอลชาย", coach_name: "ครูผู้ฝึกสอน B", status: "approved", athlete_count: 18 },
  { id: "demo-entry-c", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-football", school_id: "demo-school-c", entry_type: "team", entry_name: "ทีมฟุตบอลชาย", coach_name: "ครูผู้ฝึกสอน C", status: "approved", athlete_count: 16 },
  { id: "demo-entry-d", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-volleyball", school_id: "demo-school-a", entry_type: "team", entry_name: "ทีมวอลเลย์บอลหญิง", status: "approved", athlete_count: 10 },
  { id: "demo-entry-e", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-volleyball", school_id: "demo-school-d", entry_type: "team", entry_name: "ทีมวอลเลย์บอลหญิง", status: "approved", athlete_count: 11 },
  { id: "demo-entry-run-a", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-run", school_id: "demo-school-a", entry_type: "individual", entry_name: "นักกีฬาตัวอย่าง A", status: "approved", athlete_count: 1 },
  { id: "demo-entry-run-b", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-run", school_id: "demo-school-b", entry_type: "individual", entry_name: "นักกีฬาตัวอย่าง B", status: "approved", athlete_count: 1 },
];

const DEMO_MATCHES: Match[] = [
  { id: "demo-match-1", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-football", match_number: "FB-001", group_name: "สาย A", round_name: "รอบแบ่งกลุ่ม", school_a_id: "demo-school-a", school_b_id: "demo-school-b", status: "completed", venue_name: "สนามฟุตบอล" },
  { id: "demo-match-2", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-football", match_number: "FB-002", group_name: "สาย A", round_name: "รอบแบ่งกลุ่ม", school_a_id: "demo-school-a", school_b_id: "demo-school-c", status: "scheduled", venue_name: "สนามฟุตบอล" },
  { id: "demo-match-3", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-volleyball", match_number: "VB-001", group_name: "สาย B", round_name: "รอบรองชนะเลิศ", school_a_id: "demo-school-a", school_b_id: "demo-school-d", status: "scheduled", venue_name: "โรงยิม" },
];

const DEMO_RESULTS: MatchResult[] = [
  { match_id: "demo-match-1", score_a: 2, score_b: 1, winner_school_id: "demo-school-a" },
];

const DEMO_EVENT_RESULTS: EventResult[] = [
  { id: "demo-event-result-a", event_id: "demo-event-run", entry_id: "demo-entry-run-a", school_id: "demo-school-a", entry_name: "นักกีฬาตัวอย่าง A", rank: 1, performance_value: 12.45, performance_unit: "วินาที" },
  { id: "demo-event-result-b", event_id: "demo-event-run", entry_id: "demo-entry-run-b", school_id: "demo-school-b", entry_name: "นักกีฬาตัวอย่าง B", rank: 2, performance_value: 12.78, performance_unit: "วินาที" },
];

const DEMO_MEDALS: Medal[] = [
  { id: "demo-medal-1", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-run", school_id: "demo-school-a", medal_type: "gold" },
  { id: "demo-medal-2", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-run", school_id: "demo-school-b", medal_type: "silver" },
  { id: "demo-medal-3", competition_id: DEMO_COMPETITION.id, event_id: "demo-event-run", school_id: "demo-school-c", medal_type: "bronze" },
];

// Unified stadium navigation: original tabs and handlers, now rendered text-only in the navy masthead.
type SportsManagementTab = "schedule" | "events" | "matches";
type NavKey = Exclude<TabKey, SportsManagementTab | "submissions"> | "sports";
const sportsSubTabs: { key: SportsManagementTab; label: string; icon: (props: IconProps) => ReactElement }[] = [
  { key: "schedule", label: "โปรแกรมแข่งขัน", icon: CalendarCheckIcon },
  { key: "events", label: "รายการแข่งขัน", icon: ClipboardCheckIcon },
  { key: "matches", label: "ผลการแข่งขัน", icon: BarChartIcon },
];
const tabs: { key: NavKey; label: string; icon: (props: IconProps) => ReactElement }[] = [
  { key: "overview", label: "หน้าหลัก", icon: HomeIcon },
  { key: "school_info", label: "ข้อมูลทั่วไป", icon: FileUploadIcon },
  { key: "sports", label: "จัดการแข่งขัน", icon: CalendarGearIcon },
  { key: "schools", label: "โรงเรียน", icon: SchoolIcon },
  { key: "entries", label: "ลงทะเบียน", icon: ClipboardCheckIcon },
  { key: "standings", label: "ตารางคะแนน", icon: BarChartIcon },
  { key: "medals", label: "เหรียญรางวัล", icon: MedalIcon },
  { key: "accounts", label: "บัญชีโรงเรียน", icon: UserShieldIcon },
];

function makeId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;
}

function formatThaiDate(value?: string | null) {
  if (!value) return "ยังไม่กำหนด";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function eventTypeLabel(value: string) {
  if (value === "athletics") return "กรีฑา";
  if (value === "individual") return "กีฬาเดี่ยว / คู่";
  return "กีฬาทีม";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "ฉบับร่าง",
    registration: "เปิดรับสมัคร",
    submitted: "รับข้อมูลแล้ว · ตรวจที่สนาม",
    approved: "รับข้อมูลแล้ว · ตรวจที่สนาม",
    rejected: "รับข้อมูลแล้ว · ตรวจที่สนาม",
    withdrawn: "ถอนรายการ",
    scheduled: "รอแข่งขัน",
    live: "กำลังแข่งขัน",
    completed: "เสร็จสิ้น",
    postponed: "เลื่อนการแข่งขัน",
    cancelled: "ยกเลิก",
    closed: "ปิดรับสมัคร",
    in_progress: "กำลังดำเนินการ",
  };
  return labels[value] || value || "-";
}

const namePrefixes: readonly string[] = ATHLETE_NAME_PREFIXES;
function editPlayerName(player: AthleteInput): AthleteInput {
  const prefix = namePrefixes.find(title => player.full_name.startsWith(title));
  const normalized = {...player,play_position:player.play_position === "Mid" ? "Midlane" : player.play_position};
  return prefix ? {...normalized,prefix,full_name:player.full_name.slice(prefix.length).trimStart()} : normalized;
}
function acceptsNewEntries(event: SportEvent) {
  return event.stage3_source == null || event.status === "registration";
}
const blankPlayer = (): AthleteInput => ({ student_code: "", full_name: "", grade_level: null, gender: null });
const isRov = (event?: SportEvent) => ["GS3-ES-SM", "GS3-ES-SF"].includes(event?.event_code || "");
const isFutsal = (event?: SportEvent) => ["GS3-FS-15M","GS3-FS-UM","GS3-FS-UF"].includes(event?.event_code || "");
const isBoxing = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-BX-"));
const isTableTennis = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-TT-"));
const isPetanque = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-PT-"));
const isTakraw = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-ST-"));
const isVolleyball = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-VB-"));
const isBasketball = (event?: SportEvent) => Boolean(event?.event_code?.startsWith("GS3-BB-"));
const isFootball = (event?: SportEvent) => ["GS3-FB-13M", "GS3-FB-15M", "GS3-FB-UM", "GS3-FB-UF"].includes(event?.event_code || "");

// Results are grouped by sport, not by every age/sex/event variation.
// A dedicated management screen (currently RoV) is linked from this same hub.
const RESULT_SPORT_NAMES = [
  "วอลเลย์บอลชายหาด", "มวยสากลสมัครเล่น", "เซปักตะกร้อ", "ตะกร้อลอดห่วง",
  "เทเบิลเทนนิส", "บาสเกตบอล", "วอลเลย์บอล", "แบดมินตัน", "ฟุตซอล",
  "ฟุตบอล", "เปตอง", "กรีฑา", "ว่ายน้ำ", "แฮนด์บอล", "เทนนิส",
  "เทควันโด", "มวยไทย", "ยูโด", "จักรยาน", "หมากรุกไทย", "หมากฮอส",
  "ฟุตวอลเลย์", "ปิงปอง", "จานร่อน", "ชักเย่อ", "กระบี่กระบอง",
];
function resultSportName(event: SportEvent): string {
  if (isRov(event) || /e[ -]?sport|rov|อีสปอร์ต/i.test(event.sport_name)) return "E-Sport (RoV)";
  if (event.event_type === "athletics" || /^(วิ่ง|กระโดด|ขว้าง|ทุ่ม|พุ่ง)/.test(event.sport_name)) return "กรีฑา";
  const name = event.sport_name.trim();
  return RESULT_SPORT_NAMES.find((sport) => name.startsWith(sport)) || name.replace(/(ชาย|หญิง|ผสม|รุ่น|อายุ|ม\.[ต้นปลาย1-6]).*$/u, "").trim() || name;
}


function validateAthletes(event: SportEvent, athletes: AthleteInput[], individualBatch = false) {
  if (isBoxing(event) && athletes.length !== 1) return "มวยสากลสมัครเล่น: นักกีฬา 1 คนต่อใบสมัคร";
  if (isTableTennis(event) && athletes.length !== (event.event_code?.endsWith("-S") ? 1 : 2)) return "เทเบิลเทนนิส: เดี่ยว 1 คน / คู่ 2 คน";
  if (isPetanque(event) && (athletes.length < 3 || athletes.length > 4)) return "เปตอง: นักกีฬา 3 คน สำรองได้ 1 คน";
  if (isTakraw(event) && (athletes.length < 3 || athletes.length > 5)) return "เซปักตะกร้อ: นักกีฬา 3–5 คน";
  if (!athletes.length) return "กรุณากรอกรายชื่อนักกีฬาอย่างน้อย 1 คน";
  if (individualBatch && athletes.length > 100) return "นำเข้ากีฬาเดี่ยวได้ไม่เกิน 100 คนต่อครั้ง";
  if (!individualBatch && event.max_athletes_per_entry && athletes.length > event.max_athletes_per_entry) {
    return `รายการนี้รับนักกีฬาได้ไม่เกิน ${event.max_athletes_per_entry} คนต่อทีม`;
  }
  const duplicateCodes = athletes
    .map((athlete) => athlete.student_code)
    .filter((code): code is string => Boolean(code))
    .filter((code, index, all) => all.indexOf(code) !== index);
  if (duplicateCodes.length) return "พบรหัสนักเรียนซ้ำในรายชื่อชุดนี้";

  // The roster never requests gender or grade. Event rules remain visible to the
  // school for eligibility checks; they cannot be verified from names alone.
  return "";
}

function SelectedAthletePhoto({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img src={url} alt="ตัวอย่างรูปถ่ายที่เลือก" className="h-16 w-12 rounded border border-slate-200 object-cover"/> : null;
}

export default function GroupSportsDashboard() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [sportsMenuOpen, setSportsMenuOpen] = useState(false);
  const [schoolInfoMenuOpen, setSchoolInfoMenuOpen] = useState(false);
  const [schoolInfoSection, setSchoolInfoSection] = useState<SchoolInformationSection>("submission");
  const schoolInfoNavRef = useRef<HTMLElement | null>(null);
  const systemMenuRef = useRef<HTMLDetailsElement | null>(null);
  const schoolInfoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sportsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sportsPanelRef = useRef<HTMLDivElement | null>(null);
  const schoolInfoPanelRef = useRef<HTMLDivElement | null>(null);

  const closeSystemMenu = useCallback(() => {
    if (systemMenuRef.current) systemMenuRef.current.open = false;
  }, []);

  // One active dropdown at a time, including the native <details> menu.
  // Test the actual trigger/panel, not the entire navigation bar.
  useEffect(() => {
    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!sportsTriggerRef.current?.contains(target) && !sportsPanelRef.current?.contains(target)) {
        setSportsMenuOpen(false);
      }
      if (!schoolInfoTriggerRef.current?.contains(target) && !schoolInfoPanelRef.current?.contains(target)) {
        setSchoolInfoMenuOpen(false);
      }
      if (!systemMenuRef.current?.contains(target)) closeSystemMenu();
    };
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown, true);
  }, [closeSystemMenu]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const system = systemMenuRef.current;
      if (!sportsMenuOpen && !schoolInfoMenuOpen && !system?.open) return;
      event.preventDefault();
      if (system?.open) system.querySelector("summary")?.focus();
      else if (sportsMenuOpen) sportsTriggerRef.current?.focus();
      else if (schoolInfoMenuOpen) schoolInfoTriggerRef.current?.focus();
      setSportsMenuOpen(false);
      setSchoolInfoMenuOpen(false);
      closeSystemMenu();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [sportsMenuOpen, schoolInfoMenuOpen, closeSystemMenu]);
  const [sportsDropdownLeft, setSportsDropdownLeft] = useState(8);
  const [schoolInfoDropdownLeft, setSchoolInfoDropdownLeft] = useState(8);

  // Submenus live IN the navigation's document flow, rather than overlapping the page.
  // Align the compact panels below their respective buttons even on horizontally
  // scrollable mobile navigation and when the viewport changes size.
  const alignGroupDropdown = useCallback((group: "sports" | "school_info") => {
    const nav = schoolInfoNavRef.current;
    const trigger = (group === "sports" ? sportsTriggerRef : schoolInfoTriggerRef).current;
    if (!nav || !trigger) return;
    const parent = nav.getBoundingClientRect();
    const target = trigger.getBoundingClientRect();
    const dropdownWidth = Math.min(360, Math.max(0, parent.width - 16));
    const left = Math.min(Math.max(target.left - parent.left, 8), Math.max(8, parent.width - dropdownWidth - 8));
    if (group === "sports") setSportsDropdownLeft(left);
    else setSchoolInfoDropdownLeft(left);
  }, []);

  useEffect(() => {
    if (!sportsMenuOpen && !schoolInfoMenuOpen) return;
    const group = sportsMenuOpen ? "sports" : "school_info";
    alignGroupDropdown(group);
    const nav = schoolInfoNavRef.current;
    const navItems = nav?.querySelector('[data-sports-nav-items]');
    const onPositionChange = () => alignGroupDropdown(group);
    window.addEventListener("resize", onPositionChange);
    navItems?.addEventListener("scroll", onPositionChange, { passive: true });
    return () => {
      window.removeEventListener("resize", onPositionChange);
      navItems?.removeEventListener("scroll", onPositionChange);
    };
  }, [sportsMenuOpen, schoolInfoMenuOpen, alignGroupDropdown]);
  const [scheduleView, setScheduleView] = useState<"schedule" | "events">("schedule");
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [eventResults, setEventResults] = useState<EventResult[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [homeAthleteCount, setHomeAthleteCount] = useState<number | null>(null);
  const [homeAnnouncements, setHomeAnnouncements] = useState<{id:string;title:string;details:string;published_at:string|null}[]>([]);
  const [homeSpecialMatches, setHomeSpecialMatches] = useState<{
    id:string;event_id:string;round_name:string;scheduled_at:string|null;
    venue_name:string|null;status:string;display_team_a:string;display_team_b:string;
    score_a:number|null;score_b:number|null;
    special_source:"football"|"esports"|"boxing"|"athletics";
    special_code?:string|null;special_number?:string|null;is_session?:boolean;status_label?:string;
  }[]>([]);

  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageCertificates, setCanManageCertificates] = useState(false);
  const [canAdminCertificates, setCanAdminCertificates] = useState(false);
  const [canCentralPrint, setCanCentralPrint] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [resultSportFilter, setResultSportFilter] = useState("all");
  const [resultEventFilter, setResultEventFilter] = useState("all");
  const [resultMatchId, setResultMatchId] = useState("");
  const [resultScoreA, setResultScoreA] = useState("0");
  const [resultScoreB, setResultScoreB] = useState("0");
  const liveResultsRefreshTimer = useRef<number | null>(null);

  const [coaches,setCoaches] = useState<Coach[]>([{name:"",phone:""}]);
  const [players,setPlayers] = useState<AthleteInput[]>([blankPlayer()]);
  const [exportingEntries,setExportingEntries] = useState(false);
  const [photoFiles,setPhotoFiles] = useState<Record<number,File>>({});
  const [rosterImportBusy,setRosterImportBusy] = useState(false);
  const [rosterFileError,setRosterFileError] = useState("");
  const [rosterImportPreview,setRosterImportPreview] = useState<{fileName:string;athletes:ImportedAthlete[]} | null>(null);
  const [editEntry,setEditEntry] = useState<Entry | null>(null);
  const [eventChoice,setEventChoice] = useState("");
  const [detail,setDetail] = useState<{entry: Entry; players: AthleteInput[]} | null>(null);
  const [rosterError,setRosterError] = useState("");
  const [rosterPanelView,setRosterPanelView] = useState<"roster" | "photos">("roster");
  const [rosterTargetId,setRosterTargetId] = useState<string | null>(null);
  const [demoRosters,setDemoRosters] = useState<Record<string,AthleteInput[]>>({});
  const [schoolFilter,setSchoolFilter] = useState("");
  const [eventFilter,setEventFilter] = useState("");
  const [registrationScope, setRegistrationScope] = useState<RegistrationSport | null>(null);
  const [registrationEmbed, setRegistrationEmbed] = useState(false);
  const [listSport, setListSport] = useState<RegistrationSport | "">("");
  const [rosterAudit, setRosterAudit] = useState<string[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);
  const auditRevision = useRef(0);
  const [registrationCountsNote,setRegistrationCountsNote]=useState("");
  const activeRegistrationSport = registrationSport(registrationScope);
  const chosenEvent = events.find(e => e.id === eventChoice);
  const showPhotoInput = allowsRegistrationPhotos(chosenEvent);
  useEffect(()=>{auditRevision.current++;setRosterAudit([]);},[players,eventChoice,registrationScope]);
  const rosterAdmin = isDemo || roles.some(r => (r.role==="super_admin" && (!r.competition_id || r.competition_id===competition?.id)) || (r.role==="competition_admin" && r.competition_id===competition?.id));
  const canManageCompetition = isDemo || isAdmin || roles.some((role) => role.role === "competition_admin" && (!role.competition_id || role.competition_id === competition?.id));
  const canManageSchool = rosterAdmin || roles.some((role) => role.role === "school_manager" && (!role.competition_id || role.competition_id === competition?.id));
  const canRecordResults = isDemo || canManageCompetition || roles.some((role) => role.role === "referee" && (!role.competition_id || role.competition_id === competition?.id));
  const canManageAccounts = !isDemo && roles.some((role) => (role.role === "super_admin" && (!role.competition_id || role.competition_id === competition?.id)) || (role.role === "competition_admin" && role.competition_id === competition?.id));
  const canAccessSystemMenu = !isDemo && Boolean(userEmail) && (canManageAccounts || canManageCertificates || canAdminCertificates || canCentralPrint || canManageCompetition || canRecordResults || canManageSchool);
  const entrySchools = rosterAdmin
    ? schools
    : schools.filter((school) => roles.some((role) => role.role === "school_manager" && role.school_id === school.id && (!role.competition_id || role.competition_id===competition?.id)));

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      let profileRole = "";
      let roleRows: UserRole[] = [];
      if (user) {
        setUserEmail(user.app_metadata?.sports_school_account ? "บัญชีโรงเรียน" : user.email || "");
        const [profileResult, roleResult] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase.from("sports_user_roles").select("role, school_id, competition_id").eq("user_id", user.id).eq("is_active", true),
        ]);
        profileRole = String(profileResult.data?.role || "").toLowerCase();
        roleRows = (roleResult.data || []) as UserRole[];
      } else {
        setUserEmail("");
      }
      setIsAdmin(profileRole === "admin" || roleRows.some((role) => role.role === "super_admin"));
      setRoles(roleRows);
      // Management entry is shown only to appointed certificate officials and administrators.
      // The certificate RPC checks the authenticated account; a school-only user never sees it.
      if (user) {
        const [certificateResponse, centralResponse] = await Promise.all([supabase.rpc("sports_cert_context"), supabase.rpc("sports_central_cert_my_access")]);
        setCanCentralPrint(!centralResponse.error && centralResponse.data === true);
        const certificateRole = (certificateResponse.data as {role?:string}|null)?.role;
        setCanManageCertificates(!certificateResponse.error && (certificateRole === "official" || certificateRole === "admin"));
        setCanAdminCertificates(!certificateResponse.error && certificateRole === "admin");
      } else {
        setCanManageCertificates(false);
        setCanAdminCertificates(false);
        setCanCentralPrint(false);
      }

      const [competitionResult, schoolResult, eventResult, matchResult, medalResult, eventResultsResult] = await Promise.all([
        supabase.from("sports_competitions").select("*").eq("slug", SPORTS_COMPETITION_SLUG).maybeSingle(),
        supabase.from("sports_schools").select("*").order("name"),
        supabase.from("sports_events").select("*").order("sport_name"),
        supabase.from("sports_matches").select("*").order("scheduled_at", { ascending: true }),
        supabase.from("sports_medals").select("*"),
        supabase.from("sports_event_results").select("*"),
      ]);

      const publicErrors = [competitionResult.error, schoolResult.error, eventResult.error, matchResult.error, medalResult.error, eventResultsResult.error].filter(Boolean);
      const missingTable = publicErrors.some((item) => item?.code === "42P01" || item?.code === "PGRST205");
      if (missingTable) {
        setIsDemo(true);
      setHomeAthleteCount(DEMO_ENTRIES.reduce((n,e)=>n+(e.athlete_count || 0),0));
      setHomeAnnouncements([]);
      setHomeSpecialMatches([]);
        setCompetition(DEMO_COMPETITION);
        setSchools(DEMO_SCHOOLS);
        setEvents(DEMO_EVENTS);
        setEntries(DEMO_ENTRIES);
        setMatches(DEMO_MATCHES);
        setResults(DEMO_RESULTS);
        setEventResults(DEMO_EVENT_RESULTS);
        setMedals(DEMO_MEDALS);
        setNotice("กำลังแสดงข้อมูลตัวอย่าง เนื่องจากยังไม่ได้ติดตั้งฐานข้อมูลระบบกีฬากลุ่ม");
        return;
      }
      if (publicErrors.length) {
        throw new Error(publicErrors[0]?.message || "ไม่สามารถอ่านข้อมูลระบบกีฬากลุ่มได้");
      }

      setIsDemo(false);
      const activeCompetition = (competitionResult.data || null) as Competition | null;
      if (!activeCompetition) {
        throw new Error("ไม่พบการแข่งขันภูลังกาเกมส์ 2569 กรุณาตรวจสอบข้อมูลการแข่งขันใน Supabase");
      }
      setCompetition(activeCompetition);
      // Read-only public aggregates: no individual student names exposed to public overview.
      // The new RPC is optional until migration v33.11 is installed.
      void supabase.rpc("sports_public_overview_counts", { p_comp: activeCompetition.id })
        .then(({data, error}) => {
          if (!error && data && typeof data === "object" && "athletes" in data) {
            const count = Number((data as {athletes: unknown}).athletes);
            if (Number.isFinite(count)) setHomeAthleteCount(count);
          }
        });
      // Specialist football/RoV fixtures have independent result tables. Public RLS
      // permits only non-draft fixtures; never show unpublished scores on home.
      void Promise.all([
        supabase.from("sports_football_matches")
          .select("id,event_id,stage,group_code,team1_name,team2_name,scheduled_date,start_time,venue_name,status,score1,score2")
          .eq("competition_id",activeCompetition.id).in("status",["published","completed"]).limit(500),
        supabase.from("sports_esports_matches")
          .select("id,event_id,stage,team1_id,team2_id,scheduled_date,start_time,venue_name,match_status,score1,score2")
          .eq("competition_id",activeCompetition.id).in("match_status",["scheduled","completed"]).limit(500),
        supabase.from("sports_esports_group_teams")
          .select("id,school_name").eq("competition_id",activeCompetition.id).limit(600),
        supabase.rpc("sports_boxing_public",{p_comp:activeCompetition.id}),
        // Read-only public athletics schedule. This RPC returns only published
        // sessions for public visitors and never exposes student registration data.
        supabase.rpc("sports_ath_public",{p_comp:activeCompetition.id}),
      ]).then(([football,esports,teams,boxing,athletics])=>{
        type FootballRow = {id:string;event_id:string;stage:string;group_code:string|null;team1_name:string;team2_name:string;scheduled_date:string|null;start_time:string|null;venue_name:string|null;status:string;score1:number|null;score2:number|null};
        type EsportsRow = {id:string;event_id:string;stage:string;team1_id:string;team2_id:string;scheduled_date:string|null;start_time:string|null;venue_name:string|null;match_status:string;score1:number|null;score2:number|null};
        const teamById = new Map(((teams.data || []) as {id:string;school_name:string}[]).map(t=>[t.id,t.school_name]));
        const when = (day:string|null,time:string|null) => day && time ? `${day}T${time}+07:00` : null;
        const footballMatches = football.error ? [] : ((football.data || []) as FootballRow[]).map(m=>({
          id:`football:${m.id}`,event_id:m.event_id,round_name:m.stage==="group"?`รอบแบ่งกลุ่ม${m.group_code ? ` · สาย ${m.group_code}`:""}`:m.stage,
          scheduled_at:when(m.scheduled_date,m.start_time),venue_name:m.venue_name,
          status:m.status==="completed"?"completed":"scheduled",display_team_a:m.team1_name||"รอคู่แข่งขัน",display_team_b:m.team2_name||"รอคู่แข่งขัน",
          score_a:m.score1,score_b:m.score2,special_source:"football" as const,
        }));
        const esportsMatches = esports.error ? [] : ((esports.data || []) as EsportsRow[]).map(m=>({
          id:`esports:${m.id}`,event_id:m.event_id,round_name:m.stage,
          scheduled_at:when(m.scheduled_date,m.start_time),venue_name:m.venue_name,
          status:m.match_status==="completed"?"completed":"scheduled",display_team_a:teamById.get(m.team1_id)||"รอคู่แข่งขัน",display_team_b:teamById.get(m.team2_id)||"รอคู่แข่งขัน",
          score_a:m.score1,score_b:m.score2,special_source:"esports" as const,
        }));
        type BoxingRow={id:string;event_id:string;round_name:string;scheduled_date:string|null;start_time:string|null;venue_name:string|null;status:string;red_school:string;blue_school:string;winner_school:string|null};
        const boxingMatches=boxing.error?[]:((boxing.data||[]) as BoxingRow[]).map(m=>({id:`boxing:${m.id}`,event_id:m.event_id,round_name:m.round_name+(m.winner_school?` · ผู้ชนะ ${m.winner_school}`:""),scheduled_at:when(m.scheduled_date,m.start_time),venue_name:m.venue_name,status:m.status==="completed"?"completed":"scheduled",display_team_a:m.red_school,display_team_b:m.blue_school,score_a:null,score_b:null,special_source:"boxing" as const}));
        type AthleticsSessionRow={id:string;event_id:string;code:string;label:string;no:string;day:string;report:string;start:string;round:string;kind:string;phase:string;state:string;status:string};
        const athleticsSessions=athletics.error?[]:((athletics.data||[]) as AthleticsSessionRow[]).map(session=>{
          const stateLabel=session.state==="open"?"กำลังเรียกรายงานตัว":session.state==="closed"?"เข้าสนามแล้ว":session.state==="finished"?"เสร็จสิ้น":"รอเรียก";
          const status=session.state==="open"||session.state==="closed"?"in_progress":session.state==="finished"?"completed":"scheduled";
          return {
            id:`athletics:${session.id}`,event_id:session.event_id,
            round_name:session.round||"ช่วงการแข่งขัน",
            scheduled_at:when(session.day,session.start),venue_name:"สนามกีฬาโรงเรียนเชียงคำวิทยาคม",
            status,display_team_a:"",display_team_b:"",score_a:null,score_b:null,
            special_source:"athletics" as const,special_code:session.code,special_number:session.no,
            is_session:true,status_label:stateLabel,
          };
        });
        setHomeSpecialMatches([...footballMatches,...esportsMatches,...boxingMatches,...athleticsSessions]);
      });
      void supabase.from("sports_school_information")
        .select("id,title,details,published_at")
        .eq("competition_id", activeCompetition.id).eq("section", "announcements")
        .eq("is_published", true).order("published_at", {ascending:false}).limit(6)
        .then(({data, error}) => {
          if (!error) setHomeAnnouncements((data || []) as {id:string;title:string;details:string;published_at:string|null}[]);
        });

      const allSchools = (schoolResult.data || []) as School[];
      setSchools(allSchools.filter((school) => school.status !== "inactive"));
      const allEvents = (eventResult.data || []) as SportEvent[];
      setEvents(allEvents.filter((item) => item.competition_id === activeCompetition.id));
      const allMatches = (matchResult.data || []) as Match[];
      setMatches(allMatches.filter((item) => item.competition_id === activeCompetition.id));
      const allMedals = (medalResult.data || []) as Medal[];
      setMedals(allMedals.filter((item) => item.competition_id === activeCompetition.id));
      const allEventResults = (eventResultsResult.data || []) as EventResult[];
      const activeEventIds = new Set(allEvents.filter((item) => !activeCompetition || item.competition_id === activeCompetition.id).map((item) => item.id));
      setEventResults(allEventResults.filter((item) => activeEventIds.has(item.event_id)));

      const matchIds = allMatches.map((item) => item.id);
      if (matchIds.length) {
        const resultQuery = await supabase.from("sports_match_results").select("*").in("match_id", matchIds);
        if (resultQuery.error && resultQuery.error.code !== "PGRST205") throw resultQuery.error;
        setResults((resultQuery.data || []) as MatchResult[]);
      } else {
        setResults([]);
      }

      if (user && (profileRole === "admin" || roleRows.length > 0)) {
        // Page within the current competition; avoid silently truncating counts at the API row limit.
        const entryRows:Entry[]=[];
        let incomplete="";
        for(let offset=0;;offset+=500){
          const q=await supabase.from("sports_entries").select("*").eq("competition_id",activeCompetition.id).order("id").range(offset,offset+499);
          if(q.error){incomplete="อ่านใบสมัครไม่ครบ: "+q.error.message;break;}
          const rows=(q.data||[]) as Entry[];entryRows.push(...rows);if(rows.length<500)break;
        }
        const athleteCounts=new Map<string,number>();
        const ids=entryRows.map(e=>e.id);
        for(let i=0;i<ids.length;i+=100){
          for(let offset=0;;offset+=500){
            const q=await supabase.from("sports_athletes").select("entry_id").in("entry_id",ids.slice(i,i+100)).order("id").range(offset,offset+499);
            if(q.error){incomplete="อ่านจำนวนรายชื่อนักกีฬาไม่ครบ: "+q.error.message;break;}
            const rows=q.data||[];for(const row of rows)athleteCounts.set(row.entry_id,(athleteCounts.get(row.entry_id)||0)+1);
            if(rows.length<500)break;
          }
        }
        setRegistrationCountsNote(incomplete);
        setEntries(entryRows.sort((a,b)=>String((b as Entry & {created_at?:string}).created_at||"").localeCompare(String((a as Entry & {created_at?:string}).created_at||""))).map(item=>({...item,athlete_count:athleteCounts.get(item.id)||0})));
      } else {
        setRegistrationCountsNote("");
        setEntries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Keep the public results/medal board fresh after an official publishes placements.
  // The database transaction writes both tables together; debounce the resulting row events.
  useEffect(() => {
    const refreshPublicResults = () => {
      if (liveResultsRefreshTimer.current !== null) window.clearTimeout(liveResultsRefreshTimer.current);
      liveResultsRefreshTimer.current = window.setTimeout(() => {
        liveResultsRefreshTimer.current = null;
        void loadData(true);
      }, 350);
    };
    const channel = supabase.channel("sports-public-results-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_event_results" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_medals" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_match_results" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_matches" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_football_matches" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_esports_matches" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_ath_rounds" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_schedule_sessions" }, refreshPublicResults)
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_school_information" }, refreshPublicResults)
      .subscribe();
    // Polling fallback: Supabase Realtime may not be enabled for every public table.
    const pollId = window.setInterval(refreshPublicResults, 45_000);
    return () => {
      window.clearInterval(pollId);
      if (liveResultsRefreshTimer.current !== null) window.clearTimeout(liveResultsRefreshTimer.current);
      liveResultsRefreshTimer.current = null;
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Deep link for committees returning from specialist sport pages.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    const embed = params.get("embed") === "1";
    setRegistrationEmbed(embed);
    if (section === "results") setTab("matches");
    if (section === "registration") {
      setTab("entries");
      const sport = registrationSport(params.get("sport"));
      if (sport && !embed) {
        window.location.replace(registrationHref(sport));
        return;
      }
      setRegistrationScope(sport?.key ?? null);
      setEventFilter("");
      setFormOpen(Boolean(sport));
    }
  }, []);

  // The registration form is above the saved applications. After a user clicks
  // "ดูรายชื่อ" / "แนบรูปใบสมัครเดิม", reveal the result (or error) right away.
  useEffect(() => {
    if (tab !== "entries" || (!detail && !rosterError)) return;
    const frame = window.requestAnimationFrame(() => {
      const id = detail && rosterPanelView === "photos" ? "sports-saved-roster-photos" : "sports-saved-roster-response";
      const target = document.getElementById(id) || document.getElementById("sports-saved-roster-response");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, detail, rosterError, rosterPanelView]);

  const completedMatches = useMemo(() => matches.filter((match) => match.status === "completed"), [matches]);
  const totalMedals = medals.length;
  const schoolEntries = entries.filter(e=>entrySchools.some(s=>s.id===e.school_id));
  const registrationEvents = useMemo(() => registrationScope ? events.filter(event => eventRegistrationSport(event) === registrationScope) : events, [events, registrationScope]);
  const registrationEventIds = useMemo(() => new Set(registrationEvents.map(event => event.id)), [registrationEvents]);
  const scopedSchoolEntries = registrationScope ? schoolEntries.filter(entry => registrationEventIds.has(entry.event_id)) : schoolEntries;
  const listEvents = listSport && !registrationScope ? registrationEvents.filter(e=>eventRegistrationSport(e)===listSport) : registrationEvents;
  const listEventIds = new Set(listEvents.map(e=>e.id));
  const registrationRows = scopedSchoolEntries.filter(e=>listEventIds.has(e.event_id)&&(!schoolFilter||e.school_id===schoolFilter)&&(!eventFilter||e.event_id===eventFilter));
  const receivedEntries = scopedSchoolEntries.filter((entry) => ["submitted", "approved", "rejected"].includes(entry.status)).length;

  useEffect(() => {
    if (!registrationEmbed) return;
    const sendHeight = () => {
      const height = Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight);
      window.parent.postMessage({ type: "ckw-sport-registration-height", height }, window.location.origin);
    };
    sendHeight();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sendHeight) : null;
    if (resizeObserver) {
      resizeObserver.observe(document.documentElement);
      if (document.body) resizeObserver.observe(document.body);
    }
    const mutationObserver = typeof MutationObserver !== "undefined" && document.body
      ? new MutationObserver(sendHeight)
      : null;
    mutationObserver?.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", sendHeight);
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, [registrationEmbed, loading, formOpen, registrationRows.length, detail, rosterError, notice, error]);

  const schoolById = useMemo(() => new Map(schools.map((school) => [school.id, school])), [schools]);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const resultByMatch = useMemo(() => new Map(results.map((result) => [result.match_id, result])), [results]);
  const resultSportGroups = useMemo(() => {
    const groups = new Map<string, SportEvent[]>();
    for (const event of events) {
      if (resultSportName(event) === "E-Sport (RoV)" || resultSportName(event) === "ฟุตบอล" || isFutsal(event) || isBasketball(event) || isVolleyball(event) || isTakraw(event) || isPetanque(event) || isTableTennis(event) || isBoxing(event)) continue; // specialist systems have their own fixtures/results
      const name = resultSportName(event);
      // Athletics already has a dedicated full-width link in the results hub.
      // Keep its data in the shared results tables; only suppress the duplicate selector.
      if (name === "กรีฑา" || event.event_code?.startsWith("GS3-AT-")) continue;
      groups.set(name, [...(groups.get(name) || []), event]);
    }
    return [...groups.entries()].map(([name, sportEvents]) => ({ name, events: sportEvents }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [events]);
  const filteredResultEvents = useMemo(() => events.filter((event) =>
    resultSportName(event) !== "E-Sport (RoV)" && !isFutsal(event) && !isBasketball(event) && !isVolleyball(event) && !isTakraw(event) && !isPetanque(event) && !isTableTennis(event) && !isBoxing(event) &&
    (resultSportFilter === "all" || resultSportName(event) === resultSportFilter)
  ), [events, resultSportFilter]);
  const filteredResultMatches = useMemo(() => {
    const ids = new Set(filteredResultEvents.filter((event) => resultEventFilter === "all" || event.id === resultEventFilter).map((event) => event.id));
    return matches.filter((match) => ids.has(match.event_id));
  }, [matches, filteredResultEvents, resultEventFilter]);
  const filteredIndividualResults = useMemo(() => {
    const ids = new Set(filteredResultEvents.filter((event) => resultEventFilter === "all" || event.id === resultEventFilter).map((event) => event.id));
    return eventResults.filter((result) => ids.has(result.event_id)).sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999));
  }, [eventResults, filteredResultEvents, resultEventFilter]);


  const medalTable = useMemo(() => {
    const rows = schools.map((school) => {
      const schoolMedals = medals.filter((medal) => medal.school_id === school.id);
      return {
        school,
        gold: schoolMedals.filter((medal) => medal.medal_type === "gold").length,
        silver: schoolMedals.filter((medal) => medal.medal_type === "silver").length,
        bronze: schoolMedals.filter((medal) => medal.medal_type === "bronze").length,
        total: schoolMedals.length,
      };
    }).filter((row) => row.total > 0);
    return rows.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
  }, [medals, schools]);

  const standings = useMemo(() => {
    const filteredEvents = selectedEventId === "all" ? events : events.filter((event) => event.id === selectedEventId);
    return filteredEvents.flatMap((event) => {
      const eventMatches = matches.filter((match) => match.event_id === event.id && match.status === "completed");
      const matchesByGroup = new Map<string, Match[]>();
      eventMatches.forEach((match) => {
        const groupName = match.group_name || "ไม่แบ่งสาย";
        matchesByGroup.set(groupName, [...(matchesByGroup.get(groupName) || []), match]);
      });
      return [...matchesByGroup.entries()].map(([groupName, groupMatches]) => {
        const table = new Map<string, { school: School; played: number; win: number; draw: number; loss: number; scored: number; conceded: number; points: number }>();
        groupMatches.forEach((match) => {
          const result = resultByMatch.get(match.id);
          if (!result || !match.school_a_id || !match.school_b_id) return;
          const schoolA = schoolById.get(match.school_a_id);
          const schoolB = schoolById.get(match.school_b_id);
          if (!schoolA || !schoolB) return;
          const rowA = table.get(schoolA.id) || { school: schoolA, played: 0, win: 0, draw: 0, loss: 0, scored: 0, conceded: 0, points: 0 };
          const rowB = table.get(schoolB.id) || { school: schoolB, played: 0, win: 0, draw: 0, loss: 0, scored: 0, conceded: 0, points: 0 };
          rowA.played += 1; rowB.played += 1;
          rowA.scored += Number(result.score_a); rowA.conceded += Number(result.score_b);
          rowB.scored += Number(result.score_b); rowB.conceded += Number(result.score_a);
          if (Number(result.score_a) > Number(result.score_b)) {
            rowA.win += 1; rowB.loss += 1; rowA.points += event.points_win ?? 3; rowB.points += event.points_loss ?? 0;
          } else if (Number(result.score_b) > Number(result.score_a)) {
            rowB.win += 1; rowA.loss += 1; rowB.points += event.points_win ?? 3; rowA.points += event.points_loss ?? 0;
          } else {
            rowA.draw += 1; rowB.draw += 1; rowA.points += event.points_draw ?? 1; rowB.points += event.points_draw ?? 1;
          }
          table.set(schoolA.id, rowA); table.set(schoolB.id, rowB);
        });
        const rows = [...table.values()].sort((a, b) => b.points - a.points || (b.scored - b.conceded) - (a.scored - a.conceded) || b.scored - a.scored);
        return { event, groupName, rows };
      }).filter((group) => group.rows.length > 0);
    });
  }, [events, matches, resultByMatch, schoolById, selectedEventId]);

  async function addSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(isDemo || isAdmin)) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const schoolCode = String(form.get("school_code") || "").trim();
    const district = String(form.get("district") || "").trim();
    if (!name) return setError("กรุณากรอกชื่อโรงเรียน");
    setBusy(true); setError("");
    try {
      let joinWarning = "";
      const payload = { name, school_code: schoolCode || null, district: district || null, province: "พะเยา", status: "active" };
      if (isDemo) {
        const newSchool: School = { id: makeId("demo-school"), ...payload };
        setSchools((current) => [...current, newSchool]);
      } else {
        const { data, error: insertError } = await supabase.from("sports_schools").insert(payload).select("*").single();
        if (insertError) throw insertError;
        const newSchool = data as School;
        setSchools((current) => [...current, newSchool]);
        if (competition) {
          const { error: joinError } = await supabase.from("sports_competition_schools").upsert(
            { competition_id: competition.id, school_id: newSchool.id, status: "registered" },
            { onConflict: "competition_id,school_id" },
          );
          if (joinError) joinWarning = "เพิ่มโรงเรียนแล้ว แต่ยังผูกโรงเรียนเข้ารายการแข่งขันไม่สำเร็จ: " + joinError.message;
        }
      }
      setNotice(joinWarning || (isDemo ? "เพิ่มโรงเรียนในโหมดสาธิตแล้ว (ข้อมูลจะไม่ถูกบันทึกลงฐานข้อมูล)" : "เพิ่มโรงเรียนเรียบร้อยแล้ว"));
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มโรงเรียนไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCompetition || !competition) return;
    const form = new FormData(event.currentTarget);
    const sportName = String(form.get("sport_name") || "").trim();
    if (!sportName) return setError("กรุณากรอกชื่อรายการแข่งขัน");
    const payload = {
      competition_id: competition.id,
      event_code: String(form.get("event_code") || "").trim() || null,
      sport_name: sportName,
      event_type: String(form.get("event_type") || "team"),
      gender_rule: String(form.get("gender_rule") || "รวม"),
      level_rule: String(form.get("level_rule") || "ไม่จำกัด"),
      competition_format: String(form.get("competition_format") || "league"),
      max_athletes_per_entry: Number(form.get("max_athletes_per_entry") || 0) || null,
      points_win: Number(form.get("points_win") || 3),
      points_draw: Number(form.get("points_draw") || 1),
      points_loss: Number(form.get("points_loss") || 0),
      venue_name: String(form.get("venue_name") || "").trim() || null,
      status: "registration",
    };
    setBusy(true); setError("");
    try {
      if (isDemo) {
        setEvents((current) => [...current, { id: makeId("demo-event"), ...payload } as SportEvent]);
      } else {
        const { data, error: insertError } = await supabase.from("sports_events").insert(payload).select("*").single();
        if (insertError) throw insertError;
        setEvents((current) => [...current, data as SportEvent]);
      }
      setNotice(isDemo ? "เพิ่มรายการแข่งขันในโหมดสาธิตแล้ว" : "เพิ่มรายการแข่งขันเรียบร้อยแล้ว");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มรายการแข่งขันไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistrationError("");
    const showRegistrationError = (message: string) => {
      setRegistrationError(message);
      setError(message);
      // The source form may be many screens tall when several players are imported.
      // Keep failures beside the Submit button, not only at the top of the page.
      window.requestAnimationFrame(() => document.getElementById("sports-registration-error")?.scrollIntoView({behavior:"smooth",block:"center"}));
    };
    if (!canManageSchool || !competition) return showRegistrationError("ไม่พบสิทธิ์ลงทะเบียนหรือข้อมูลการแข่งขัน กรุณาเข้าสู่ระบบอีกครั้ง");
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("event_id") || "");
    const schoolId = String(form.get("school_id") || "");
    const sportEvent = events.find((item) => item.id === eventId);
    // All sports use the same coach/athlete form as RoV. The entry name is
    // created automatically rather than asking schools to type it repeatedly.
    const schoolName = schools.find(s => s.id === schoolId)?.name.trim() || "";
    const firstAthleteName = `${players[0]?.prefix || ""}${players[0]?.full_name.trim() || ""}`;
    const entryName = editEntry?.entry_name || (sportEvent?.event_type !== "team" && sportEvent?.max_athletes_per_entry === 1
      ? firstAthleteName : schoolName);
    if (!sportEvent || !schoolId || !entryName) return showRegistrationError("กรุณาเลือกรายการแข่งขัน โรงเรียน และกรอกชื่อนักกีฬาให้ครบ");
    if (registrationScope && !registrationEventIds.has(eventId)) return showRegistrationError("กรุณาเลือกรายการแข่งขันในประเภทกีฬาที่เลือก");
    if (!entrySchools.some(s=>s.id===schoolId)) return showRegistrationError("ไม่มีสิทธิ์ลงทะเบียนให้โรงเรียนนี้");
    if (isTableTennis(sportEvent)) return showRegistrationError("กรุณาใช้หน้าลงทะเบียนเทเบิลเทนนิสเฉพาะกีฬา");
    if (isTakraw(sportEvent)) return showRegistrationError("กรุณาใช้หน้าลงทะเบียนเซปักตะกร้อเฉพาะกีฬา");
    if (isVolleyball(sportEvent)) return showRegistrationError("กรุณาใช้หน้าลงทะเบียนวอลเลย์บอลเฉพาะกีฬา");
    if (isBasketball(sportEvent)) return showRegistrationError("กรุณาลงทะเบียนผ่านเมนูบาสเกตบอล 4 รุ่น");
    if (isFutsal(sportEvent)) return showRegistrationError("กรุณาลงทะเบียนผ่านเมนูฟุตซอล 3 ประเภท");
    if (isFootball(sportEvent)) return showRegistrationError("การลงทะเบียนฟุตบอลใช้แบบฟอร์มเฉพาะที่เมนู ‘ฟุตบอล 4 ประเภท’ เพื่อเก็บวันเกิดและเบอร์เสื้อ");
    if (rosterImportBusy) return showRegistrationError("กำลังอ่าน Excel กรุณารอให้ระบบตรวจรายชื่อให้เสร็จก่อน");
    if (rosterImportPreview) return showRegistrationError("กรุณากด ‘ใช้รายชื่อในฟอร์ม’ หลังตรวจตัวอย่าง Excel ก่อนส่งลงทะเบียน");
    if (!editEntry && sportEvent.stage3_source != null && sportEvent.status !== "registration") return showRegistrationError("รายการนี้ยังไม่เปิดรับสมัคร");
    const athletes = players.map(p=>({
      ...p,
      full_name:p.full_name.trim() ? (p.prefix || "") + p.full_name.trim() : "",
      student_code:p.student_code?.trim()||null,
      // No sports registration collects grade or gender.
      grade_level: null,
      gender: null,
    }));
    const invalidPrefix = players.findIndex(player => !namePrefixes.includes((player.prefix || "").trim()));
    if (invalidPrefix !== -1) return showRegistrationError(`นักกีฬาคนที่ ${invalidPrefix + 1}: กรุณาเลือกคำนำหน้าชื่อ (เด็กชาย/เด็กหญิง/นาย/นางสาว)`);
    const missingName = players.findIndex(player => !player.full_name.trim());
    if (missingName !== -1) return showRegistrationError(`นักกีฬาคนที่ ${missingName + 1}: กรุณากรอกชื่อ–สกุล`);
    if (athletes.some(a=>!a.full_name)) return showRegistrationError("กรุณากรอกชื่อผู้เล่นทุกแถว");
    if (isRov(sportEvent) && (athletes.length<5 || athletes.length>7)) return showRegistrationError("RoV ต้องมีผู้เล่นหลัก 5 คน และสามารถเพิ่มตัวสำรองได้อีกไม่เกิน 2 คน (ไม่บังคับ)");
    if (isRov(sportEvent)) {
      const missingIgn = athletes.findIndex(a => !(a.ign || "").trim());
      if (missingIgn !== -1) return showRegistrationError(`นักกีฬาคนที่ ${missingIgn + 1}: กรุณากรอกชื่อในเกม (IGN)`);
      const reserveCount = athletes.filter(a=>a.team_role==="ตัวสำรอง").length;
      const invalidRole = athletes.some(a=>!["หัวหน้าทีม","ตัวจริง","ตัวสำรอง"].includes(a.team_role||""));
      if (athletes.filter(a=>a.team_role==="หัวหน้าทีม").length!==1 ||
          athletes.filter(a=>a.team_role==="ตัวจริง").length!==4 ||
          reserveCount>2 || invalidRole)
        return showRegistrationError("กรุณาระบุหัวหน้าทีม 1 คน ตัวจริงอีก 4 คน และตัวสำรองไม่เกิน 2 คน (ไม่บังคับ)");
    }
    // Every type of sport requires at least one named coach and a telephone.
    // Keep the same validation for team, pairs, individuals, athletics and RoV.
    if (!coaches.length) return showRegistrationError("กรุณาเพิ่มครูผู้ควบคุมทีมอย่างน้อย 1 คน");
    const invalidCoach = coaches.findIndex(c=>!c.name.trim() || !/^\+?\d{9,15}$/.test(c.phone.replace(/[ ()-]/g,"")));
    if (invalidCoach !== -1) return showRegistrationError(`ครูผู้ควบคุมคนที่ ${invalidCoach + 1}: กรุณากรอกชื่อและเบอร์โทรศัพท์ 9–15 หลักให้ถูกต้อง`);
    const normalizedCoaches = coaches.map(c=>({name:c.name.trim(),phone:c.phone.trim()}));
    const individualBatch = !editEntry && supportsIndividualBatch(sportEvent) && athletes.length > 1;
    const validationMessage = validateAthletes(sportEvent, athletes, individualBatch);
    if (validationMessage) return showRegistrationError(validationMessage);
    const payload = {
      competition_id: competition.id,
      event_id: eventId,
      school_id: schoolId,
      entry_type: sportEvent.event_type === "team" ? "team" : "individual",
      entry_name: entryName,
      coach_name: normalizedCoaches[0].name,
      // Database migration 0020 automatically treats submitted registrations as received.
      status: "approved",
    };
    setBusy(true); setError(""); setRegistrationError("");
    try {
      const assistant = normalizedCoaches[1]?.name || "";
      let id = editEntry?.id;
      let batchSaved: Entry[] = [];
      if (isDemo) {
        if (individualBatch) {
          const newRosters: Record<string, AthleteInput[]> = {};
          batchSaved = athletes.map((athlete) => {
            const newId = makeId("demo-entry");
            newRosters[newId] = [athlete];
            return {...payload,id:newId,entry_name:athlete.full_name,assistant_coach:assistant,coaches:normalizedCoaches,athlete_count:1} as Entry;
          });
          setDemoRosters(prev=>({...prev,...newRosters}));
        } else {
          id = id || makeId("demo-entry");
          setDemoRosters(prev=>({...prev,[id!]:athletes}));
        }
      } else if (individualBatch) {
        const result = await supabase.rpc("sports_register_individual_batch",{
          p_event:eventId,p_school:schoolId,p_coach:payload.coach_name,p_players:athletes,p_coaches:normalizedCoaches
        });
        if (result.error) throw new Error(result.error.message);
        const records = result.data as {id:string;entry_name:string}[];
        if (!Array.isArray(records) || records.length !== athletes.length) throw new Error("ผลการนำเข้าจากฐานข้อมูลไม่ครบ กรุณาตรวจสอบใบสมัคร");
        batchSaved = records.map(row=>({...payload,id:row.id,entry_name:row.entry_name,assistant_coach:assistant,coaches:normalizedCoaches,athlete_count:1} as Entry));
      } else {
        const result = await supabase.rpc("sports_register_roster",{p_entry:id||null,p_event:eventId,p_school:schoolId,p_name:entryName,p_coach:payload.coach_name,p_assistant:assistant||null,p_players:athletes,p_coaches:normalizedCoaches});
        if (result.error) throw new Error(result.error.message);
        id = result.data as string;
      }
      if (individualBatch) {
        setEntries(current=>[...batchSaved,...current]);
      } else {
        const saved = {...payload,id:id!,assistant_coach:assistant,coaches:normalizedCoaches,athlete_count:athletes.length} as Entry;
        setEntries(current=>[saved,...current.filter(row=>row.id!==id)]);
      }
      // Save the actual entry first; photos must never create duplicate registrations.
      // A failed image does not roll back a valid registration; the school may retry
      // from "ดูรายชื่อ → แนบรูป" on the saved application.
      let failedPhotos: string[] = [];
      if (!isDemo && allowsRegistrationPhotos(sportEvent) && Object.keys(photoFiles).length) {
        for (const [row, file] of Object.entries(photoFiles)) {
          const index = Number(row);
          const athlete = athletes[index];
          // Individual batch saves one separate entry per athlete. Photos are
          // attached to the corresponding entry at roster index 0.
          const targetEntryId = individualBatch ? batchSaved[index]?.id : id;
          if (!athlete || !targetEntryId) continue;
          try { await uploadAthletePhoto(targetEntryId, individualBatch ? 0 : index, athlete, file); }
          catch (cause) { failedPhotos.push(`${index + 1}: ${cause instanceof Error ? cause.message : "ไม่ทราบสาเหตุ"}`); }
        }
      }
      setPhotoFiles({});
      setEditEntry(null); setDetail(null); setRosterFileError(""); setRosterImportPreview(null);
      if (failedPhotos.length) setError(`บันทึกใบสมัครสำเร็จ แต่ยังแนบรูปบางคนไม่ได้ (${failedPhotos.join("; ")}) กรุณาเปิด “ดูรายชื่อ” เพื่อแนบรูปอีกครั้ง`);
      setNotice(individualBatch ? `${isDemo ? "นำเข้าในโหมดสาธิต" : "รับข้อมูลลงทะเบียน"}กีฬาเดี่ยว ${batchSaved.length} คน (แยกใบสมัครรายคน) เรียบร้อยแล้ว · ตรวจตัวจริงที่สนามแข่งขัน` : isDemo ? "บันทึกการลงทะเบียนในโหมดสาธิตแล้ว" : "รับข้อมูลลงทะเบียนแล้ว · ตรวจตัวนักกีฬาและหลักฐานที่สนามแข่งขันในวันแข่งขันจริง");
      setFormOpen(false);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ";
      const help = /PGRST202|Could not find the function|schema cache/i.test(reason)
        ? "ตรวจสอบว่าได้ติดตั้ง SQL Migration 0015 และรีโหลด Schema Cache ของ Supabase แล้ว"
        : /permission denied|ไม่มีสิทธิ์|not authorized|JWT/i.test(reason)
        ? "ตรวจสอบสิทธิ์บัญชีโรงเรียนและเข้าสู่ระบบอีกครั้ง"
        : /duplicate key|23505/i.test(reason)
        ? "มีข้อมูลซ้ำในรายการนี้ โปรดตรวจสอบว่าเคยลงทะเบียนไว้แล้วหรือไม่"
        : "";
      showRegistrationError(`${help ? `${help} — ` : ""}${reason}`);
    } finally { setBusy(false); }
  }

  // Advisory only: no changes to the database, and no assumption that all fixtures have a known duration.
  async function auditRegistration(form: HTMLFormElement) {
    const fd = new FormData(form);
    const eventId = String(fd.get("event_id") || "");
    const schoolId = String(fd.get("school_id") || "");
    if (!canManageSchool || !entrySchools.some(s=>s.id===schoolId) || !eventId || !registrationEventIds.has(eventId)) {
      setRosterAudit(["กรุณาเลือกรายการแข่งขันและโรงเรียนที่มีสิทธิ์ก่อนตรวจสอบ"]); return;
    }
    const input = players.filter(p=>p.full_name.trim()).map(p=>({...p, full_name:(p.prefix||"")+p.full_name.trim()}));
    if (!input.length) {setRosterAudit(["กรุณากรอกชื่อนักกีฬาก่อนตรวจสอบ"]);return;}
    const warnings:string[]=[];
    if (duplicateNames(input.map(p=>p.full_name)).length) warnings.push("มีชื่อซ้ำในฟอร์ม โปรดตรวจสอบว่าเป็นคนเดียวกันหรือไม่");
    const codes=input.map(p=>p.student_code?.trim()).filter(Boolean);
    if (new Set(codes).size!==codes.length) warnings.push("มีรหัสนักเรียนซ้ำในฟอร์ม");
    const candidates=schoolEntries.filter(e=>e.school_id===schoolId && e.id!==editEntry?.id && !["withdrawn","cancelled"].includes(e.status));
    const byId=new Map(candidates.map(e=>[e.id,e]));
    const revision=++auditRevision.current;
    setAuditBusy(true);setRosterAudit([]);
    try {
      const known:{entry_id:string;full_name:string;student_code?:string|null}[]=[];
      if (isDemo) {
        for(const e of candidates) for(const a of demoRosters[e.id]||[]) known.push({...a,entry_id:e.id});
      } else {
        // Limit to the currently authorized school's visible application IDs. RLS still applies.
        for(let i=0;i<candidates.length;i+=50){
          const ids=candidates.slice(i,i+50).map(e=>e.id);
          for(let offset=0;;offset+=500){
            const q=await supabase.from("sports_athletes").select("entry_id,full_name,student_code").in("entry_id",ids).order("id").range(offset,offset+499);
            if(q.error)throw new Error(q.error.message);
            const rows=q.data||[]; known.push(...rows); if(rows.length<500)break;
          }
        }
      }
      const schoolName=schools.find(s=>s.id===schoolId)?.name;
      const startTimes=new Map<string,Set<number>>();
      const remember=(id:string,time:string|null|undefined)=>{if(!time)return;const t=new Date(time).getTime();if(!Number.isFinite(t))return;const set=startTimes.get(id)||new Set<number>();set.add(t);startTimes.set(id,set);};
      for(const m of matches) if(!["cancelled","postponed"].includes(m.status)&&(m.school_a_id===schoolId||m.school_b_id===schoolId))remember(m.event_id,m.scheduled_at);
      for(const m of homeSpecialMatches) if(schoolName&&(m.display_team_a===schoolName||m.display_team_b===schoolName))remember(m.event_id,m.scheduled_at);
      if(!isDemo && competition){
        const ids=[...new Set([eventId,...candidates.map(e=>e.event_id)])];
        for(let i=0;i<ids.length;i+=50){
          const q=await supabase.from("sports_schedule_sessions").select("event_id,session_date,start_time,status").eq("competition_id",competition.id).in("event_id",ids.slice(i,i+50)).eq("status","published");
          if(q.error){warnings.push("ตรวจเวลาโปรแกรมส่วนกลางไม่ครบ: "+q.error.message);break;}
          for(const m of q.data||[]) if(m.session_date&&m.start_time)remember(m.event_id,`${m.session_date}T${m.start_time}+07:00`);
        }
      }
      const messages=new Set<string>();
      for(const a of input) for(const b of known){
        const identity=sameAthlete(a,b);if(!identity)continue;
        const e=byId.get(b.entry_id);if(!e)continue;
        const label=events.find(ev=>ev.id===e.event_id)?.sport_name||"รายการเดิม";
        if(e.event_id===eventId)messages.add(`${a.full_name} · ${identity==="code"?"รหัสตรงกัน":"ชื่ออาจซ้ำ"} ในใบสมัครรายการเดียวกัน (${label})`);
        else if([...(startTimes.get(eventId)||[])].some(t=>startTimes.get(e.event_id)?.has(t))) messages.add(`${a.full_name} · อาจมีเวลาเริ่มแข่งขันตรงกันกับ ${label} (${identity==="code"?"รหัสตรงกัน":"ชื่ออาจตรงกัน"})`);
      }
      warnings.push(...messages);
      if(!messages.size)warnings.push("ไม่พบรายการซ้ำหรือเวลาเริ่มตรงกันจากข้อมูลที่ตรวจได้ (ไม่ใช่การยืนยันว่าไม่มีเวลาซ้อน)");
      warnings.push("ตรวจเฉพาะใบสมัครที่บัญชีนี้อ่านได้และโปรแกรมที่มีเวลาเริ่มแล้ว ไม่รวมระยะเวลาแข่งหรือรอบที่ยังไม่กำหนด");
      if(revision===auditRevision.current)setRosterAudit(warnings);
    }catch(err){if(revision===auditRevision.current)setRosterAudit([...warnings,"ตรวจสอบไม่ครบ: "+(err instanceof Error?err.message:"ไม่สามารถอ่านข้อมูลได้")]);}
    finally{setAuditBusy(false);}
  }

  async function printFilteredRosters() {
    if (!canManageSchool || busy || !registrationRows.length || registrationRows.length>50) return;
    const popup=window.open("","_blank");
    if(!popup){setError("เบราว์เซอร์บล็อกหน้าพิมพ์ กรุณาอนุญาตป๊อปอัป");return;}
    popup.opener=null;
    const doc=popup.document;
    doc.title="บัญชีรายชื่อนักกีฬา";
    const style=doc.createElement("style");style.textContent="@page{size:A4;margin:14mm}body{font-family:Tahoma,Arial,sans-serif;color:#11213c;font-size:13px}h1{font-size:22px}h2{font-size:15px;margin:15px 0 4px}section{break-inside:avoid;border-bottom:1px solid #b8c5d3;padding-bottom:8px}ol{padding-left:26px}li{padding:2px}button{padding:8px 16px}@media print{button{display:none}}";doc.head.appendChild(style);
    const heading=doc.createElement("h1");heading.textContent="บัญชีรายชื่อนักกีฬา · PHAYAO GAMES 2026";doc.body.appendChild(heading);
    const status=doc.createElement("p");status.textContent="กำลังอ่านรายชื่อจากใบสมัครที่เลือก…";doc.body.appendChild(status);
    setBusy(true);
    try{
      let failed=0;
      for(const entry of registrationRows){
        if(popup.closed)return;
        const section=doc.createElement("section");const title=doc.createElement("h2");title.textContent=`${schoolById.get(entry.school_id)?.name||""} · ${eventById.get(entry.event_id)?.sport_name||""}`;section.appendChild(title);
        let roster:AthleteInput[]=demoRosters[entry.id]||[];
        if(!isDemo){const q=await supabase.rpc("sports_roster_details",{p_entry:entry.id,p_team:null});if(q.error||!Array.isArray(q.data?.players)){failed++;const p=doc.createElement("p");p.textContent="ไม่สามารถอ่านรายชื่อใบสมัครนี้ได้";section.appendChild(p);doc.body.appendChild(section);continue;}roster=q.data.players as AthleteInput[];}
        if(!roster.length)failed++;
        const ol=doc.createElement("ol");for(const a of roster){const li=doc.createElement("li");li.textContent=a.full_name;ol.appendChild(li);}section.appendChild(ol);doc.body.appendChild(section);
      }
      status.textContent=`${isDemo?"ข้อมูลสาธิต · ":""}${registrationRows.length} ใบสมัคร${failed?` · ${failed} ใบสมัครไม่มีรายชื่อหรืออ่านไม่ได้ กรุณาตรวจสอบก่อนใช้`:""} · เอกสารสำหรับผู้มีสิทธิ์เท่านั้น`;
      const print=doc.createElement("button");print.textContent="พิมพ์ / บันทึก PDF";print.onclick=()=>popup.print();doc.body.insertBefore(print,heading);
    }catch(err){status.textContent="อ่านข้อมูลไม่ครบ: "+(err instanceof Error?err.message:"เกิดข้อผิดพลาด");}
    finally{setBusy(false);}
  }

  async function openRoster(entry: Entry, edit = false, view: "roster" | "photos" = "roster") {
    if (busy) return;
    setBusy(true);
    setRosterTargetId(entry.id);
    setRosterPanelView(view);
    setRosterError("");
    setError("");
    setDetail(null);
    setFormOpen(false); // Existing applications must never open a blank NEW registration form.
    try {
      let list: AthleteInput[] = demoRosters[entry.id] || [];
      let staff: Coach[] = entry.coaches || [entry.coach_name,entry.assistant_coach].filter(Boolean).map(name=>({name:name!,phone:""}));
      if (!isDemo) {
        // The existing security-definer RPC verifies the current school's role;
        // never query all athletes publicly or use a service-role key in the UI.
        const {data,error} = await supabase.rpc("sports_roster_details",{p_entry:entry.id,p_team:null});
        if (error) throw new Error(`อ่านรายชื่อจากใบสมัครเดิมไม่สำเร็จ: ${error.message}`);
        if (!data || typeof data !== "object" || !Array.isArray(data.players)) {
          throw new Error("ไม่พบรายชื่อหรือบัญชีนี้ไม่มีสิทธิ์อ่านใบสมัครนี้ กรุณาใช้บัญชีโรงเรียนเจ้าของใบสมัคร และตรวจสิทธิ์ school_manager");
        }
        list = (data.players as unknown[]).filter((player): player is AthleteInput =>
          typeof player === "object" && player !== null && "full_name" in player && typeof player.full_name === "string"
        );
        if (Array.isArray(data.coaches)) {
          staff = (data.coaches as unknown[]).filter((coach): coach is Coach =>
            typeof coach === "object" && coach !== null && "name" in coach && typeof coach.name === "string"
          ).map(coach=>({name:coach.name, phone: typeof coach.phone === "string" ? coach.phone : ""}));
        }
      }
      if (!list.length) {
        throw new Error("ใบสมัครนี้ไม่มีรายชื่อนักกีฬาที่ดึงได้ กรุณาตรวจสอบข้อมูล sports_athletes ใน Supabase โดยยังไม่ต้องสมัครใหม่");
      }
      if (edit) {
        setCoaches(staff.length ? staff : [{name:"",phone:""}]);
        setEditEntry(entry);
        setEventChoice(entry.event_id);
        setPlayers(list.map(editPlayerName));
        setRosterFileError(""); setRosterImportPreview(null);
        setPhotoFiles({});
        setFormOpen(true);
        window.scrollTo({top:0,behavior:"smooth"});
      } else {
        setDetail({entry:{...entry,coaches:staff},players:list});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "เปิดรายชื่อจากใบสมัครเดิมไม่สำเร็จ";
      setRosterError(message); // Show by the entry list, not above the long registration form.
    } finally {
      setBusy(false);
    }
  }

  async function addMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCompetition || !competition) return;
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("event_id") || "");
    if (isBoxing(events.find(e=>e.id===eventId))) return setError("จัดการในหน้ามวยสากลสมัครเล่นโดยเฉพาะ");
    if (isTableTennis(events.find(e=>e.id===eventId))) return setError("จัดการในหน้าเทเบิลเทนนิสโดยเฉพาะ");
    if (isPetanque(events.find(e=>e.id===eventId))) return setError("จัดการคู่แข่งขันในหน้าเปตองโดยเฉพาะ");
    if (isTakraw(events.find(e=>e.id===eventId))) return setError("จัดการคู่แข่งขันในหน้าเซปักตะกร้อโดยเฉพาะ");
    if (isVolleyball(events.find(e=>e.id===eventId))) return setError("จัดการคู่แข่งขันในหน้าวอลเลย์บอลโดยเฉพาะ");
    if (isBasketball(events.find(e=>e.id===eventId))) return setError("จัดการคู่บาสเกตบอลจากหน้าบาสเกตบอลโดยเฉพาะ");
    if (isFutsal(events.find(e=>e.id===eventId))) return setError("จัดการคู่ฟุตซอลจากหน้าฟุตซอลโดยเฉพาะ");
    const schoolAId = String(form.get("school_a_id") || "");
    const schoolBId = String(form.get("school_b_id") || "");
    if (!eventId || !schoolAId || !schoolBId) return setError("กรุณาเลือกรายการแข่งขันและโรงเรียนทั้งสองฝ่าย");
    if (schoolAId === schoolBId) return setError("โรงเรียนทั้งสองฝ่ายต้องไม่ซ้ำกัน");
    const dateTime = String(form.get("scheduled_at") || "");
    const payload = {
      competition_id: competition.id,
      event_id: eventId,
      match_number: String(form.get("match_number") || "").trim() || null,
      group_name: String(form.get("group_name") || "").trim() || null,
      round_name: String(form.get("round_name") || "รอบแบ่งกลุ่ม"),
      school_a_id: schoolAId,
      school_b_id: schoolBId,
      scheduled_at: dateTime ? new Date(dateTime).toISOString() : null,
      venue_name: String(form.get("venue_name") || "").trim() || null,
      status: "scheduled",
    };
    setBusy(true); setError("");
    try {
      if (isDemo) {
        setMatches((current) => [...current, { id: makeId("demo-match"), ...payload } as Match]);
      } else {
        const { data, error: insertError } = await supabase.from("sports_matches").insert(payload).select("*").single();
        if (insertError) throw insertError;
        setMatches((current) => [...current, data as Match]);
      }
      setNotice(isDemo ? "เพิ่มโปรแกรมแข่งขันในโหมดสาธิตแล้ว" : "เพิ่มโปรแกรมแข่งขันเรียบร้อยแล้ว");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มโปรแกรมแข่งขันไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function saveMatchResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRecordResults) return;
    const match = matches.find((item) => item.id === resultMatchId);
    if (!match) return setError("ไม่พบรายการแข่งขันที่เลือก");
    const scoreA = Number(resultScoreA);
    const scoreB = Number(resultScoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) return setError("กรุณากรอกคะแนนเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
    const winnerSchoolId = scoreA === scoreB ? null : scoreA > scoreB ? match.school_a_id || null : match.school_b_id || null;
    setBusy(true); setError("");
    try {
      const resultPayload = { match_id: match.id, score_a: scoreA, score_b: scoreB, winner_school_id: winnerSchoolId, recorded_at: new Date().toISOString() };
      if (isDemo) {
        setResults((current) => [...current.filter((item) => item.match_id !== match.id), resultPayload]);
        setMatches((current) => current.map((item) => item.id === match.id ? { ...item, status: "completed" } : item));
      } else {
        const { error: resultError } = await supabase.from("sports_match_results").upsert(resultPayload, { onConflict: "match_id" });
        if (resultError) throw resultError;
        const { error: matchError } = await supabase.from("sports_matches").update({ status: "completed" }).eq("id", match.id);
        if (matchError) throw matchError;
        setResults((current) => [...current.filter((item) => item.match_id !== match.id), resultPayload]);
        setMatches((current) => current.map((item) => item.id === match.id ? { ...item, status: "completed" } : item));
      }
      setNotice(isDemo ? "บันทึกผลการแข่งขันในโหมดสาธิตแล้ว" : "บันทึกผลการแข่งขันและอัปเดตสถานะแล้ว");
      setResultMatchId(""); setResultScoreA("0"); setResultScoreB("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกผลการแข่งขันไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function saveEventResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRecordResults) return;
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("event_id") || "");
    const entryId = String(form.get("entry_id") || "");
    const entry = entries.find((item) => item.id === entryId);
    if (!eventId || !entry || entry.event_id !== eventId || entry.status !== "approved") return setError("กรุณาเลือกรายการแข่งขันและใบสมัครที่รับข้อมูลแล้วให้ตรงกัน");
    if (events.find(e=>e.id===eventId)?.event_code?.startsWith("GS3-AT-")) return setError("กรุณาบันทึกผลที่ระบบกรีฑา / รายงานตัวโดยเฉพาะ");
    const rankValue = String(form.get("rank") || "").trim();
    const performanceValue = String(form.get("performance_value") || "").trim();
    const payload = {
      event_id: eventId,
      entry_id: entryId,
      school_id: entry.school_id,
      entry_name: entry.entry_name,
      rank: rankValue ? Number(rankValue) : null,
      performance_value: performanceValue ? Number(performanceValue) : null,
      performance_unit: String(form.get("performance_unit") || "").trim() || null,
      result_text: String(form.get("result_text") || "").trim() || null,
      recorded_at: new Date().toISOString(),
    };
    if ((payload.rank !== null && (!Number.isInteger(payload.rank) || payload.rank < 1)) || (payload.performance_value !== null && !Number.isFinite(payload.performance_value))) {
      return setError("อันดับต้องเป็นจำนวนเต็มบวก และสถิติต้องเป็นตัวเลข");
    }
    setBusy(true); setError("");
    try {
      if (isDemo) {
        setEventResults((current) => [...current.filter((item) => !(item.event_id === eventId && item.entry_id === entryId)), { id: makeId("demo-event-result"), ...payload } as EventResult]);
      } else {
        const { data, error: resultError } = await supabase.from("sports_event_results").upsert(payload, { onConflict: "event_id,entry_id" }).select("*").single();
        if (resultError) throw resultError;
        setEventResults((current) => [...current.filter((item) => !(item.event_id === eventId && item.entry_id === entryId)), data as EventResult]);
      }
      setNotice(isDemo ? "บันทึกผลรายบุคคลในโหมดสาธิตแล้ว" : "บันทึกผลรายบุคคลเรียบร้อยแล้ว");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกผลรายบุคคลไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function addMedal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCompetition || !competition) return;
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("event_id") || "");
    const schoolId = String(form.get("school_id") || "");
    const medalType = String(form.get("medal_type") || "gold") as Medal["medal_type"];
    if (!eventId || !schoolId) return setError("กรุณาเลือกรายการแข่งขันและโรงเรียน");
    setBusy(true); setError("");
    try {
      if (isDemo) {
        setMedals((current) => [...current, { id: makeId("demo-medal"), competition_id: competition.id, event_id: eventId, school_id: schoolId, medal_type: medalType }]);
      } else {
        const { data, error: insertError } = await supabase.from("sports_medals").insert({ competition_id: competition.id, event_id: eventId, school_id: schoolId, medal_type: medalType }).select("*").single();
        if (insertError) throw insertError;
        setMedals((current) => [...current, data as Medal]);
      }
      setNotice(isDemo ? "เพิ่มเหรียญรางวัลในโหมดสาธิตแล้ว" : "บันทึกเหรียญรางวัลเรียบร้อยแล้ว");
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกเหรียญรางวัลไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  const renderForm = () => {
    if (!formOpen) return null;
    const formShell = "rounded-2xl border border-rose-200 bg-[#fff8f8] p-4 md:p-5";
    const labelClass = "mb-1 block text-xs font-bold text-slate-600";
    const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-rose-100";
    const close = () => {auditRevision.current++;setRosterAudit([]);setFormOpen(false);};

    if (tab === "schools" && (isDemo || isAdmin)) return (
      <form className={formShell} onSubmit={addSchool}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">เพิ่มโรงเรียนเข้าร่วมการแข่งขัน</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label><span className={labelClass}>ชื่อโรงเรียน *</span><input name="name" required className={inputClass} placeholder="ชื่อโรงเรียน" /></label>
          <label><span className={labelClass}>รหัสโรงเรียน</span><input name="school_code" className={inputClass} placeholder="เช่น PY001" /></label>
          <label><span className={labelClass}>อำเภอ</span><input name="district" className={inputClass} placeholder="อำเภอ" /></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกโรงเรียน"}</button></div>
      </form>
    );

    if (tab === "events" && canManageCompetition) return (
      <form className={formShell} onSubmit={addEvent}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">เพิ่มรายการแข่งขัน</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label><span className={labelClass}>ชื่อรายการแข่งขัน *</span><input name="sport_name" required className={inputClass} placeholder="เช่น ฟุตบอลชาย ม.ต้น" /></label>
          <label><span className={labelClass}>รหัสรายการ</span><input name="event_code" className={inputClass} placeholder="เช่น FB-MJ" /></label>
          <label><span className={labelClass}>ประเภท</span><select name="event_type" className={inputClass}><option value="team">กีฬาทีม</option><option value="individual">กีฬาเดี่ยว / คู่</option><option value="athletics">กรีฑา</option></select></label>
          <label><span className={labelClass}>เพศ</span><select name="gender_rule" className={inputClass}><option>รวม</option><option>ชาย</option><option>หญิง</option><option>ผสม</option></select></label>
          <label><span className={labelClass}>รุ่น / ระดับชั้น</span><select name="level_rule" className={inputClass}><option>ไม่จำกัด</option><option>ม.ต้น</option><option>ม.ปลาย</option><option>ม.1</option><option>ม.2</option><option>ม.3</option><option>ม.4</option><option>ม.5</option><option>ม.6</option></select></label>
          <label><span className={labelClass}>รูปแบบแข่งขัน</span><select name="competition_format" className={inputClass}><option value="league">แบ่งสาย / พบกันหมด</option><option value="knockout">แพ้คัดออก</option><option value="time">จับเวลา</option><option value="distance">วัดระยะ</option><option value="points">สะสมคะแนน</option><option value="manual">กำหนดผลโดยกรรมการ</option></select></label>
          <label><span className={labelClass}>จำนวนนักกีฬาสูงสุดต่อทีม</span><input name="max_athletes_per_entry" type="number" min="1" className={inputClass} placeholder="ไม่จำกัด" /></label>
          <label><span className={labelClass}>คะแนนชนะ</span><input name="points_win" type="number" min="0" defaultValue="3" className={inputClass} /></label>
          <label><span className={labelClass}>คะแนนเสมอ / แพ้</span><div className="flex gap-2"><input name="points_draw" type="number" min="0" defaultValue="1" className={inputClass} /><input name="points_loss" type="number" min="0" defaultValue="0" className={inputClass} /></div></label>
          <label className="md:col-span-3"><span className={labelClass}>สนามแข่งขัน (ถ้ากำหนดแล้ว)</span><input name="venue_name" className={inputClass} placeholder="ชื่อสนาม" /></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกรายการแข่งขัน"}</button></div>
      </form>
    );

    if (tab === "entries" && canManageSchool && !loading) return (
      <form key={editEntry?.id || "new-roster"} className={formShell} onSubmit={addEntry} noValidate>
        {activeRegistrationSport && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-blue-800"><Link href={`/group-sports/${activeRegistrationSport.key}`} target={registrationEmbed ? "_top" : undefined}>← กลับระบบ{activeRegistrationSport.name}</Link><a href="/group-sports?section=registration" target={registrationEmbed ? "_top" : undefined} className="underline">เลือกกีฬาอื่น</a></div>}
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">{activeRegistrationSport ? `ลงทะเบียนนักกีฬา · ${activeRegistrationSport.name}` : "ลงทะเบียนทีม / นักกีฬา"}</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className={labelClass}>รายการแข่งขัน *</span><select name="event_id" required disabled={rosterImportBusy} className={inputClass} value={eventChoice} onChange={e=>{
            const id=e.target.value;
            setRosterFileError(""); setRosterImportPreview(null); setRegistrationError("");
            // Separate competitions should never inherit another event's roster.
            if (id !== eventChoice && !editEntry) {
              setPlayers(isRov(events.find(item=>item.id===id))
                ? Array.from({length:5},(_,i)=>({...blankPlayer(),team_role:i===0?"หัวหน้าทีม":"ตัวจริง"}))
                : [blankPlayer()]);
              setCoaches([{name:"",phone:""}]);
              setPhotoFiles({});
            }
            setEventChoice(id);
          }}><option value="" disabled>เลือกรายการแข่งขัน</option>{registrationEvents.filter(item => (!editEntry || item.id===editEntry.event_id) && !isFootball(item) && !isFutsal(item) && !isBasketball(item) && !isVolleyball(item) && !isTakraw(item) && !isTableTennis(item)).map(item => <option key={item.id} value={item.id}>{item.sport_name}{!acceptsNewEntries(item) ? ` · ${statusLabel(item.status)}` : ""}</option>)}</select></label>
          {!registrationEvents.length && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{activeRegistrationSport ? `ยังไม่พบรายการ${activeRegistrationSport.name}ในฐานข้อมูล` : "ยังไม่พบรายการแข่งขันของภูลังกาเกมส์ 2569 ในฐานข้อมูล กรุณาตรวจสอบการนำเข้ารายการแข่งขันและรหัสการแข่งขัน (slug)"}</p>}
          <label><span className={labelClass}>โรงเรียน *</span><select name="school_id" required className={inputClass} onChange={()=>{auditRevision.current++;setRosterAudit([]);}} defaultValue={editEntry?.school_id||(entrySchools.length===1?entrySchools[0].id:"")}><option value="" disabled>เลือกโรงเรียน</option>{entrySchools.filter(s=>!editEntry||s.id===editEntry.school_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {chosenEvent && !editEntry && !acceptsNewEntries(chosenEvent) && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">
            รายการนี้ยังไม่เปิดรับสมัคร {rosterAdmin && <button type="button" onClick={() => { setScheduleView("events"); setTab("schedule"); setFormOpen(false); }} className="font-bold underline">ไปที่จัดการแข่งขัน → รายการแข่งขัน เพื่อเปลี่ยนสถานะเป็น “เปิดรับสมัคร”</button>}
          </div>}
          <div className="space-y-2 md:col-span-2">
            <div>
              <p className="text-sm font-black text-slate-900">ครูผู้ควบคุมทีม / นักกีฬา</p>
              <p className="mt-1 text-xs text-slate-600">เพิ่มครูผู้ควบคุมได้หลายคนทุกประเภทกีฬา โดยระบุชื่อและเบอร์โทรศัพท์ของครูแต่ละคน ส่วนชื่อทีม/นักกีฬาระบบจะกำหนดจากโรงเรียนหรือรายชื่อนักกีฬาอัตโนมัติ</p>
            </div>
            {coaches.map((coach,i)=><div key={i} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
              <label><span className={labelClass}>{isTakraw(chosenEvent) ? (["ผู้จัดการทีม","ผู้ฝึกสอน","ผู้ช่วยผู้ฝึกสอน"][i] || `เจ้าหน้าที่คนที่ ${i+1}`) : `ครูผู้ควบคุมทีม คนที่ ${i+1}`} *</span><input className={inputClass} required value={coach.name} onChange={e=>setCoaches(rows=>rows.map((c,j)=>i===j?{...c,name:e.target.value}:c))}/></label>
              <label><span className={labelClass}>เบอร์โทรศัพท์ *</span><input className={inputClass} type="tel" required value={coach.phone} onChange={e=>setCoaches(rows=>rows.map((c,j)=>i===j?{...c,phone:e.target.value}:c))}/></label>
              <button type="button" disabled={coaches.length<=1} title={coaches.length<=1?"ต้องมีครูผู้ควบคุมทีมอย่างน้อย 1 คน":"ลบครูผู้ควบคุมทีมคนนี้"} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={()=>setCoaches(rows=>rows.length>1?rows.filter((_,j)=>i!==j):rows)}>ลบครูคนที่ {i+1}</button>
            </div>)}
            <button type="button" className="rounded-lg bg-rose-50 p-2 font-bold text-red-800" disabled={isTakraw(chosenEvent)&&coaches.length>=3} onClick={()=>setCoaches(rows=>[...rows,{name:"",phone:""}])}>＋ เพิ่มครูผู้ควบคุมทีม</button>
          </div>
        </div>
        <div className="my-4 flex items-center justify-between"><strong>รายชื่อนักกีฬา · {players.filter(p=>p.full_name.trim()).length} คน {isRov(chosenEvent)?"(ตัวจริง 5 คน · ตัวสำรองเพิ่มได้ 0–2 คน ไม่บังคับ)":chosenEvent && supportsIndividualBatch(chosenEvent)?"(แยกใบสมัครคนละ 1 คน สูงสุด 100 คน/ครั้ง)":chosenEvent?.max_athletes_per_entry?`/ ${chosenEvent.max_athletes_per_entry} คน`:""}</strong>
        <button type="button" className="rounded-lg bg-rose-50 p-2 font-bold text-red-800" disabled={isRov(chosenEvent)?players.length>=7:chosenEvent&&supportsIndividualBatch(chosenEvent)?players.length>=100:!!chosenEvent?.max_athletes_per_entry&&players.length>=chosenEvent.max_athletes_per_entry} onClick={()=>setPlayers(rows=>[...rows,{...blankPlayer(),team_role:isRov(chosenEvent)?"ตัวสำรอง":undefined}])}>＋ เพิ่มนักกีฬา</button></div>
        <div className="mb-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-slate-800">นำเข้ารายชื่อนักกีฬาจาก Excel</p>
              <p className="mt-1 text-xs text-slate-600">1. เลือกรายการแข่งขัน  2. ดาวน์โหลดเทมเพลตเฉพาะรายการ  3. กรอกชื่อใน Excel  4. อัปโหลดและตรวจสอบ</p>
            </div>
            <button type="button" disabled={!chosenEvent || busy || rosterImportBusy} onClick={() => {
              if (!chosenEvent) return;
              setError("");
              void downloadRosterTemplate(chosenEvent).catch((err:unknown)=>setError(err instanceof Error ? err.message : "ดาวน์โหลดเทมเพลตไม่สำเร็จ"));
            }} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              ↓ ดาวน์โหลดเทมเพลต Excel
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="block flex-1 text-sm font-semibold text-slate-700">อัปโหลดไฟล์รายชื่อนักกีฬา (.xlsx, .xls)
              <input key={eventChoice} type="file" accept=".xlsx,.xls" disabled={!chosenEvent || busy || rosterImportBusy} className="mt-1 block w-full cursor-pointer rounded-xl border border-rose-200 bg-white p-2.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:font-bold file:text-red-800 disabled:opacity-50" onChange={(ev) => {
                const file = ev.currentTarget.files?.[0];
                ev.currentTarget.value = ""; // Permit selecting the same file after correction.
                if (!file || !chosenEvent) return;
                setRosterFileError(""); setRosterImportPreview(null);
                setRosterImportBusy(true); setError("");
                void readRosterExcel(file,chosenEvent).then(athletes=>{
                  setRosterImportPreview({fileName:file.name,athletes});
                 }).catch((err:unknown)=>{
                    setRosterFileError(file.name + " — " + (err instanceof Error ? err.message : "อ่านไฟล์ Excel ไม่สำเร็จ"));
                  })
                  .finally(()=>setRosterImportBusy(false));
              }}/>
            </label>
            <p className="text-xs text-slate-500">รองรับไฟล์ไม่เกิน 5 MB · ไม่รวมข้อมูลชั้นและเพศ · ยังไม่บันทึกลงฐานข้อมูล</p>
          </div>
          {rosterFileError && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{rosterFileError}</p>}
          {rosterImportBusy && <p role="status" className="mt-3 text-sm font-semibold text-red-700">กำลังตรวจสอบรายชื่อในไฟล์...</p>}
          {rosterImportPreview && <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-emerald-800">พบ {rosterImportPreview.athletes.length} คน · {rosterImportPreview.fileName}</p>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={()=>setRosterImportPreview(null)}>ยกเลิก</button>
                <button type="button" disabled={busy} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>{
                  setPlayers(rosterImportPreview.athletes);
                  setPhotoFiles({});
                  setRosterFileError(""); setRosterImportPreview(null);
                  setNotice("นำเข้ารายชื่อนักกีฬาในแบบฟอร์มแล้ว กรุณาตรวจสอบอีกครั้งและกดส่งข้อมูลลงทะเบียนเพื่อบันทึก");
                }}>ใช้รายชื่อ {rosterImportPreview.athletes.length} คนแทนรายชื่อในฟอร์ม</button>
              </div>
            </div>
            <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">ลำดับ</th><th className="p-2">รหัสนักเรียน</th><th className="p-2">ชื่อ–สกุล</th>{isRov(chosenEvent)&&<th className="p-2">บทบาท / IGN</th>}</tr></thead>
                <tbody>{rosterImportPreview.athletes.map((athlete,i)=><tr key={i} className="border-t border-slate-100"><td className="p-2">{i+1}</td><td className="p-2">{athlete.student_code||"-"}</td><td className="p-2">{athlete.prefix}{athlete.full_name}</td>{isRov(chosenEvent)&&<td className="p-2">{athlete.team_role} · {athlete.ign}</td>}</tr>)}</tbody></table>
            </div>
            <p className="mt-2 text-xs text-amber-800">การยืนยันจะเปลี่ยนเฉพาะรายชื่อนักกีฬาในแบบฟอร์ม ไม่เปลี่ยนโรงเรียน รายการแข่งขัน หรือครูผู้ควบคุมทีม</p>
          </div>}
          {chosenEvent && <p className="mt-3 text-xs text-amber-800">หมายเหตุ: โรงเรียนต้องตรวจสอบคุณสมบัตินักกีฬาให้ตรงตามประเภท {chosenEvent.gender_rule} / รุ่น {chosenEvent.level_rule} ก่อนส่งข้อมูล</p>}
        </div>
        {players.map((player,i)=><div key={i} className="mb-2 rounded-xl bg-slate-50 p-3">
          <div className="grid items-end gap-3 sm:grid-cols-[auto_minmax(120px,1fr)_minmax(0,3fr)]">
            <strong className="pb-2">คนที่ {i+1}</strong>
            <label className="text-xs">รหัสนักเรียน<input className={inputClass} value={player.student_code||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,student_code:e.target.value}:p))}/></label>
            <div className="grid grid-cols-[minmax(120px,1fr)_minmax(0,2fr)] items-end gap-2">
              <label className="text-xs">คำนำหน้าชื่อ *<select required className={inputClass} value={player.prefix||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,prefix:e.target.value}:p))}><option value="">เลือกคำนำหน้า</option>{namePrefixes.map(title=><option key={title}>{title}</option>)}</select></label>
              <label className="text-xs">ชื่อ–สกุล *<input className={inputClass} required value={player.full_name||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,full_name:e.target.value}:p))}/></label>
            </div>
          </div>
          {isRov(chosenEvent) && <div className="grid gap-2 sm:col-span-full sm:grid-cols-3">
            <label className="text-xs">บทบาทในทีม *<select className={inputClass} required value={player.team_role||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,team_role:e.target.value}:p))}><option value="">เลือกบทบาท</option>{["หัวหน้าทีม","ตัวจริง","ตัวสำรอง"].map(r=><option key={r}>{r}</option>)}</select></label>
            <label className="text-xs">ชื่อในเกม (IGN) *<input required className={inputClass} value={player.ign||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,ign:e.target.value}:p))}/></label>
            <label className="text-xs">ตำแหน่งที่เล่น<select className={inputClass} value={player.play_position||""} onChange={e=>setPlayers(rows=>rows.map((p,j)=>j===i?{...p,play_position:e.target.value}:p))}><option value="">ไม่ระบุ</option>{ROV_PLAY_POSITIONS.map(r=><option key={r}>{r}</option>)}</select></label>
          </div>}
          {showPhotoInput && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-white p-3">
            <span className="text-xs font-bold text-red-900">รูปถ่ายนักกีฬา (ไม่บังคับ)</span>
            <label className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-red-900">
              {photoFiles[i] ? "เปลี่ยนรูป" : "เลือกรูป JPG / PNG / WebP"}
              <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                try { verifyPhotoFile(file); setRegistrationError(""); setPhotoFiles(previous => ({ ...previous, [i]: file })); }
                catch (cause) { setRegistrationError(cause instanceof Error ? cause.message : "ไฟล์รูปไม่ถูกต้อง"); }
              }}/>
            </label>
            {photoFiles[i] && <SelectedAthletePhoto file={photoFiles[i]}/>}
            {photoFiles[i] && <span className="text-xs text-emerald-800">เลือกแล้ว: {photoFiles[i].name} (จะอัปโหลดหลังบันทึกใบสมัคร)</span>}
            {photoFiles[i] && <button type="button" className="text-xs font-bold text-red-700 underline" onClick={()=>setPhotoFiles(previous=>{ const next = {...previous}; delete next[i]; return next; })}>นำรูปออก</button>}
          </div>}
          <button type="button" disabled={players.length===1} className="mt-2 rounded-lg px-2 py-1 text-sm font-bold text-red-700 hover:bg-red-50" onClick={()=>{
            setPlayers(rows=>rows.filter((_,j)=>j!==i));
            setPhotoFiles(previous=>Object.fromEntries(Object.entries(previous).filter(([key])=>Number(key)!==i).map(([key,file])=>[Number(key)>i?Number(key)-1:Number(key),file])));
          }}>ลบ</button>
        </div>)}
        <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <h4 className="font-black">ตรวจความครบถ้วนก่อนส่ง</h4>
          <p className="mt-1">ชื่อและคำนำหน้าครบ {players.filter(p=>p.full_name.trim() && namePrefixes.includes((p.prefix||"").trim())).length}/{players.length} คน{showPhotoInput && <> · เลือกรูปใหม่ {Object.keys(photoFiles).length}/{players.length} คน (รูปไม่บังคับ{editEntry?" · ไม่รวมรูปเดิม":""})</>}</p>
          {duplicateNames(players.map(p=>p.full_name)).length>0 && <p className="mt-2 font-bold text-amber-900">พบชื่อที่อาจซ้ำในฟอร์ม โปรดตรวจสอบก่อนส่ง</p>}
          <button type="button" disabled={auditBusy||busy||rosterImportBusy} onClick={e=>{const form=e.currentTarget.form;if(form)void auditRegistration(form);}} className="mt-3 rounded-lg border border-blue-300 bg-white px-4 py-2 font-bold text-blue-900 disabled:opacity-50">{auditBusy?"กำลังตรวจสอบ…":"ตรวจรายชื่อซ้ำ / เวลาแข่งขัน"}</button>
          {rosterAudit.length>0&&<ul className="mt-3 list-disc space-y-1 pl-5" role="status">{rosterAudit.map((message,i)=><li key={i}>{message}</li>)}</ul>}
          <p className="mt-2 text-xs text-slate-600">ผลตรวจเป็นคำเตือนเบื้องต้น ไม่เปลี่ยนสิทธิ์หรือสถานะใบสมัคร</p>
        </section>
        {registrationError && <div id="sports-registration-error" role="alert" tabIndex={-1} className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">
          <strong className="block">ยังส่งข้อมูลลงทะเบียนไม่ได้</strong>{registrationError}
        </div>}
        {!editEntry && chosenEvent && !acceptsNewEntries(chosenEvent) && <p className="mt-3 text-sm font-medium text-amber-800">รายการนี้ยังไม่เปิดรับสมัคร ต้องให้ผู้ดูแลเปลี่ยนสถานะเป็น “เปิดรับสมัคร” ก่อน</p>}
        {rosterImportPreview && <p className="mt-3 text-sm font-medium text-amber-800">ตรวจ Excel แล้วต้องกด “ใช้รายชื่อ … คนแทนรายชื่อในฟอร์ม” ก่อนบันทึก</p>}
        <div className="mt-4 flex justify-end"><button type="submit" disabled={busy || auditBusy || rosterImportBusy || !!rosterImportPreview || (!editEntry && !!chosenEvent && !acceptsNewEntries(chosenEvent))} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : chosenEvent && supportsIndividualBatch(chosenEvent) && players.length > 1 ? `ส่งข้อมูลลงทะเบียน ${players.length} คน` : "ส่งข้อมูลลงทะเบียน"}</button></div>
      </form>
    );

    if (tab === "matches" && canManageCompetition) return (
      <form className={formShell} onSubmit={addMatch}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">เพิ่มโปรแกรมการแข่งขัน</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="md:col-span-2"><span className={labelClass}>รายการแข่งขัน *</span><select name="event_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกรายการแข่งขัน</option>{events.filter((item) => item.event_type === "team" && !isFutsal(item) && !isBasketball(item) && !isVolleyball(item) && !isTakraw(item) && !isPetanque(item)).map((item) => <option key={item.id} value={item.id}>{item.sport_name}</option>)}</select></label>
          <label><span className={labelClass}>รหัสแมตช์</span><input name="match_number" className={inputClass} placeholder="เช่น FB-001" /></label>
          <label><span className={labelClass}>โรงเรียน A *</span><select name="school_a_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกโรงเรียน</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className={labelClass}>โรงเรียน B *</span><select name="school_b_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกโรงเรียน</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className={labelClass}>สาย</span><input name="group_name" className={inputClass} placeholder="สาย A" /></label>
          <label><span className={labelClass}>รอบการแข่งขัน</span><select name="round_name" className={inputClass}><option>รอบแบ่งกลุ่ม</option><option>รอบก่อนรองชนะเลิศ</option><option>รอบรองชนะเลิศ</option><option>รอบชิงชนะเลิศ</option></select></label>
          <label><span className={labelClass}>วันและเวลา</span><input name="scheduled_at" type="datetime-local" className={inputClass} /></label>
          <label><span className={labelClass}>สนามแข่งขัน</span><input name="venue_name" className={inputClass} placeholder="สนาม" /></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกโปรแกรม"}</button></div>
      </form>
    );

    if (tab === "standings" && canRecordResults) return (
      <form className={formShell} onSubmit={saveEventResult}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">บันทึกผลกีฬาเดี่ยว / กรีฑา</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2"><span className={labelClass}>รายการแข่งขัน *</span><select name="event_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกรายการเดี่ยว / กรีฑา</option>{events.filter((item) => item.event_type !== "team").map((item) => <option key={item.id} value={item.id}>{item.sport_name}</option>)}</select></label>
          <label className="md:col-span-2"><span className={labelClass}>ผู้เข้าแข่งขัน *</span><select name="entry_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกทีม / นักกีฬา</option>{entries.filter((entry) => entry.status === "approved" && eventById.get(entry.event_id)?.event_type !== "team").map((entry) => <option key={entry.id} value={entry.id}>{eventById.get(entry.event_id)?.sport_name} · {schoolById.get(entry.school_id)?.name} · {entry.entry_name}</option>)}</select></label>
          <label><span className={labelClass}>อันดับ</span><input name="rank" type="number" min="1" step="1" className={inputClass} placeholder="เช่น 1" /></label>
          <label><span className={labelClass}>สถิติ</span><input name="performance_value" type="number" min="0" step="0.001" className={inputClass} placeholder="เช่น 12.45" /></label>
          <label><span className={labelClass}>หน่วย</span><input name="performance_unit" className={inputClass} placeholder="วินาที / เมตร / คะแนน" /></label>
          <label><span className={labelClass}>หมายเหตุผล</span><input name="result_text" className={inputClass} placeholder="เช่น ผ่านเข้ารอบ" /></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกผลรายบุคคล"}</button></div>
      </form>
    );

    if (tab === "medals" && canManageCompetition) return (
      <form className={formShell} onSubmit={addMedal}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">บันทึกเหรียญรางวัล</h3><button type="button" onClick={close} className="text-sm text-slate-500">ปิด ✕</button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label><span className={labelClass}>รายการแข่งขัน *</span><select name="event_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกรายการ</option>{events.map((item) => <option key={item.id} value={item.id}>{item.sport_name}</option>)}</select></label>
          <label><span className={labelClass}>โรงเรียนที่ได้รับรางวัล *</span><select name="school_id" required className={inputClass} defaultValue=""><option value="" disabled>เลือกโรงเรียน</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className={labelClass}>ประเภทเหรียญ</span><select name="medal_type" className={inputClass}><option value="gold">เหรียญทอง</option><option value="silver">เหรียญเงิน</option><option value="bronze">เหรียญทองแดง</option></select></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกเหรียญ"}</button></div>
      </form>
    );

    return null;
  };

  // Open the registration form directly from the registration menu.
  // Reset only when starting a new registration, not when re-clicking the
  // already-open tab (which might otherwise discard unsaved form input).

  async function exportRegistrations() {
    if (!competition || exportingEntries) return;
    setExportingEntries(true); setError(""); setNotice("");
    try {
      const {data,error} = await supabase.rpc("sports_registration_excel",{p_comp:competition.id});
      if (error) throw new Error(error.code === "PGRST202" ? "ยังไม่ได้ติดตั้ง SQL 053 สำหรับดาวน์โหลดทะเบียน" : error.message);
      if (!Array.isArray(data?.entries)) throw new Error("อ่านทะเบียนไม่ครบ กรุณาดาวน์โหลดใหม่");
      const {downloadRegistrationExcel} = await import("@/lib/group-sports/registration-excel");
      downloadRegistrationExcel(data);
      setNotice(`ดาวน์โหลด Excel แล้ว · ${data.entries.length} ใบสมัคร`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ดาวน์โหลดทะเบียนไม่สำเร็จ");
    } finally { setExportingEntries(false); }
  }
  const openNewRegistration = () => {
    setEditEntry(null);
    setDetail(null);
    setRosterError("");
    setRosterFileError(""); setRosterImportPreview(null);setPhotoFiles({});
    setPlayers([blankPlayer()]);
    setCoaches([{name:"",phone:""}]);
    setEventChoice("");
    setFormOpen(true);
  };

  const headerAction = () => {
    if (tab === "schools" && (isDemo || isAdmin)) return <button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">＋ เพิ่มโรงเรียน</button>;
    if (tab === "events" && canManageCompetition) return <button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">＋ เพิ่มรายการ</button>;
    if (tab === "matches" && canManageCompetition) return <button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">＋ เพิ่มคู่แข่งขัน</button>;
    if (tab === "standings" && canRecordResults) return <button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">＋ บันทึกผลเดี่ยว / กรีฑา</button>;
    if (tab === "medals" && canManageCompetition) return <button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">＋ บันทึกเหรียญ</button>;
    return null;
  };

  const goToSportsSection = (key: string) => {
    closeSystemMenu();
    setSportsMenuOpen(false);
    setSchoolInfoMenuOpen(false);
    setFormOpen(false);
    if (key === "news") { setSchoolInfoSection("announcements"); setTab("school_info"); }
    else if (key === "program") { setScheduleView("schedule"); setTab("schedule"); }
    else if (key === "general") { setSchoolInfoSection("submission"); setTab("school_info"); }
    else if (key === "sports") { setScheduleView("schedule"); setTab("schedule"); }
    else if (key === "register") { setRegistrationScope(null); setListSport("");setEventFilter("");setDetail(null);setTab("entries"); }
    else if (key === "about") { setTab("about"); }
    else { setTab(key as TabKey); }
    setError("");
  };

  if (registrationScope === "table-tennis" && tab === "entries") {
    return <main className="p-6"><Link href="/group-sports/table-tennis?tab=registration" target={registrationEmbed?"_top":undefined} className="font-bold text-blue-800 underline">เปิดแบบฟอร์มเทเบิลเทนนิสเฉพาะกีฬา →</Link></main>;
  }
  if (registrationScope === "takraw" && tab === "entries") {
    return <main className="p-6"><Link href="/group-sports/takraw?tab=registration" target={registrationEmbed?"_top":undefined} className="font-bold text-blue-800 underline">เปิดแบบฟอร์มเซปักตะกร้อเฉพาะกีฬา →</Link></main>;
  }
  if (registrationScope === "volleyball" && tab === "entries") {
    return <main className="p-6"><Link href="/group-sports/volleyball?tab=registration" target={registrationEmbed?"_top":undefined} className="font-bold text-blue-800 underline">เปิดแบบฟอร์มวอลเลย์บอลเฉพาะกีฬา →</Link></main>;
  }
  if (registrationEmbed) {
    return (
      <main className="min-h-screen bg-[#eaf5ed] p-3 text-[#07123d] sm:p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">PHAYAO GAMES 2026 · REGISTRATION</p>
              <h1 className="mt-1 text-xl font-black">{activeRegistrationSport ? `ลงทะเบียนนักกีฬา · ${activeRegistrationSport.name}` : "ศูนย์ลงทะเบียนนักกีฬา"}</h1>
              <p className="mt-1 text-xs text-slate-600">บันทึกใบสมัครผ่านระบบกลางเดิม · ตรวจสอบรายชื่อและเอกสารที่สนามแข่งขันจริง</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeRegistrationSport && <Link href={`/group-sports/${activeRegistrationSport.key}`} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50">กลับหน้าจัดการกีฬา</Link>}
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">รับข้อมูลแล้ว {receivedEntries} ใบสมัคร</span>
            </div>
          </header>

          {loading ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">กำลังโหลดข้อมูลการแข่งขันและสิทธิ์โรงเรียน...</section>
          ) : !canManageSchool ? (
            <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-[#07123d]">เข้าสู่ระบบโรงเรียนก่อนลงทะเบียน</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">หากต้องการลงทะเบียนนักกีฬา กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนที่ได้รับสิทธิ์ในการแข่งขันนี้</p>
              <Link href="/group-sports/login" className="mt-4 inline-flex rounded-xl bg-[#0755ce] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">เข้าสู่ระบบโรงเรียน →</Link>
            </section>
          ) : (
            <>
              {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}
              {!formOpen && <div className="flex justify-end"><button type="button" onClick={openNewRegistration} className="rounded-xl bg-[#0755ce] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">＋ ลงทะเบียนรายการใหม่</button></div>}
              {renderForm()}

              <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black">ใบสมัครที่ส่งแล้ว · {activeRegistrationSport?.name || "ทุกประเภทกีฬา"}</h2>
                    <p className="mt-1 text-xs text-slate-500">แสดงเฉพาะใบสมัครที่บัญชีโรงเรียนนี้มีสิทธิ์เข้าถึง</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{registrationRows.length} ใบสมัคร</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {registrationRows.map(entry => (
                    <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <strong>{schoolById.get(entry.school_id)?.name || "โรงเรียน"} · {entry.entry_name}</strong>
                        <p className="mt-1 text-sm text-slate-600">{eventById.get(entry.event_id)?.sport_name || "รายการแข่งขัน"} · {entry.coach_name || "ไม่ระบุครูผู้ควบคุม"} · {entry.athlete_count} คน</p>
                        <p className="mt-1 text-xs font-bold text-emerald-800">{statusLabel(entry.status)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => void openRoster(entry)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 disabled:opacity-50">ดูรายชื่อ</button>
                        {!isDemo && <Link href={`/group-sports/print?entry=${encodeURIComponent(entry.id)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#0755ce] px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">พิมพ์ใบสมัคร</Link>}
                      </div>
                    </article>
                  ))}
                  {!registrationRows.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">ยังไม่มีใบสมัครของกีฬาประเภทนี้</p>}
                </div>
                {rosterError && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{rosterError}</div>}
                {detail && <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>รายชื่อนักกีฬา · {detail.entry.entry_name}</strong>
                    <button type="button" onClick={() => setDetail(null)} className="text-sm font-bold text-blue-800 underline">ปิดรายชื่อ</button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{detail.entry.coach_name || "ไม่ระบุครูผู้ควบคุม"}</p>
                  <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm">{detail.players.map((player, index) => <li key={`${player.student_code || player.full_name}-${index}`}>{[player.student_code, player.full_name].filter(Boolean).join(" · ")}</li>)}</ol>
                  {!isDemo && canManageSchool && !isVolleyball(eventById.get(detail.entry.event_id)) && allowsRegistrationPhotos(eventById.get(detail.entry.event_id)) && <div className="mt-4"><AthletePhotoManager entryId={detail.entry.id} athletes={detail.players} /></div>}
                </section>}
              </section>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="sports-games-shell min-h-screen text-slate-900">
      <header className="sports-games-masthead">
        <div className="sports-games-topbar" aria-label="เมนูหลักภูลังกาเกมส์">
          <button type="button" className="sports-games-logo" onClick={()=>goToSportsSection("overview")} aria-label="ภูลังกาเกมส์ — หน้าหลัก">
            <img src="/images/group-sports/phulangka-30.webp" alt="ภูลังกาเกมส์ ครั้งที่ 30" />
          </button>
          <nav ref={schoolInfoNavRef} aria-label="เมนูกีฬากลุ่ม" data-menu-version="33.12-text-only-existing-tabs" className="sports-games-unified-nav">
          <div data-sports-nav-items className="sports-games-unified-items">
            {tabs.filter((item) => item.key !== "accounts" || canManageAccounts).map((item) => {
              const isSportsGroup = item.key === "sports";
              const isSchoolInfoGroup = item.key === "school_info";
              const isActive = isSportsGroup
                ? sportsMenuOpen || (!schoolInfoMenuOpen && sportsSubTabs.some((sub) => sub.key === tab))
                : isSchoolInfoGroup
                  ? schoolInfoMenuOpen || (!sportsMenuOpen && (tab === "school_info" || tab === "submissions"))
                  : !sportsMenuOpen && !schoolInfoMenuOpen && tab === item.key;
              return (
                <button
                  key={item.key}
                  ref={isSchoolInfoGroup ? schoolInfoTriggerRef : isSportsGroup ? sportsTriggerRef : undefined}
                  type="button"
                  aria-current={isActive && !isSportsGroup && !isSchoolInfoGroup ? "page" : undefined}
                  aria-pressed={isActive}
                  data-selected={isActive ? "true" : "false"}
                  aria-expanded={isSportsGroup ? sportsMenuOpen : isSchoolInfoGroup ? schoolInfoMenuOpen : undefined}
                  aria-controls={isSportsGroup ? "sports-management-submenu" : isSchoolInfoGroup ? "school-information-submenu" : undefined}
                  onClick={() => {
                    closeSystemMenu();
                    if (isSchoolInfoGroup) {
                      alignGroupDropdown("school_info");
                      setSportsMenuOpen(false);
                      if (tab !== "school_info" && tab !== "submissions") {
                        setTab("school_info");
                        setSchoolInfoSection("submission");
                        setFormOpen(false);
                        setError("");
                        setSchoolInfoMenuOpen(true);
                      } else {
                        setSchoolInfoMenuOpen(open => !open);
                      }
                      return;
                    }
                    if (isSportsGroup) {
                      alignGroupDropdown("sports");
                      setSchoolInfoMenuOpen(false);
                      // Opening from another section must also change the content:
                      // otherwise the old page (e.g. โรงเรียน) stays visible beneath the menu.
                      const alreadyInSports = sportsSubTabs.some((sub) => sub.key === tab);
                      if (!alreadyInSports) {
                        setTab("schedule");
                        setScheduleView("schedule");
                        setFormOpen(false);
                        setError("");
                        setSportsMenuOpen(true);
                      } else {
                        // Once inside the group, a second click only opens/closes its submenu.
                        setSportsMenuOpen((open) => !open);
                      }
                      return;
                    }
                    setSportsMenuOpen(false);
                    setSchoolInfoMenuOpen(false);
                    if (item.key === "entries") {
                      // The main registration menu opens the sport hub; keep any active form intact on repeated clicks.
                      if (tab !== "entries" || registrationScope) {
                        setRegistrationScope(null);setListSport("");setEventFilter("");setFormOpen(false);setDetail(null);
                      }
                    } else {
                      setFormOpen(false);
                    }
                    setTab(item.key as TabKey);
                    setError("");
                  }}
                  className={`sports-games-main-item ${isActive ? "is-current" : ""}`}
                >
                  <span className="sports-games-main-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Submenus open below the unified topbar without a second card-menu strip. */}
          <div
            id="sports-management-submenu"
            aria-hidden={!sportsMenuOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${sportsMenuOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                style={{ marginLeft: sportsDropdownLeft }}
                className={`relative mt-3 w-[calc(100%-1rem)] max-w-[360px] transition-[transform,filter] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${sportsMenuOpen ? "translate-y-0 blur-0" : "-translate-y-2 blur-[3px]"}`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-3xl bg-rose-100/70 blur-xl" />
                <div ref={sportsPanelRef} role="group" aria-label="เลือกเมนูจัดการแข่งขัน" className="relative space-y-1 rounded-2xl border border-rose-100 bg-white/95 p-2 shadow-[0_10px_26px_rgba(88,30,35,0.09)]">
                  {sportsSubTabs.map((sub) => {
                    const selected = tab === sub.key;
                    return (
                      <button
                        key={sub.key}
                        type="button"
                        tabIndex={sportsMenuOpen ? 0 : -1}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => {
                          if (!sportsMenuOpen) return;
                          setTab(sub.key);
                          if (sub.key === "schedule") setScheduleView("schedule");
                          setSportsMenuOpen(false);
                          setSchoolInfoMenuOpen(false);
                          setFormOpen(false);
                          setError("");
                        }}
                        className={`group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-[background-color,color,transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 motion-reduce:transition-none ${selected ? "bg-rose-100 font-extrabold text-[#7f1d1d]" : "bg-white font-semibold text-slate-800 hover:bg-rose-50 hover:text-[#7f1d1d]"}`}
                      >
                        <span className="flex min-w-0 items-center gap-3"><sub.icon className="h-5 w-5 shrink-0 text-blue-800"/><span>{sub.label}</span></span>
                      </button>
                    );
                  })}
                  {canManageCertificates && <>
                    <Link href="/group-sports/results" tabIndex={sportsMenuOpen ? 0 : -1}
                      onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-left text-sm font-extrabold text-blue-900 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                      <span className="flex min-w-0 items-center gap-3"><TrophyIcon className="h-5 w-5 shrink-0 text-blue-800"/><span>บันทึกอันดับรางวัล</span></span>
                    </Link>
                  </>}
                  {(canManageCertificates || canAdminCertificates) && <Link href="/group-sports/test" tabIndex={sportsMenuOpen ? 0 : -1} onClick={()=>{setSportsMenuOpen(false);setSchoolInfoMenuOpen(false);}} className="flex min-h-12 items-center rounded-xl bg-amber-100 px-3 py-3 text-sm font-bold text-amber-950">ศูนย์ทดสอบระบบ (TEST)</Link>}
                  {canAdminCertificates && <>
                    <Link href="/group-sports/officials" tabIndex={sportsMenuOpen ? 0 : -1}
                      onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                      <span className="flex min-w-0 items-center gap-3"><span>มอบหมายกรรมการกีฬา</span></span>
                    </Link>
                    <Link href="/group-sports/admin" tabIndex={sportsMenuOpen ? 0 : -1}
                      onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-3 text-left text-sm font-extrabold text-red-900 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                      <span className="flex min-w-0 items-center gap-3"><span>Admin Full Control · แก้ไขทุกใบสมัคร</span></span>
                    </Link>
                    <Link href="/group-sports/results/corrections" tabIndex={sportsMenuOpen ? 0 : -1}
                      onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                      <span className="flex min-w-0 items-center gap-3"><span>แก้ไขผลหลังประกาศ (Admin)</span></span>
                    </Link>
                    <Link href="/group-sports/certificates/manage" tabIndex={sportsMenuOpen ? 0 : -1}
                      onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                      <span className="flex min-w-0 items-center gap-3"><span>จัดการเกียรติบัตรและตั้งค่า</span></span>
                    </Link>
                  </>}
                </div>
              </div>
            </div>
          </div>
          <div
            id="school-information-submenu"
            aria-hidden={!schoolInfoMenuOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${schoolInfoMenuOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                style={{ marginLeft: schoolInfoDropdownLeft }}
                className={`relative mt-3 w-[calc(100%-1rem)] max-w-[360px] transition-[transform,filter] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${schoolInfoMenuOpen ? "translate-y-0 blur-0" : "-translate-y-2 blur-[3px]"}`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-3xl bg-rose-100/70 blur-xl" />
                <div ref={schoolInfoPanelRef} role="group" aria-label="เมนูข้อมูลทั่วไป" className="relative space-y-1 rounded-2xl border border-rose-100 bg-white/95 p-2 shadow-[0_10px_26px_rgba(88,30,35,0.09)]">
                  {[{key:"submission" as const,label:"ส่งข้อมูลโรงเรียน (พิธีเปิด)"},...SCHOOL_INFORMATION_SECTIONS].map(option => {
                    const selected = schoolInfoSection === option.key && (tab === "school_info" || tab === "submissions");
                    return (
                      <button
                        type="button"
                        key={option.key}
                        tabIndex={schoolInfoMenuOpen ? 0 : -1}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => {
                          if (!schoolInfoMenuOpen) return;
                          setSchoolInfoSection(option.key);
                          setTab("school_info");
                          setSchoolInfoMenuOpen(false);
                          setSportsMenuOpen(false);
                          setFormOpen(false);
                          setError("");
                        }}
                        className={`group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-[background-color,color,transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 motion-reduce:transition-none ${selected ? "bg-rose-100 font-extrabold text-[#7f1d1d]" : "bg-white font-semibold text-slate-800 hover:bg-rose-50 hover:text-[#7f1d1d]"}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {selected && <span aria-hidden="true" className="h-5 w-[3px] rounded-full bg-rose-600" />}
                          <span>{option.label}</span>
                        </span>
                      </button>
                    );
                  })}
                  {canManageAccounts && <Link href="/group-sports/information/manage" tabIndex={schoolInfoMenuOpen ? 0 : -1}
                    onClick={() => { setSchoolInfoMenuOpen(false); setSportsMenuOpen(false); }}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border-t border-blue-100 bg-blue-50 px-3 py-3 text-left text-sm font-extrabold text-blue-900 hover:bg-blue-100">
                    <span>จัดการภาพและข้อความ (Admin)</span>
                  </Link>}
                  <button type="button" tabIndex={schoolInfoMenuOpen ? 0 : -1}
                    onClick={()=>goToSportsSection("about")}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-900">
                    <span>เกี่ยวกับงานและรายละเอียดการแข่งขัน</span>
                  </button>
                  {/* School printing is separate from the official management route. */}
                  <Link
                    href="/group-sports/certificates"
                    tabIndex={schoolInfoMenuOpen ? 0 : -1}
                    onClick={() => {
                      setSchoolInfoMenuOpen(false);
                      setSportsMenuOpen(false);
                    }}
                    className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-t border-rose-100 bg-white px-3 py-3 text-left text-sm font-extrabold text-[#7f1d1d] transition-[background-color,color,transform,box-shadow] duration-200 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 motion-reduce:transition-none"
                  >
                    <span className="flex min-w-0 items-center gap-2"><span>พิมพ์เกียรติบัตร (สำหรับโรงเรียน)</span></span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </nav>
          <details ref={systemMenuRef} className="sports-games-more">
            <summary aria-label={canAccessSystemMenu ? "เมนูระบบสำหรับผู้ได้รับสิทธิ์" : "เข้าสู่ระบบ"}
              onClick={() => { setSportsMenuOpen(false); setSchoolInfoMenuOpen(false); }}>
              {canAccessSystemMenu ? <span>เมนูระบบ</span> : <span>เข้าสู่ระบบ</span>}
            </summary>
            <div className="sports-games-more-list" onClick={(event) => {
              // Scrolling or clicking empty space in the panel must not close it.
              if (event.target instanceof Element && event.target.closest("a, button")) closeSystemMenu();
            }}>
              {canAccessSystemMenu ? <>
                {canManageCompetition && <button onClick={()=>goToSportsSection("sports")}>จัดการแข่งขัน / โปรแกรมแข่งขัน</button>}
                {canManageSchool && <button onClick={()=>goToSportsSection("register")}>ลงทะเบียน / แก้ไขใบสมัคร</button>}
                {canManageCompetition && <button onClick={()=>goToSportsSection("standings")}>ตารางคะแนน / ผลการแข่งขัน</button>}
                {canManageCompetition && <Link href="/group-sports/football">จัดการฟุตบอล</Link>}
                {canManageCompetition && <Link href="/group-sports/futsal">จัดการฟุตซอล</Link>}
                {canManageCompetition && <Link href="/group-sports/basketball">จัดการบาสเกตบอล</Link>}
                {canManageCompetition && <Link href="/group-sports/volleyball">จัดการวอลเลย์บอล</Link>}
                {canManageCompetition && <Link href="/group-sports/petanque">จัดการเปตอง</Link>}
                {canManageCompetition && <Link href="/group-sports/boxing">จัดการมวยสากลสมัครเล่น</Link>}
                <Link href="/group-sports/athletics">ระบบกรีฑา / รายงานตัว</Link>
                {canManageCompetition && <Link href="/group-sports/table-tennis">จัดการเทเบิลเทนนิส</Link>}
                {canManageCompetition && <Link href="/group-sports/takraw">จัดการเซปักตะกร้อ</Link>}
                {canManageCompetition && <Link href="/group-sports/esports">จัดการ E-Sport (RoV)</Link>}
                {canManageCertificates && <Link href="/group-sports/results">บันทึกอันดับรางวัล</Link>}
                {canAdminCertificates && <Link href="/group-sports/officials">มอบหมายกรรมการกีฬา</Link>}
                {canAdminCertificates && <Link href="/group-sports/admin">Admin Full Control</Link>}
                {canAdminCertificates && <Link href="/group-sports/results/corrections">แก้ไขผลหลังประกาศ</Link>}
                {canAdminCertificates && <Link href="/group-sports/certificates/manage">จัดการเกียรติบัตร</Link>}
                {canCentralPrint && <Link href="/group-sports/certificates/central">พิมพ์เกียรติบัตรส่วนกลาง</Link>}
                {canManageAccounts && <button onClick={()=>goToSportsSection("accounts")}>บัญชีโรงเรียน</button>}
                {canManageAccounts && <Link href="/group-sports/information/manage">จัดการภาพและข้อความพิธีเปิด</Link>}
                {(canManageCertificates || canAdminCertificates || canManageAccounts) && <Link href="/group-sports/test">ศูนย์ทดสอบระบบ (TEST)</Link>}
                {canManageAccounts && <Link href="/group-sports/reset">รีเซตข้อมูลจริง (ระวัง)</Link>}
                <Link href="/group-sports/certificates">พิมพ์เกียรติบัตรของโรงเรียน</Link>
                <button onClick={async()=>{await supabase.auth.signOut();window.location.assign("/group-sports/login");}}>ออกจากระบบ</button>
              </> : <>
                <Link href="/login">Admin / กรรมการ — เข้าสู่ระบบ Google</Link>
                <Link href="/group-sports/login">โรงเรียน — เข้าสู่ระบบลงทะเบียน</Link>
              </>}
            </div>
          </details>
        </div>
        {tab === "overview" ? <div>
          <h1 className="sr-only">กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</h1>
          <button type="button" style={{ display: "block", width: "100%", padding: 0, border: 0, cursor: "pointer" }} aria-label="ดูโปรแกรมวันนี้" onClick={() => goToSportsSection("program")}>
            <img src="/images/group-sports/group-sports-30-banner-v2.webp" width={2172} height={229} style={{ display: "block", width: "100%", height: "auto" }} alt="กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569" />
          </button>
        </div> : <div className="sports-games-inner-banner">
          <div><small>PHAYAO GAMES 2026</small><h1>กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา</h1><p>ระบบบริหารจัดการแข่งขัน ครั้งที่ 30 • ประจำปี 2569</p></div>
          <div className="sports-games-inner-actions">{headerAction()}<ParadeRouteShortcut competitionId={competition?.id ?? null} canManage={canManageAccounts}/></div>
        </div>}
      </header>

      <div className="w-full px-4 pb-12 md:px-8">


        {isDemo && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>โหมดสาธิต:</strong> ข้อมูลโรงเรียน รายการแข่งขัน และผลการแข่งขันที่แสดงเป็นข้อมูลสมมติ การเพิ่มหรือแก้ไขในโหมดนี้จะอยู่เฉพาะหน้าจอและไม่บันทึกลง Supabase กรุณาติดตั้ง SQL Migration ก่อนใช้งานจริง</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {renderForm()}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">กำลังโหลดข้อมูลการแข่งขัน...</div>
        ) : (
          <>
            {tab === "accounts" && (canManageAccounts ? <SchoolAccountsManager /> : (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-100 via-rose-100 to-rose-100 text-red-700">
                    <UserShieldIcon className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">เมนูบัญชีโรงเรียน</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">เมนูนี้ใช้สำหรับผู้ดูแลระบบในการสร้าง Username และ Password ให้โรงเรียนที่เข้าร่วมการแข่งขัน หากต้องการใช้งาน กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลหรือบัญชีกรรมการที่มีสิทธิ์จัดการการแข่งขัน</p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {userEmail ? <button type="button" onClick={async()=>{await supabase.auth.signOut();window.location.assign("/group-sports/login");}} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">ออกจากระบบแล้วเข้าสู่ระบบใหม่</button> : <Link href="/group-sports/login" className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:brightness-110">เข้าสู่ระบบผู้ดูแล</Link>}
                    <button type="button" onClick={() => setTab("overview")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">กลับหน้าหลัก</button>
                  </div>
                </div>
              </section>
            ))}
            {(tab === "submissions" || (tab === "school_info" && schoolInfoSection === "submission")) && <SchoolSubmissionsContent embedded />}
            {tab === "school_info" && schoolInfoSection !== "submission" && (isDemo
              ? (hasSchoolParadeReference(schoolInfoSection)
                  ? <section className="rounded-2xl border border-rose-100 bg-white p-4 sm:p-6"><SchoolParadeReference section={schoolInfoSection} /></section>
                  : <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">โหมดสาธิตยังไม่มีข้อมูลประชาสัมพันธ์จริง กรุณาเชื่อมต่อ Supabase</div>)
              : <SchoolInformationHub key={schoolInfoSection} competitionId={competition?.id ?? null} section={schoolInfoSection}
                  canManage={canManageAccounts} />)}
            {tab === "schedule" && <SportsScheduleContent key={scheduleView} embedded initialTab={scheduleView} />}
            {tab === "overview" && <SportsGamesHome
              schools={schools} events={events} matches={matches.filter(m=>!isFutsal(eventById.get(m.event_id)) && !isBasketball(eventById.get(m.event_id)) && !isVolleyball(eventById.get(m.event_id)) && !isTakraw(eventById.get(m.event_id)) && !isPetanque(eventById.get(m.event_id)) && !isTableTennis(eventById.get(m.event_id)) && !isBoxing(eventById.get(m.event_id)))} results={results}
              medals={medals} entries={entries} eventResults={eventResults}
              specialMatches={homeSpecialMatches}
              announcements={homeAnnouncements} athleteCount={homeAthleteCount}
              onNavigate={(destination)=>{
                if (destination === "announcements") goToSportsSection("news");
                else if (destination === "schedule") goToSportsSection("program");
                else if (destination === "entries") { goToSportsSection("register"); }
                else goToSportsSection(destination);
              }}
            />}

            {tab === "about" && <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-blue-950">เกี่ยวกับการแข่งขัน</h2>
              <p className="mt-3 text-base leading-8">กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p>
              <p className="text-sm text-slate-600">ติดตามโปรแกรมการแข่งขัน ผลการแข่งขัน และตารางเหรียญรางวัลจากข้อมูลที่กรรมการประกาศผ่านระบบ</p>
              <div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>goToSportsSection("program")} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white">ดูโปรแกรมแข่งขัน</button><button onClick={()=>goToSportsSection("schools")} className="rounded-xl border border-blue-200 px-4 py-2 font-bold text-blue-900">โรงเรียนที่เข้าร่วม</button></div>
            </section>}

            {tab === "schools" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">โรงเรียนที่เข้าร่วม</h2><p className="mt-1 text-sm text-slate-500">ทะเบียนโรงเรียนกลางสำหรับการแข่งขันระดับจังหวัด</p></div><span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-red-700">{schools.length} โรงเรียน</span></div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {schools.map((school) => (
                    <div key={school.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-rose-200 hover:shadow-sm">
                      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xl">🏫</span><div className="min-w-0"><h3 className="font-bold text-slate-900">{school.name}</h3><p className="mt-1 text-xs text-slate-500">{school.district || "ไม่ระบุอำเภอ"} · {school.province || "พะเยา"}</p><p className="mt-2 text-[11px] text-slate-400">รหัส {school.school_code || "ยังไม่กำหนด"}</p></div></div>
                      {competition && <SchoolDirectorEditor schoolId={school.id} schoolName={school.name} currentName={school.director_name || ""} competitionId={competition.id} canEdit={rosterAdmin || roles.some(role => role.role === "school_manager" && role.school_id === school.id && (!role.competition_id || role.competition_id === competition.id))} onSaved={() => void loadData()} />}
                    </div>
                  ))}
                </div>
                {!schools.length && <EmptyState title="ยังไม่มีโรงเรียนในทะเบียน" description="ผู้ดูแลการแข่งขันสามารถเพิ่มโรงเรียนที่เข้าร่วมได้" />}
              </section>
            )}

            {tab === "events" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">รายการแข่งขัน</h2><p className="mt-1 text-sm text-slate-500">กำหนดประเภทกีฬา เพศ รุ่น และรูปแบบการแข่งขัน</p></div><span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-red-700">{events.length} รายการ</span></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="pb-3 pr-3">รหัส</th><th className="pb-3 pr-3">รายการแข่งขัน</th><th className="pb-3 pr-3">ประเภท</th><th className="pb-3 pr-3">เพศ / รุ่น</th><th className="pb-3 pr-3">รูปแบบ</th><th className="pb-3">สถานะ</th></tr></thead><tbody>{events.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-3 text-xs font-semibold text-slate-500">{item.event_code || "-"}</td><td className="py-3 pr-3 font-bold text-slate-800">{item.sport_name}</td><td className="py-3 pr-3">{eventTypeLabel(item.event_type)}</td><td className="py-3 pr-3">{item.gender_rule} · {item.level_rule}</td><td className="py-3 pr-3 text-xs text-slate-500">{item.competition_format || "-"}</td><td className="py-3"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-red-700">{statusLabel(item.status)}</span></td></tr>)}</tbody></table></div>
                {!events.length && <EmptyState title="ยังไม่มีรายการแข่งขัน" description="เพิ่มรายการกีฬาและกำหนดรุ่นการแข่งขันก่อนเปิดรับสมัคร" />}
              </section>
            )}

            {tab === "entries" && (
              <section id="sports-saved-entries-list" className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div><h2 className="text-xl font-black text-slate-900">{activeRegistrationSport ? `ใบสมัคร · ${activeRegistrationSport.name}` : "ศูนย์ลงทะเบียนนักกีฬา"}</h2><p className="mt-1 text-sm text-slate-500">รับข้อมูลลงทะเบียนทันทีหลังส่งสำเร็จ · ตรวจตัวนักกีฬาและเอกสารหลักฐานที่สนามในวันแข่งขันจริง</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!formOpen && canManageSchool && (registrationScope || events.some(e=>!eventRegistrationSport(e))) && <button type="button" onClick={openNewRegistration} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800">＋ ลงทะเบียนรายการใหม่</button>}
                    {!isDemo && canManageSchool && !registrationScope && <button type="button" disabled={exportingEntries} onClick={()=>void exportRegistrations()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{exportingEntries ? "กำลังเตรียม Excel…" : rosterAdmin ? "ดาวน์โหลด Excel ทุกโรงเรียน" : "ดาวน์โหลด Excel ของโรงเรียน"}</button>}
                    {canManageAccounts && !registrationScope && <Link href="/group-sports/reset" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-red-900 hover:bg-rose-100">รีเซตข้อมูลจริง (ระวัง)</Link>}
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">รับข้อมูลแล้ว {receivedEntries} / {scopedSchoolEntries.length}</span>
                  </div>
                </div>
                {activeRegistrationSport ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900"><span>{activeRegistrationSport.icon} {activeRegistrationSport.name} · แสดงเฉพาะรายการแข่งขันและใบสมัครประเภทนี้</span><div className="flex flex-wrap gap-3"><Link href={`/group-sports/${activeRegistrationSport.key}`} className="rounded-lg bg-[#0755ce] px-3 py-2 text-white">กลับระบบกีฬา</Link><a href="/group-sports?section=registration" className="rounded-lg border border-blue-200 bg-white px-3 py-2">เลือกกีฬาอื่น</a></div></div> : <>
                  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน">
                    {REGISTRATION_SPORTS.map(sport=>{
                      const sportEvents=events.filter(e=>eventRegistrationSport(e)===sport.key);
                      const ids=new Set(sportEvents.map(e=>e.id));
                      const mine=schoolEntries.filter(e=>ids.has(e.event_id)&&(!schoolFilter||e.school_id===schoolFilter)&&!["withdrawn","cancelled"].includes(e.status));
                      return <a key={sport.key} href={registrationHref(sport)} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600">
                        <div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{backgroundColor:sport.color}}>{sport.icon}</span><div className="min-w-0"><h3 className="font-black text-[#07123d]">{sport.name}</h3><p className="text-xs text-slate-600">{sportEvents.length} รายการแข่งขัน</p></div></div>
                        {canManageSchool?<p className="text-xs text-slate-600">{mine.length} ใบสมัคร · {mine.reduce((n,e)=>n+(e.athlete_count||0),0)} รายชื่อ</p>:<p className="text-xs text-slate-600">เข้าสู่ระบบเพื่อดูใบสมัคร</p>}
                        <span className="mt-auto flex min-h-11 w-full items-center justify-center rounded-lg px-2 text-center text-sm font-bold" style={{backgroundColor:"#0755ce",color:"#fff"}}>ลงทะเบียนนักกีฬา →</span>
                      </a>;
                    })}
                  </div>
                  <p className="mb-4 text-xs text-slate-600">ยอดรายชื่อจากใบสมัครกลางที่บัญชีนี้อ่านได้ ตามโรงเรียนที่เลือก (นับซ้ำได้หากคนเดียวสมัครหลายรายการ)</p>
                </>}
                {canManageSchool && registrationCountsNote && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{registrationCountsNote} · ตัวเลขอาจไม่ครบ</p>}
                {!canManageSchool && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">หากต้องการลงทะเบียนนักกีฬา กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนที่มีสิทธิ์การแข่งขันนี้ <Link href="/group-sports/login" className="font-bold underline">เข้าสู่ระบบโรงเรียน</Link></div>}
                <div className={`mb-4 grid gap-2 ${registrationScope?"sm:grid-cols-2":"sm:grid-cols-3"}`}>
                  {!registrationScope && <select aria-label="ประเภทกีฬา" className="rounded-lg border p-2" value={listSport} onChange={e=>{setListSport(e.target.value as RegistrationSport|"");setEventFilter("");setDetail(null);}}><option value="">ทุกประเภทกีฬา</option>{REGISTRATION_SPORTS.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select>}
                  <select aria-label="โรงเรียน" className="rounded-lg border p-2" value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}><option value="">ทุกโรงเรียนที่ดูแล</option>{entrySchools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <select aria-label="รายการแข่งขัน" className="rounded-lg border p-2" value={eventFilter} onChange={e=>setEventFilter(e.target.value)}><option value="">{activeRegistrationSport ? `ทุกรายการ${activeRegistrationSport.name}` : "ทุกรายการแข่งขัน"}</option>{listEvents.map(e=><option key={e.id} value={e.id}>{e.sport_name}</option>)}</select>
                </div>
                {canManageSchool && <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">พบ {registrationRows.length} ใบสมัครตามตัวกรอง</p><button type="button" disabled={busy||!registrationRows.length||registrationRows.length>50} onClick={()=>void printFilteredRosters()} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-800 disabled:opacity-50">พิมพ์บัญชีรายชื่อตามตัวกรอง</button>{registrationRows.length>50&&<p className="w-full text-xs text-slate-500">กรองให้เหลือไม่เกิน 50 ใบสมัครต่อการพิมพ์หนึ่งครั้ง</p>}</div>}
                {registrationRows.map(entry=><article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
                  <div><strong>{schoolById.get(entry.school_id)?.name} · {entry.entry_name}</strong><p className="text-sm">{eventById.get(entry.event_id)?.sport_name} · {entry.coach_name||"ไม่ระบุครูผู้ควบคุม"} · {entry.athlete_count} คน</p>
                    <p className="text-sm font-bold text-emerald-800">{statusLabel(entry.status)}</p></div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={busy} onClick={()=>void openRoster(entry)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50">{busy && rosterTargetId===entry.id ? "กำลังดึงรายชื่อ..." : "ดูรายชื่อ"}</button>
                    {!isDemo && canManageSchool && !isVolleyball(eventById.get(entry.event_id)) && allowsRegistrationPhotos(eventById.get(entry.event_id)) &&
                      <button type="button" disabled={busy} onClick={()=>void openRoster(entry,false,"photos")} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50">
                        {busy && rosterTargetId===entry.id ? "กำลังดึงนักกีฬา..." : "แนบรูปใบสมัครเดิม"}
                      </button>}
                    {!isDemo && <Link href={`${isTableTennis(eventById.get(entry.event_id))?"/group-sports/table-tennis/print":isTakraw(eventById.get(entry.event_id))?"/group-sports/takraw/print":isVolleyball(eventById.get(entry.event_id))?"/group-sports/volleyball/print":isBasketball(eventById.get(entry.event_id))?"/group-sports/basketball/print":isFutsal(eventById.get(entry.event_id))?"/group-sports/futsal/print":isFootball(eventById.get(entry.event_id))?"/group-sports/football/print":"/group-sports/print"}?entry=${encodeURIComponent(entry.id)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-rose-100">พิมพ์ใบสมัคร PDF</Link>}
                    {canManageAccounts && isVolleyball(eventById.get(entry.event_id)) && <Link href={`/group-sports/volleyball?tab=registration&code=${encodeURIComponent(eventById.get(entry.event_id)?.event_code||"")}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Admin แก้ไขใบสมัครวอลเลย์บอล</Link>}
                    {canManageAccounts && isTakraw(eventById.get(entry.event_id)) && <Link href={`/group-sports/takraw?tab=registration&code=${encodeURIComponent(eventById.get(entry.event_id)?.event_code||"")}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Admin แก้ไขใบสมัครเซปักตะกร้อ</Link>}
                    {canManageAccounts && isTableTennis(eventById.get(entry.event_id)) && <Link href={`/group-sports/table-tennis?tab=registration&code=${encodeURIComponent(eventById.get(entry.event_id)?.event_code||"")}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Admin แก้ไขใบสมัครเทเบิลเทนนิส</Link>}
                    {canManageAccounts && !isVolleyball(eventById.get(entry.event_id)) && !isTakraw(eventById.get(entry.event_id)) && !isTableTennis(eventById.get(entry.event_id)) && <Link href={`/group-sports/admin?entry=${encodeURIComponent(entry.id)}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100">Admin แก้ไขใบสมัคร</Link>}
                    {canManageAccounts && <Link href={`/group-sports/reset?entry=${encodeURIComponent(entry.id)}`} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50">ลบใบสมัคร</Link>}
                  </div>
                </article>)}
                {!registrationRows.length && <p className="rounded-xl bg-slate-50 p-5">ยังไม่มีใบสมัครตามเงื่อนไขนี้</p>}
                {rosterError && <div id="sports-saved-roster-response" role="alert" tabIndex={-1} className="mt-4 scroll-mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                  <strong className="block">ยังเปิดรายชื่อนักกีฬาจากใบสมัครเดิมไม่ได้</strong>
                  <p className="mt-1 whitespace-pre-wrap">{rosterError}</p>
                  <p className="mt-2 text-xs">ตรวจสอบว่ากดใบสมัครของโรงเรียนตัวเองและเข้าสู่ระบบ Production หากยังไม่ได้ให้ส่งข้อความนี้มา โดยไม่ต้องลงทะเบียนซ้ำ</p>
                  <button type="button" onClick={()=>{setRosterError("");setRosterTargetId(null);}} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-bold">ปิดข้อความ</button>
                </div>}
                {detail && <section id="sports-saved-roster-response" tabIndex={-1} className="mt-4 scroll-mt-4 rounded-xl border bg-rose-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong>รายชื่อจากใบสมัครเดิม · {detail.entry.entry_name}</strong><div className="flex items-center gap-3">{!isDemo && <Link href={`${isBasketball(eventById.get(detail.entry.event_id))?"/group-sports/basketball/print":isFutsal(eventById.get(detail.entry.event_id))?"/group-sports/futsal/print":isFootball(eventById.get(detail.entry.event_id))?"/group-sports/football/print":"/group-sports/print"}?entry=${encodeURIComponent(detail.entry.id)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800">พิมพ์ / บันทึก PDF</Link>}<button onClick={()=>setDetail(null)}>ปิด</button></div></div>
                  {detail.entry.coaches?.length ? detail.entry.coaches.map((c,i)=><p key={i}>ครูผู้ควบคุมทีม {i+1} · {c.name} {c.phone}</p>) : <p>ผู้ฝึกสอน {detail.entry.coach_name||"—"} {detail.entry.assistant_coach && ` · ผู้ช่วย ${detail.entry.assistant_coach}`}</p>}
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">รับข้อมูลการสมัครแล้ว · กรรมการจะตรวจตัวนักกีฬาและเอกสารหลักฐาน ณ สนามแข่งขันในวันแข่งขันจริง</p>
                  <ol className="my-3 list-decimal pl-6">{detail.players.map((p,i)=><li key={i}>{[p.student_code,p.full_name,...(isRov(eventById.get(detail.entry.event_id)) ? [p.team_role,p.ign,p.play_position] : [])].filter(Boolean).join(" · ")}</li>)}</ol>
                  {!isDemo && canManageSchool && !isVolleyball(eventById.get(detail.entry.event_id)) && allowsRegistrationPhotos(eventById.get(detail.entry.event_id)) &&
                    <div id="sports-saved-roster-photos" className="scroll-mt-4">
                      <AthletePhotoManager entryId={detail.entry.id} athletes={detail.players} />
                    </div>}
                </section>}
              </section>
            )}

            {tab === "matches" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div><h2 className="text-xl font-black text-slate-900">ผลการแข่งขัน</h2><p className="mt-1 text-sm text-slate-500">เลือกชนิดกีฬาเพื่อดูผลและเข้าสู่ระบบจัดการแข่งขันเฉพาะกีฬา</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">บันทึกผลแล้ว {completedMatches.length} / {matches.length} แมตช์</span>
                </div>
                <div className="mb-5 rounded-2xl border border-rose-100 bg-[#fffafa] p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div><h3 className="font-extrabold text-[#7f1d1d]">เลือกชนิดกีฬา</h3><p className="mt-1 text-xs text-slate-600">เลือกเข้าสู่ระบบเฉพาะกีฬาเพื่อดูโปรแกรมและผลการแข่งขัน</p></div>
                    <button type="button" onClick={() => {setResultSportFilter("all");setResultEventFilter("all");setResultMatchId("");}} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-rose-50">แสดงผลทุกกีฬา</button>
                  </div>
                  <div className="space-y-3" aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา">
                    {[
                      { href: "/group-sports/esports", icon: "🎮", title: "E-Sport (RoV)", description: "มีระบบจัดการแข่งขันแยก · แบ่งกลุ่ม บันทึกผล ตารางคะแนน และสาย Knockout" },
                      { href: "/group-sports/football", icon: "⚽", title: "ฟุตบอล 4 ประเภท", description: "ระบบเฉพาะฟุตบอล · แบ่งสาย สมัครนักกีฬา โปรแกรม 51 คู่ บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/futsal", icon: "⚽", title: "ฟุตซอล 3 ประเภท", description: "ระบบเฉพาะฟุตซอล · แบ่งสาย สมัครนักกีฬา โปรแกรม 51 คู่ บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/basketball", icon: "🏀", title: "บาสเกตบอล 4 รุ่น", description: "ระบบเฉพาะบาสเกตบอล · แบ่งสาย สมัครนักกีฬา โปรแกรม 54 คู่ (รวม 2 คู่รอยืนยัน) บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/volleyball", icon: "🏐", title: "วอลเลย์บอล 4 รุ่น", description: "ระบบเฉพาะวอลเลย์บอล · แบ่งสาย โปรแกรม 93 คู่ บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/takraw", icon: "🏐", title: "เซปักตะกร้อ 4 รุ่น", description: "ระบบเฉพาะเซปักตะกร้อ · แบ่งสาย โปรแกรม 62 คู่ บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/petanque", icon: "🔴", title: "เปตอง 4 รุ่น", description: "ระบบเฉพาะเปตอง · แบ่งสาย โปรแกรม 96 คู่จริง บันทึกผล และตารางคะแนน" },
                      { href: "/group-sports/table-tennis", icon: "🏓", title: "เทเบิลเทนนิส 15 รายการ", description: "แพ้คัดออก · โปรแกรม 75 คู่ · บันทึกคะแนนรายเกม" },
                      { href: "/group-sports/athletics", icon: "🏃", title: "กรีฑา", description: "โปรแกรม 84 ช่วง · รายงานตัว · พิมพ์ใบรายงานตัว · บันทึกผลการแข่งขัน" },
                      { href: "/group-sports/boxing", icon: "🥊", title: "มวยสากลสมัครเล่น 26 รายการ", description: "ชั่งน้ำหนัก · จับสาย · บันทึกผลตามคำตัดสิน" },
                    ].map((sport) => (
                      <Link key={sport.href} href={sport.href} className="group grid min-h-20 w-full grid-cols-1 items-center gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-[0_3px_12px_rgba(7,18,61,.06)] transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 sm:grid-cols-[minmax(0,1fr)_176px] sm:gap-4">
                        <span className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl">{sport.icon}</span>
                          <span className="min-w-0">
                            <span className="block font-extrabold text-[#07123d]">{sport.title}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-slate-600">{sport.description}</span>
                          </span>
                        </span>
                        <span aria-hidden="true" className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0755ce] px-3 text-center text-sm font-bold text-white transition group-hover:bg-[#07123d]">เข้าสู่ระบบ <span>→</span></span>
                      </Link>
                    ))}
                  </div>
                  {resultSportGroups.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {resultSportGroups.map((group) => {
                      const isSelected = resultSportFilter === group.name;
                      const ids = new Set(group.events.map((event) => event.id));
                      const finished = matches.filter((match) => ids.has(match.event_id) && match.status === "completed").length;
                      return <button key={group.name} type="button" aria-pressed={isSelected} onClick={() => {setResultSportFilter(group.name);setResultEventFilter("all");setResultMatchId("");}}
                        className={`flex min-h-20 items-center justify-between gap-2 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 ${isSelected ? "border-red-300 bg-rose-100 text-[#7f1d1d]" : "border-slate-200 bg-white text-slate-800 hover:border-rose-300 hover:bg-rose-50"}`}>
                        <span className="min-w-0"><span className="block text-sm font-extrabold">{group.name}</span><span className="mt-1 block text-xs opacity-75">{group.events.length} รายการ · มีผล {finished} คู่</span></span><span aria-hidden="true" className="shrink-0 text-lg text-red-800">›</span>
                      </button>;
                    })}
                  </div>}
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">{resultSportFilter === "all" ? "ผลการแข่งขันทุกชนิดกีฬา" : `ผลการแข่งขัน: ${resultSportFilter}`}</p><p className="text-xs text-slate-500">เลือกประเภทย่อยหรือรุ่นแข่งขันเพื่อดูผลเฉพาะรายการ</p></div>
                  <label className="w-full sm:w-72"><span className="sr-only">กรองรายการแข่งขัน</span><select value={resultEventFilter} onChange={(event) => {setResultEventFilter(event.target.value);setResultMatchId("");}} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกรุ่น / ทุกประเภท</option>{filteredResultEvents.map((event) => <option key={event.id} value={event.id}>{event.sport_name} · {event.gender_rule} {event.level_rule}</option>)}</select></label>
                </div>
                {filteredResultMatches.length ? <MatchTable matches={filteredResultMatches} schools={schoolById} events={eventById} results={resultByMatch} /> : <EmptyState title="ยังไม่มีผลการแข่งขันประเภททีม" description="เมื่อกรรมการส่งผล ระบบจะประกาศผลในส่วนนี้ทันที" />}
                {filteredIndividualResults.length > 0 && <div className="mt-5 overflow-hidden rounded-xl border border-slate-200"><h3 className="bg-slate-50 px-4 py-3 font-bold text-slate-900">ผลกีฬาเดี่ยว / กรีฑา</h3><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3">รายการ</th><th className="p-3">โรงเรียน</th><th className="p-3">นักกีฬา / ทีม</th><th className="p-3">อันดับ</th><th className="p-3">สถิติ</th></tr></thead><tbody>{filteredIndividualResults.map((result) => <tr key={result.id} className="border-b last:border-0"><td className="p-3 font-semibold">{eventById.get(result.event_id)?.sport_name || "-"}</td><td className="p-3">{schoolById.get(result.school_id)?.name || "-"}</td><td className="p-3">{result.entry_name}</td><td className="p-3 font-bold text-red-800">{result.rank || "-"}</td><td className="p-3">{result.performance_value ?? "-"} {result.performance_unit || ""}</td></tr>)}</tbody></table></div></div>}
                {canRecordResults && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 px-4 py-3"><p className="text-xs text-rose-900">กรรมการที่ได้รับสิทธิ์สามารถบันทึกผลประเภททีมด้านล่าง หรือไปบันทึกผลกีฬาเดี่ยวและกรีฑาได้ ส่วน E-Sport ใช้ระบบแยกด้านบน</p><button type="button" className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-rose-100" onClick={() => {setTab("standings");setFormOpen(true);}}>บันทึกผลเดี่ยว / กรีฑา →</button></div>}
                {canRecordResults && <form onSubmit={saveMatchResult} className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><h3 className="mb-3 font-bold text-slate-900">บันทึกผลการแข่งขัน</h3><div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"><label><span className="mb-1 block text-xs font-bold text-slate-600">เลือกแมตช์</span><select required value={resultMatchId} onChange={(event) => setResultMatchId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">เลือกแมตช์ที่ต้องการบันทึกผล</option>{filteredResultMatches.filter((match) => match.status !== "cancelled").map((match) => <option key={match.id} value={match.id}>{eventById.get(match.event_id)?.sport_name || "รายการแข่งขัน"} · {schoolById.get(match.school_a_id || "")?.name || "รอระบุ"} พบ {schoolById.get(match.school_b_id || "")?.name || "รอระบุ"}</option>)}</select></label><label><span className="mb-1 block text-xs font-bold text-slate-600">คะแนน A</span><input type="number" min="0" step="0.01" value={resultScoreA} onChange={(event) => setResultScoreA(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">คะแนน B</span><input type="number" min="0" step="0.01" value={resultScoreB} onChange={(event) => setResultScoreB(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label><button disabled={busy || !resultMatchId} className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">บันทึกผล</button></div><p className="mt-2 text-xs text-slate-500">ระบบจะคำนวณผู้ชนะและอัปเดตสถานะแมตช์เป็นเสร็จสิ้นโดยอัตโนมัติ</p></form>}

              </section>
            )}

            {tab === "standings" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">ตารางคะแนน</h2><p className="mt-1 text-sm text-slate-500">คำนวณจากผลการแข่งขันที่บันทึกแล้ว โดยใช้เกณฑ์คะแนนของแต่ละรายการ</p></div><select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">ทุกรายการ</option>{events.map((item) => <option key={item.id} value={item.id}>{item.sport_name}</option>)}</select></div>
                {eventResults.filter((item) => selectedEventId === "all" || item.event_id === selectedEventId).length > 0 && <div className="mb-5 overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-50 px-4 py-3"><h3 className="font-bold text-slate-900">ผลอันดับสุดท้ายจากกรรมการ</h3><p className="text-xs text-slate-500">อันดับที่ประกาศแล้วในแต่ละรายการแข่งขัน</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="px-4 py-2">รายการ</th><th className="px-4 py-2">โรงเรียน</th><th className="px-4 py-2">ผู้เข้าแข่งขัน</th><th className="px-4 py-2">อันดับ</th><th className="px-4 py-2">สถิติ</th><th className="px-4 py-2">หมายเหตุ</th></tr></thead><tbody>{eventResults.filter((item) => selectedEventId === "all" || item.event_id === selectedEventId).sort((a, b) => (a.rank || 999) - (b.rank || 999)).map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-semibold">{eventById.get(item.event_id)?.sport_name || "-"}</td><td className="px-4 py-3">{schoolById.get(item.school_id)?.name || "-"}</td><td className="px-4 py-3 font-bold">{item.entry_name}</td><td className="px-4 py-3 font-black text-red-700">{item.rank || "-"}</td><td className="px-4 py-3">{item.performance_value ?? "-"} {item.performance_unit || ""}</td><td className="px-4 py-3 text-slate-500">{item.result_text || "-"}</td></tr>)}</tbody></table></div></div>}
                <div className="space-y-5">{standings.map(({ event: sportEvent, groupName, rows }) => <div key={`${sportEvent.id}-${groupName}`} className="overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-50 px-4 py-3"><h3 className="font-bold text-slate-900">{sportEvent.sport_name} · {groupName}</h3><p className="text-xs text-slate-500">คะแนนชนะ {sportEvent.points_win ?? 3} · เสมอ {sportEvent.points_draw ?? 1} · แพ้ {sportEvent.points_loss ?? 0}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="px-4 py-2">อันดับ</th><th className="px-4 py-2">โรงเรียน</th><th className="px-4 py-2">แข่ง</th><th className="px-4 py-2">ชนะ</th><th className="px-4 py-2">เสมอ</th><th className="px-4 py-2">แพ้</th><th className="px-4 py-2">ได้ / เสีย</th><th className="px-4 py-2">คะแนน</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.school.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-black">{index + 1}</td><td className="px-4 py-3 font-bold">{row.school.name}</td><td className="px-4 py-3">{row.played}</td><td className="px-4 py-3">{row.win}</td><td className="px-4 py-3">{row.draw}</td><td className="px-4 py-3">{row.loss}</td><td className="px-4 py-3">{row.scored} / {row.conceded}</td><td className="px-4 py-3 font-black text-red-700">{row.points}</td></tr>)}</tbody></table></div></div>)}{!standings.length && <EmptyState title="ยังไม่มีตารางคะแนน" description="เมื่อบันทึกผลการแข่งขันประเภททีมแล้ว ระบบจะคำนวณตารางคะแนนให้" />}</div>
              </section>
            )}

            {tab === "medals" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-xl font-black text-slate-900">สรุปเหรียญรางวัล</h2><p className="mt-1 text-sm text-slate-500">จัดอันดับโรงเรียนตามจำนวนเหรียญทอง เงิน และทองแดง</p></div><MedalTable rows={medalTable} showEmpty /><div className="mt-6 border-t border-slate-100 pt-5"><h3 className="mb-3 font-bold text-slate-900">รายการเหรียญที่บันทึกแล้ว</h3>{medals.length ? <div className="space-y-2">{medals.map((medal) => <div key={medal.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{eventById.get(medal.event_id)?.sport_name || "รายการแข่งขัน"}</p><p className="text-xs text-slate-500">{schoolById.get(medal.school_id)?.name || "-"}</p></div><MedalBadge type={medal.medal_type} /></div>)}</div> : <p className="text-sm text-slate-500">ยังไม่มีการบันทึกเหรียญรางวัล</p>}</div></section>
            )}
          </>
        )}

        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 md:flex-row"><span>ระบบกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา</span><span>พัฒนาแยกจากระบบกิจกรรมพัฒนาผู้เรียน · CKW Student Activity App</span></footer>
      </div>
    </main>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center"><p className="font-bold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>;
}

function MedalBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string; icon: string }> = {
    gold: { label: "เหรียญทอง", className: "bg-amber-100 text-amber-800", icon: "🥇" },
    silver: { label: "เหรียญเงิน", className: "bg-slate-100 text-slate-700", icon: "🥈" },
    bronze: { label: "เหรียญทองแดง", className: "bg-orange-100 text-orange-800", icon: "🥉" },
  };
  const item = config[type] || config.gold;
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${item.className}`}>{item.icon} {item.label}</span>;
}

function MedalTable({ rows, showEmpty = false }: { rows: { school: School; gold: number; silver: number; bronze: number; total: number }[]; showEmpty?: boolean }) {
  if (!rows.length) return showEmpty ? <EmptyState title="ยังไม่มีผลการมอบเหรียญ" description="เมื่อบันทึกเหรียญรางวัลแล้ว ตารางอันดับจะแสดงโดยอัตโนมัติ" /> : null;
  return <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="pb-3 pr-2">อันดับ</th><th className="pb-3 pr-2">โรงเรียน</th><th className="pb-3 px-2 text-center">🥇</th><th className="pb-3 px-2 text-center">🥈</th><th className="pb-3 px-2 text-center">🥉</th><th className="pb-3 pl-2 text-right">รวม</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.school.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-2 font-black text-slate-500">{index + 1}</td><td className="py-3 pr-2 font-bold text-slate-800">{row.school.name}</td><td className="px-2 py-3 text-center font-bold text-amber-700">{row.gold}</td><td className="px-2 py-3 text-center font-bold text-slate-600">{row.silver}</td><td className="px-2 py-3 text-center font-bold text-orange-700">{row.bronze}</td><td className="py-3 pl-2 text-right font-black">{row.total}</td></tr>)}</tbody></table></div>;
}

function MatchTable({ matches, schools, events, results }: { matches: Match[]; schools: Map<string, School>; events: Map<string, SportEvent>; results: Map<string, MatchResult> }) {
  if (!matches.length) return null;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="pb-3 pr-3">รายการ / รอบ</th><th className="pb-3 pr-3">คู่แข่งขัน</th><th className="pb-3 pr-3">วันเวลา / สนาม</th><th className="pb-3 pr-3">ผล</th><th className="pb-3">สถานะ</th></tr></thead><tbody>{matches.map((match) => { const result = results.get(match.id); return <tr key={match.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-3"><p className="font-bold text-slate-800">{events.get(match.event_id)?.sport_name || "รายการแข่งขัน"}</p><p className="mt-1 text-xs text-slate-500">{match.match_number || "-"} · {match.group_name || "ไม่แบ่งสาย"} · {match.round_name}</p></td><td className="py-3 pr-3"><p className="font-semibold">{schools.get(match.school_a_id || "")?.name || "รอระบุ"}</p><p className="my-1 text-[10px] font-bold text-slate-400">พบ</p><p className="font-semibold">{schools.get(match.school_b_id || "")?.name || "รอระบุ"}</p></td><td className="py-3 pr-3 text-xs text-slate-500">{formatThaiDate(match.scheduled_at)}<p className="mt-1">{match.venue_name || "ยังไม่กำหนดสนาม"}</p></td><td className="py-3 pr-3 font-black text-red-800">{result ? `${result.score_a} : ${result.score_b}` : "-"}</td><td className="py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${match.status === "completed" ? "bg-emerald-50 text-emerald-700" : match.status === "live" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel(match.status)}</span></td></tr>; })}</tbody></table></div>;
}
