"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadAthletePhoto } from "@/lib/group-sports/rov-photos";
import { footballAgeOnStart, footballStaffSlots, type FootballCoach, type FootballStaffSlot } from "@/lib/group-sports/football-staff";
import "./football-print.css";

type Player={full_name:string;student_code:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string};
type Details={id:string;school_name:string;director_name:string|null;sport_name:string;players:Player[];coaches:FootballCoach[]};

function thaiDate(value:string|null){
 if(!value)return "";
 const date=new Date(`${value}T12:00:00+07:00`);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Bangkok"}).format(date);
}
function managerName(data:Details){return (data.coaches[0]?.manager_name||"").trim();}
function printPlayerPhoto(player:Player|undefined, index:number, url:string|undefined){
 return <div key={`athlete-${index}`} className="football-photo-slot">
  <div className="football-photo-frame">{player&&url?<img src={url} alt={`รูปนักกีฬา ${player.full_name}`}/>:<span>{player?"ยังไม่ได้แนบรูป":"รูปถ่าย"}<br/>นักกีฬา {index+1}</span>}</div>
  <div className="football-photo-caption"><b>หมายเลข {player?.jersey_number??"........"}</b><p>{player?.full_name||"ชื่อ–สกุล ............................."}</p><p>ว/ด/ป เกิด {thaiDate(player?.birth_date||null)||"......................"}</p></div>
 </div>;
}
function printStaffPhoto(slot:FootballStaffSlot, url:string|undefined){
 return <div className="football-photo-slot football-photo-staff" key={slot.key}>
  <div className="football-photo-frame">{slot.name&&url?<img src={url} alt={`รูป ${slot.title} ${slot.name}`}/>:<span>{slot.name?"ยังไม่ได้แนบรูป":"รูปถ่าย"}<br/>{slot.title}</span>}</div>
  <div className="football-photo-caption"><b>{slot.title}</b><p>{slot.name||"ชื่อ–สกุล ............................"}</p></div>
 </div>;
}
export default function FootballPrintPage(){
 const [entry,setEntry]=useState("");
 const [data,setData]=useState<Details|null>(null);
 const [photos,setPhotos]=useState<Record<number,string>>({});
 const [staffPhotos,setStaffPhotos]=useState<Record<string,string>>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{setEntry(new URLSearchParams(window.location.search).get("entry")||"");},[]);
 useEffect(()=>{
  if(!entry){setLoading(false);return;}
  let cancelled=false;
  const objectUrls:string[]=[];
  setData(null);setPhotos({});setStaffPhotos({});setLoading(true);setError("");
  void(async()=>{try{
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry))throw new Error("รหัสใบสมัครไม่ถูกต้อง");
   const result=await supabase.rpc("sports_football_roster_details",{p_entry:entry});
   if(result.error)throw result.error;
   const details=result.data as Details;
   if(cancelled)return;
   setData(details);
   const athleteUrls:Record<number,string>={};
   const staffUrls:Record<string,string>={};
   const staff=footballStaffSlots(details.coaches||[]).filter(s=>s.name);
   // Bounded concurrency, so teams with twenty players do not flood Storage.
   const requests:(()=>Promise<void>)[]=[
    ...details.players.map((player,i)=>async()=>{
     const url=await downloadAthletePhoto(entry,i,{full_name:player.full_name,student_code:player.student_code}).catch(()=>null);
     if(url){if(cancelled)URL.revokeObjectURL(url);else{objectUrls.push(url);athleteUrls[i]=url;}}
    }),
    ...staff.map(slot=>async()=>{
     const url=await downloadAthletePhoto(entry,slot.photoIndex,slot.identity).catch(()=>null);
     if(url){if(cancelled)URL.revokeObjectURL(url);else{objectUrls.push(url);staffUrls[slot.key]=url;}}
    }),
   ];
   for(let i=0;i<requests.length&&!cancelled;i+=6)await Promise.all(requests.slice(i,i+6).map(fn=>fn()));
   if(!cancelled){setPhotos(athleteUrls);setStaffPhotos(staffUrls);}
  }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"อ่านใบสมัครไม่สำเร็จ");}
  finally{if(!cancelled)setLoading(false);}})();
  return()=>{cancelled=true;objectUrls.forEach(url=>URL.revokeObjectURL(url));};
 },[entry]);
 const isOpenBoys=Boolean(data?.sport_name.includes("ไม่จำกัดอายุ ชาย"));
 const staff=useMemo(()=>footballStaffSlots(data?.coaches||[]),[data]);
 const extraStaff=staff.slice(4);
 const extraStaffPages=Array.from({length:Math.ceil(extraStaff.length/12)},(_,i)=>extraStaff.slice(i*12,(i+1)*12));
 const playerRows=Array.from({length:20},(_,i)=>data?.players[i]||null);
 const displayRole=(role:string,option:"P"|"S"|"N")=>{
  const name=role.trim();
  return option==="P"?name==="ผู้เล่นจริง":option==="S"?name==="สำรอง":!name;
 };
 const readyToPrint=Boolean(data&&!loading&&!error);
 return <main className="football-print-area">
  <div className="football-print-tools">
   <a href="/group-sports/football">← กลับหน้าฟุตบอล</a>
   <button disabled={!readyToPrint} onClick={()=>window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
   <span role="status">{loading?"กำลังเตรียมใบสมัครและรูปภาพ…":error||(!entry?"ไม่พบรหัสใบสมัคร":data?`${data.players.length} คน · รูปนักกีฬา ${Object.keys(photos).length} รูป · รูปเจ้าหน้าที่ ${Object.keys(staffPhotos).length} รูป`:"ยังไม่มีใบสมัคร")}</span>
  </div>
  {error&&<p className="football-print-error" role="alert">{error}</p>}
  {!entry&&!loading&&<p className="football-print-error" role="alert">กรุณากลับไปเลือกใบสมัครที่ต้องการพิมพ์</p>}
  {data&&<>
   <section className="football-a4 football-sheet">
    <header><h1>รายชื่อนักกีฬาฟุตบอล {data.sport_name.replace(/^ฟุตบอล\s*/,"")}</h1><p>กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p><h2>ชื่อทีมโรงเรียน {data.school_name}</h2></header>
    <table><thead><tr><th className="number">ลำดับ</th><th>ชื่อ–สกุล</th><th>วัน/เดือน/ปีเกิด</th><th>เบอร์เสื้อ</th><th>หมายเหตุ</th></tr></thead>
     <tbody>{playerRows.map((p,i)=><tr key={i}><td>{i+1}</td><td className="left">{p?.full_name||""}</td><td>{thaiDate(p?.birth_date||null)}</td><td>{p?.jersey_number??""}</td><td className="left">{p?.player_note||""}</td></tr>)}</tbody></table>
    <footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({managerName(data)||"..................................................."})</footer>
   </section>
   <section className="football-a4 football-sheet football-entry-list">
    <header><h1>ใบส่งรายชื่อนักกีฬาฟุตบอลทีมโรงเรียน {data.school_name}</h1><p>{data.sport_name} · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p></header>
    <table><thead><tr><th className="number">ลำดับ</th><th>ชื่อ–สกุล</th><th>เบอร์เสื้อ</th>
      {isOpenBoys?<><th>P</th><th>S</th><th>N</th><th>อายุ</th></>:<><th>ผู้เล่นจริง</th><th>สำรอง</th><th>อายุ</th></>}
     </tr></thead><tbody>{Array.from({length:isOpenBoys?22:20},(_,i)=>{
      const p=data.players[i];const age=footballAgeOnStart(p?.birth_date||null,data.sport_name);
      return <tr key={i}><td>{i+1}</td><td className="left">{p?.full_name||""}</td><td>{p?.jersey_number??""}</td>
       <td>{p&&(isOpenBoys?displayRole(p.player_role,"P"):p.player_role==="ผู้เล่นจริง")?"✓":""}</td>
       <td>{p&&(isOpenBoys?displayRole(p.player_role,"S"):p.player_role==="สำรอง")?"✓":""}</td>
       {isOpenBoys&&<td>{p&&displayRole(p.player_role,"N")?"✓":""}</td>}
       <td>{age??""}</td>
      </tr>;
     })}</tbody></table>
    <p className="football-print-legend">อายุ = จำนวนปีเต็ม ณ วันเริ่มการแข่งขัน{isOpenBoys?" · P = ผู้เล่นจริง · S = สำรอง · N = ยังไม่ระบุสถานะ":""} (ใช้แสดงข้อมูล ไม่ใช่การตรวจสอบคุณสมบัติ)</p>
    <footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({managerName(data)||"..................................................."})</footer>
   </section>
   <section className="football-a4 football-photos">
    <header><h1>แผงรูปนักกีฬาฟุตบอล</h1><p>{data.sport_name} · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p><h2>ทีมโรงเรียน {data.school_name} · หน้าที่ 1/2</h2></header>
    <div className="football-photo-grid">{Array.from({length:12},(_,i)=>printPlayerPhoto(data.players[i],i,photos[i]))}</div>
   </section>
   <section className="football-a4 football-photos football-photos-second">
    <header><h1>แผงรูปนักกีฬาฟุตบอล</h1><p>{data.sport_name} · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p><h2>ทีมโรงเรียน {data.school_name} · หน้าที่ 2/2</h2></header>
    <div className="football-photo-grid">
     {Array.from({length:8},(_,i)=>printPlayerPhoto(data.players[i+12],i+12,photos[i+12]))}
     {staff.slice(0,4).map(s=>printStaffPhoto(s,staffPhotos[s.key]))}
    </div>
    <footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({managerName(data)||"..................................................."})</footer>
   </section>
   {extraStaffPages.map((extraPage,i)=><section key={`staff-page-${i}`} className="football-a4 football-photos football-photos-extra">
    <header><h1>แผงรูปเจ้าหน้าที่ทีมเพิ่มเติม {i+1}/{extraStaffPages.length}</h1><p>{data.sport_name} · ทีมโรงเรียน {data.school_name}</p></header>
    <div className="football-photo-grid">{extraPage.map(s=>printStaffPhoto(s,staffPhotos[s.key]))}</div>
   </section>)}
   {isOpenBoys&&<p className="football-print-note">หมายเหตุ: ฟุตบอลชายไม่จำกัดอายุ ตามระเบียบรับสมัครนักกีฬาได้สูงสุด 20 คน แม้แบบใบส่งรายชื่อมี 22 ช่อง แผงรูปเป็นเอกสารประกอบตามที่ระบบกำหนด</p>}
  </>}
 </main>;
}
