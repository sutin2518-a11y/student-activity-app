"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadAthletePhoto } from "@/lib/group-sports/rov-photos";
import { futsalStaffSlots, type FutsalCoach } from "@/lib/group-sports/futsal-staff";
import "./futsal-print.css";
type Player={full_name:string;student_code:string|null;grade_level:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string};
type Details={id:string;school_name:string;director_name:string|null;sport_name:string;players:Player[];coaches:FutsalCoach[]};
function thaiDate(value:string|null){
 if(!value)return "";
 const date=new Date(`${value}T12:00:00+07:00`);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("th-TH-u-ca-buddhist",{day:"numeric",month:"numeric",year:"numeric",timeZone:"Asia/Bangkok"}).format(date);
}
function Photo({url,name,number,role}:{url?:string;name?:string;number?:number|null;role?:string}){
 return <div className="fs-photo"><div className="fs-frame">{url&&name?<img src={url} alt={`รูป ${name}`}/>:null}</div>{role?<><div className="fs-caption">ชื่อ {name||"........................"}</div><div>{role}</div></>:<><div>หมายเลข {number??"........"}</div><div className="fs-caption">ชื่อ {name||"........................"}</div></>}</div>;
}
export default function FutsalPrintPage(){
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
   const result=await supabase.rpc("sports_futsal_roster_details",{p_entry:entry});
   if(result.error)throw result.error;
   const details=result.data as Details;
   if(cancelled)return;
   setData(details);
   const athleteUrls:Record<number,string>={};
   const staffUrls:Record<string,string>={};
   const staff=futsalStaffSlots(details.coaches||[]).filter(s=>s.name);
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
 const staff=futsalStaffSlots(data?.coaches||[]);
 const missing=data?data.players.length-Object.keys(photos).length+staff.slice(0,4).filter(s=>!s.name||!staffPhotos[s.key]).length:0;
 const ready=Boolean(data&&!loading&&!error);
 const sport=data?.sport_name||"";
 const nameOf=(key:string)=>staff.find(s=>s.key===key)?.name||"";
 return <main className="fs-print-area">
  <div className="fs-print-tools"><a href="/group-sports/futsal?tab=registration">← กลับหน้าฟุตซอล</a><button disabled={!ready} onClick={async ()=>{if(!missing||(await sportsConfirm(`ยังขาดรูป/ชื่อ ${missing} ช่อง (รวมเจ้าหน้าที่) ต้องการพิมพ์ฉบับไม่สมบูรณ์หรือไม่?`)))window.print();}}>พิมพ์ / บันทึกเป็น PDF (2 หน้า)</button><span role="status">{loading?"กำลังโหลดรูปภาพ…":error||(!entry?"ไม่พบรหัสใบสมัคร":data?`นักกีฬา ${data.players.length} คน · ขาดรูป/ชื่อ ${missing} ช่อง (ไม่รวมช่องนักกีฬาที่ว่าง)` : "ไม่พบข้อมูล")}</span></div>
  {error&&<p role="alert">{error}</p>}
  {data&&<>
   <section className="fs-a4 fs-photo-sheet">
    <h1>แผงรูปนักกีฬาฟุตซอล</h1>
    <div className="fs-team">ทีม โรงเรียน <span>{data.school_name}</span></div>
    <div className="fs-options">รุ่น {[["ทีมอายุไม่เกิน 15 ปีชาย",sport.includes("15 ปี")],["ทีมไม่จำกัดอายุชาย",sport.includes("ไม่จำกัดอายุ")],["ทีมหญิง",sport.includes("หญิง")]].map(([label,checked])=><span key={String(label)}><b className="fs-circle">{checked?"✓":""}</b> {label}</span>)}</div>
    <div className="fs-photo-grid">
      {staff.slice(0,4).map(s=><Photo key={s.key} role={s.title} name={s.name} url={staffPhotos[s.key]}/>)}
      {Array.from({length:14},(_,i)=><div key={i} style={i===12?{gridColumn:2}:i===13?{gridColumn:3}:undefined}><Photo name={data.players[i]?.full_name} number={data.players[i]?.jersey_number} url={photos[i]}/></div>)}
    </div>
   </section>
   <section className="fs-a4 fs-list-sheet">
    <div className="fs-list-heading">รายชื่อนักกีฬาฟุตซอล รุ่น <span>{sport.replace(/^ฟุตซอล\s*/,"")}</span> โรงเรียน <span>{data.school_name}</span></div>
    <table><colgroup><col style={{width:"11%"}}/><col style={{width:"33%"}}/><col style={{width:"21%"}}/><col style={{width:"8%"}}/><col style={{width:"27%"}}/></colgroup><thead><tr>{["หมายเลข","ชื่อ-สกุล","วัน/ เดือน/ปี (เกิด)","ชั้น","ลายมือชื่อ"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{Array.from({length:14},(_,i)=>{const p=data.players[i];return <tr key={i}><td>{p?.jersey_number??""}</td><td className="fs-name">{p?.full_name||""}</td><td>{thaiDate(p?.birth_date||null)}</td><td>{p?.grade_level||""}</td><td/></tr>;})}</tbody></table>
    <div className="fs-signatures">{[["ผู้ฝึกสอน",nameOf("coach-0")],["ผู้ช่วยผู้ฝึกสอน",nameOf("coach-1")],["ผู้ควบคุมทีม",nameOf("controller")],["ผู้จัดการทีม",nameOf("manager")],["นายทะเบียน",""],["ผู้อำนวยการโรงเรียน",data.director_name||""]].map(([role,name],i)=><div className={`fs-signature ${i>=4?"fs-signature-center":""}`} key={role}><div>ลงชื่อ ...................................................</div><div>( {name||"..................................................."} )</div><div>{role}{i===5?` ${data.school_name}`:""}</div>{i===5&&<div className="fs-stamp">( ประทับตราโรงเรียน )</div>}</div>)}</div>
   </section>
  </>}
 </main>;
}
