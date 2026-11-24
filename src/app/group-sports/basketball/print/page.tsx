"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadAthletePhoto } from "@/lib/group-sports/rov-photos";
import { type FootballCoach } from "@/lib/group-sports/football-staff";
import "../../football/print/football-print.css";

type Player={full_name:string;student_code:string|null;grade_level:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string};
type Details={id:string;school_name:string;director_name:string|null;sport_name:string;players:Player[];coaches:FootballCoach[]};

function thaiDate(value:string|null){
 if(!value)return "";
 const date=new Date(`${value}T12:00:00+07:00`);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Bangkok"}).format(date);
}
function printPlayerPhoto(player:Player|undefined, index:number, url:string|undefined){
 return <div key={`athlete-${index}`} className="football-photo-slot">
  <div className="football-photo-frame">{player&&url?<img src={url} alt={`รูปนักกีฬา ${player.full_name}`}/>:<span>{player?"ยังไม่ได้แนบรูป":"รูปถ่าย"}<br/>นักกีฬา {index+1}</span>}</div>
  <div className="football-photo-caption"><b>หมายเลข {player?.jersey_number??"........"}</b><p>{player?.full_name||"ชื่อ–สกุล ............................."}</p><p>ว/ด/ป เกิด {thaiDate(player?.birth_date||null)||"......................"}</p></div>
 </div>;
}
export default function BasketballPrintPage(){
 const [entry,setEntry]=useState("");
 const [data,setData]=useState<Details|null>(null);
 const [photos,setPhotos]=useState<Record<number,string>>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{setEntry(new URLSearchParams(window.location.search).get("entry")||"");},[]);
 useEffect(()=>{
  if(!entry){setLoading(false);return;}
  let cancelled=false;
  const objectUrls:string[]=[];
  setData(null);setPhotos({});setLoading(true);setError("");
  void(async()=>{try{
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry))throw new Error("รหัสใบสมัครไม่ถูกต้อง");
   const result=await supabase.rpc("sports_basketball_roster_details",{p_entry:entry});
   if(result.error)throw result.error;
   const details=result.data as Details;
   if(cancelled)return;
   setData(details);
   const athleteUrls:Record<number,string>={};
   // Bounded concurrency, so teams with twenty players do not flood Storage.
   const requests:(()=>Promise<void>)[]=[
    ...details.players.map((player,i)=>async()=>{
     const url=await downloadAthletePhoto(entry,i,{full_name:player.full_name,student_code:player.student_code}).catch(()=>null);
     if(url){if(cancelled)URL.revokeObjectURL(url);else{objectUrls.push(url);athleteUrls[i]=url;}}
    }),
   ];
   for(let i=0;i<requests.length&&!cancelled;i+=6)await Promise.all(requests.slice(i,i+6).map(fn=>fn()));
   if(!cancelled){setPhotos(athleteUrls);}
  }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"อ่านใบสมัครไม่สำเร็จ");}
  finally{if(!cancelled)setLoading(false);}})();
  return()=>{cancelled=true;objectUrls.forEach(url=>URL.revokeObjectURL(url));};
 },[entry]);
 const playerRows=Array.from({length:12},(_,i)=>data?.players[i]||null);
 const readyToPrint=Boolean(data&&!loading&&!error);
 return <main className="football-print-area">
  <div className="football-print-tools">
   <a href="/group-sports/basketball">← กลับหน้าบาสเกตบอล</a>
   <button disabled={!readyToPrint} onClick={()=>window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
   <span role="status">{loading?"กำลังเตรียมใบสมัครและรูปภาพ…":error||(!entry?"ไม่พบรหัสใบสมัคร":data?`${data.players.length} คน · รูปนักกีฬา ${Object.keys(photos).length} รูป`:"ยังไม่มีใบสมัคร")}</span>
  </div>
  {error&&<p className="football-print-error" role="alert">{error}</p>}
  {!entry&&!loading&&<p className="football-print-error" role="alert">กรุณากลับไปเลือกใบสมัครที่ต้องการพิมพ์</p>}
  {data&&<>
   <section className="football-a4 football-sheet">
    <header><h1>ใบรายชื่อนักกีฬาบาสเกตบอล</h1><p>กีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา ปีการศึกษา 2569</p><h2>{data.school_name} · {data.sport_name}</h2></header>
    <table><thead><tr><th>ลำดับ</th><th>ชื่อ–สกุล</th><th>หมายเลขเสื้อ</th><th>ลายมือชื่อ</th></tr></thead><tbody>{playerRows.map((p,i)=><tr key={i}><td>{i+1}</td><td className="left">{p?.full_name||""}</td><td>{p?.jersey_number??""}</td><td></td></tr>)}{[{title:"ผู้ฝึกสอน",name:data.coaches?.[0]?.name,phone:data.coaches?.[0]?.phone},{title:"ผู้ช่วยผู้ฝึกสอน",name:data.coaches?.[1]?.name,phone:data.coaches?.[1]?.phone},{title:"ผู้จัดการทีม",name:data.coaches?.[0]?.manager_name,phone:data.coaches?.[0]?.manager_phone}].map(c=><tr key={c.title}><td>{c.title}</td><td>{c.name||""}</td><td colSpan={2}>{c.phone||""}</td></tr>)}</tbody></table>
    <footer>ลงชื่อ ................................................ ผู้ฝึกสอน<br/>(................................................)<br/><br/>ลงชื่อ ................................................<br/>( {data.director_name||"................................................"} )<br/>ตำแหน่ง ................................................ (ประทับตราสถานศึกษา)</footer>
   </section>
   <section className="football-a4 football-photos">
    <header><h1>แผงรูปนักกีฬาบาสเกตบอล</h1><p>กีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา ปีการศึกษา 2569</p><h2>{data.school_name} · {data.sport_name}</h2></header>
    <div className="football-photo-grid">{Array.from({length:12},(_,i)=>printPlayerPhoto(data.players[i],i,photos[i]))}</div>
    <footer>ขอรับรองว่ารูปถ่ายและข้อความข้างต้นเป็นจริงทุกประการ<br/>ลงชื่อ ................................ ผู้ฝึกสอน　ลงชื่อ ................................ ผู้บริหารสถานศึกษา (ประทับตรา)</footer>
   </section>
  </>}
 </main>;
}
