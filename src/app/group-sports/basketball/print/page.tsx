"use client";
import { sportsConfirm } from "@/lib/group-sports/sports-dialog";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { downloadAthletePhoto } from "@/lib/group-sports/rov-photos";
import "./basketball-official-print.css";

type Player={full_name:string;student_code:string|null;jersey_number:number|null};
type Coach={name:string;phone:string;manager_name?:string;manager_phone?:string};
type Details={id:string;school_name:string;sport_name:string;director_name?:string|null;players:Player[];coaches:Coach[]};
const BASE="/docs/basketball";
const coords=(x:number,y:number,w:number,h:number):CSSProperties=>({left:`${x/1024*100}%`,top:`${y/1447*100}%`,width:`${w/1024*100}%`,height:`${h/1447*100}%`});
function Fill({x,y,w,h,value,align="left",font=15,white=false}:{x:number;y:number;w:number;h:number;value?:string;align?:"left"|"center";font?:number;white?:boolean}){
 const text=value||""; if(!text)return null;
 const size=Math.min(font,Math.max(8,(w-6)/Math.max(1,Array.from(text).length)*1.8));
 return <div className="bb-official-fill" style={{...coords(x,y,w,h),fontSize:`${size/1024*100}cqw`,justifyContent:align==="center"?"center":"flex-start",backgroundColor:white?"white":"transparent"}}>{text}</div>;
}
function category(s:string){const v=s.replace(/\s+/g,"");if(!v.includes("ชาย")&&!v.includes("หญิง"))return -1;const female=v.includes("หญิง");if(v.includes("ไม่จำกัดอายุ"))return female?3:2;if(v.includes("15"))return female?1:0;return -1;}
function splitName(full:string){const parts=full.trim().split(/\s+/);return parts.length>1?[parts.slice(0,-1).join(" "),parts[parts.length-1]]:[full,""];}
export default function BasketballPrintPage(){
 const [entry,setEntry]=useState<string|null>(null);
 const [data,setData]=useState<Details|null>(null);
 const [photos,setPhotos]=useState<Record<number,string>>({});
 const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const [ready,setReady]=useState<number[]>([]);const [templateError,setTemplateError]=useState(false);
 useEffect(()=>{setEntry(new URLSearchParams(window.location.search).get("entry")||"");},[]);
 useEffect(()=>{if(entry===null)return;if(!entry){setLoading(false);return;}
  let cancelled=false;const urls:string[]=[];
  setLoading(true);setError("");setData(null);setPhotos({});setReady([]);setTemplateError(false);
  void(async()=>{try{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry))throw new Error("รหัสใบสมัครไม่ถูกต้อง");
    const result=await supabase.rpc("sports_basketball_roster_details",{p_entry:entry});if(result.error)throw new Error(result.error.message);
    const details=result.data as Details;
    if(!details||details.id!==entry||!Array.isArray(details.players)||details.players.length>12)throw new Error("ข้อมูลใบสมัครไม่ถูกต้อง กรุณาตรวจสอบกับผู้ดูแล");
    if(category(details.sport_name)<0)throw new Error("ไม่สามารถระบุรุ่นการแข่งขันจากใบสมัครได้ กรุณาตรวจสอบชื่อรายการ");
    const loaded:Record<number,string>={};
    for(let i=0;i<details.players.length&&!cancelled;i+=4)await Promise.all(details.players.slice(i,i+4).map(async(p,j)=>{const idx=i+j;const url=await downloadAthletePhoto(entry,idx,p).catch(()=>null);if(url){if(cancelled)URL.revokeObjectURL(url);else{urls.push(url);loaded[idx]=url;}}}));
    if(!cancelled){setPhotos(loaded);setData(details);}
  }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"อ่านใบสมัครไม่สำเร็จ");}finally{if(!cancelled)setLoading(false);}})();
  return()=>{cancelled=true;urls.forEach(url=>URL.revokeObjectURL(url));};
 },[entry]);
 const missing=data?data.players.length-Object.keys(photos).length:0;
 const canPrint=Boolean(data&&!loading&&!error&&!templateError&&ready.length===2);
 const tick=data?category(data.sport_name):-1;
 const markReady=(n:number)=>setReady(old=>old.includes(n)?old:[...old,n]);
 const staff=data?[{name:data.coaches?.[0]?.name,phone:data.coaches?.[0]?.phone},{name:data.coaches?.[1]?.name,phone:data.coaches?.[1]?.phone},{name:data.coaches?.[0]?.manager_name,phone:data.coaches?.[0]?.manager_phone}]:[];
 return <main className="bb-official-root">
  <div className="bb-official-tools"><a href="/group-sports/basketball?tab=registration">← กลับหน้าลงทะเบียนบาสเกตบอล</a><button type="button" disabled={!canPrint} onClick={async ()=>{if(missing&&!(await sportsConfirm(`ยังไม่มีรูปนักกีฬา ${missing} คน ต้องการพิมพ์โดยเว้นช่องรูปไว้หรือไม่?`)))return;window.print();}}>พิมพ์ใบรายชื่อและแผงรูป / PDF</button><span role="status">{loading?"กำลังโหลดใบสมัครและรูปภาพ…":error||(!entry?"ไม่พบรหัสใบสมัคร":data?`${data.players.length} คน · รูป ${Object.keys(photos).length}/${data.players.length}`:"")}</span>{missing>0&&<strong className="bb-official-warning">ยังไม่มีรูปหรือโหลดรูปไม่ได้ {missing} คน กรุณาตรวจสอบก่อนพิมพ์</strong>}{templateError&&<strong>โหลดแม่แบบไม่สำเร็จ กรุณารีเฟรช</strong>}</div>
  {data&&<>
   <section className="bb-official-sheet" aria-label="ใบรายชื่อนักกีฬาบาสเกตบอล">
    <img className="bb-official-template" src={`${BASE}/form-3.png`} alt="แม่แบบใบรายชื่อบาสเกตบอล" onLoad={()=>markReady(3)} onError={()=>setTemplateError(true)}/>
    <Fill x={440} y={200} w={480} h={28} value={data.school_name.replace(/^โรงเรียน\s*/,"")} font={20} white/>
    {tick>=0&&<div className="bb-official-tick" style={coords([155,372,608,805][tick],269,23,25)}>✓</div>}
    {Array.from({length:12},(_,i)=>{const p=data.players[i];const y=385+i*31.95;return <div key={i}><Fill x={258} y={y} w={360} h={30} value={p?.full_name} font={17}/><Fill x={625} y={y} w={128} h={30} value={p?.jersey_number==null?"":String(p.jersey_number)} align="center" font={17}/></div>;})}
    {staff.map((c,i)=><div key={i}><Fill x={258} y={768+i*31.95} w={360} h={30} value={c.name} font={17}/><Fill x={710} y={768+i*31.95} w={223} h={30} value={c.phone} font={17}/></div>)}
   </section>
   <section className="bb-official-sheet" aria-label="แผงรูปนักกีฬาบาสเกตบอล">
    <img className="bb-official-template" src={`${BASE}/form-4.png`} alt="แม่แบบแผงรูปบาสเกตบอล" onLoad={()=>markReady(4)} onError={()=>setTemplateError(true)}/>
    <Fill x={440} y={203} w={480} h={28} value={data.school_name.replace(/^โรงเรียน\s*/,"")} font={20} white/>
    {tick>=0&&<div className="bb-official-tick" style={coords([155,372,608,805][tick],238,23,25)}>✓</div>}
    {Array.from({length:12},(_,i)=>{const col=i%4,row=Math.floor(i/4),x=[139,338,547,764][col],y=[330,599,889][row];const p=data.players[i],name=splitName(p?.full_name||"");return <div key={i}>
      {photos[i]&&<img className="bb-official-photo" src={photos[i]} alt={`รูป ${p?.full_name||i+1}`} style={coords(x+2,y+2,143,163)}/>}
      <Fill x={x+17} y={y+178} w={147} h={28} value={name[0]} font={15} white/>
      <Fill x={x+29} y={y+205} w={135} h={28} value={name[1]} font={15} white/>
    </div>;})}
   </section>
  </>}
 </main>;
}
