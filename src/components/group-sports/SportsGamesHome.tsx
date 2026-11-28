"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./sports-games-home.css";

type School = { id: string; name: string };
type Event = { id: string; sport_name: string; event_type: string; event_code?: string | null; status?: string; venue_name?: string | null };
type Match = {
  id: string; event_id: string; round_name: string; group_name?: string | null;
  school_a_id?: string | null; school_b_id?: string | null;
  scheduled_at?: string | null; venue_name?: string | null; status: string;
  display_team_a?:string; display_team_b?:string; score_a?:number|null;score_b?:number|null;
  special_source?:"football"|"esports"|"boxing"|"athletics";
  special_code?:string|null; special_number?:string|null;
  is_session?:boolean; status_label?:string;
  sport_name?:string; scheduled_day?:string|null; scheduled_time?:string|null;
  winner_school?:string|null; updated_at?:string|null; can_manage?:boolean; operator?:boolean;
  live_version?:string|null; fixture_version?:string|null;
};
type Result = { match_id: string; score_a: number; score_b: number };
type Medal = { school_id: string; event_id: string; medal_type: "gold" | "silver" | "bronze" };
type Entry = { athlete_count?: number };
type EventResult = { id: string; event_id: string; school_id: string; rank?: number | null; entry_name: string; performance_value?: number | null; performance_unit?: string | null };
type News = { id: string; title: string; details: string; published_at?: string | null };
type Dest = "schedule" | "matches" | "medals" | "schools" | "events" | "entries" | "announcements" | "school_info";

export type SportsGamesHomeProps = {
  schools: School[]; events: Event[]; matches: Match[]; results: Result[];
  medals: Medal[]; entries: Entry[]; eventResults: EventResult[];
  specialMatches: Match[];
  announcements: News[]; athleteCount: number | null;
  onNavigate: (destination: Dest) => void;
};

// Intl constructors are expensive (especially inside Array.sort). Reuse them.
const thaiDateFormatter=new Intl.DateTimeFormat("th-TH", {timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric"});
const thaiTimeFormatter=new Intl.DateTimeFormat("th-TH", {timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",hour12:false});
const bangkokKeyFormatter=new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"});
function dateParts(value?: string | null) {
  if (!value) return { date: "รอกำหนด", time: "--:--", key: "" };
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return { date: "รอกำหนด", time: "--:--", key: "" };
  return {date:thaiDateFormatter.format(d),time:thaiTimeFormatter.format(d),key:bangkokKeyFormatter.format(d)};
}
function todayBangkok() { return bangkokKeyFormatter.format(new Date()); }

function sportGlyph(sport: string) {
  if (/ฟุตบอล|ฟุตซอล/i.test(sport)) return "⚽";
  if (/กรีฑา|วิ่ง|กระโดด|ขว้าง/i.test(sport)) return "🏃";
  if (/วอลเลย์|เซปักตะกร้อ|ตะกร้อ/i.test(sport)) return "🏐";
  if (/บาสเกต/i.test(sport)) return "🏀";
  if (/มวย/i.test(sport)) return "🥊";
  if (/เทเบิลเทนนิส|ปิงปอง/i.test(sport)) return "🏓";
  if (/เปตอง/i.test(sport)) return "🎯";
  if (/RoV|E-Sport|อีสปอร์ต/i.test(sport)) return "🎮";
  if (/แบดมินตัน/i.test(sport)) return "🏸";
  return "🏅";
}

function sportGroup(value: string) {
  const name = value.trim();
  if (/RoV|E-Sport|อีสปอร์ต/i.test(name)) return "E-Sport (RoV)";
  if (/ฟุตซอล/i.test(name)) return "ฟุตซอล";
  if (/ฟุตบอล/i.test(name)) return "ฟุตบอล";
  if (/บาสเกต/i.test(name)) return "บาสเกตบอล";
  if (/วอลเลย์บอล/i.test(name)) return "วอลเลย์บอล";
  if (/เซปักตะกร้อ|ตะกร้อ/i.test(name)) return "เซปักตะกร้อ";
  if (/เปตอง/i.test(name)) return "เปตอง";
  if (/เทเบิลเทนนิส|ปิงปอง/i.test(name)) return "เทเบิลเทนนิส";
  if (/มวย/i.test(name)) return "มวยสากลสมัครเล่น";
  if (/กรีฑา|วิ่ง|กระโดด|ขว้าง/i.test(name)) return "กรีฑา";
  const fragment = name.split(/\s+(?:รุ่น|ประเภท|ชาย|หญิง|ไม่จำกัด|อายุ|คู่|เดี่ยว|ม\.)/)[0];
  return fragment || name;
}

const SPORT_ORDER = ["E-Sport (RoV)","ฟุตบอล","ฟุตซอล","บาสเกตบอล","วอลเลย์บอล","เซปักตะกร้อ","เปตอง","เทเบิลเทนนิส","มวยสากลสมัครเล่น","กรีฑา"];
const isLiveMatch = (match: Match) => match.status === "live" || match.status === "in_progress";
const isHiddenFromLiveBoard = (match: Match) => ["cancelled","canceled","completed","draft","postponed"].includes(match.status);

// Cache date/time per fixture object; sorting no longer re-formats the same timestamp repeatedly.
const fixtureClockCache = new WeakMap<Match,{at:Match["scheduled_at"];day:Match["scheduled_day"];time:Match["scheduled_time"];dayKey:string;timeKey:string}>();
function fixtureClock(m:Match) {
  const cached=fixtureClockCache.get(m);
  if(cached && cached.at===m.scheduled_at && cached.day===m.scheduled_day && cached.time===m.scheduled_time)return cached;
  const d=m.scheduled_at?new Date(m.scheduled_at):null;
  const valid=d!==null&&!Number.isNaN(d.valueOf());
  const value={at:m.scheduled_at,day:m.scheduled_day,time:m.scheduled_time,
    dayKey:m.scheduled_day||(valid&&d?bangkokKeyFormatter.format(d):""),
    timeKey:m.scheduled_time?m.scheduled_time.slice(0,5):valid&&d?thaiTimeFormatter.format(d):"--:--"};
  fixtureClockCache.set(m,value);return value;
}
function matchDay(m:Match) {return fixtureClock(m).dayKey;}
function matchTime(m:Match) {return fixtureClock(m).timeKey;}
function matchDate(m:Match) { return m.scheduled_day ? dateParts(`${m.scheduled_day}T12:00:00+07:00`).date : dateParts(m.scheduled_at).date; }
function orderMatches(a:Match,b:Match) { return (matchDay(a)||"9999-12-31").localeCompare(matchDay(b)||"9999-12-31") || (matchTime(a)==="--:--"?"99:99":matchTime(a)).localeCompare(matchTime(b)==="--:--"?"99:99":matchTime(b)) || a.id.localeCompare(b.id); }
function matchLabel(m:Match) { return m.status_label || (isLiveMatch(m)?"กำลังแข่งขัน":m.status==="awaiting_result"?"รอผลทางการ":m.status==="completed"?"จบการแข่งขัน":"รอแข่งขัน"); }
function LiveControls({match,reload}:{match:Match;reload:()=>Promise<Match[]|undefined>}) {
  const [a,setA]=useState(String(match.score_a??0));
  const [b,setB]=useState(String(match.score_b??0));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  // Keep the version that belongs to the draft score, not the latest poll's version.
  const [expected,setExpected]=useState(match.live_version??null);
  const changed=expected!==(match.live_version??null);
  const live=isLiveMatch(match);
  const today=matchDay(match)===todayBangkok();
  const scoreOK=/^\d{1,3}$/.test(a)&&/^\d{1,3}$/.test(b);
  async function act(action:"start"|"score"|"stop") {
    if(busy||changed||!match.can_manage||!match.fixture_version||!match.special_source)return;
    if(action!=="score"&&!window.confirm(action==="start"?"ยืนยันเริ่มแสดง LIVE คู่นี้บนหน้าสาธารณะ?":"หยุด LIVE และรอผลทางการ? ต้องบันทึกผลจริงในหน้ากีฬาเดิม"))return;
    setBusy(true);setError("");
    try {
      const r=await supabase.rpc("sports_live_action_v1",{p_source:match.special_source,p_match:match.id.split(":")[1],p_action:action,p_score_a:action==="score"?Number(a):null,p_score_b:action==="score"?Number(b):null,p_fixture_version:match.fixture_version,p_expected:expected});
      if(r.error)throw r.error;
      const fresh=await reload(); const current=fresh?.find(m=>m.id===match.id); if(current){setExpected(current.live_version??null);setA(String(current.score_a??0));setB(String(current.score_b??0));}
    } catch(e) {setError(typeof e==="object"&&e&&"message" in e?String(e.message):"บันทึกไม่สำเร็จ");}
    finally {setBusy(false);}
  }
  return <div className="phg-live-controls">
    <strong>ควบคุมการแข่งขัน · เฉพาะผู้มีสิทธิ์</strong>
    {changed?<div role="status">ข้อมูลสดเปลี่ยนแล้ว <button type="button" onClick={()=>{setA(String(match.score_a??0));setB(String(match.score_b??0));setExpected(match.live_version??null);setError("");}}>โหลดคะแนนล่าสุด</button></div>:null}
    {live && match.special_source!=="boxing" && <div className="phg-score-edit"><label>ทีม A<input inputMode="numeric" value={a} onChange={e=>setA(e.target.value)} disabled={busy||changed} /></label><span>:</span><label>ทีม B<input inputMode="numeric" value={b} onChange={e=>setB(e.target.value)} disabled={busy||changed}/></label><button type="button" disabled={busy||changed||!scoreOK} onClick={()=>void act("score")}>อัปเดตคะแนนสด</button></div>}
    <div className="phg-live-actions">{live?<button type="button" disabled={busy||changed} onClick={()=>void act("stop")}>หยุด LIVE / รอผลทางการ</button>:<button type="button" disabled={busy||changed||!today} onClick={()=>void act("start")}>{match.status==="awaiting_result"?"กลับมา LIVE":"เริ่มแข่งขัน LIVE"}</button>}{!live&&!today&&<small>เริ่ม LIVE ได้เมื่อถึงวันแข่งขันเท่านั้น</small>}</div>
    <small>{match.special_source==="esports"?"RoV: จำนวนเกมที่ชนะ (0–2) · ":""}คะแนนสดไม่ใช่ผลทางการ · บันทึกผลจริงในหน้าจัดการกีฬาตามเดิม</small>{error&&<p role="alert" className="phg-live-error">{error}</p>}
  </div>;
}

function StatGlyph({kind}:{kind:"schools"|"events"|"athletes"|"live"}) {
  const common = {viewBox:"0 0 24 24",width:42,height:42,fill:"none",stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
  if (kind === "schools") return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 20v-2c0-3 2.7-5 6-5s6 2 6 5v2H2Zm13-7c3.3 0 7 1.6 7 5v2h-5"/><path d="M11 6c.6-1 1.6-1.7 3-1.7"/></svg>;
  if (kind === "events") return <svg {...common}><circle cx="16" cy="3.5" r="2"/><path d="m13 8 4 2 4-2M11 13l4-5-4-2-5 5m7-1 1 5 4 5M11 13l-5 4-4 1m9-5 2-1"/></svg>;
  if (kind === "athletes") return <svg {...common}><circle cx="10" cy="7" r="3.5"/><path d="M3 21v-2.5C3 15 5.5 13 10 13s7 2 7 5.5V21H3ZM17.3 8.5l2.2 2.3L23 6.5"/></svg>;
  return <svg {...common}><circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3.5 2.5M9 1h6M12 1v3M18.5 5l1.8-1.5"/></svg>;
}

const fmt = (value: number) => value.toLocaleString("th-TH");

function SportsGamesHome({
  schools, events, matches, results, medals, entries, eventResults, specialMatches, announcements, athleteCount, onNavigate,
}: SportsGamesHomeProps) {
  const [sportFilter, setSportFilter] = useState("all");
  const [liveSportFilter, setLiveSportFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [venueFilter,setVenueFilter]=useState("all");
  const [liveDateFilter,setLiveDateFilter]=useState("all");
  const [activeId,setActiveId]=useState("");
  const [showAll,setShowAll]=useState(false);
  const [board,setBoard]=useState<Match[]|null>(null);
  const [boardError,setBoardError]=useState(false);
  const [lastRefresh,setLastRefresh]=useState<string|null>(null);
  const requestRef=useRef(0);
  const boardInFlight=useRef(false);
  const refreshBoard=useCallback(async(automatic=false)=>{
    if(automatic && (document.hidden||boardInFlight.current))return;
    const revision=++requestRef.current;
    boardInFlight.current=true;
    try {
      // The pulse RPC hashes the entire board, so a separate pulse doubles
      // server work when data changes. Read the board directly once per minute.
      const r=await supabase.rpc("sports_live_board_v1");
      if(revision!==requestRef.current)return;
      if(r.error||!Array.isArray(r.data)) {setBoardError(true);return;}
      setBoard(r.data as Match[]);setBoardError(false);setLastRefresh(new Date().toISOString());return r.data as Match[];
    } catch {if(revision===requestRef.current)setBoardError(true);}
    finally {if(revision===requestRef.current)boardInFlight.current=false;}
  },[]);
  useEffect(()=>{
    void refreshBoard();
    const timer=window.setInterval(()=>void refreshBoard(true),60_000);
    const visible=()=>{if(!document.hidden)void refreshBoard(true);};
    document.addEventListener("visibilitychange",visible);
    let authTimer:number|undefined;
    let lastUser:string|undefined;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      const uid=session?.user?.id||"";
      if(event==="INITIAL_SESSION" && lastUser===undefined){lastUser=uid;return;}
      if(lastUser===uid)return;
      lastUser=uid;setBoard(null);requestRef.current++;boardInFlight.current=false;
      window.clearTimeout(authTimer);authTimer=window.setTimeout(()=>void refreshBoard(),0);
    });
    return()=>{requestRef.current++;boardInFlight.current=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",visible);window.clearTimeout(authTimer);subscription.unsubscribe();};
  },[refreshBoard]);
  const schoolById = useMemo(() => new Map(schools.map(s => [s.id, s.name])), [schools]);
  const eventById = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const resultByMatch = useMemo(() => new Map(results.map(r => [r.match_id, r])), [results]);
  const allGroups = useMemo(() => [...new Set(events.map(e => sportGroup(e.sport_name)))].sort((a,b)=>a.localeCompare(b,"th")), [events]);
  const medalsFiltered = useMemo(() => sportFilter === "all" ? medals : medals.filter(m => {
    const e = eventById.get(m.event_id);
    return e && sportGroup(e.sport_name) === sportFilter;
  }), [medals,sportFilter,eventById]);
  const medalRows = useMemo(() => schools.map(s => {
    const mine = medalsFiltered.filter(m => m.school_id === s.id);
    const gold = mine.filter(m => m.medal_type === "gold").length;
    const silver = mine.filter(m => m.medal_type === "silver").length;
    const bronze = mine.filter(m => m.medal_type === "bronze").length;
    return { id: s.id, name: s.name, gold, silver, bronze, total: mine.length };
  }).sort((a,b) => b.gold-a.gold || b.silver-a.silver || b.bronze-a.bronze || a.name.localeCompare(b.name,"th")), [schools,medalsFiltered]);
  const getSchool = (id?: string | null) => (id ? schoolById.get(id) : null) || "รอระบุโรงเรียน";
  const boardEventNames=useMemo(()=>{const names=new Map<string,string|undefined>();for(const m of board||[])if(!names.has(m.event_id))names.set(m.event_id,m.sport_name);return names;},[board]);
  const getEvent = (id: string) => eventById.get(id)?.sport_name || boardEventNames.get(id) || "รายการแข่งขัน";
  const allMatches = useMemo(()=>board === null ? [...matches, ...specialMatches.filter(m=>m.special_source!=="athletics")] : [...matches.filter(m=>!eventById.get(m.event_id)?.event_code?.startsWith("GS3-")), ...board],[board,matches,specialMatches,eventById]);
  const goMatch = (m: Match) => {
    if (m.special_source === "football") window.location.assign(getEvent(m.event_id).includes("เทเบิลเทนนิส") ? "/group-sports/table-tennis" : getEvent(m.event_id).includes("เปตอง") ? "/group-sports/petanque" : getEvent(m.event_id).includes("เซปักตะกร้อ") ? "/group-sports/takraw" : getEvent(m.event_id).includes("วอลเลย์บอล") ? "/group-sports/volleyball" : getEvent(m.event_id).includes("บาสเกตบอล") ? "/group-sports/basketball" : getEvent(m.event_id).includes("ฟุตซอล") ? "/group-sports/futsal" : "/group-sports/football");
    else if (m.special_source === "boxing") window.location.assign("/group-sports/boxing");
    else if (m.special_source === "esports") window.location.assign("/group-sports/esports");
    else if (m.special_source === "athletics") window.location.assign(`/group-sports/athletics${m.special_code ? `?code=${encodeURIComponent(m.special_code)}` : ""}`);
    else onNavigate("matches");
  };
  const displaySchoolA = (m:Match) => m.display_team_a || getSchool(m.school_a_id);
  const displaySchoolB = (m:Match) => m.display_team_b || getSchool(m.school_b_id);
  const matchScore = (m:Match) => m.special_source
    ? (m.score_a == null || m.score_b == null ? null : { score_a:m.score_a, score_b:m.score_b })
    : resultByMatch.get(m.id) || null;
  const now=Date.now();
  const todayKey=todayBangkok();
  const liveBoardMatches=allMatches.filter(m=>!isHiddenFromLiveBoard(m)&&(!!matchDay(m)||isLiveMatch(m)||m.status==="awaiting_result")&&eventById.get(m.event_id)?.status!=="draft");
  const liveSportGroups=[...new Set([...SPORT_ORDER,...events.filter(e=>e.status!=="draft").map(e=>sportGroup(e.sport_name)),...liveBoardMatches.map(m=>sportGroup(getEvent(m.event_id)))])];
  const sportMatches=liveBoardMatches.filter(m=>liveSportFilter==="all"||sportGroup(getEvent(m.event_id))===liveSportFilter);
  const venues=[...new Set(sportMatches.map(m=>m.venue_name||eventById.get(m.event_id)?.venue_name||"รอกำหนดสนาม"))].sort((a,b)=>a.localeCompare(b,"th"));
  const chosenVenue=venues.includes(venueFilter)?venueFilter:"all";
  const selected=sportMatches.filter(m=>(chosenVenue==="all"||(m.venue_name||eventById.get(m.event_id)?.venue_name||"รอกำหนดสนาม")===chosenVenue)&&(liveDateFilter==="all"||matchDay(m)===todayKey));
  const ongoing=liveBoardMatches.filter(isLiveMatch);
  const selectedLive=selected.filter(isLiveMatch).sort(orderMatches);
  const pending=selected.filter(m=>m.status==="awaiting_result").sort(orderMatches);
  const selectedUpcoming=selected.filter(m=>!isLiveMatch(m)&&m.status!=="awaiting_result").sort(orderMatches);
  const upcomingFuture=selectedUpcoming.filter(m=>matchDay(m)>todayKey||(matchDay(m)===todayKey&&(!m.scheduled_at||new Date(m.scheduled_at).getTime()>=now)));
  const futureSet=new Set(upcomingFuture);
  const upcomingPast=selectedUpcoming.filter(m=>!futureSet.has(m));
  const ordered=[...selectedLive,...upcomingFuture,...pending,...upcomingPast];
  const featured=ordered.find(m=>m.id===activeId)||ordered[0];
  const otherMatches=[...selectedLive,...pending,...upcomingFuture,...upcomingPast].filter(m=>m.id!==featured?.id);
  const activeOthers=otherMatches.filter(m=>isLiveMatch(m)||m.status==="awaiting_result");
  const activeSet=new Set(activeOthers);
  const remaining=otherMatches.filter(m=>!activeSet.has(m));
  const visibleOthers=showAll?otherMatches:[...activeOthers,...remaining.slice(0,3)];
  const latestResults=allMatches.filter(m=>m.status==="completed"&&(!!matchScore(m)||!!m.winner_school)).slice().sort((a,b)=>new Date(b.updated_at||b.scheduled_at||0).getTime()-new Date(a.updated_at||a.scheduled_at||0).getTime()).slice(0,3);
  const selectedLiveCount=selectedLive.length;
  const selectedUpcomingCount=selectedUpcoming.length;
  const recentIndividual=eventResults.filter(r=>r.rank===1).slice(0,3);
  const soon=liveBoardMatches.filter(m=>!isLiveMatch(m)&&m.status!=="awaiting_result"&&matchDay(m)>=todayKey).sort(orderMatches);
  const chosenSchoolName=schoolFilter==="all"?"":(schoolById.get(schoolFilter)||"");
  const schoolSchedule=soon.filter(m=>schoolFilter==="all"||m.school_a_id===schoolFilter||m.school_b_id===schoolFilter||(chosenSchoolName.length>0&&[m.display_team_a,m.display_team_b].some(label=>!!label&&(label.includes(chosenSchoolName)||chosenSchoolName.includes(label)))));
  const todayMatches=schoolSchedule.filter(m=>matchDay(m)===todayKey);
  const displayedSchedule=(todayMatches.length?todayMatches:schoolSchedule).slice(0,5);
  const scheduleHeading=todayMatches.length?"โปรแกรมวันนี้":"โปรแกรมการแข่งขันถัดไป";
  const medalNumber = medalsFiltered.length;
  const registrations = athleteCount ?? (entries.length ? entries.reduce((n,e)=>n+(e.athlete_count||0),0) : null);

  return <div className="phg-home" id="phayao-games-home">
    <section className="phg-stats" aria-label="สถิติการแข่งขัน">
      {[
        { icon:"schools" as const, label:"โรงเรียนที่เข้าร่วม", number:fmt(schools.length), sub:"ดูรายชื่อโรงเรียน", gradient:"blue", target:"schools" as Dest },
        { icon:"events" as const, label:"รายการแข่งขัน", number:fmt(events.length), sub:"ดูรายละเอียดการแข่งขัน", gradient:"green", target:"events" as Dest },
        { icon:"athletes" as const, label:"นักกีฬาที่ลงทะเบียน", number:registrations === null ? "—" : fmt(registrations), sub:registrations === null ? "รอสถิติทะเบียนนักกีฬา" : "ดูข้อมูลนักกีฬา", gradient:"purple", target:"entries" as Dest },
        { icon:"live" as const, label:"กำลังแข่งขัน", number:fmt(ongoing.length), sub:"ดูรายละเอียด", gradient:"orange", target:"matches" as Dest },
      ].map(stat=><button type="button" key={stat.label} className="phg-stat" onClick={()=>onNavigate(stat.target)}>
        <span className={`phg-stat-icon phg-${stat.gradient}`} aria-hidden="true"><StatGlyph kind={stat.icon}/></span>
        <span className="phg-stat-copy"><strong>{stat.label}</strong><b>{stat.number}</b><small>{stat.sub} <span aria-hidden="true">→</span></small></span>
      </button>)}
    </section>

    <div className="phg-board">
      <div className="phg-left">
        <section className="phg-panel phg-live-panel">
          <div className="phg-panel-heading phg-live-heading">
            <div><h2>ศูนย์ติดตามการแข่งขัน</h2><p>สถานะจริงจากกรรมการ · เลือกกีฬาและสนามได้</p></div>
            <div className="phg-live-tools">
              <label className="phg-live-filter"><span>ประเภทกีฬา</span>
                <select aria-label="เลือกประเภทกีฬาในหน้าต่างกำลังแข่งขัน" value={liveSportFilter} onChange={e=>{setLiveSportFilter(e.target.value);setVenueFilter("all");setActiveId("");setShowAll(false);}}>
                  <option value="all">ทุกประเภทกีฬา ({liveBoardMatches.length})</option>
                  {liveSportGroups.map(group=>{
                    const count=liveBoardMatches.filter(m=>sportGroup(getEvent(m.event_id))===group).length;
                    return <option value={group} key={group}>{group} ({count})</option>;
                  })}
                </select>
              </label>
              <button className="phg-inline-link" type="button" onClick={()=>onNavigate("schedule")}>โปรแกรมทั้งหมด →</button>
            </div>
          </div>
          <div className="phg-live-filterbar"><label>สนาม <select value={chosenVenue} onChange={e=>{setVenueFilter(e.target.value);setActiveId("");}}><option value="all">ทุกสนาม</option>{venues.map(v=><option key={v} value={v}>{v}</option>)}</select></label><label>วันที่ <select value={liveDateFilter} onChange={e=>{setLiveDateFilter(e.target.value);setActiveId("");}}><option value="all">ทุกวัน</option><option value="today">วันนี้</option></select></label><button type="button" className="phg-inline-link" onClick={()=>void refreshBoard()}>↻ รีเฟรช</button>{activeId&&<button type="button" className="phg-inline-link" onClick={()=>setActiveId("")}>กลับไปเลือกคู่อัตโนมัติ</button>}</div>
          {boardError?<div className="phg-live-error" role="status">เชื่อมข้อมูลสดไม่ได้ · แสดงข้อมูลล่าสุดที่มี (ยังไม่ยืนยันสถานะสดใหม่)</div>:board===null?<small>กำลังโหลดโปรแกรมที่เผยแพร่แล้ว…</small>:<small className="phg-live-refresh">อัปเดต {dateParts(lastRefresh).time} น. · ตรวจข้อมูลทุก 60 วินาทีขณะเปิดหน้า</small>}
          <div className="phg-live-summary" aria-live="polite">
            {liveSportFilter === "all" ? "ทุกประเภทกีฬา" : liveSportFilter}
            <span> · กำลังดำเนินการ {selectedLiveCount} รายการ</span>
            <span> · รอแข่งขัน {selectedUpcomingCount} รายการ</span><span> · รอผลทางการ {pending.length} รายการ</span>
          </div>
          <div className="phg-live-grid">
            <div className="phg-featured-match">
              {featured ? <>
                <div className="phg-featured-top"><span>{sportGlyph(getEvent(featured.event_id))} {getEvent(featured.event_id)}</span><span className={`phg-status-chip ${isLiveMatch(featured)?"is-live":""}`}>{isLiveMatch(featured)?`● ${featured.status_label || "LIVE · กำลังแข่งขัน"}`:featured.status==="awaiting_result"?"รอผลทางการ":upcomingPast.includes(featured)?"รอยืนยันเริ่มแข่งขัน":"◷ โปรแกรมถัดไป"}</span></div>
                {featured.is_session ? <div className="phg-session-feature">
                  <strong>{featured.round_name}</strong>
                  <span>ช่วงที่ {featured.special_number || "-"}</span>
                  <small>เวลาเริ่ม {matchTime(featured)} น. · {featured.venue_name || "สนามกรีฑา"}</small>
                </div> : <div className="phg-scoreline"><strong>{displaySchoolA(featured)}</strong><span className="phg-score">{matchScore(featured)?`${matchScore(featured)?.score_a} : ${matchScore(featured)?.score_b}`:"VS"}</span><strong>{displaySchoolB(featured)}</strong></div>}
                <div className="phg-match-meta">{featured.special_number?`คู่/ช่วง ${featured.special_number} · `:""}{featured.round_name} · {featured.venue_name||eventById.get(featured.event_id)?.venue_name||"รอกำหนดสนาม"} · {matchDate(featured)} {matchTime(featured)==="--:--"?"รอกำหนดเวลา":matchTime(featured)}</div>
                {(isLiveMatch(featured)||featured.status==="awaiting_result")&&!featured.is_session&&<small className="phg-live-refresh">{featured.status==="awaiting_result"?"สิ้นสุดการแสดง LIVE · รอกรรมการบันทึกผลทางการ":matchScore(featured)?"คะแนนสด · ยังไม่ใช่ผลทางการ":"กำลังแข่งขัน · ยังไม่มีคะแนนสด"}</small>}
                {featured.operator&&!featured.can_manage&&<small className="phg-live-refresh">ยังควบคุม LIVE ไม่ได้ · ต้องระบุคู่แข่งขันจริงในโปรแกรมก่อน</small>}
                <button type="button" className="phg-inline-link" onClick={()=>goMatch(featured)}>เปิดหน้ากีฬานี้ →</button>
                {featured.can_manage&&!boardError&&board!==null&&<LiveControls key={`${featured.id}:${featured.fixture_version}`} match={featured} reload={refreshBoard}/>}
              </> : <div className="phg-empty"><strong>{liveSportFilter === "all" ? "ยังไม่มีคู่แข่งขันในโปรแกรม" : `ยังไม่มีโปรแกรม${liveSportFilter}`}</strong><span>เมื่อผู้จัดการแข่งขันเผยแพร่โปรแกรม ระบบจะแสดงข้อมูลของประเภทกีฬาที่เลือกตรงนี้</span></div>}
            </div>
            <div className="phg-up-next">{visibleOthers.length ? visibleOthers.map(m=><button type="button" className={`phg-next-match ${isLiveMatch(m)?"is-live": ""}`} key={m.id} onClick={()=>setActiveId(m.id)}>
              <time><small>{matchDate(m)}</small>{matchTime(m)==="--:--"?"รอเวลา":matchTime(m)}</time><span><strong>{sportGlyph(getEvent(m.event_id))} {getEvent(m.event_id)}</strong><small>{m.is_session?`${m.round_name} · ช่วง ${m.special_number||"-"}`:`${displaySchoolA(m)} พบ ${displaySchoolB(m)}`}</small><small>📍 {m.venue_name||"รอกำหนดสนาม"}</small></span><em>{isLiveMatch(m)&&matchScore(m)?`${matchScore(m)?.score_a} : ${matchScore(m)?.score_b}`:matchLabel(m)}</em>
            </button>) : <div className="phg-empty phg-small-empty">ยังไม่มีรายการอื่นในเงื่อนไขที่เลือก</div>}{remaining.length>3&&<button type="button" className="phg-inline-link" onClick={()=>setShowAll(v=>!v)}>{showAll?"แสดงเฉพาะคู่ถัดไป":"ดูคู่อื่นทั้งหมด ("+otherMatches.length+")"}</button>}</div>
          </div>
          <p className="phg-live-refresh">แสดงเฉพาะโปรแกรมที่เผยแพร่แล้ว · เวลาถึงกำหนดไม่ถือว่าเริ่มแข่งจนกว่ากรรมการยืนยัน · กรีฑาใช้สถานะรายงานตัวเดิม</p>
        </section>

        <section className="phg-panel phg-results-panel">
          <div className="phg-panel-heading"><h2>⚡ ผลการแข่งขันล่าสุด</h2><button type="button" className="phg-inline-link" onClick={()=>onNavigate("matches")}>ดูผลการแข่งขันทั้งหมด →</button></div>
          <div className="phg-recent-grid">{latestResults.length ? latestResults.map(m => {
            const score=matchScore(m);
            return <button key={m.id} type="button" onClick={()=>goMatch(m)} className="phg-result-tile"><strong>{sportGlyph(getEvent(m.event_id))} {getEvent(m.event_id)}</strong><span>{m.winner_school?`ชนะ: ${m.winner_school}`:<>{displaySchoolA(m)} <b>{score?.score_a} - {score?.score_b}</b> {displaySchoolB(m)}</>}</span><small>จบการแข่งขัน · {m.round_name}</small></button>;
          }) : recentIndividual.length ? recentIndividual.map(r=><button key={r.id} type="button" onClick={()=>onNavigate("matches")} className="phg-result-tile"><strong>{sportGlyph(getEvent(r.event_id))} {getEvent(r.event_id)}</strong><span>{getSchool(r.school_id)}</span><small>อันดับ 1 · {r.performance_value??""} {r.performance_unit||""}</small></button>) : <div className="phg-empty">ยังไม่มีผลการแข่งขันที่ประกาศแล้ว</div>}</div>
        </section>

        <div className="phg-bottom-panels">
          <section className="phg-panel phg-schedule-panel">
            <div className="phg-panel-heading"><h2>🗓 {scheduleHeading}</h2><select aria-label="เลือกโรงเรียน" value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}><option value="all">ทุกโรงเรียน</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="phg-schedule-list">{displayedSchedule.length ? displayedSchedule.map(m=><button type="button" className="phg-schedule-row" onClick={()=>goMatch(m)} key={m.id}>
              <b>{matchDate(m)}<br/>{matchTime(m)==="--:--"?"รอเวลา":matchTime(m)+" น."}</b><strong>{sportGlyph(getEvent(m.event_id))} {getEvent(m.event_id)}</strong><span>{m.is_session ? `${m.round_name} · ช่วง ${m.special_number || "-"}` : `${displaySchoolA(m)} / ${displaySchoolB(m)}`}</span><small>📍 {m.venue_name||"รอสนาม"}</small>
            </button>) : <div className="phg-empty">ยังไม่มีโปรแกรมในเงื่อนไขที่เลือก</div>}</div>
          </section>
          <section className="phg-panel phg-news-panel">
            <div className="phg-panel-heading"><h2>📣 ข่าวและประกาศ</h2><button type="button" className="phg-inline-link" onClick={()=>onNavigate("announcements")}>ดูทั้งหมด →</button></div>
            <div className="phg-news-list">{announcements.length ? announcements.slice(0,3).map(a=><button type="button" key={a.id} className="phg-news-item" onClick={()=>onNavigate("announcements")}><span aria-hidden="true">📄</span><span><strong>{a.title}</strong><small>{a.details.slice(0,92)}{a.details.length>92?"…":""}</small><em>{a.published_at?dateParts(a.published_at).date:"ประกาศล่าสุด"}</em></span></button>) : <div className="phg-empty">ยังไม่มีประกาศที่เผยแพร่<br/>เมื่อผู้ดูแลเผยแพร่ ข่าวจะปรากฏตรงนี้</div>}</div>
          </section>
        </div>
      </div>

      <aside className="phg-panel phg-medals-panel">
        <div className="phg-medal-title"><span aria-hidden="true">🏆</span><h2>สรุปเหรียญรางวัลรายโรงเรียน</h2></div>
        <div className="phg-medal-filter"><strong>ประเภทกีฬา</strong><select aria-label="เลือกประเภทกีฬาเพื่อกรองเหรียญ" value={sportFilter} onChange={e=>setSportFilter(e.target.value)}><option value="all">ทุกประเภทกีฬา</option>{allGroups.map(g=><option value={g} key={g}>{g}</option>)}</select></div>
        <div className="phg-medal-scroll" role="region" aria-label="ตารางเหรียญรางวัลทุกโรงเรียน" tabIndex={0}>
          <table className="phg-medal-table"><thead><tr><th scope="col">อันดับ</th><th scope="col">โรงเรียน</th><th scope="col" className="phg-gold-col">🥇<small>ทอง</small></th><th scope="col" className="phg-silver-col">🥈<small>เงิน</small></th><th scope="col" className="phg-bronze-col">🥉<small>ทองแดง</small></th><th scope="col">รวม</th></tr></thead>
            <tbody>{medalRows.map((r,i)=><tr key={r.id}><td><span className={`phg-rank ${i<3?"phg-rank-top":""}`}>{i+1}</span></td><td>{r.name}</td><td>{r.gold}</td><td>{r.silver}</td><td>{r.bronze}</td><td><b>{r.total}</b></td></tr>)}</tbody>
          </table>
          {!medalRows.length && <div className="phg-empty">ยังไม่มีข้อมูลโรงเรียน</div>}
        </div>
        <div className="phg-medal-foot">{fmt(medalNumber)} เหรียญที่บันทึกแล้ว · จัดอันดับตามทอง → เงิน → ทองแดง</div>
        <button type="button" className="phg-medal-all" onClick={()=>onNavigate("medals")}>ดูตารางเหรียญรางวัลทั้งหมด →</button>
      </aside>
    </div>
  </div>;
}

export default memo(SportsGamesHome);
