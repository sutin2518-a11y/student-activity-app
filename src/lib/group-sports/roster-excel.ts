/** Event-specific Excel templates for student-athlete registration.
 * The workbook contains no live/student data until the school fills it in.
 * Import validates template identity before any UI state is updated.
 */
import { addRosterExcelDropdowns, type ExcelDropdown } from "./xlsx-dropdowns";

export type RosterTemplateEvent = {
  id: string;
  event_code?: string | null;
  sport_name: string;
  event_type?: "team" | "individual" | "athletics";
  max_athletes_per_entry?: number | null;
};

export type ImportedAthlete = {
  prefix: string;
  student_code: string;
  full_name: string;
  grade_level: null;
  gender: null;
  team_role?: string;
  ign?: string;
  play_position?: string;
};

const SHEET_ROSTER = "รายชื่อนักกีฬา";
const SHEET_META = "ข้อมูลรายการ";
const TEMPLATE_VERSION = "CKW-SPORTS-ROSTER-1";
const STANDARD_HEADERS = ["ลำดับ", "รหัสนักเรียน", "คำนำหน้าชื่อ", "ชื่อ-สกุล"];
const ROV_HEADERS = ["บทบาทในทีม", "ชื่อในเกม (IGN)", "ตำแหน่งที่เล่น"];
export const ATHLETE_NAME_PREFIXES = ["เด็กชาย", "เด็กหญิง", "นาย", "นางสาว"] as const;
const PREFIXES: readonly string[] = ATHLETE_NAME_PREFIXES;
const ROLES = ["หัวหน้าทีม", "ตัวจริง", "ตัวสำรอง"];
export const ROV_PLAY_POSITIONS = ["Dark Slayer", "Jungle", "Midlane", "Abyssal Dragon", "Support"] as const;
const POSITIONS: readonly string[] = ROV_PLAY_POSITIONS;

export function isRovRoster(event: RosterTemplateEvent): boolean {
  return ["GS3-ES-SM", "GS3-ES-SF"].includes(event.event_code || "");
}

export function supportsIndividualBatch(event: RosterTemplateEvent): boolean {
  return !event.event_code?.startsWith("GS3-TT-") && event.event_type !== "team" && event.max_athletes_per_entry === 1;
}

export function rosterColumns(event: RosterTemplateEvent): string[] {
  return isRovRoster(event) ? [...STANDARD_HEADERS, ...ROV_HEADERS] : STANDARD_HEADERS;
}

export async function downloadRosterTemplate(event: RosterTemplateEvent): Promise<void> {
  const XLSX = await import("xlsx");
  const rov = isRovRoster(event);
  const limit = rov ? 7 : supportsIndividualBatch(event) ? 50 : Math.min(Math.max(event.max_athletes_per_entry || 30, 1), 100);
  const headers = rosterColumns(event);
  const rows: string[][] = [headers];
  for (let index = 0; index < limit; index++) {
    const role = index === 0 ? "หัวหน้าทีม" : index < 5 ? "ตัวจริง" : "ตัวสำรอง";
    rows.push([String(index + 1), "", "", "", ...(rov ? [role, "", ""] : [])]);
  }
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = headers.map((_, i) => ({ wch: i === 3 ? 34 : i === 5 ? 24 : i === 6 ? 24 : 20 }));
  // Keep student IDs as text so leading zeros are not lost during normal data entry.
  for (let row = 2; row <= limit + 1; row++) {
    const cell = `B${row}`;
    worksheet[cell] = { t: "s", v: "", z: "@" };
  }
  const metadata = XLSX.utils.aoa_to_sheet([
    ["เวอร์ชันเทมเพลต", TEMPLATE_VERSION],
    ["รหัสรายการภายในระบบ", event.id],
    ["รหัสการแข่งขัน", event.event_code || ""],
    ["ชื่อรายการ", event.sport_name],
    ["จำนวนนักกีฬาต่อใบสมัคร", rov ? 7 : (event.max_athletes_per_entry || "ไม่จำกัด")],
    ["วิธีนำเข้า", supportsIndividualBatch(event) ? "กีฬาเดี่ยว/กรีฑา: ระบบแยกหนึ่งนักกีฬาต่อหนึ่งใบสมัคร สูงสุด 100 รายชื่อ" : "กีฬาทีม/คู่: รายชื่อในไฟล์เดียวกันเป็นหนึ่งใบสมัคร"],
    ["คำแนะนำ", "กรอกเฉพาะชีต 'รายชื่อนักกีฬา' ห้ามแก้ชื่อคอลัมน์หรือชีต 'ข้อมูลรายการ'"],
    ["วิธีใช้", "ดาวน์โหลดจากรายการที่ต้องการ → กรอก Excel → อัปโหลดในรายการเดิม → ตรวจสอบก่อนบันทึก"],
    ["คำนำหน้าที่รองรับ", PREFIXES.join(", ")],
    ["ข้อมูลนักกีฬา", "ไม่ต้องกรอกชั้นหรือเพศ; โรงเรียนตรวจสอบความถูกต้องตามรุ่น/ประเภทแข่งขัน"],
    ...(rov ? [["RoV", "หัวหน้าทีม 1 คน + ตัวจริง 4 คน, ตัวสำรอง 0–2 คน; ระบุ IGN ทุกคน"], ["ตำแหน่ง", POSITIONS.join(", ")]] : []),
  ]);
  metadata["!cols"] = [{ wch: 29 }, { wch: 95 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, worksheet, SHEET_ROSTER);
  XLSX.utils.book_append_sheet(book, metadata, SHEET_META);
  const safe = (event.event_code || event.sport_name).replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60);
  // SheetJS Community Edition does not export Excel data validation rules.
  // Inject OOXML-native dropdowns into the generated uncompressed workbook.
  const rules: ExcelDropdown[] = [
    { range: `C2:C${limit + 1}`, options: PREFIXES, label: "คำนำหน้าชื่อ" },
    ...(rov ? [
      { range: `E2:E${limit + 1}`, options: ROLES, label: "บทบาทในทีม" },
      { range: `G2:G${limit + 1}`, options: POSITIONS, label: "ตำแหน่งที่เล่น" },
    ] : []),
  ];
  const raw = XLSX.write(book, { type: "array", bookType: "xlsx", compression: false });
  const withDropdowns = addRosterExcelDropdowns(new Uint8Array(raw), rules);
  // Make an ArrayBuffer-backed Blob for compatibility with strict TS BlobPart typing.
  const buffer = new ArrayBuffer(withDropdowns.byteLength);
  new Uint8Array(buffer).set(withDropdowns);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `แบบฟอร์มรายชื่อนักกีฬา-${safe}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const asText = (value: unknown): string => String(value ?? "").normalize("NFC").trim();

export async function readRosterExcel(file: File, event: RosterTemplateEvent): Promise<ImportedAthlete[]> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("รองรับไฟล์ Excel .xlsx หรือ .xls เท่านั้น กรุณาใช้เทมเพลตที่ดาวน์โหลดจากระบบ");
  if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellText: true });
  const rosterSheet = workbook.Sheets[SHEET_ROSTER];
  const metadataSheet = workbook.Sheets[SHEET_META];
  if (!rosterSheet || !metadataSheet) throw new Error("ไม่พบรูปแบบเทมเพลตของระบบ กรุณาดาวน์โหลดเทมเพลตของรายการแข่งขันนี้อีกครั้ง");
  const metadata = XLSX.utils.sheet_to_json<unknown[]>(metadataSheet, { header: 1, raw: false, defval: "" });
  if (asText(metadata[0]?.[1]) !== TEMPLATE_VERSION) throw new Error("เวอร์ชันเทมเพลตไม่ถูกต้อง กรุณาดาวน์โหลดไฟล์ใหม่");
  if (asText(metadata[1]?.[1]) !== event.id || asText(metadata[2]?.[1]) !== (event.event_code || "")) {
    throw new Error("ไฟล์นี้เป็นของรายการแข่งขันอื่น กรุณาดาวน์โหลดเทมเพลตของรายการที่เลือกอยู่");
  }
  const sheetRange = rosterSheet["!ref"] ? XLSX.utils.decode_range(rosterSheet["!ref"]) : null;
  if (sheetRange && sheetRange.e.r > 500) throw new Error("ไฟล์มีมากกว่า 500 แถว กรุณาลดจำนวนแถวให้ตรงตามรายการ");
  const data = XLSX.utils.sheet_to_json<unknown[]>(rosterSheet, { header: 1, raw: false, defval: "" });
  const expected = rosterColumns(event);
  if (!expected.every((name, i) => asText(data[0]?.[i]) === name)) {
    throw new Error("หัวตาราง Excel ไม่ตรงกับเทมเพลต กรุณาอย่าเปลี่ยนชื่อคอลัมน์");
  }
  if (data.length > 501) throw new Error("ไฟล์มีมากกว่า 500 แถว กรุณาแบ่งรายชื่อและใช้เทมเพลตของแต่ละรายการ");
  const imported: ImportedAthlete[] = [];
  const usedCodes = new Set<string>();
  for (let index = 1; index < data.length; index++) {
    const cells = data[index] || [];
    const studentCode = asText(cells[1]);
    let prefix = asText(cells[2]);
    let fullName = asText(cells[3]);
    const role = asText(cells[4]);
    const ign = asText(cells[5]);
    const position = asText(cells[6]) === "Mid" ? "Midlane" : asText(cells[6]); // Older templates remain importable
    // Ignore unused rows, including prefilled order numbers and RoV roles.
    if (![studentCode, prefix, fullName, ign, position].some(Boolean)) continue;
    const line = index + 1;
    const inlinePrefix = PREFIXES.find((p) => fullName.startsWith(p));
    if (inlinePrefix) {
      if (prefix && prefix !== inlinePrefix) throw new Error(`แถว ${line}: คำนำหน้าชื่อซ้ำและไม่ตรงกัน`);
      prefix = inlinePrefix;
      fullName = fullName.slice(inlinePrefix.length).trim();
    }
    if (!PREFIXES.includes(prefix)) throw new Error(`แถว ${line}: กรุณาเลือกคำนำหน้าชื่อให้ถูกต้อง`);
    if (!fullName || fullName.length > 160) throw new Error(`แถว ${line}: กรุณากรอกชื่อ-สกุลให้ครบ (ไม่เกิน 160 ตัวอักษร)`);
    if (studentCode.length > 50) throw new Error(`แถว ${line}: รหัสนักเรียนยาวเกินไป`);
    if (studentCode && usedCodes.has(studentCode)) throw new Error(`แถว ${line}: รหัสนักเรียน ${studentCode} ซ้ำในไฟล์`);
    if (studentCode) usedCodes.add(studentCode);
    const athlete: ImportedAthlete = { student_code: studentCode, prefix, full_name: fullName, grade_level: null, gender: null };
    if (isRovRoster(event)) {
      if (!ROLES.includes(role)) throw new Error(`แถว ${line}: บทบาทในทีมต้องเป็น หัวหน้าทีม, ตัวจริง หรือ ตัวสำรอง`);
      if (!ign || ign.length > 80) throw new Error(`แถว ${line}: กรุณากรอกชื่อในเกม (IGN) ไม่เกิน 80 ตัวอักษร`);
      if (position && !POSITIONS.includes(position)) throw new Error(`แถว ${line}: ตำแหน่งที่เล่นไม่ถูกต้อง`);
      athlete.team_role = role;
      athlete.ign = ign;
      athlete.play_position = position;
    }
    imported.push(athlete);
  }
  if (!imported.length) throw new Error("ไม่พบรายชื่อนักกีฬาในไฟล์ Excel");
  const max = isRovRoster(event) ? 7 : supportsIndividualBatch(event) ? 100 : event.max_athletes_per_entry;
  if (max && imported.length > max) throw new Error(`รายการนี้รับนักกีฬาได้ไม่เกิน ${max} คน (ไฟล์มี ${imported.length} คน)`);
  if (isRovRoster(event)) {
    const captain = imported.filter((p) => p.team_role === "หัวหน้าทีม").length;
    const starters = imported.filter((p) => p.team_role === "ตัวจริง").length;
    const reserves = imported.filter((p) => p.team_role === "ตัวสำรอง").length;
    if (captain !== 1 || starters !== 4 || reserves > 2) {
      throw new Error(`RoV ต้องมีหัวหน้าทีม 1 คน ตัวจริง 4 คน และสำรอง 0–2 คน (พบ ${captain}/${starters}/${reserves})`);
    }
  }
  return imported;
}
