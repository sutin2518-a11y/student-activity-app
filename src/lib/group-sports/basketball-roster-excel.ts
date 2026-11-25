/** Basketball official-form template: roster fields only. Legacy templates accepted. */
import { addRosterExcelDropdowns } from "./xlsx-dropdowns";
import { BASKETBALL_CONFIG, FOOTBALL_NAME_PREFIXES, type BasketballCode } from "./basketball-config";
const COLUMNS = ["ลำดับ", "คำนำหน้า", "ชื่อ-สกุล", "หมายเลขเสื้อ"];
const LEGACY_COLUMNS = ["ลำดับ", "รหัสนักเรียน", "คำนำหน้า", "ชื่อ-สกุล", "วันเกิด (YYYY-MM-DD)", "เบอร์เสื้อ", "ผู้เล่นจริง/สำรอง", "หมายเหตุ", "ชั้นเรียน"];
const SPLIT_COLUMNS = ["ลำดับ", "รหัสนักเรียน", "คำนำหน้า", "ชื่อ-สกุล", "วันเกิด (วัน)", "เดือนเกิด", "ปีเกิด (พ.ศ.)", "เบอร์เสื้อ", "ผู้เล่นจริง/สำรอง", "หมายเหตุ", "ชั้นเรียน"];
const VERSION = "CKW-BASKETBALL-2569-3";
export type ImportedBasketballPlayer = {
  prefix: string;
  name: string;
  student_code: string;
  birth_date: string;
  jersey_number: string;
  player_role: string;
  player_note: string;
  grade_level: string;
};

function cell(value:unknown){return String(value??"").trim().normalize("NFC");}
export async function downloadBasketballRosterTemplate(code:BasketballCode){
 const XLSX=await import("xlsx");
 const worksheet=XLSX.utils.aoa_to_sheet([COLUMNS,...Array.from({length:12},(_,i)=>[i+1,"","",""])]);
 worksheet["!cols"]=[{wch:10},{wch:18},{wch:40},{wch:18}];
 const meta=XLSX.utils.aoa_to_sheet([["เวอร์ชัน",VERSION],["รหัสบาสเกตบอล",code],["รายการ",BASKETBALL_CONFIG[code].title],["หมายเหตุ","กรอกชื่อ–สกุลและหมายเลขเสื้อ 7–12 คน ไม่ต้องกรอกวันเกิดหรือระดับชั้น แนบรูปในเว็บไซต์"],["ข้อสำคัญ","รุ่น 15 ปี เกิดตั้งแต่ พ.ศ. 2554 ตรวจหลักฐานที่สนาม"]]);
 meta["!cols"]=[{wch:25},{wch:100}];
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,worksheet,"รายชื่อนักกีฬา");XLSX.utils.book_append_sheet(book,meta,"ข้อมูลรายการ");
 const raw=XLSX.write(book,{type:"array",bookType:"xlsx",compression:false});
 const enhanced=addRosterExcelDropdowns(new Uint8Array(raw),[{range:"B2:B13",options:[...FOOTBALL_NAME_PREFIXES],label:"คำนำหน้า"}]);
 const buffer=new ArrayBuffer(enhanced.byteLength);new Uint8Array(buffer).set(enhanced);
 const url=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
 const anchor=document.createElement("a");anchor.href=url;anchor.download=`รายชื่อบาสเกตบอล-${code}.xlsx`;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importBasketballRosterExcel(file:File,code:BasketballCode):Promise<ImportedBasketballPlayer[]>{
 if(!/\.xlsx$/i.test(file.name)||!file.size||file.size>5*1024*1024)throw new Error("กรุณาเลือกไฟล์ .xlsx ขนาดไม่เกิน 5 MB");
 const XLSX=await import("xlsx"),book=XLSX.read(await file.arrayBuffer(),{type:"array"});
 const roster=book.Sheets["รายชื่อนักกีฬา"],meta=book.Sheets["ข้อมูลรายการ"];
 if(!roster||!meta)throw new Error("ไม่พบชีตตามแม่แบบบาสเกตบอล");
 const md=XLSX.utils.sheet_to_json<unknown[]>(meta,{header:1,raw:true,defval:""}),v=cell(md[0]?.[1]);
 const cols=v===VERSION?COLUMNS:v==="CKW-BASKETBALL-2569-2"?SPLIT_COLUMNS:v==="CKW-BASKETBALL-2569-1"?LEGACY_COLUMNS:null;
 if(!cols||cell(md[1]?.[1])!==code)throw new Error("ไฟล์นี้ไม่ใช่แม่แบบของรุ่นบาสเกตบอลที่เลือกอยู่");
 for(const address of Object.keys(roster)){if(!/^[A-Z]+[0-9]+$/.test(address))continue;const pos=XLSX.utils.decode_cell(address);if(pos.r>12&&pos.c<cols.length&&cell(roster[address]?.v))throw new Error("พบจำนวนแถวเกิน 12 คน");}
 const rows=XLSX.utils.sheet_to_json<unknown[]>(roster,{header:1,range:`A1:${XLSX.utils.encode_col(cols.length-1)}13`,raw:true,defval:""});
 if(!cols.every((h,i)=>cell(rows[0]?.[i])===h))throw new Error("หัวคอลัมน์ Excel ไม่ตรงกับแม่แบบ");
 const players:ImportedBasketballPlayer[]=[],jerseys=new Set<string>(),names=new Set<string>();
 for(let i=1;i<rows.length;i++){
  const r=rows[i]||[],prefix=cell(r[v===VERSION?1:2]),name=cell(r[v===VERSION?2:3]),jersey=cell(r[v===VERSION?3:v==="CKW-BASKETBALL-2569-2"?7:5]);
  if(!prefix&&!name&&!jersey)continue;
  if(!FOOTBALL_NAME_PREFIXES.includes(prefix as typeof FOOTBALL_NAME_PREFIXES[number])||!name)throw new Error(`แถว ${i+1}: กรุณากรอกคำนำหน้าและชื่อ–สกุล`);
  if(!/^(?:[0-9]|[1-9][0-9])$/.test(jersey)||jerseys.has(jersey))throw new Error(`แถว ${i+1}: หมายเลขเสื้อไม่ถูกต้องหรือซ้ำ`);
  const identity=(prefix+name).replace(/\s+/g,"");if(names.has(identity))throw new Error(`แถว ${i+1}: ชื่อนักกีฬาซ้ำ`);names.add(identity);jerseys.add(jersey);
  players.push({prefix,name,jersey_number:jersey,student_code:"",birth_date:"",grade_level:"",player_role:"",player_note:""});
 }
 if(players.length<7||players.length>12)throw new Error("ลงทะเบียนบาสเกตบอลได้ 7–12 คนต่อทีม");return players;
}
