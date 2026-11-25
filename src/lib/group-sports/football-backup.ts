import { supabase } from "@/lib/supabase";
import { athletePhotoPath, ROV_PHOTO_BUCKET } from "./rov-photos";
import { footballAgeOnStart, footballStaffSlots, type FootballCoach } from "./football-staff";
import { FOOTBALL_CODES, FOOTBALL_CONFIG, type FootballCode } from "./football-config";
import { writeStoredZip } from "./football-photo-zip";
export type FootballBackupRoster={id:string;event_id:string;school_id:string;school_name:string;sport_name:string;status:string;code:FootballCode;players:{full_name:string;student_code:string|null;birth_date:string|null;jersey_number:number|null;player_role:string;player_note:string}[];coaches:FootballCoach[]};
function saveBytes(bytes:Uint8Array,filename:string,mime:string){const buffer=new ArrayBuffer(bytes.byteLength);new Uint8Array(buffer).set(bytes);const url=URL.createObjectURL(new Blob([buffer],{type:mime}));const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),3000);}
export async function exportFootballBackup(rosters:FootballBackupRoster[]){
 const XLSX=await import("xlsx");const book=XLSX.utils.book_new();
 const headers=["รหัสใบสมัคร","รหัสรายการ","รหัสโรงเรียน","โรงเรียน","รุ่นแข่งขัน","สถานะ","ลำดับ","ชื่อ–สกุล","รหัสนักเรียน","วันเกิด (ค.ศ.)","เบอร์เสื้อ","ผู้เล่นจริง/สำรอง","อายุ ณ วันเริ่มแข่งขัน","หมายเหตุ","Storage path ที่คาดไว้ (ไม่ยืนยันว่ามีรูป)"];
 const staffRows:(string|number)[][]=[["รหัสใบสมัคร","รหัสโรงเรียน","โรงเรียน","รุ่นแข่งขัน","ตำแหน่ง","ชื่อ–สกุล","โทรศัพท์","Storage path ที่คาดไว้ (ไม่ยืนยันว่ามีรูป)"]];
 const summaries:(string|number)[][]=[["รุ่น","จำนวนใบสมัคร","จำนวนนักกีฬา"]];
 for(const code of FOOTBALL_CODES){const list=rosters.filter(r=>r.code===code);const rows:(string|number)[][]=[headers];summaries.push([FOOTBALL_CONFIG[code].title,list.length,list.reduce((n,r)=>n+r.players.length,0)]);
  for(const r of list){for(const [i,p] of r.players.entries()){rows.push([r.id,r.event_id,r.school_id,r.school_name,r.sport_name,r.status,i+1,p.full_name,p.student_code||"",p.birth_date||"",p.jersey_number??"",p.player_role||"",footballAgeOnStart(p.birth_date,r.sport_name)??"",p.player_note||"",await athletePhotoPath(r.id,i,p)]);}
   for(const slot of footballStaffSlots(r.coaches||[]).filter(s=>s.name)){staffRows.push([r.id,r.school_id,r.school_name,r.sport_name,slot.title,slot.name,slot.key==="manager"?r.coaches[0]?.manager_phone||"":r.coaches[slot.photoIndex-110]?.phone||"",await athletePhotoPath(r.id,slot.photoIndex,slot.identity)]);}}
  const sheet=XLSX.utils.aoa_to_sheet(rows);sheet["!cols"]=headers.map((_,i)=>({wch:i===14?65:i===7?35:i<3?38:22}));sheet["!autofilter"]={ref:sheet["!ref"]||"A1:O1"};XLSX.utils.book_append_sheet(book,sheet,code);
 }
 const summary=XLSX.utils.aoa_to_sheet([["สำรองข้อมูลฟุตบอล PHAYAO GAMES 2569"],["ส่งออกเมื่อ",new Date().toISOString()],["ข้อมูลส่วนบุคคล — จัดเก็บในพื้นที่จำกัดสิทธิ์"],["Excel ไม่รวมไฟล์รูปจริง และไม่ใช่ SQL backup; อ่านทีละใบสมัคร ไม่ใช่ snapshot เดียว"],[],...summaries]);summary["!cols"]=[{wch:80},{wch:30},{wch:22}];XLSX.utils.book_append_sheet(book,summary,"สรุป");
 const staff=XLSX.utils.aoa_to_sheet(staffRows);staff["!cols"]=staffRows[0].map((_,i)=>({wch:i===7?65:32}));staff["!autofilter"]={ref:staff["!ref"]||"A1:H1"};XLSX.utils.book_append_sheet(book,staff,"เจ้าหน้าที่");
 const raw=XLSX.write(book,{type:"array",bookType:"xlsx"});saveBytes(new Uint8Array(raw),`football-backup-${new Date().toISOString().slice(0,10)}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
export async function exportFootballPhotos(roster:FootballBackupRoster){
 const items=[...roster.players.map((p,i)=>({index:i,identity:p,label:p.full_name,kind:"player"})),...footballStaffSlots(roster.coaches||[]).filter(s=>s.name).map(s=>({index:s.photoIndex,identity:s.identity,label:s.name,kind:s.title}))];
 const entries:{name:string;data:Uint8Array;time:number;date:number}[]=[];const manifest:object[]=[];const date=0x5c21;
 let missed=0;
 for(const item of items){const path=await athletePhotoPath(roster.id,item.index,item.identity);const result=await supabase.storage.from(ROV_PHOTO_BUCKET).download(path);const ok=Boolean(result.data&&!result.error);if(ok&&result.data){entries.push({name:path,data:new Uint8Array(await result.data.arrayBuffer()),time:0,date});}else missed++;manifest.push({name:item.label,role:item.kind,index:item.index,path,downloaded:ok,error:result.error?.message||null});}
 entries.push({name:"manifest.json",data:new TextEncoder().encode(JSON.stringify({entry_id:roster.id,school:roster.school_name,code:roster.code,exported_at:new Date().toISOString(),photos:manifest},null,2)),time:0,date});
 saveBytes(writeStoredZip(entries),`football-photos-${roster.id}.zip`,"application/zip");return {downloaded:items.length-missed,missed};
}
