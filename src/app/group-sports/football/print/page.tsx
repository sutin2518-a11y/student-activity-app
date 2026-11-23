"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadAthletePhoto } from "@/lib/group-sports/rov-photos";
import "./football-print.css";

type Player={full_name:string;student_code:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string};
type Staff={name:string;phone:string};
type Details={id:string;school_name:string;director_name:string|null;sport_name:string;players:Player[];coaches:Staff[]};
function thaiDate(v:string|null){if(!v)return "";return new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Bangkok"}).format(new Date(`${v}T12:00:00+07:00`));}
function emptyRow(i:number){return <tr key={i}><td>{i}</td><td/><td/><td/><td/></tr>;}
export default function FootballPrintPage(){
 const [entry,setEntry]=useState("");
 useEffect(()=>{setEntry(new URLSearchParams(window.location.search).get("entry")||"");},[]);
 const [data,setData]=useState<Details|null>(null);const [photos,setPhotos]=useState<Record<number,string>>({});
 const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!entry)return;let ignore=false;const objectUrls:string[]=[];
  void(async()=>{try{if(!/^[a-f\d-]{36}$/i.test(entry))throw new Error("รหัสใบสมัครไม่ถูกต้อง");
   const result=await supabase.rpc("sports_football_roster_details",{p_entry:entry});if(result.error)throw result.error;
   const details=result.data as Details;if(ignore)return;setData(details);
   const fetched:Record<number,string>={};for(let i=0;i<details.players.length;i++){
    const p=details.players[i];const url=await downloadAthletePhoto(entry,i,{full_name:p.full_name,student_code:p.student_code}).catch(()=>null);
    if(url){objectUrls.push(url);fetched[i]=url;}
   }
   if(!ignore)setPhotos(fetched);
  }catch(e){if(!ignore)setError(e instanceof Error?e.message:"อ่านใบสมัครไม่สำเร็จ");}finally{if(!ignore)setLoading(false);}})();
  return()=>{ignore=true;objectUrls.forEach(url=>URL.revokeObjectURL(url));};
 },[entry]);
 const isOpenBoys=data?.sport_name.includes("ไม่จำกัดอายุ ชาย")||false;
 const playerRows=[...Array(20)].map((_,i)=>data?.players[i]||null);
 return <main className="football-print-area">
  <div className="football-print-tools"><a href="/group-sports/football">← กลับหน้าฟุตบอล</a><button disabled={loading||!!error||!data} onClick={()=>window.print()}>พิมพ์ / บันทึกเป็น PDF</button><span>{loading?"กำลังเตรียมใบสมัครและรูปภาพ…":data?`${data.players.length} คน`:error}</span></div>
  {error&&<p className="football-print-error" role="alert">{error}</p>}
  {data&&<>
   <section className="football-a4 football-sheet">
    <header><h1>รายชื่อนักกีฬาฟุตบอล {data.sport_name.replace(/^ฟุตบอล\s*/,"")}</h1><p>กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p><h2>ชื่อทีมโรงเรียน {data.school_name}</h2></header>
    <table><thead><tr><th className="number">ลำดับ</th><th>ชื่อ–สกุล</th><th>วัน/เดือน/ปีเกิด</th><th>เบอร์เสื้อ</th><th>หมายเหตุ</th></tr></thead><tbody>{playerRows.map((p,i)=>p?<tr key={i}><td>{i+1}</td><td className="left">{p.full_name}</td><td>{thaiDate(p.birth_date)}</td><td>{p.jersey_number??""}</td><td className="left">{p.player_note||""}</td></tr>:emptyRow(i+1))}</tbody></table>
    <footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({data.director_name||"..................................................."})</footer>
   </section>
   <section className="football-a4 football-sheet">
    <header><h1>ใบส่งรายชื่อนักกีฬาฟุตบอลทีมโรงเรียน {data.school_name}</h1><p>{data.sport_name} · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30</p></header>
    <table><thead><tr><th className="number">ลำดับ</th><th>ชื่อ–สกุล</th><th>เบอร์เสื้อ</th>{isOpenBoys?<><th>P</th><th>S</th><th>N</th></>:<><th>ผู้เล่นจริง</th><th>สำรอง</th><th>อายุ</th></>}</tr></thead><tbody>{Array.from({length:isOpenBoys?22:20},(_,i)=>{
     const p=data.players[i];return <tr key={i}><td>{i+1}</td><td className="left">{p?.full_name||""}</td><td>{p?.jersey_number??""}</td>
     <td>{!isOpenBoys&&p?.player_role==="ผู้เล่นจริง"?"✓":""}</td><td>{!isOpenBoys&&p?.player_role==="สำรอง"?"✓":""}</td><td>{!isOpenBoys?"": ""}</td></tr>;
    })}</tbody></table><footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({data.director_name||"..................................................."})</footer>
   </section>
   {[0,12].map((offset,part)=><section className="football-a4 football-photos" key={offset}>
    <header><h1>แผงรูปนักกีฬาฟุตบอล</h1><p>{data.sport_name} · กีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30</p><h2>ทีมโรงเรียน {data.school_name} · หน้าที่ {part+1}/2</h2></header>
    <div className="football-photo-grid">{Array.from({length:part===0?12:8},(_,pos)=>{
      const idx=offset+pos,p=data.players[idx];return <div key={idx} className="football-photo-slot">
       <div className="football-photo-frame">{photos[idx]?<img src={photos[idx]} alt={`รูป ${p?.full_name||idx+1}`}/>:<span>รูปถ่าย<br/>นักกีฬา {idx+1}</span>}</div>
       <div className="football-photo-caption"><b>หมายเลข {p?.jersey_number??"........"}</b><p>{p?.full_name||"ชื่อ–สกุล .................................."}</p><p>ว/ด/ป เกิด {thaiDate(p?.birth_date||null)||".................."}</p></div>
      </div>;
     })}</div>
     {part===1&&<div className="football-print-staff"><p><b>ผู้จัดการทีม:</b> {data.director_name||"..................................."}</p>{data.coaches.map((c,i)=><p key={i}><b>{i===0?"ผู้ฝึกสอน":`ผู้ช่วยผู้ฝึกสอน ${i}`}:</b> {c.name}</p>)}</div>}
     {part===1&&<footer>ลงชื่อ ........................................................................ ผู้จัดการทีม<br/>({data.director_name||"..................................................."})</footer>}
   </section>)}
   {isOpenBoys&&<p className="football-print-note">หมายเหตุ: แบบฟอร์มฟุตบอลไม่จำกัดอายุชายในเอกสารมีช่องรายชื่อ 22 แถว แต่ระเบียบระบุการส่งผู้เล่น 15–20 คน ระบบจึงรับสมัครสูงสุด 20 คน ส่วนแผงรูปที่พิมพ์เพิ่มเป็นเอกสารประกอบ</p>}
  </>}
 </main>;
}
