"use client";

import { useMemo, useState } from "react";
import "./sports-games-home.css";

type School = { id: string; name: string };
type Event = { id: string; sport_name: string; event_type: string; venue_name?: string | null };
type Match = {
  id: string; event_id: string; round_name: string; group_name?: string | null;
  school_a_id?: string | null; school_b_id?: string | null;
  scheduled_at?: string | null; venue_name?: string | null; status: string;
  display_team_a?:string; display_team_b?:string; score_a?:number|null;score_b?:number|null;
  special_source?:"football"|"esports";
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

function dateParts(value?: string | null) {
  if (!value) return { date: "รอกำหนด", time: "--:--", key: "" };
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return { date: "รอกำหนด", time: "--:--", key: "" };
  return {
    date: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(d),
    key: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
  };
}

function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function sportGlyph(sport: string) {
  if (/ฟุตบอล/i.test(sport)) return "⚽";
  if (/กรีฑา|วิ่ง|กระโดด|ขว้าง/i.test(sport)) return "🏃";
  if (/วอลเลย์/i.test(sport)) return "🏐";
  if (/บาสเกต/i.test(sport)) return "🏀";
  if (/เทเบิลเทนนิส/i.test(sport)) return "🏓";
  if (/RoV|E-Sport/i.test(sport)) return "🎮";
  if (/แบดมินตัน/i.test(sport)) return "🏸";
  return "🏅";
}

function sportGroup(value: string) {
  const name = value.trim();
  if (/RoV|E-Sport/i.test(name)) return "E-Sport (RoV)";
  if (/ฟุตบอล/i.test(name)) return "ฟุตบอล";
  if (/กรีฑา|วิ่ง|กระโดด|ขว้าง/i.test(name)) return "กรีฑา";
  if (/วอลเลย์บอล/i.test(name)) return "วอลเลย์บอล";
  if (/เทเบิลเทนนิส/i.test(name)) return "เทเบิลเทนนิส";
  const fragment = name.split(/\s+(?:รุ่น|ประเภท|ชาย|หญิง|ไม่จำกัด|อายุ|คู่|เดี่ยว|ม\.)/)[0];
  return fragment || name;
}

function StatGlyph({kind}:{kind:"schools"|"events"|"athletes"|"live"}) {
  const common = {viewBox:"0 0 24 24",width:42,height:42,fill:"none",stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
  if (kind === "schools") return <svg {...common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 20v-2c0-3 2.7-5 6-5s6 2 6 5v2H2Zm13-7c3.3 0 7 1.6 7 5v2h-5"/><path d="M11 6c.6-1 1.6-1.7 3-1.7"/></svg>;
  if (kind === "events") return <svg {...common}><circle cx="16" cy="3.5" r="2"/><path d="m13 8 4 2 4-2M11 13l4-5-4-2-5 5m7-1 1 5 4 5M11 13l-5 4-4 1m9-5 2-1"/></svg>;
  if (kind === "athletes") return <svg {...common}><circle cx="10" cy="7" r="3.5"/><path d="M3 21v-2.5C3 15 5.5 13 10 13s7 2 7 5.5V21H3ZM17.3 8.5l2.2 2.3L23 6.5"/></svg>;
  return <svg {...common}><circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3.5 2.5M9 1h6M12 1v3M18.5 5l1.8-1.5"/></svg>;
}

const fmt = (value: number) => value.toLocaleString("th-TH");

export default function SportsGamesHome({
  schools, events, matches, results, medals, entries, eventResults, specialMatches, announcements, athleteCount, onNavigate,
}: SportsGamesHomeProps) {
  const [sportFilter, setSportFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
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
  const getEvent = (id: string) => eventById.get(id)?.sport_name || "รายการแข่งขัน";
  const allMatches = [...matches, ...specialMatches];
  const goMatch = (m: Match) => {
    if (m.special_source === "football") window.location.assign(getEvent(m.event_id).includes("เทเบิลเทนนิส") ? "/group-sports/table-tennis" : getEvent(m.event_id).includes("เปตอง") ? "/group-sports/petanque" : getEvent(m.event_id).includes("เซปักตะกร้อ") ? "/group-sports/takraw" : getEvent(m.event_id).includes("วอลเลย์บอล") ? "/group-sports/volleyball" : getEvent(m.event_id).includes("บาสเกตบอล") ? "/group-sports/basketball" : getEvent(m.event_id).includes("ฟุตซอล") ? "/group-sports/futsal" : "/group-sports/football");
    else if (m.special_source === "esports") window.location.assign("/group-sports/esports");
    else onNavigate("matches");
  };
  const displaySchoolA = (m:Match) => m.display_team_a || getSchool(m.school_a_id);
  const displaySchoolB = (m:Match) => m.display_team_b || getSchool(m.school_b_id);
  const matchScore = (m:Match) => m.special_source
    ? (m.score_a == null || m.score_b == null ? null : { score_a:m.score_a, score_b:m.score_b })
    : resultByMatch.get(m.id) || null;
  const now = Date.now();
  const ongoing = allMatches.filter(m => m.status === "live" || m.status === "in_progress");
  const soon = [...allMatches].filter(m => !["cancelled","completed"].includes(m.status) && m.scheduled_at).sort((a,b)=>new Date(a.scheduled_at||0).getTime()-new Date(b.scheduled_at||0).getTime());
  const featured = ongoing[0] || soon.find(m => new Date(m.scheduled_at||0).getTime() >= now) || soon[0];
  const otherMatches = soon.filter(m => m.id !== featured?.id).slice(0,3);
  const latestResults = allMatches.filter(m => m.status === "completed" && !!matchScore(m)).slice().sort((a,b)=>new Date(b.scheduled_at||0).getTime()-new Date(a.scheduled_at||0).getTime()).slice(0,3);
  const recentIndividual = eventResults.filter(r => r.rank === 1).slice(0,3);
  const todayKey = todayBangkok();
  const todayMatches = [...allMatches].filter(m => dateParts(m.scheduled_at).key === todayKey && m.status !== "cancelled").sort((a,b)=>new Date(a.scheduled_at||0).getTime()-new Date(b.scheduled_at||0).getTime());
  const chosenSchoolName = schoolFilter === "all" ? "" : (schoolById.get(schoolFilter) || "");
  const displayedSchedule = (todayMatches.length ? todayMatches : soon)
    .filter(m => schoolFilter === "all" || m.school_a_id === schoolFilter || m.school_b_id === schoolFilter ||
      (chosenSchoolName.length>0 && [m.display_team_a,m.display_team_b].some(label =>
        !!label && (label.includes(chosenSchoolName) || chosenSchoolName.includes(label)))))
    .slice(0,5);
  const scheduleHeading = todayMatches.length ? "โปรแกรมวันนี้" : "โปรแกรมการแข่งขันถัดไป";
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
          <div className="phg-panel-heading">
            <div><h2>กำลังแข่งขัน</h2><p>ผลสดและโปรแกรมถัดไปในสนาม</p></div>
            <button className="phg-inline-link" type="button" onClick={()=>onNavigate("schedule")}>โปรแกรมทั้งหมด →</button>
          </div>
          <div className="phg-live-grid">
            <div className="phg-featured-match">
              {featured ? <>
                <div className="phg-featured-top"><span>{sportGlyph(getEvent(featured.event_id))} {getEvent(featured.event_id)}</span><span className={`phg-status-chip ${ongoing.some(m=>m.id===featured.id)?"is-live":""}`}>{ongoing.some(m=>m.id===featured.id)?"● LIVE · กำลังแข่ง":"◷ โปรแกรมถัดไป"}</span></div>
                <div className="phg-scoreline"><strong>{displaySchoolA(featured)}</strong><span className="phg-score">{matchScore(featured)?`${matchScore(featured)?.score_a} : ${matchScore(featured)?.score_b}`:"VS"}</span><strong>{displaySchoolB(featured)}</strong></div>
                <div className="phg-match-meta">{featured.round_name} · {featured.venue_name||eventById.get(featured.event_id)?.venue_name||"รอกำหนดสนาม"} · {dateParts(featured.scheduled_at).date} {dateParts(featured.scheduled_at).time}</div>
              </> : <div className="phg-empty"><strong>ยังไม่มีคู่แข่งขันในโปรแกรม</strong><span>เมื่อผู้จัดการแข่งขันกำหนดคู่ ระบบจะแสดงข้อมูลจากฐานจริงตรงนี้</span></div>}
            </div>
            <div className="phg-up-next">{otherMatches.length ? otherMatches.map(m=><button type="button" className="phg-next-match" key={m.id} onClick={()=>goMatch(m)}>
              <time>{dateParts(m.scheduled_at).time}</time><span><strong>{getEvent(m.event_id)}</strong><small>{m.round_name} · {displaySchoolA(m)} พบ {displaySchoolB(m)}</small></span><em>{m.status === "live"?"กำลังแข่งขัน":"รอแข่งขัน"}</em>
            </button>) : <div className="phg-empty phg-small-empty">ยังไม่มีคู่ถัดไป</div>}</div>
          </div>
        </section>

        <section className="phg-panel phg-results-panel">
          <div className="phg-panel-heading"><h2>⚡ ผลการแข่งขันล่าสุด</h2><button type="button" className="phg-inline-link" onClick={()=>onNavigate("matches")}>ดูผลการแข่งขันทั้งหมด →</button></div>
          <div className="phg-recent-grid">{latestResults.length ? latestResults.map(m => {
            const score=matchScore(m);
            return <button key={m.id} type="button" onClick={()=>goMatch(m)} className="phg-result-tile"><strong>{sportGlyph(getEvent(m.event_id))} {getEvent(m.event_id)}</strong><span>{displaySchoolA(m)} <b>{score?.score_a} - {score?.score_b}</b> {displaySchoolB(m)}</span><small>จบการแข่งขัน · {m.round_name}</small></button>;
          }) : recentIndividual.length ? recentIndividual.map(r=><button key={r.id} type="button" onClick={()=>onNavigate("matches")} className="phg-result-tile"><strong>{sportGlyph(getEvent(r.event_id))} {getEvent(r.event_id)}</strong><span>{getSchool(r.school_id)}</span><small>อันดับ 1 · {r.performance_value??""} {r.performance_unit||""}</small></button>) : <div className="phg-empty">ยังไม่มีผลการแข่งขันที่ประกาศแล้ว</div>}</div>
        </section>

        <div className="phg-bottom-panels">
          <section className="phg-panel phg-schedule-panel">
            <div className="phg-panel-heading"><h2>🗓 {scheduleHeading}</h2><select aria-label="เลือกโรงเรียน" value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}><option value="all">ทุกโรงเรียน</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="phg-schedule-list">{displayedSchedule.length ? displayedSchedule.map(m=><button type="button" className="phg-schedule-row" onClick={()=>goMatch(m)} key={m.id}>
              <b>{dateParts(m.scheduled_at).time} น.</b><strong>{sportGlyph(getEvent(m.event_id))} {getEvent(m.event_id)}</strong><span>{displaySchoolA(m)} / {displaySchoolB(m)}</span><small>📍 {m.venue_name||"รอสนาม"}</small>
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
