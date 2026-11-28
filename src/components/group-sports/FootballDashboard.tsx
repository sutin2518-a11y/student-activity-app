"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import FootballPhotoPicker from "@/components/group-sports/FootballPhotoPicker";
import FootballSavedPhotos from "@/components/group-sports/FootballSavedPhotos";
import ThaiDatePicker from "@/components/group-sports/ThaiDatePicker";
import { uploadAthletePhoto } from "@/lib/group-sports/rov-photos";
import { footballStaffSlots, footballAgeOnStart } from "@/lib/group-sports/football-staff";
import { exportFootballBackup, type FootballBackupRoster } from "@/lib/group-sports/football-backup";
import { downloadFootballRosterTemplate, importFootballRosterExcel, type ImportedFootballPlayer } from "@/lib/group-sports/football-roster-excel";
import { FOOTBALL_CODES, FOOTBALL_CONFIG, FOOTBALL_NAME_PREFIXES, matchSchool, formatThaiFootballDate, type FootballCode, type FootballTab } from "@/lib/group-sports/football-config";

const SLUG = "phayao-secondary-group-sports-2569";
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const control = "w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-700 focus:ring-2 focus:ring-rose-200";
const redButton = "rounded-lg bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50";
const ghostButton = "rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-red-900 hover:bg-rose-50 disabled:opacity-50";

type FootballEvent = { id: string; competition_id: string; event_code: FootballCode; sport_name: string; status: string };
type Team = { id: string; event_id: string; group_code: string; seed_order: number; school_name: string };
type Match = { id: string; event_id: string; match_no: number; stage: "group"|"quarter"|"semifinal"|"final"; group_code: string|null; team1_name: string; team2_name: string; scheduled_date: string|null; start_time: string|null; venue_name: string; status: "draft"|"published"|"completed"|"cancelled"; score1: number|null; score2: number|null; penalty1: number|null; penalty2: number|null; notes: string; updated_at: string };
type School = { id: string; name: string; director_name?: string|null; status?: string };
type Role = { role: string; school_id: string|null; competition_id: string|null };
type Player = { prefix: string; name: string; student_code: string; birth_date: string; jersey_number: string; player_role: string; player_note: string; photo?: File };
type Coach = { name: string; phone: string; manager_name?: string; manager_phone?: string; photo?: File };
type SavedEntry = { id: string; school_id: string; school_name: string; athlete_count: number; status: string };
type RosterDetails = { id:string;event_id:string;status:string;school_id:string;school_name:string;sport_name:string;director_name?:string|null;players: {full_name:string;student_code:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string}[];coaches:Coach[] };
type History = { id:number; changed_at:string; before_data:Record<string,unknown>; after_data:Record<string,unknown>; changed_by:string|null };
const newPlayer = (): Player => ({ prefix: "", name: "", student_code: "", birth_date: "", jersey_number: "", player_role: "", player_note: "" });
const newCoach = (): Coach => ({ name: "", phone: "" });
const stageNames: Record<Match["stage"],string> = { group: "รอบแบ่งกลุ่ม", quarter: "รอบ 8 ทีม", semifinal: "รอบรองชนะเลิศ", final: "รอบชิงชนะเลิศ" };
const statusNames: Record<Match["status"],string> = { draft: "ฉบับร่าง", published: "เผยแพร่แล้ว", completed: "แข่งขันเสร็จสิ้น", cancelled: "ยกเลิก" };
const tabs: { key:FootballTab; label:string }[] = [
 {key:"schedule",label:"โปรแกรม / ผล"},{key:"groups",label:"แบ่งสาย"},
 {key:"registration",label:"ลงทะเบียนนักกีฬา"},{key:"standings",label:"ตารางคะแนน"},
 {key:"knockout",label:"รอบน็อกเอาต์"},{key:"rules",label:"ระเบียบ / เอกสาร"},
 {key:"history",label:"ประวัติแก้ไข"}
];
function errorText(err: unknown) { return err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as {message:unknown}).message) : "ไม่สามารถดำเนินการได้"; }
function parseDisplayName(full: string): Player { const prefix=FOOTBALL_NAME_PREFIXES.find(p=>full.startsWith(p))||""; return {...newPlayer(),prefix,name:full.slice(prefix.length)}; }
function winner(match: Match): string|null { if (match.status!=="completed" || match.score1==null || match.score2==null) return null; if(match.score1>match.score2)return match.team1_name; if(match.score2>match.score1)return match.team2_name; if(match.penalty1!=null && match.penalty2!=null) return match.penalty1>match.penalty2?match.team1_name:match.team2_name; return null; }

type Standing = { school:string; played:number; win:number; loss:number; scored:number; conceded:number; points:number };
function makeStandings(teams:Team[], matches:Match[], group:string):Standing[] {
 const rows=teams.filter(t=>t.group_code===group).map(t=>({school:t.school_name,played:0,win:0,loss:0,scored:0,conceded:0,points:0}));
 for(const m of matches.filter(x=>x.stage==="group"&&x.group_code===group&&x.status==="completed"&&x.score1!=null&&x.score2!=null)) {
  const a=rows.find(r=>matchSchool(m.team1_name,r.school)); const b=rows.find(r=>matchSchool(m.team2_name,r.school)); if(!a||!b)continue;
  a.played++;b.played++;a.scored+=m.score1!;a.conceded+=m.score2!;b.scored+=m.score2!;b.conceded+=m.score1!;
  const isA=m.score1!>m.score2!||(m.score1===m.score2&&m.penalty1!=null&&m.penalty2!=null&&m.penalty1>m.penalty2);
  const isB=m.score2!>m.score1!||(m.score1===m.score2&&m.penalty1!=null&&m.penalty2!=null&&m.penalty2>m.penalty1);
  if(isA){a.win++;b.loss++;a.points+=3;} else if(isB){b.win++;a.loss++;b.points+=3;}
 }
 return rows.sort((a,b)=>b.points-a.points||(b.scored-b.conceded)-(a.scored-a.conceded)||b.scored-a.scored||a.conceded-b.conceded);
}
function signedScore(match:Match){ if(match.status!=="completed"||match.score1==null)return "—"; return `${match.score1} : ${match.score2}${match.penalty1!=null?` (จุดโทษ ${match.penalty1}:${match.penalty2})`:""}`; }

export default function FootballDashboard(){
 const [code,setCode]=useState<FootballCode>("GS3-FB-13M");
 const [tab,setTab]=useState<FootballTab>("schedule");
 const [events,setEvents]=useState<FootballEvent[]>([]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [schools,setSchools]=useState<School[]>([]);
 const [roles,setRoles]=useState<Role[]>([]);
 const [competitionId,setCompetitionId]=useState("");
 const [email,setEmail]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [schoolId,setSchoolId]=useState("");
 const [players,setPlayers]=useState<Player[]>([newPlayer()]);
 const [coaches,setCoaches]=useState<Coach[]>([newCoach()]);
 const [managerName,setManagerName]=useState("");
 const [managerPhone,setManagerPhone]=useState("");
 const [managerPhoto,setManagerPhoto]=useState<File|undefined>();
 const [backupBusy,setBackupBusy]=useState(false);
 const [savedEntries,setSavedEntries]=useState<SavedEntry[]>([]);
 const [selectedEntry,setSelectedEntry]=useState<RosterDetails|null>(null);
 const [importPreview,setImportPreview]=useState<ImportedFootballPlayer[]|null>(null);
 const [editMatch,setEditMatch]=useState<Match|null>(null);
 const [history,setHistory]=useState<History[]>([]);
 const selectedEvent=events.find(x=>x.event_code===code);
 const config=FOOTBALL_CONFIG[code];
 const isAdmin=roles.some(r=>r.role==="competition_admin"&&r.competition_id===competitionId||r.role==="super_admin"&&(!r.competition_id||r.competition_id===competitionId));
 const eligibleSchools=isAdmin?schools:schools.filter(s=>roles.some(r=>r.role==="school_manager"&&r.school_id===s.id&&(!r.competition_id||r.competition_id===competitionId)));
 const canRegister=Boolean(selectedEvent?.id&&selectedEvent.status==="registration"&&eligibleSchools.length);
 const eventMatches=matches.filter(x=>x.event_id===selectedEvent?.id).sort((a,b)=>a.scheduled_date?.localeCompare(b.scheduled_date||"")||0||a.start_time?.localeCompare(b.start_time||"")||0||a.match_no-b.match_no);
 const eventTeams=teams.filter(x=>x.event_id===selectedEvent?.id);
 const groupCodes=[...new Set(eventTeams.map(t=>t.group_code))].sort();
 const completed=eventMatches.filter(m=>m.status==="completed").length;
 const published=eventMatches.filter(m=>["published","completed"].includes(m.status)).length;
 const collisionMatchIds=new Set(matches.filter(a=>a.status!=="cancelled"&&a.scheduled_date&&a.start_time&&matches.some(b=>
   b.id!==a.id&&b.status!=="cancelled"&&b.venue_name===a.venue_name&&b.scheduled_date===a.scheduled_date&&b.start_time===a.start_time
 )).map(m=>m.id));
 const isScheduleChecked=eventMatches.length===config.matches&&eventMatches.every(m=>m.scheduled_date&&m.start_time&&m.venue_name&&m.team1_name&&m.team2_name&&!collisionMatchIds.has(m.id));
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const auth=await supabase.auth.getUser();const user=auth.data.user;
   setEmail(user?.app_metadata?.sports_school_account?"บัญชีโรงเรียน":user?.email||"");
   const comp=await supabase.from("sports_competitions").select("id").eq("slug",SLUG).maybeSingle();
   if(comp.error)throw comp.error;
   if(!comp.data?.id)throw new Error("ไม่พบการแข่งขัน กรุณาตรวจสอบการติดตั้ง Stage 3");
   setCompetitionId(comp.data.id);
   const [ev,grp,m,s,r]=await Promise.all([
    supabase.from("sports_events").select("id,competition_id,event_code,sport_name,status").eq("competition_id",comp.data.id).in("event_code",[...FOOTBALL_CODES]),
    supabase.from("sports_football_group_teams").select("*").eq("competition_id",comp.data.id).order("seed_order"),
    supabase.from("sports_football_matches").select("*").eq("competition_id",comp.data.id).order("match_no"),
    supabase.from("sports_schools").select("id,name,director_name,status").order("name"),
    user?supabase.from("sports_user_roles").select("role,school_id,competition_id").eq("user_id",user.id).eq("is_active",true):Promise.resolve({data:[],error:null})
   ]);
   for(const result of [ev,grp,m,s,r])if(result.error)throw new Error(result.error.message);
   setEvents((ev.data||[]) as FootballEvent[]);setTeams((grp.data||[]) as Team[]);
   setMatches((m.data||[]) as Match[]);setSchools((s.data||[]).filter((x:School)=>x.status!=="inactive") as School[]);
   setRoles((r.data||[]) as Role[]);
  }catch(cause){setError(`${errorText(cause)} — หากยังไม่ได้ติดตั้ง SQL 0026 โปรดรัน Migration ก่อน`);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();const params=new URLSearchParams(window.location.search);if(params.get("tab")==="registration")setTab("registration");/* unified-navigation-v1: football */const requested=params.get("code") as FootballCode;if(FOOTBALL_CODES.includes(requested))setCode(requested);},[refresh]);
 useEffect(()=>{setMessage("");setError("");setSelectedEntry(null);setSavedEntries([]);setPlayers([newPlayer()]);setCoaches([newCoach()]);setManagerName("");setManagerPhone("");setManagerPhoto(undefined);setImportPreview(null);setEditMatch(null);setHistory([]);},[code]);
 useEffect(()=>{if(eligibleSchools.length&&!eligibleSchools.some(s=>s.id===schoolId))setSchoolId(eligibleSchools[0].id);},[schoolId,eligibleSchools]);
 const loadEntries=useCallback(async()=>{if(!selectedEvent?.id||!email)return;
  const r=await supabase.rpc("sports_football_my_entries",{p_event:selectedEvent.id});
  if(r.error){setError(r.error.message);return;}
  setSavedEntries(Array.isArray(r.data)?r.data as SavedEntry[]:[]);
 },[selectedEvent?.id,email]);
 useEffect(()=>{if(tab==="registration")void loadEntries();},[tab,loadEntries]);
 const standings=useMemo(()=>groupCodes.map(group=>({group,rows:makeStandings(eventTeams,eventMatches,group)})),[groupCodes.join("|"),teams,matches,selectedEvent?.id]);
 // Group qualification suggestions appear only when every group match has a result.
 const allGroupDone=eventMatches.filter(m=>m.stage==="group").every(m=>m.status==="completed");
 const matchByNo=new Map(eventMatches.map(m=>[m.match_no,m]));
 const resolvedName=(value:string):string=>{
  if(!allGroupDone)return value;
  const groupRank=value.match(/^ที่\s*([12])\s*สาย\s*([A-D])$/);
  if(groupRank){const list=standings.find(s=>s.group===groupRank[2])?.rows;const idx=Number(groupRank[1])-1;
   const tie=list&&list[idx+1]&&list[idx].points===list[idx+1].points&&(list[idx].scored-list[idx].conceded)===(list[idx+1].scored-list[idx+1].conceded);
   return list?.[idx]&&!tie?list[idx].school:value;
  }
  const matchWinner=value.match(/ชนะคู่ที่\s*(\d+)/);
  if(matchWinner){const origin=matchByNo.get(Number(matchWinner[1]));return origin?winner(origin)||value:value;}
  return value;
 };
 const refreshList=async()=>{await refresh();await loadEntries();};
 async function activatePublicView(){
  if(!selectedEvent||!isAdmin||selectedEvent.status!=="draft")return;
  if(!(await sportsConfirm(`เปิดแสดงประเภท ${config.title} ให้โรงเรียนเห็นรายชื่อสายได้ โดยยังไม่เปิดรับสมัครนักกีฬาใช่หรือไม่?`)))return;
  setBusy(true);setError("");try{
   const r=await supabase.from("sports_events").update({status:"scheduled"}).eq("id",selectedEvent.id).eq("competition_id",competitionId).eq("status","draft");
   if(r.error)throw r.error;
   setMessage("เปิดแสดงรายการและสายแล้ว แต่ยังไม่เปิดรับสมัครหรือเผยแพร่คู่แข่งขัน กรุณาตรวจและกดเผยแพร่โปรแกรมเมื่อพร้อม");await refresh();
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function activateRegistration(){if(!selectedEvent||!isAdmin)return;
  if(!(await sportsConfirm(`ยืนยันเปิดรับสมัครนักกีฬา ${config.title} ให้โรงเรียนกรอกข้อมูลได้หรือไม่?`)))return;
  setBusy(true);try{const r=await supabase.from("sports_events").update({status:"registration"}).eq("id",selectedEvent.id).eq("competition_id",competitionId);if(r.error)throw r.error;
   setMessage("เปิดรับสมัครเรียบร้อยแล้ว");await refresh();}catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function publish(){if(!isAdmin||!selectedEvent)return;
  if(!isScheduleChecked){setError("ตรวจโปรแกรมไม่ครบ กรุณาตรวจวัน เวลา สถานที่ และจำนวนคู่ก่อนเผยแพร่");return;}
  if(selectedEvent.status==="draft"){setError("กรุณากด เปิดแสดงรายการ ก่อน แล้วจึงเผยแพร่โปรแกรมได้ โดยไม่จำเป็นต้องเปิดรับสมัคร");return;}
  const drafts=eventMatches.filter(m=>m.status==="draft");if(!drafts.length){setMessage("ไม่มีคู่ฉบับร่างที่ต้องเผยแพร่");return;}
  if(!(await sportsConfirm(`ยืนยันเผยแพร่โปรแกรม ${config.compact} จำนวน ${drafts.length} คู่?`)))return;
  setBusy(true);setError("");try{const r=await supabase.from("sports_football_matches").update({status:"published"}).eq("event_id",selectedEvent.id).eq("status","draft");
   if(r.error)throw r.error;setMessage("เผยแพร่โปรแกรมเรียบร้อยแล้ว");await refresh();}catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 function editPlayer(i:number,field:Exclude<keyof Player,"photo">,value:string){setPlayers(prev=>prev.map((p,index)=>index===i?{...p,[field]:value}:p));}
 function editCoach(i:number,field:Exclude<keyof Coach,"photo">,value:string){setCoaches(prev=>prev.map((p,index)=>index===i?{...p,[field]:value}:p));}
 async function loadRoster(id:string){setBusy(true);setError("");try{
  const r=await supabase.rpc("sports_football_roster_details",{p_entry:id});if(r.error)throw r.error;
  const details=r.data as RosterDetails;if(!details||details.event_id!==selectedEvent?.id)throw new Error("ใบสมัครไม่ตรงรุ่นที่เลือก");setSelectedEntry(details);setSchoolId(details.school_id);
  setPlayers(details.players.map(p=>({...parseDisplayName(p.full_name),student_code:p.student_code||"",birth_date:p.birth_date||"",jersey_number:p.jersey_number==null?"":String(p.jersey_number),player_role:p.player_role||"",player_note:p.player_note||""})));
  setCoaches(details.coaches?.length?details.coaches.map(c=>({name:c.name,phone:c.phone})):[newCoach()]);
  setManagerName(details.coaches?.[0]?.manager_name||"");setManagerPhone(details.coaches?.[0]?.manager_phone||"");setManagerPhoto(undefined);setImportPreview(null);setTab("registration");
 }catch(e){setError(errorText(e));}finally{setBusy(false);}}
 async function register(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||!selectedEvent||!schoolId||!canRegister)return;
  if(!players.length||players.length>20){setError("ระบุรายชื่อนักกีฬา 1–20 คน");return;}
  if(!selectedEntry&&savedEntries.some(x=>x.school_id===schoolId)){setError("โรงเรียนนี้มีใบสมัครแล้ว กรุณาเปิดใบสมัครเดิมเพื่อแก้ไขหรือแนบรูป");return;}
  if(importPreview){setError("กรุณากด ใช้รายชื่อในฟอร์ม หลังตรวจ Excel ก่อนส่งใบสมัคร");return;}
  if(players.some(p=>!p.prefix||!p.name.trim()||!p.birth_date||footballAgeOnStart(p.birth_date,config.title)===null||!/^(?:[0-9]|[1-9][0-9])$/.test(p.jersey_number))){setError("กรุณาระบุคำนำหน้า ชื่อ วันเกิด และเบอร์เสื้อของนักกีฬาทุกคน");return;}
  const codes=players.map(p=>p.student_code.trim()).filter(Boolean);if(new Set(codes).size!==codes.length){setError("รหัสนักเรียนซ้ำกันภายในทีม");return;}
  const numbers=players.map(p=>p.jersey_number);if(new Set(numbers).size!==numbers.length){setError("หมายเลขเสื้อนักกีฬาซ้ำกัน กรุณาตรวจสอบ");return;}
  if(!coaches.length||coaches.some(c=>!c.name.trim()||!/^\+?\d{9,15}$/.test(c.phone.replace(/[ ()-]/g,"")))){setError("กรุณากรอกชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมอย่างน้อยหนึ่งคน");return;}
  if(managerPhoto && !managerName.trim()){setError("กรุณาระบุชื่อผู้จัดการทีมก่อนส่งใบสมัครที่แนบรูปผู้จัดการทีม");return;}
  if(managerPhone.trim() && !/^\+?\d{9,15}$/.test(managerPhone.replace(/[ ()-]/g,""))){setError("กรุณาตรวจสอบเบอร์โทรศัพท์ผู้จัดการทีม");return;}
  if(selectedEntry&&selectedEntry.school_id!==schoolId){setError("ไม่สามารถเปลี่ยนโรงเรียนของใบสมัครเดิมได้");return;}
  if((managerPhoto||players.some(p=>p.photo)||coaches.some(c=>c.photo))&&!(await sportsConfirm("ตรวจสอบว่ารูปที่เลือกตรงกับชื่อของนักกีฬาและเจ้าหน้าที่แต่ละคนแล้ว ใช่หรือไม่?")))return;
  setBusy(true);setError("");try{
    const roster=players.map(p=>({full_name:p.prefix+p.name.trim(),student_code:p.student_code.trim()||null,birth_date:p.birth_date,jersey_number:p.jersey_number,player_role:p.player_role,player_note:p.player_note}));
    const staffData=coaches.map((c,i)=>({name:c.name.trim(),phone:c.phone.trim(),...(i===0?{manager_name:managerName.trim(),manager_phone:managerPhone.trim()}:{})}));
    const result=selectedEntry&&!isAdmin?await supabase.rpc("sports_school_edit_team_v1",{p_entry:selectedEntry.id,p_event:selectedEvent.id,p_school:schoolId,p_players:roster,p_coaches:staffData,p_sport:"football"}):await supabase.rpc("sports_football_register_v3333",{p_entry:selectedEntry?.id||null,p_event:selectedEvent.id,p_school:schoolId,p_players:roster,p_coaches:staffData});
    if(result.error)throw result.error;
    const entryId=result.data as string;
    setMessage("บันทึกใบสมัครแล้ว กำลังแนบรูปที่เลือก…");
    const failures:string[]=[];
    // Verify the saved roster before attaching any file. Never upload by position alone.
    const check=await supabase.rpc("sports_football_roster_details",{p_entry:entryId});
    const saved=check.data as RosterDetails|null;
    if(check.error||!saved||saved.event_id!==selectedEvent.id||saved.school_id!==schoolId){
      setMessage("บันทึกใบสมัครแล้ว แต่ยังตรวจสอบรายชื่อเพื่อแนบรูปไม่ได้ กรุณาเปิดใบสมัครเดิม ไม่ต้องสมัครใหม่");
      await loadEntries();return;
    }
    for(let i=0;i<players.length;i++){
      const file=players[i].photo;if(!file)continue;const actual=saved.players[i],expected=roster[i];
      if(!actual||actual.full_name.trim()!==expected.full_name.trim()||(actual.student_code||"").trim()!==(expected.student_code||"").trim()){failures.push(`นักกีฬา ${i+1}: รายชื่อไม่ตรง`);continue;}
      try{await uploadAthletePhoto(entryId,i,actual,file);}catch(err){failures.push(`นักกีฬา ${i+1}: ${errorText(err)}`);}
    }
    const expectedStaff=footballStaffSlots(staffData),actualStaff=footballStaffSlots(saved.coaches||[]);
    for(const slot of expectedStaff){
      const file=slot.key==="manager"?managerPhoto:coaches[slot.photoIndex-110]?.photo;if(!file)continue;
      const actual=actualStaff.find(x=>x.key===slot.key);
      if(!actual||actual.name!==slot.name){failures.push(`${slot.title}: ชื่อไม่ตรง`);continue;}
      try{await uploadAthletePhoto(entryId,actual.photoIndex,actual.identity,file);}catch(err){failures.push(`${slot.title}: ${errorText(err)}`);}
    }
    await loadEntries();await loadRoster(entryId);
    setMessage(failures.length?"บันทึกใบสมัครแล้ว แต่บางรูปยังไม่สำเร็จ กรุณาแนบรูปอีกครั้งจากใบสมัครเดิม":"บันทึกใบสมัครและรูปที่เลือกเรียบร้อยแล้ว สามารถพิมพ์ PDF ได้");
    if(failures.length)setError(failures.join(" · "));
  }catch(cause){setError(errorText(cause));}finally{setBusy(false);}
 }
 async function backupAll(){
  if(!isAdmin||backupBusy||busy)return;
  setBackupBusy(true);setError("");try{
   const rows:FootballBackupRoster[]=[];
   for(const key of FOOTBALL_CODES){
    const ev=events.find(e=>e.event_code===key);if(!ev)throw new Error(`ไม่พบรายการ ${key}`);
    const list=await supabase.rpc("sports_football_my_entries",{p_event:ev.id});if(list.error||!Array.isArray(list.data))throw new Error(list.error?.message||"อ่านรายการไม่สำเร็จ");
    for(const item of list.data as SavedEntry[]){const detail=await supabase.rpc("sports_football_roster_details",{p_entry:item.id});if(detail.error||!detail.data)throw new Error(detail.error?.message||"อ่านใบสมัครไม่สำเร็จ");
     const roster=detail.data as RosterDetails;if(roster.id!==item.id||roster.event_id!==ev.id||roster.players.length!==item.athlete_count)throw new Error("ข้อมูลเปลี่ยนระหว่างสำรอง กรุณาลองใหม่");rows.push({...roster,code:key});}
   }
   await exportFootballBackup(rows);setMessage(`ส่งออก Excel สำรองฟุตบอล ${rows.length} ใบสมัคร จาก 4 รุ่นแล้ว (รูปจริงสำรองแยก)`);
  }catch(err){setError(errorText(err));}finally{setBackupBusy(false);}
 }
 async function saveMatch(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!isAdmin||!editMatch)return;
  const data=new FormData(e.currentTarget), status=String(data.get("status")) as Match["status"];
  const score1=data.get("score1")===""?null:Number(data.get("score1"));const score2=data.get("score2")===""?null:Number(data.get("score2"));
  const penalty1=data.get("penalty1")===""?null:Number(data.get("penalty1"));const penalty2=data.get("penalty2")===""?null:Number(data.get("penalty2"));
  if(status==="completed"&&(score1===null||score2===null||(score1===score2&&(penalty1===null||penalty2===null||penalty1===penalty2)))){
   setError("ผลที่เสมอหลังเวลาปกติต้องบันทึกสกอร์ยิงจุดโทษเพื่อระบุผู้ชนะก่อนบันทึกผล");return;
  }
  const payload={scheduled_date:String(data.get("date")||"")||null,start_time:String(data.get("time")||"")||null,
   venue_name:String(data.get("venue")||""),team1_name:String(data.get("team1")||""),team2_name:String(data.get("team2")||""),
   score1:status==="completed"?score1:null,score2:status==="completed"?score2:null,
   penalty1:status==="completed"?penalty1:null,penalty2:status==="completed"?penalty2:null,
   notes:String(data.get("notes")||""),status};
  setBusy(true);setError("");try{const r=await supabase.from("sports_football_matches").update(payload).eq("id",editMatch.id);
   if(r.error)throw r.error;setEditMatch(null);setMessage("บันทึกโปรแกรม/ผลการแข่งขันสำเร็จ");await refresh();
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function loadHistory(){if(!isAdmin||!selectedEvent)return;
  const result=await supabase.from("sports_football_match_history").select("id,changed_at,changed_by,before_data,after_data").eq("event_id",selectedEvent.id).order("changed_at",{ascending:false}).limit(150);
  if(result.error)setError(result.error.message);else setHistory((result.data||[]) as History[]);
 }
 return <main className="min-h-screen bg-[#f1f5f9] pb-16 text-slate-900">
  <header className="bg-[#09142f] px-4 pb-5 pt-4 text-white sm:px-6">
   <div className="mx-auto max-w-7xl">
    <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-rose-100"><div className="flex flex-wrap gap-4"><Link href="/group-sports?section=results" className="hover:underline">← กลับหน้าผลการแข่งขัน</Link><Link href="/group-sports" className="hover:underline">โปรแกรมกีฬาทั้งหมด</Link></div><span>{email||"ผู้เข้าชม"}</span></div>
    <div className="rounded-xl border border-white/15 bg-gradient-to-r from-[#5d101a] via-[#991b1b] to-[#15234d] px-5 py-4 shadow-lg sm:px-7">
     <p className="text-xs font-bold tracking-[.18em] text-amber-300">PHULANGKA GAMES 2026 · FOOTBALL</p>
     <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">ระบบจัดการแข่งขันฟุตบอล</h1>
     <p className="mt-1 text-xs text-white/80">กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 · ทั้ง 4 ประเภท</p>
    </div>
   </div>
  </header>
  <div className="mx-auto max-w-7xl space-y-4 px-4 pt-4 sm:px-6">
   {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
   {message&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{message}</div>}
   {loading&&<div className={panel}>กำลังโหลดข้อมูลฟุตบอล…</div>}
   {!loading&&<>
    <section className={panel}>
     <h2 className="mb-3 font-extrabold text-red-950">เลือกรุ่นการแข่งขันฟุตบอล (4 ประเภท)</h2>
     <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{FOOTBALL_CODES.map(key=><button type="button" key={key} disabled={busy||backupBusy} onClick={()=>setCode(key)}
      className={`min-h-16 rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition ${code===key?"border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200":"border-rose-200 bg-white text-red-900 hover:bg-rose-50"}`}>
      {FOOTBALL_CONFIG[key].title}</button>)}</div>
     <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><p>{config.venue} · {config.dateRange}</p><span className="rounded-full bg-rose-50 px-3 py-1 font-bold text-red-800">{config.matches} คู่ · {config.groupCount} สาย</span></div>
    </section>
    <div className="grid gap-3 sm:grid-cols-3"><div className={panel}><p className="text-xs text-slate-500">ทีมในสาย</p><p className="text-2xl font-black">{selectedEvent?eventTeams.length:"—"}</p></div><div className={panel}><p className="text-xs text-slate-500">คู่แข่งขันที่มองเห็น</p><p className="text-2xl font-black">{selectedEvent?eventMatches.length:"—"} / {config.matches}</p></div><div className={panel}><p className="text-xs text-slate-500">บันทึกผลแล้ว / เผยแพร่</p><p className="text-2xl font-black">{selectedEvent?completed:"—"} / {selectedEvent?published:"—"}</p></div></div>
    <nav className="flex flex-wrap items-center gap-2" aria-label="เมนูฟุตบอล">{tabs.map(t=><button key={t.key} type="button" disabled={busy||backupBusy} onClick={()=>{setTab(t.key);setEditMatch(null);if(t.key==="history")void loadHistory();}}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-extrabold ${tab===t.key?"border-red-900 bg-red-800 text-white shadow ring-2 ring-rose-200":"border-rose-200 bg-white text-red-900 hover:bg-rose-50"}`}>{t.label}</button>)}
      <button type="button" disabled={busy||backupBusy} onClick={()=>void refresh()} className={`${ghostButton} ml-auto`}>รีเฟรชข้อมูล</button></nav>
    {(!selectedEvent||eventMatches.length===0)&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{!selectedEvent
      ? "รุ่นนี้ยังไม่เปิดแสดงต่อผู้ชมทั่วไป หรือรายการยังไม่ได้ติดตั้งในฐานข้อมูล — ตัวเลขจากเอกสารไม่ใช่ข้อมูลที่ดึงจากฐานข้อมูล"
      : "รายการนี้เปิดแสดงแล้ว แต่ยังไม่มีคู่แข่งขันที่เผยแพร่ให้บัญชีนี้เห็น"}
      {isAdmin?" · ตรวจการติดตั้ง SQL 0026 และข้อมูลรายการใน Supabase":" · รอผู้ดูแลตรวจสอบและเผยแพร่โปรแกรม"}</div>}
    {tab==="schedule"&&<section className={panel}>
     <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">โปรแกรมและผลการแข่งขัน</h2><p className="text-sm text-slate-500">ตารางตาม PDF ต้นฉบับ · วันเวลาแสดงจากฐานข้อมูลจริง</p></div>
      {isAdmin&&selectedEvent&&<div className="flex flex-wrap gap-2">
       {selectedEvent.status==="draft"&&<button disabled={busy} onClick={()=>void activatePublicView()} className={ghostButton}>เปิดแสดงรุ่นนี้ (ยังไม่รับสมัคร)</button>}
       {selectedEvent.status!=="registration"&&<button disabled={busy} onClick={()=>void activateRegistration()} className={ghostButton}>เปิดรับสมัครนักกีฬา</button>}
       <button disabled={busy||selectedEvent.status==="draft"||!isScheduleChecked||!eventMatches.some(m=>m.status==="draft")} onClick={()=>void publish()} className={redButton}>เผยแพร่โปรแกรม ({eventMatches.filter(m=>m.status==="draft").length} คู่)</button>
      </div>}
     </div>
     {isAdmin&&eventMatches.some(m=>collisionMatchIds.has(m.id))&&<p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">พบคู่ฟุตบอลที่ใช้สนาม วัน และเวลาเดียวกัน กรุณาแก้ไขก่อนเผยแพร่</p>}
     {isAdmin&&<div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-red-900">ขั้นตอน: 1) เปิดแสดงรุ่นให้เห็นสาย (ยังไม่เปิดรับสมัคร) 2) ตรวจคู่ วัน เวลา สนาม 3) เผยแพร่โปรแกรม · การเปิดรับสมัครนักกีฬาเป็นปุ่มแยกต่างหาก · โปรแกรมฉบับร่างยังไม่แสดงแก่ผู้ชมทั่วไป</div>}
     <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-rose-50 text-red-950"><tr><th className="p-3">คู่ที่</th><th className="p-3">วัน / เวลา</th><th className="p-3">รอบ / สาย</th><th className="p-3">คู่แข่งขัน</th><th className="p-3">ผล</th><th className="p-3">สถานะ</th>{isAdmin&&<th className="p-3">จัดการ</th>}</tr></thead>
      <tbody>{eventMatches.map(m=><tr key={m.id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-bold">{m.match_no}</td><td className="p-3 whitespace-nowrap">{formatThaiFootballDate(m.scheduled_date)}<br/><span className="font-bold text-red-900">{m.start_time?.slice(0,5)||"—"} น.</span></td>
       <td className="p-3 whitespace-nowrap">{stageNames[m.stage]}{m.group_code?` · สาย ${m.group_code}`:""}</td>
       <td className="p-3"><strong>{resolvedName(m.team1_name)}</strong><span className="px-2 text-slate-400">พบ</span><strong>{resolvedName(m.team2_name)}</strong></td>
       <td className="p-3 whitespace-nowrap font-black text-red-900">{signedScore(m)}</td><td className="p-3 text-xs">{statusNames[m.status]}</td>
       {isAdmin&&<td className="p-3"><button type="button" onClick={()=>{setEditMatch(m);setError("");}} className={ghostButton}>แก้ไข / บันทึกผล</button></td>}
      </tr>)}</tbody></table></div>
     {!eventMatches.length&&<p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มีโปรแกรมที่เผยแพร่</p>}
     {isAdmin&&editMatch&&<form onSubmit={e=>void saveMatch(e)} className="mt-5 space-y-3 rounded-2xl border border-red-300 bg-[#fff9f9] p-4" key={editMatch.id}>
      <div className="flex items-center justify-between gap-2"><h3 className="font-black">แก้ไขคู่ที่ {editMatch.match_no} · {config.compact}</h3><button type="button" onClick={()=>setEditMatch(null)} className={ghostButton}>ปิด</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold">วันที่<input type="date" name="date" defaultValue={editMatch.scheduled_date||""} className={control} required/></label><label className="text-xs font-semibold">เวลา<input type="time" name="time" defaultValue={editMatch.start_time?.slice(0,5)||""} className={control} required/></label><label className="text-xs font-semibold sm:col-span-2">สนาม<input name="venue" defaultValue={editMatch.venue_name} className={control} required/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">ทีมแรก<input name="team1" defaultValue={resolvedName(editMatch.team1_name)} className={control} required/></label><label className="text-xs font-semibold">ทีมที่สอง<input name="team2" defaultValue={resolvedName(editMatch.team2_name)} className={control} required/></label></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-semibold">ประตูทีมแรก<input type="number" min="0" max="99" name="score1" defaultValue={editMatch.score1??""} className={control}/></label><label className="text-xs font-semibold">ประตูทีมที่สอง<input type="number" min="0" max="99" name="score2" defaultValue={editMatch.score2??""} className={control}/></label><label className="text-xs font-semibold">จุดโทษทีมแรก<input type="number" min="0" max="99" name="penalty1" defaultValue={editMatch.penalty1??""} className={control}/></label><label className="text-xs font-semibold">จุดโทษทีมที่สอง<input type="number" min="0" max="99" name="penalty2" defaultValue={editMatch.penalty2??""} className={control}/></label><label className="text-xs font-semibold">สถานะ<select name="status" defaultValue={editMatch.status} className={control}>{Object.entries(statusNames).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label></div>
      <label className="block text-xs font-semibold">หมายเหตุ<textarea name="notes" defaultValue={editMatch.notes} className={control} rows={2}/></label>
      <p className="text-xs text-slate-600">ถ้าเสมอในเวลาปกติ ต้องกรอกผลยิงจุดโทษด้วยเมื่อบันทึกผลเสร็จสิ้น · บันทึกข้อมูลจริงใน Supabase</p>
      <button type="submit" disabled={busy} className={redButton}>บันทึกโปรแกรม / ผล</button></form>}
    </section>}
    {tab==="groups"&&<section className={panel}><h2 className="text-lg font-black">รายชื่อทีมและการแบ่งสาย</h2><p className="mt-1 text-sm text-slate-500">ยึดตามผังสายจาก PDF ต้นฉบับ</p>
     <div className="mt-4 grid gap-3 md:grid-cols-2">{groupCodes.map(g=><div key={g} className="rounded-xl border border-rose-200"><div className="bg-rose-50 px-4 py-3 font-black text-red-900">สาย {g}</div><ol className="divide-y divide-slate-100">{eventTeams.filter(t=>t.group_code===g).sort((a,b)=>a.seed_order-b.seed_order).map((team,i)=><li key={team.id} className="px-4 py-3 text-sm"><span className="mr-3 text-slate-500">{i+1}.</span>{team.school_name}</li>)}</ol></div>)}</div>
     {!eventTeams.length&&<p className="mt-3 text-slate-500">ยังไม่มีข้อมูลสายที่เผยแพร่</p>}
    </section>}
    {tab==="standings"&&<section className={panel}><h2 className="text-lg font-black">ตารางคะแนน · {config.compact}</h2><p className="mt-1 text-sm text-slate-500">ชนะ 3 คะแนน แพ้ 0 คะแนน · ผลเสมอในเวลาปกติพิจารณาผู้ชนะจากจุดโทษ</p>
     <div className="mt-4 space-y-4">{standings.map(s=><div key={s.group} className="overflow-x-auto rounded-xl border border-slate-200"><h3 className="bg-rose-50 px-4 py-3 font-black text-red-900">สาย {s.group}</h3><table className="w-full min-w-[600px] text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["อันดับ","โรงเรียน","แข่ง","ชนะ","แพ้","ได้/เสีย","ผลต่าง","คะแนน"].map(x=><th key={x} className="px-3 py-2 text-left">{x}</th>)}</tr></thead><tbody>{s.rows.map((row,i)=><tr key={row.school} className="border-t"><td className="p-3 font-bold">{i+1}</td><td className="p-3 font-bold">{row.school}</td><td className="p-3">{row.played}</td><td className="p-3">{row.win}</td><td className="p-3">{row.loss}</td><td className="p-3">{row.scored}/{row.conceded}</td><td className="p-3">{row.scored-row.conceded}</td><td className="p-3 font-black text-red-800">{row.points}</td></tr>)}</tbody></table></div>)}</div>
     <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">หากคะแนนและผลต่างประตูเท่ากัน ให้กรรมการตรวจผลการพบกันและจับสลากตามระเบียบก่อนยืนยันอันดับ ระบบไม่ตัดสินกรณีดังกล่าวแทนกรรมการ</p>
    </section>}
    {tab==="knockout"&&<section className={panel}><h2 className="text-lg font-black">สายการแข่งขันรอบน็อกเอาต์</h2><p className="mt-1 text-sm text-slate-500">รอบและเวลาอ้างอิง PDF · ทีมที่เข้ารอบจะแสดงตามผลจริงที่บันทึกแล้ว ผู้ดูแลสามารถยืนยันหรือแก้ไขชื่อทีมได้</p>
     {code==="GS3-FB-UM"&&<p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">รุ่นไม่จำกัดอายุชายต้องจับสลากทีมอันดับ 3 เพิ่ม 2 ทีมตามระเบียบ จึงไม่กำหนดคู่รอบ 8 ทีมอัตโนมัติโดยไม่ได้จับสลากจริง</p>}
     <div className="mt-4 grid gap-3 md:grid-cols-2">{eventMatches.filter(x=>x.stage!=="group").map(m=><div key={m.id} className="rounded-xl border border-rose-200 bg-white p-4"><div className="flex justify-between gap-2"><span className="text-xs font-bold text-red-800">{stageNames[m.stage]} · คู่ที่ {m.match_no}</span><span className="text-xs">{formatThaiFootballDate(m.scheduled_date)} · {m.start_time?.slice(0,5)} น.</span></div><div className="mt-3 text-sm font-black">{resolvedName(m.team1_name)} <span className="px-2 text-slate-400">พบ</span> {resolvedName(m.team2_name)}</div><div className="mt-2 font-black text-red-900">{signedScore(m)}</div>{isAdmin&&<button onClick={()=>{setTab("schedule");setEditMatch(m);}} className={`${ghostButton} mt-3`}>กำหนดทีม / บันทึกผล</button>}</div>)}</div>
    </section>}
    {tab==="registration"&&<section className={panel}>
      <div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-lg font-black">ลงทะเบียนนักกีฬาฟุตบอล</h2><p className="mt-1 text-sm text-slate-500">โรงเรียนละ 1 ทีมต่อประเภท · ข้อมูลรับทันที ตรวจตัวและระเบียบที่สนาม</p></div><span className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-red-800">ใช้ร่วมกับระบบบัญชีโรงเรียนเดิม</span></div>
      {!email&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">กรุณา <Link href="/group-sports/login" className="font-bold underline">เข้าสู่ระบบบัญชีโรงเรียน</Link> ก่อนลงทะเบียน</p>}
      {selectedEvent?.status!=="registration"&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">ยังไม่เปิดรับสมัครรุ่นนี้ Admin ต้องเปิดรับสมัครก่อน</p>}
      {isAdmin&&<button type="button" disabled={busy||backupBusy} onClick={()=>void backupAll()} className={`${ghostButton} mt-3`}>{backupBusy?"กำลังสำรองข้อมูล…":"ดาวน์โหลด Excel สำรองฟุตบอลทั้ง 4 รุ่น (Admin)"}</button>}
      {canRegister&&<form onSubmit={e=>void register(e)} className="mt-4"><fieldset disabled={busy||backupBusy} className="space-y-4">
       <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">โรงเรียน<select disabled={Boolean(selectedEntry)} value={schoolId} onChange={e=>{setSchoolId(e.target.value);setSelectedEntry(null);setPlayers([newPlayer()]);setCoaches([newCoach()]);setManagerName("");setManagerPhone("");setManagerPhoto(undefined);setImportPreview(null);}} className={control}>{eligibleSchools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-bold">ประเภทการแข่งขัน<input disabled readOnly value={config.title} className={`${control} bg-slate-50`}/></label></div>
       <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="font-extrabold">ครูผู้ควบคุมทีม</h3><button type="button" disabled={coaches.length>=30} onClick={()=>setCoaches(prev=>[...prev,newCoach()])} className={ghostButton}>+ เพิ่มครู</button></div>
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
        <h4 className="font-bold text-red-900">ผู้จัดการทีม (สำหรับแผงรูปและลายเซ็น)</h4>
        <p className="mt-1 text-xs text-slate-600">ชื่อผู้จัดการทีมแยกจากชื่อผู้อำนวยการโรงเรียน · หากยังไม่ทราบชื่อ เว้นว่างไว้ก่อนได้ และเพิ่มหลังจากนั้น</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className={control} aria-label="ชื่อผู้จัดการทีม" placeholder="ชื่อ–สกุลผู้จัดการทีม" value={managerName} onChange={e=>setManagerName(e.target.value)}/>
          <input className={control} aria-label="เบอร์โทรศัพท์ผู้จัดการทีม (ไม่บังคับ)" inputMode="tel" placeholder="เบอร์โทรศัพท์ (ไม่บังคับ)" value={managerPhone} onChange={e=>setManagerPhone(e.target.value)}/>
        </div>
        <FootballPhotoPicker label="รูปผู้จัดการทีม" file={managerPhoto} onChange={setManagerPhoto}/>
       </div>
       <p className="mb-2 text-xs text-slate-600">ครูผู้ควบคุมคนแรกแสดงเป็นผู้ฝึกสอน และคนถัดไปเป็นผู้ช่วยผู้ฝึกสอนในแผงรูป</p><div className="space-y-2">{coaches.map((c,i)=><div key={i} className="rounded-lg border border-slate-200 p-2"><p className="mb-1 text-xs font-bold">{i===0?"ผู้ฝึกสอน":`ผู้ช่วยผู้ฝึกสอน คนที่ ${i}`}</p><div className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={`ชื่อครู ${i+1}`} required className={control} placeholder="ชื่อ–สกุลครูผู้ควบคุม" value={c.name} onChange={e=>editCoach(i,"name",e.target.value)}/><input aria-label={`โทรศัพท์ครู ${i+1}`} required className={control} inputMode="tel" placeholder="เบอร์โทรศัพท์" value={c.phone} onChange={e=>editCoach(i,"phone",e.target.value)}/><button type="button" disabled={coaches.length===1} onClick={()=>setCoaches(prev=>prev.filter((_,n)=>n!==i))} className={ghostButton}>ลบ</button></div><FootballPhotoPicker label={i===0?"รูปผู้ฝึกสอน":`รูปผู้ช่วยผู้ฝึกสอน คนที่ ${i}`} file={c.photo} onChange={file=>setCoaches(prev=>prev.map((x,j)=>j===i?{...x,photo:file}:x))}/></div>)}</div>
       </div>
       <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">นำเข้ารายชื่อจาก Excel</h3><p className="text-xs text-slate-600">ดาวน์โหลดแม่แบบเฉพาะรุ่น เลือกวัน เดือนภาษาไทย ปี พ.ศ. ใน Excel กรอกไม่เกิน 20 คน แล้วอัปโหลดตรวจรายชื่อก่อนใช้</p></div><button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white" onClick={()=>void downloadFootballRosterTemplate(code).catch(e=>setError(errorText(e)))}>↓ ดาวน์โหลด Excel</button></div>
         <input type="file" aria-label="นำเข้า Excel ฟุตบอล" accept=".xlsx" className="mt-3 block w-full text-xs" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(!file)return;
          void importFootballRosterExcel(file,code).then(rows=>{setImportPreview(rows);setError("");}).catch(err=>{setError(errorText(err));setImportPreview(null);});}}/>
         {importPreview&&<div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3"><p className="text-sm font-bold">ตรวจพบ {importPreview.length} คน จาก Excel กรุณาตรวจชื่อ วันเกิด และหมายเลขเสื้อก่อนนำมาใช้</p><div className="mt-2 max-h-40 overflow-y-auto text-xs">{importPreview.map((p,i)=><p key={i}>{i+1}. {p.prefix}{p.name} · {formatThaiFootballDate(p.birth_date)} · เสื้อ {p.jersey_number}</p>)}</div><div className="mt-3 flex gap-2"><button type="button" className={redButton} onClick={()=>{setPlayers(importPreview.map(p=>({...p})));setImportPreview(null);}}>ใช้รายชื่อในฟอร์ม</button><button type="button" className={ghostButton} onClick={()=>setImportPreview(null)}>ยกเลิก</button></div></div>}
        </div>
       <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex flex-wrap justify-between gap-2"><div><h3 className="font-extrabold">รายชื่อนักกีฬา ({players.length}/20)</h3><p className="text-xs text-slate-500">กรอกชื่อ วันเกิด เบอร์เสื้อ และระบุผู้เล่นจริง/สำรองได้ตามแบบฟอร์ม · ไม่มีการตรวจสอบกติกาคุณสมบัติอัตโนมัติ</p></div><button type="button" disabled={players.length>=20} onClick={()=>setPlayers(prev=>[...prev,newPlayer()])} className={ghostButton}>+ เพิ่มนักกีฬา</button></div>
        <div className="space-y-3">{players.map((p,i)=><div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold">นักกีฬาคนที่ {i+1}</span><button type="button" disabled={players.length===1} onClick={()=>setPlayers(prev=>prev.filter((_,n)=>n!==i))} className="text-xs font-bold text-red-800 disabled:text-slate-400">ลบคนนี้</button></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold">คำนำหน้าชื่อ<select required className={control} value={p.prefix} onChange={e=>editPlayer(i,"prefix",e.target.value)}><option value="">เลือกคำนำหน้า</option>{FOOTBALL_NAME_PREFIXES.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="text-xs font-bold sm:col-span-1">ชื่อ–สกุล<input required className={control} value={p.name} onChange={e=>editPlayer(i,"name",e.target.value)} placeholder="ชื่อ–สกุล"/></label><div className="text-xs font-bold"><span>วันเดือนปีเกิด (พ.ศ.)</span><ThaiDatePicker required className={control} value={p.birth_date} onChange={value=>editPlayer(i,"birth_date",value)}/></div><label className="text-xs font-bold">เบอร์เสื้อ<input type="number" min="0" max="99" required className={control} value={p.jersey_number} onChange={e=>editPlayer(i,"jersey_number",e.target.value)}/></label></div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold">รหัสนักเรียน (ถ้ามี)<input className={control} value={p.student_code} onChange={e=>editPlayer(i,"student_code",e.target.value)}/></label><label className="text-xs font-bold">ตำแหน่ง (เลือกได้)<select className={control} value={p.player_role} onChange={e=>editPlayer(i,"player_role",e.target.value)}><option value="">ยังไม่ระบุ</option><option value="ผู้เล่นจริง">ผู้เล่นจริง</option><option value="สำรอง">ตัวสำรอง</option></select></label><label className="text-xs font-bold">หมายเหตุ<input className={control} value={p.player_note} onChange={e=>editPlayer(i,"player_note",e.target.value)} placeholder="ถ้ามี"/></label></div>
          <FootballPhotoPicker label={`รูปนักกีฬาคนที่ ${i+1}`} file={p.photo} onChange={file=>setPlayers(prev=>prev.map((x,j)=>j===i?{...x,photo:file}:x))}/>
        </div>)}</div>
       </div>
       <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy||!selectedEvent} className={redButton}>{busy?"กำลังบันทึก…":selectedEntry?"บันทึกแก้ไขใบสมัคร":"ส่งใบสมัครนักกีฬา"}</button><button type="button" onClick={()=>{setSelectedEntry(null);setPlayers([newPlayer()]);setCoaches([newCoach()]);setManagerName("");setManagerPhone("");setManagerPhoto(undefined);setImportPreview(null);}} className={ghostButton}>เริ่มใบสมัครใหม่ / ล้างแบบฟอร์ม</button></div>
      </fieldset></form>}
      {selectedEntry&&<div className="mt-5 rounded-xl border border-rose-200 p-4"><h3 className="font-black">ใบสมัคร: {selectedEntry.school_name}</h3><p className="mt-1 text-xs text-slate-600">แนบรูปนักกีฬาได้หลังบันทึกใบสมัคร โดยไม่ต้องลงทะเบียนใหม่</p><FootballSavedPhotos disabled={busy||backupBusy} key={selectedEntry.id} roster={{...selectedEntry,code}}/>
       <Link href={`/group-sports/football/print?entry=${encodeURIComponent(selectedEntry.id)}`} target="_blank" className={`${redButton} mt-3 inline-flex`}>พิมพ์ใบรายชื่อ / แผงรูป / บันทึก PDF ↗</Link></div>}
      {!!email&&<div className="mt-5"><div className="flex justify-between gap-2"><h3 className="font-black">ใบสมัครที่บันทึกแล้ว ({savedEntries.length})</h3><button type="button" disabled={busy||backupBusy} onClick={()=>void loadEntries()} className={ghostButton}>รีเฟรช</button></div><div className="mt-2 space-y-2">{savedEntries.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm"><div><strong>{x.school_name}</strong><p className="text-xs text-slate-500">{x.athlete_count} คน · รับข้อมูลแล้ว ตรวจตัวจริงที่สนาม</p></div><div className="flex gap-2"><button disabled={busy||backupBusy} onClick={()=>void loadRoster(x.id)} className={ghostButton}>ดูรายชื่อ / แนบรูป / แก้ไข</button><Link target="_blank" href={`/group-sports/football/print?entry=${encodeURIComponent(x.id)}`} className={ghostButton}>พิมพ์ PDF</Link></div></div>)}</div>
       {!savedEntries.length&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">ยังไม่มีใบสมัครในรายการนี้</p>}
      </div>}
    </section>}
    {tab==="rules"&&<section className={panel}><h2 className="text-lg font-black">ระเบียบการแข่งขันและแบบฟอร์ม</h2><p className="mt-2 text-sm leading-7 text-slate-600">ระบบแสดงระเบียบต้นฉบับเป็นเอกสารให้โรงเรียนอ่าน ไม่ใช้กติกาการเปลี่ยนตัว อายุที่เคยสังกัด หรือประวัติผู้เล่นมาตรวจสอบหรือบล็อกการสมัครอัตโนมัติ</p>
     <Link href={config.source} target="_blank" className={`${redButton} mt-4 inline-flex`}>เปิด PDF โปรแกรมและระเบียบฉบับเต็ม ↗</Link>
     <p className="mt-3 text-xs text-slate-500">เอกสารประกอบการส่งรายชื่อ แผงรูป และลายเซ็นผู้จัดการทีมอยู่ในไฟล์เดียวกันและในหน้าพิมพ์ใบสมัคร</p>
     {config.notes&&<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{config.notes}</div>}
    </section>}
    {tab==="history"&&<section className={panel}><h2 className="text-lg font-black">ประวัติการแก้ไขโปรแกรมและผล</h2>{!isAdmin?<p className="mt-2 text-sm text-slate-600">เฉพาะผู้ดูแลการแข่งขัน</p>:<><button onClick={()=>void loadHistory()} className={`${ghostButton} mt-2`}>โหลดประวัติ</button><div className="mt-3 space-y-2">{history.map(x=><div className="rounded-lg border border-slate-200 p-3 text-xs" key={x.id}><p className="font-bold">{formatThaiFootballDate(x.changed_at.slice(0,10))} · {new Date(x.changed_at).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok"})}</p><p className="mt-1 text-slate-600">ก่อน: {String(x.before_data?.status||"")} · หลัง: {String(x.after_data?.status||"")} · ผล {String(x.after_data?.score1??"-")} : {String(x.after_data?.score2??"-")}</p></div>)}{!history.length&&<p className="text-sm text-slate-500">ยังไม่มีประวัติที่แสดง</p>}</div></>}</section>}
    <p className="pb-4 text-xs text-slate-500">โปรแกรมฟุตบอลตามเอกสารปี 2569 · ระบบแยกจาก E-Sport โดยไม่กระทบผลการแข่งขัน RoV</p>
   </>}
  </div>
 </main>;
}
