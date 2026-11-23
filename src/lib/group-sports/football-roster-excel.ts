/** Excel template + strict import for football; no eligibility-rule auto checks. */
import { addRosterExcelDropdowns } from "./xlsx-dropdowns";
import { FOOTBALL_CONFIG, FOOTBALL_NAME_PREFIXES, type FootballCode } from "./football-config";
const COLUMNS=["ลำดับ","รหัสนักเรียน","คำนำหน้า","ชื่อ-สกุล","วันเกิด (YYYY-MM-DD)","เบอร์เสื้อ","ผู้เล่นจริง/สำรอง","หมายเหตุ"];
const VERSION="CKW-FOOTBALL-2569-1";
export type ImportedFootballPlayer={prefix:string;name:string;student_code:string;birth_date:string;jersey_number:string;player_role:string;player_note:string};
function cell(value:unknown){return String(value??"").trim().normalize("NFC");}
function readDate(raw:unknown){const value=cell(raw);if(!value)return "";
 if(/^\d{4}-\d\d-\d\d$/.test(value)){const yyyy=Number(value.slice(0,4));return `${yyyy>2400?yyyy-543:yyyy}${value.slice(4)}`;}
 const parts=value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 if(!parts)throw new Error(`วันเกิด ${value}: ใช้รูปแบบ YYYY-MM-DD หรือ DD/MM/YYYY`);
 const y=Number(parts[3]);return `${y>2400?y-543:y}-${parts[2].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
}
export async function downloadFootballRosterTemplate(code:FootballCode){
 const XLSX=await import("xlsx");const worksheet=XLSX.utils.aoa_to_sheet([COLUMNS,...Array.from({length:20},(_,i)=>[i+1,"","","","","","",""])]);
 worksheet["!cols"]=[{wch:8},{wch:20},{wch:16},{wch:33},{wch:23},{wch:12},{wch:20},{wch:30}];
 for(let row=2;row<=21;row++){worksheet[`B${row}`]={t:"s",v:"",z:"@"};worksheet[`E${row}`]={t:"s",v:"",z:"@"};}
 const meta=XLSX.utils.aoa_to_sheet([["เวอร์ชัน",VERSION],["รหัสฟุตบอล",code],["รายการ",FOOTBALL_CONFIG[code].title],["หมายเหตุ","กรอกเฉพาะชีต รายชื่อนักกีฬา ใช้วันเกิด ค.ศ. รูปแบบ YYYY-MM-DD"],["ข้อสำคัญ","ไม่ต้องกรอกให้ครบ 20 คน เว้นแถวว่างได้ ห้ามแก้หัวตาราง"]]);
 meta["!cols"]=[{wch:25},{wch:90}];const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,worksheet,"รายชื่อนักกีฬา");XLSX.utils.book_append_sheet(book,meta,"ข้อมูลรายการ");
 const raw=XLSX.write(book,{type:"array",bookType:"xlsx",compression:false});
 const enhanced=addRosterExcelDropdowns(new Uint8Array(raw),[
  {range:"C2:C21",options:[...FOOTBALL_NAME_PREFIXES],label:"คำนำหน้า"},
  {range:"G2:G21",options:["ผู้เล่นจริง","สำรอง"],label:"ผู้เล่นจริง/สำรอง"}
 ]);
 const buffer=new ArrayBuffer(enhanced.byteLength);new Uint8Array(buffer).set(enhanced);
 const url=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
 const anchor=document.createElement("a");anchor.href=url;anchor.download=`รายชื่อฟุตบอล-${code}.xlsx`;document.body.appendChild(anchor);anchor.click();anchor.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importFootballRosterExcel(file:File,code:FootballCode):Promise<ImportedFootballPlayer[]>{
 if(!/\.xlsx$/i.test(file.name))throw new Error("รองรับเฉพาะไฟล์ .xlsx ที่ดาวน์โหลดจากระบบฟุตบอล");
 if(!file.size||file.size>5*1024*1024)throw new Error("ไฟล์ Excel ต้องมีขนาดไม่เกิน 5 MB");
 const XLSX=await import("xlsx");const book=XLSX.read(await file.arrayBuffer(),{type:"array",cellText:true});
 const roster=book.Sheets["รายชื่อนักกีฬา"],meta=book.Sheets["ข้อมูลรายการ"];
 if(!roster||!meta)throw new Error("ไม่พบชีตตามแม่แบบฟุตบอล กรุณาดาวน์โหลดเทมเพลตใหม่");
 const metadata=XLSX.utils.sheet_to_json<unknown[]>(meta,{header:1,raw:false,defval:""});
 if(cell(metadata[0]?.[1])!==VERSION||cell(metadata[1]?.[1])!==code)throw new Error("ไฟล์นี้ไม่ใช่แม่แบบของรุ่นฟุตบอลที่เลือกอยู่");
 const rows=XLSX.utils.sheet_to_json<unknown[]>(roster,{header:1,raw:false,defval:""});
 if(!COLUMNS.every((header,index)=>cell(rows[0]?.[index])===header))throw new Error("หัวคอลัมน์ Excel ไม่ตรงกับแม่แบบ");
 if(rows.length>25)throw new Error("พบจำนวนแถวเกินแม่แบบฟุตบอล 20 คน");
 const players:ImportedFootballPlayer[]=[];const jerseys=new Set<string>();
 for(let row=1;row<rows.length;row++){
  const [order,id,prefix,name,dob,jersey,role,note]=rows[row]||[];
  const values=[id,prefix,name,dob,jersey,role,note].map(cell);
  if(!values.some(Boolean))continue;
  if(!FOOTBALL_NAME_PREFIXES.includes(values[1] as typeof FOOTBALL_NAME_PREFIXES[number]))throw new Error(`แถว ${row+1}: คำนำหน้าชื่อไม่ถูกต้อง`);
  if(!values[2])throw new Error(`แถว ${row+1}: ไม่พบชื่อ–สกุล`);
  const birthDate=readDate(dob);if(!birthDate||!/\d{4}-\d\d-\d\d/.test(birthDate)||Number.isNaN(Date.parse(birthDate)))throw new Error(`แถว ${row+1}: วันเกิดไม่ถูกต้อง`);
  if(!/^(?:[0-9]|[1-9][0-9])$/.test(values[4]))throw new Error(`แถว ${row+1}: เบอร์เสื้อไม่ถูกต้อง (0–99)`);
  if(jerseys.has(values[4]))throw new Error(`แถว ${row+1}: หมายเลขเสื้อซ้ำ`);
  if(values[5]&&!(["ผู้เล่นจริง","สำรอง"].includes(values[5])))throw new Error(`แถว ${row+1}: บทบาทนักกีฬาไม่ถูกต้อง`);
  jerseys.add(values[4]);players.push({prefix:values[1],name:values[2],student_code:values[0],birth_date:birthDate,jersey_number:values[4],player_role:values[5],player_note:values[6]});
 }
 if(!players.length)throw new Error("ไม่พบรายชื่อนักกีฬาใน Excel");
 return players;
}
