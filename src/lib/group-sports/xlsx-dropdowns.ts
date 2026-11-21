/**
 * Add native Excel Data Validation dropdowns to an uncompressed SheetJS .xlsx.
 * SheetJS Community Edition writes cell content but not dropdown validation.
 * We patch xl/worksheets/sheet1.xml and rebuild the small OOXML ZIP without
 * another package, so a normal downloaded Excel file has real selection lists.
 *
 * Call XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: false })
 * before passing the bytes here. Throws for compressed or ZIP64 files rather
 * than silently producing an Excel file without validation.
 */

export type ExcelDropdown = {
  range: string; // C2:C101
  options: readonly string[];
  label: string;
};

type ZipEntry = { name: string; data: Uint8Array; time: number; date: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function parseStoredZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let at = bytes.byteLength - 22; at >= Math.max(0, bytes.byteLength - 65557); at--) {
    if (view.getUint32(at, true) === 0x06054B50) { eocd = at; break; }
  }
  if (eocd < 0) throw new Error("โครงสร้างไฟล์ Excel ไม่ถูกต้อง");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  if (count === 0xFFFF || cursor === 0xFFFFFFFF) throw new Error("ไม่รองรับไฟล์ Excel แบบ ZIP64");
  const entries: ZipEntry[] = [];
  for (let idx = 0; idx < count; idx++) {
    if (view.getUint32(cursor, true) !== 0x02014B50) throw new Error("ไม่พบรายการไฟล์ภายใน Excel");
    const method = view.getUint16(cursor + 10, true);
    if (method !== 0) throw new Error("Excel ไม่ได้ถูกสร้างในโหมดไม่บีบอัด จึงเพิ่มดรอปดาวน์ไม่ได้");
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    if (view.getUint32(localOffset, true) !== 0x04034B50) throw new Error("โครงสร้างไฟล์ Excel เสียหาย");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > bytes.byteLength) throw new Error("ข้อมูลภายใน Excel ไม่สมบูรณ์");
    entries.push({
      name: decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)),
      data: bytes.slice(dataStart, dataStart + compressedSize),
      time: view.getUint16(cursor + 12, true),
      date: view.getUint16(cursor + 14, true),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function writeStoredZip(entries: ZipEntry[]): Uint8Array {
  const names = entries.map(entry => encoder.encode(entry.name));
  const locals = entries.map((entry, i) => 30 + names[i].byteLength + entry.data.byteLength);
  const centrals = entries.map((_, i) => 46 + names[i].byteLength);
  const output = new Uint8Array(locals.reduce((a, b) => a + b, 0) + centrals.reduce((a, b) => a + b, 0) + 22);
  const view = new DataView(output.buffer);
  const offsets: number[] = [];
  let cursor = 0;
  entries.forEach((entry, i) => {
    const name = names[i], length = entry.data.byteLength, crc = crc32(entry.data);
    offsets.push(cursor);
    view.setUint32(cursor, 0x04034B50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x0800, true); // UTF-8 filenames
    view.setUint16(cursor + 8, 0, true); // stored (uncompressed)
    view.setUint16(cursor + 10, entry.time, true);
    view.setUint16(cursor + 12, entry.date, true);
    view.setUint32(cursor + 14, crc, true);
    view.setUint32(cursor + 18, length, true);
    view.setUint32(cursor + 22, length, true);
    view.setUint16(cursor + 26, name.byteLength, true);
    view.setUint16(cursor + 28, 0, true);
    output.set(name, cursor + 30);
    output.set(entry.data, cursor + 30 + name.byteLength);
    cursor += locals[i];
  });
  const centralStart = cursor;
  entries.forEach((entry, i) => {
    const name = names[i], length = entry.data.byteLength, crc = crc32(entry.data);
    view.setUint32(cursor, 0x02014B50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 10, 0, true);
    view.setUint16(cursor + 12, entry.time, true);
    view.setUint16(cursor + 14, entry.date, true);
    view.setUint32(cursor + 16, crc, true);
    view.setUint32(cursor + 20, length, true);
    view.setUint32(cursor + 24, length, true);
    view.setUint16(cursor + 28, name.byteLength, true);
    view.setUint16(cursor + 30, 0, true); // extra length
    view.setUint16(cursor + 32, 0, true); // comment length
    view.setUint16(cursor + 34, 0, true); // disk number
    view.setUint16(cursor + 36, 0, true); // internal attributes
    view.setUint32(cursor + 38, 0, true); // external attributes
    view.setUint32(cursor + 42, offsets[i], true);
    output.set(name, cursor + 46);
    cursor += centrals[i];
  });
  view.setUint32(cursor, 0x06054B50, true);
  view.setUint16(cursor + 4, 0, true);
  view.setUint16(cursor + 6, 0, true);
  view.setUint16(cursor + 8, entries.length, true);
  view.setUint16(cursor + 10, entries.length, true);
  view.setUint32(cursor + 12, cursor - centralStart, true);
  view.setUint32(cursor + 16, centralStart, true);
  view.setUint16(cursor + 20, 0, true);
  return output;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function validationXml(rules: readonly ExcelDropdown[], prefix = ""): string {
  const items = rules.map(({ range, options, label }) => {
    if (!/^[A-Z]{1,3}[1-9]\d*:[A-Z]{1,3}[1-9]\d*$/.test(range)) throw new Error("ช่วงเซลล์ดรอปดาวน์ไม่ถูกต้อง");
    if (!options.length || options.some(option => /[,"\r\n]/.test(option))) throw new Error("ค่าตัวเลือก Excel ไม่ถูกต้อง");
    const formula = `"${options.join(",")}"`;
    if (encoder.encode(formula).length > 255) throw new Error("รายการตัวเลือก Excel ยาวเกิน 255 ไบต์");
    return `<${prefix}dataValidation type="list" errorStyle="stop" allowBlank="1" showDropDown="0" showInputMessage="1" showErrorMessage="1" sqref="${range}" promptTitle="${escapeXml(label)}" prompt="กรุณาเลือกค่าจากรายการ" errorTitle="ค่าที่เลือกไม่ถูกต้อง" error="กรุณาเลือกจากรายการที่กำหนด"><${prefix}formula1>${escapeXml(formula)}</${prefix}formula1></${prefix}dataValidation>`;
  });
  return `<${prefix}dataValidations count="${items.length}">${items.join("")}</${prefix}dataValidations>`;
}

/** Applies dropdowns to the first worksheet (รายชื่อนักกีฬา). */
export function addRosterExcelDropdowns(uncompressedXlsx: Uint8Array, rules: readonly ExcelDropdown[]): Uint8Array {
  if (!rules.length) return uncompressedXlsx;
  const entries = parseStoredZip(uncompressedXlsx);
  const worksheet = entries.find(entry => entry.name === "xl/worksheets/sheet1.xml");
  if (!worksheet) throw new Error("ไม่พบชีตรายชื่อนักกีฬาใน Excel");
  let xml = decoder.decode(worksheet.data);
  if (/<(?:[A-Za-z0-9_]+:)?dataValidations\b/.test(xml)) throw new Error("ชีต Excel มีข้อมูลดรอปดาวน์เดิมอยู่แล้ว");
  const rootTag = xml.match(/<([A-Za-z0-9_]+:)?worksheet\b/);
  if (!rootTag) throw new Error("โครงสร้างชีต Excel ไม่ถูกต้อง");
  const prefix = rootTag[1] || "";
  if (!xml.includes(`</${prefix}worksheet>`)) throw new Error("โครงสร้างชีต Excel ไม่ถูกต้อง");
  const validation = validationXml(rules, prefix);
  // OOXML schema order requires dataValidations after sheetData and before
  // hyperlinks/print settings/page margins. SheetJS writes the latter.
  const afterData = xml.indexOf(`</${prefix}sheetData>`);
  const anchors = ["hyperlinks", "printOptions", "pageMargins", "pageSetup", "headerFooter", "rowBreaks", "colBreaks", "ignoredErrors", "drawing", "legacyDrawing", "extLst"].map(name => `<${prefix}${name}`).concat(`</${prefix}worksheet>`);
  const positions = anchors.map(anchor => xml.indexOf(anchor, afterData >= 0 ? afterData : 0)).filter(pos => pos >= 0);
  if (!positions.length) throw new Error("ไม่สามารถเพิ่มรายการเลือกใน Excel ได้");
  const insertAt = Math.min(...positions);
  xml = xml.slice(0, insertAt) + validation + xml.slice(insertAt);
  worksheet.data = encoder.encode(xml);
  return writeStoredZip(entries);
}
