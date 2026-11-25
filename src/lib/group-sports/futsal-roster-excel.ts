/** Excel template + strict import for futsal; no eligibility-rule auto checks. */
import { addRosterExcelDropdowns } from "./xlsx-dropdowns";
import { FUTSAL_CONFIG, FOOTBALL_NAME_PREFIXES, type FutsalCode } from "./futsal-config";

const LEGACY_COLUMNS = ["ลำดับ", "รหัสนักเรียน", "คำนำหน้า", "ชื่อ-สกุล", "วันเกิด (YYYY-MM-DD)", "เบอร์เสื้อ", "ผู้เล่นจริง/สำรอง", "หมายเหตุ", "ชั้นเรียน"];
const COLUMNS = ["ลำดับ", "รหัสนักเรียน", "คำนำหน้า", "ชื่อ-สกุล", "วันเกิด (วัน)", "เดือนเกิด", "ปีเกิด (พ.ศ.)", "เบอร์เสื้อ", "ผู้เล่นจริง/สำรอง", "หมายเหตุ", "ชั้นเรียน"];
const VERSION = "CKW-FUTSAL-2569-2";
const LEGACY_VERSION = "CKW-FUTSAL-2569-1";


export type ImportedFutsalPlayer = {
  prefix: string;
  name: string;
  student_code: string;
  birth_date: string;
  jersey_number: string;
  player_role: string;
  player_note: string;
  grade_level: string;
};

function cell(value: unknown) {
  return String(value ?? "").trim().normalize("NFC");
}

export function toIsoDate(yearValue: number, month: number, day: number): string {
  const year = yearValue > 2400 ? yearValue - 543 : yearValue;
  if (!Number.isInteger(year) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date());
  const today = ["year","month","day"].map(k=>parts.find(p=>p.type===k)?.value).join("-");
  return iso <= today ? iso : "";
}

const THAI_MONTHS: Record<string, number> = {
  "มกราคม": 1, "มค": 1,
  "กุมภาพันธ์": 2, "กพ": 2,
  "มีนาคม": 3, "มีค": 3,
  "เมษายน": 4, "เมย": 4,
  "พฤษภาคม": 5, "พค": 5,
  "มิถุนายน": 6, "มิย": 6,
  "กรกฎาคม": 7, "กค": 7,
  "สิงหาคม": 8, "สค": 8,
  "กันยายน": 9, "กย": 9,
  "ตุลาคม": 10, "ตค": 10,
  "พฤศจิกายน": 11, "พย": 11,
  "ธันวาคม": 12, "ธค": 12,
};

function readDate(raw: unknown, XLSX: typeof import("xlsx")): string {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return "";
    const parsed = XLSX.SSF.parse_date_code(raw);
    return parsed ? toIsoDate(parsed.y, parsed.m, parsed.d) : "";
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return toIsoDate(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }

  const value = cell(raw).replace(/[๐-๙]/g, c => String(c.charCodeAt(0)-0x0e50)).replace(/พ\.ศ\.?/g, "").trim();
  if (!value) return "";

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value);
  if (match) return toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));

  match = /^(\d{1,2})\s*([ก-๙.]+)\s*(\d{4})$/.exec(value);
  if (match) {
    const monthToken = match[2].replace(/\./g, "");
    const month = THAI_MONTHS[monthToken];
    if (month) return toIsoDate(Number(match[3]), month, Number(match[1]));
  }
  return "";
}

export const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export function readThaiDateParts(day:unknown, month:unknown, year:unknown):string {
  const normalize = (v:unknown) => cell(v).replace(/[๐-๙]/g, c => String(c.charCodeAt(0)-0x0e50));
  const d = normalize(day), m = normalize(month), y = normalize(year);
  if (!/^\d{1,2}$/.test(d) || !/^\d{4}$/.test(y) || Number(y)<2443) return "";
  const monthNumber = /^\d{1,2}$/.test(m) ? Number(m) : THAI_MONTHS[m.replace(/\./g, "")];
  return toIsoDate(Number(y), monthNumber, Number(d));
}

export async function downloadFutsalRosterTemplate(code: FutsalCode) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([
    COLUMNS,
    ...Array.from({ length: 14 }, (_, index) => [index + 1, "", "", "", "", "", "", "", "", "", ""]),
  ]);
  worksheet["!cols"] = [
    { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 33 },
    { wch: 15 }, { wch: 18 }, { wch: 19 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
    {wch:13}, {hidden:true}, {hidden:true}, {hidden:true},
  ];
  for (let row=2;row<=15;row++) worksheet[`B${row}`]={t:"s",v:"",z:"@"};
  const nowYear=Number(new Intl.DateTimeFormat("en",{timeZone:"Asia/Bangkok",year:"numeric"}).format(new Date()))+543;
  const years=Array.from({length:nowYear-2443+1},(_,i)=>[nowYear-i]);
  XLSX.utils.sheet_add_aoa(worksheet,Array.from({length:31},(_,i)=>[i+1]),{origin:"L1"});
  XLSX.utils.sheet_add_aoa(worksheet,MONTH_NAMES.map(m=>[m]),{origin:"M1"});
  XLSX.utils.sheet_add_aoa(worksheet,years,{origin:"N1"});
  const meta = XLSX.utils.aoa_to_sheet([
    ["เวอร์ชัน", VERSION], ["รหัสฟุตซอล", code], ["รายการ", FUTSAL_CONFIG[code].title],
    ["หมายเหตุ", "เลือกวัน เดือนภาษาไทย และปี พ.ศ. จากดรอปดาวน์ เช่น 2 | ธันวาคม | 2554 ไม่ต้องแปลงเป็น ค.ศ."],
    ["ข้อสำคัญ", "กรอกเฉพาะชีต รายชื่อนักกีฬา 10–14 คน เว้นแถวว่างได้ ห้ามแก้หัวตาราง ระบบตรวจวันที่จริงก่อนนำเข้า"],
  ]);
  meta["!cols"]=[{wch:25},{wch:110}];
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,worksheet,"รายชื่อนักกีฬา");XLSX.utils.book_append_sheet(book,meta,"ข้อมูลรายการ");
  const raw=XLSX.write(book,{type:"array",bookType:"xlsx",compression:false});
  const enhanced=addRosterExcelDropdowns(new Uint8Array(raw),[
    {range:"C2:C15",options:[...FOOTBALL_NAME_PREFIXES],label:"คำนำหน้า"},
    {range:"E2:E15",options:[],sourceRange:"$L$1:$L$31",label:"วันเกิด"},
    {range:"F2:F15",options:[],sourceRange:"$M$1:$M$12",label:"เดือนเกิด"},
    {range:"G2:G15",options:[],sourceRange:`$N$1:$N$${years.length}`,label:"ปีเกิด พ.ศ."},
    {range:"I2:I15",options:["ผู้เล่นจริง","สำรอง"],label:"ผู้เล่นจริง/สำรอง"},
    {range:"K2:K15",options:["ม.1","ม.2","ม.3","ม.4","ม.5","ม.6"],label:"ชั้นเรียน"},
  ]);
  const buffer = new ArrayBuffer(enhanced.byteLength);
  new Uint8Array(buffer).set(enhanced);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `รายชื่อฟุตซอล-${code}-ปฏิทินไทย.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFutsalRosterExcel(file: File, code: FutsalCode): Promise<ImportedFutsalPlayer[]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("รองรับเฉพาะไฟล์ .xlsx ที่ดาวน์โหลดจากระบบฟุตซอล");
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ Excel ต้องมีขนาดไม่เกิน 5 MB");

  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const roster = book.Sheets["รายชื่อนักกีฬา"];
  const meta = book.Sheets["ข้อมูลรายการ"];
  if (!roster || !meta) throw new Error("ไม่พบชีตตามแม่แบบฟุตซอล กรุณาดาวน์โหลดเทมเพลตใหม่");

  const metadata = XLSX.utils.sheet_to_json<unknown[]>(meta, { header: 1, raw: true, defval: "" });
  const version = cell(metadata[0]?.[1]);
  if (![VERSION, LEGACY_VERSION].includes(version) || cell(metadata[1]?.[1]) !== code) {
    throw new Error("ไฟล์นี้ไม่ใช่แม่แบบของรุ่นฟุตซอลที่เลือกอยู่");
  }
  const splitDate=version===VERSION;
  const expectedColumns=splitDate?COLUMNS:LEGACY_COLUMNS;
  // Ignore only the template's hidden validation lists (L:N); reject extra player rows.
  for (const address of Object.keys(roster)) {
    if (!/^[A-Z]+[0-9]+$/.test(address)) continue;
    const pos=XLSX.utils.decode_cell(address);
    if (pos.r>14 && pos.c<expectedColumns.length && cell(roster[address]?.v)) throw new Error("พบจำนวนแถวเกินแม่แบบฟุตซอล 14 คน");
  }
  const range=`A1:${splitDate?"K":"I"}15`;
  const rows=XLSX.utils.sheet_to_json<unknown[]>(roster,{header:1,range,raw:true,defval:""});
  const displayRows=XLSX.utils.sheet_to_json<unknown[]>(roster,{header:1,range,raw:false,defval:""});
  if (!expectedColumns.every((header,index)=>cell(rows[0]?.[index])===header)) throw new Error("หัวคอลัมน์ Excel ไม่ตรงกับแม่แบบ");
  const players:ImportedFutsalPlayer[]=[];
  const jerseys=new Set<string>();
  const studentCodes=new Set<string>();
  for(let row=1;row<rows.length;row++){
    const cells=rows[row]||[];
    const [,id,prefix,name,dob]=cells;
    const [jersey,role,note,grade]=cells.slice(splitDate?7:5);
    const dateParts=splitDate?cells.slice(4,7):[dob];
    const hasDate=dateParts.some(v=>typeof v==="number"?v!==0:Boolean(cell(v)));
    if (![id,prefix,name,jersey,role,note,grade].some(v=>Boolean(cell(v)))&&!hasDate) continue;
    const values=[displayRows[row]?.[1]??id,prefix,name,dob,jersey,role,note].map(cell);
    if(values[0]&&studentCodes.has(values[0]))throw new Error(`แถว ${row+1}: รหัสนักเรียนซ้ำ`);
    if(values[0])studentCodes.add(values[0]);
    if (!FOOTBALL_NAME_PREFIXES.includes(values[1] as typeof FOOTBALL_NAME_PREFIXES[number])) {
      throw new Error(`แถว ${row + 1}: คำนำหน้าชื่อไม่ถูกต้อง`);
    }
    if (!values[2]) throw new Error(`แถว ${row + 1}: ไม่พบชื่อ–สกุล`);

    const birthDate = splitDate ? readThaiDateParts(...(dateParts as [unknown,unknown,unknown])) : readDate(dob, XLSX);
    if (!birthDate) throw new Error(`แถว ${row + 1}: วันเกิดไม่ถูกต้อง กรุณาระบุวัน เดือน ปี พ.ศ. ให้ครบและถูกต้อง เช่น 2 ธันวาคม 2554`);
    if (!/^(?:[0-9]|[1-9][0-9])$/.test(values[4])) throw new Error(`แถว ${row + 1}: เบอร์เสื้อไม่ถูกต้อง (0–99)`);
    if (jerseys.has(values[4])) throw new Error(`แถว ${row + 1}: หมายเลขเสื้อซ้ำ`);
    if (values[5] && !(values[5] === "ผู้เล่นจริง" || values[5] === "สำรอง")) throw new Error(`แถว ${row + 1}: บทบาทนักกีฬาไม่ถูกต้อง`);

    if (!/^ม\.[1-6]$/.test(cell(grade))) throw new Error(`แถว ${row+1}: กรุณาระบุชั้นเรียน ม.1–ม.6`);
    if(code==="GS3-FS-15M" && birthDate<"2011-01-01") throw new Error(`แถว ${row+1}: รุ่น 15 ปี ชาย ต้องเกิดตั้งแต่ พ.ศ. 2554`);
    jerseys.add(values[4]);
    players.push({
      prefix: values[1],
      name: values[2],
      student_code: values[0],
      birth_date: birthDate,
      jersey_number: values[4],
      player_role: values[5],
      player_note: values[6],
      grade_level:cell(grade),
    });
  }

  if(players.length<10||players.length>14) throw new Error("ลงทะเบียนฟุตซอลได้ 10–14 คนต่อทีม");
  return players;
}
