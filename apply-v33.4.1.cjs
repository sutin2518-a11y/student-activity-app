#!/usr/bin/env node
// Minimal, version-tolerant fix for TypeScript errors in v33.4.
// Run from the root of the CURRENT Next.js project: node apply-v33.4.1.cjs
// Does not touch database, permissions, or unrelated components.
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const fixes = [
  'src/app/group-sports-officials/page.tsx',
  'src/app/group-sports/results/page.tsx',
];
const managerPath = 'src/components/group-sports/SportsOfficialsAccessManager.tsx';
const pending = [];
let errors = [];

for (const relative of fixes) {
  const full = path.join(projectRoot, relative);
  if (!fs.existsSync(full)) {
    errors.push(`ไม่พบไฟล์: ${relative}`);
    continue;
  }
  const original = fs.readFileSync(full, 'utf8');
  // Target ONLY the JSX tags on the two routes that pass mode="manage" + unsupported view.
  // Remove view while preserving any other props, route logic and custom v1.2 changes.
  let matches = 0;
  const updated = original.replace(/<([A-Z][\w.]*)\b([^<>]*?)\s*\/?\s*>/gs, (whole, name, attrs) => {
    if (!/\bmode\s*=\s*["']manage["']/.test(attrs) || !/\bview\s*=/.test(attrs)) return whole;
    const newAttrs = attrs.replace(/\s+view\s*=\s*(?:"[^"]*"|'[^']*'|\{[^{}]*\})/, '');
    if (newAttrs === attrs) return whole;
    matches++;
    return whole.replace(attrs, newAttrs);
  });
  if (matches === 0) {
    if (/\bmode\s*=\s*["']manage["']/.test(original) && !/\bview\s*=/.test(original)) {
      console.log(`✓ ${relative}: ไม่มี view แล้ว (ข้าม)`);
    } else {
      errors.push(`${relative}: ไม่พบ JSX รูปแบบ mode="manage" และ view= ที่แก้ได้อย่างปลอดภัย`);
    }
  } else pending.push({relative, full, original, updated});
}
{
  const full = path.join(projectRoot, managerPath);
  if (!fs.existsSync(full)) errors.push(`ไม่พบไฟล์: ${managerPath}`);
  else {
    const original = fs.readFileSync(full, 'utf8');
    const exact = /const isEsports\s*=\s*!!selectedEvent\s*&&\s*eSportCodes\.has\(selectedEvent\.event_code\);/;
    const replacement = 'const isEsports = selectedEvent?.event_code != null && eSportCodes.has(selectedEvent.event_code);';
    if (exact.test(original)) pending.push({relative: managerPath, full, original, updated: original.replace(exact, replacement)});
    else if (original.includes(replacement)) console.log(`✓ ${managerPath}: ตรวจค่า null แล้ว (ข้าม)`);
    else errors.push(`${managerPath}: ไม่พบโค้ดเดิมที่ตรงกัน จึงไม่แก้อัตโนมัติ`);
  }
}

if (errors.length) {
  console.error('หยุดการแก้ไขเพื่อความปลอดภัย:');
  for (const error of errors) console.error(' - ' + error);
  console.error('ไม่มีไฟล์ใดถูกเปลี่ยน กรุณาส่งไฟล์ TSX ทั้งสามไฟล์เพื่อตรวจเวอร์ชันปัจจุบัน');
  process.exit(1);
}
if (!pending.length) {
  console.log('ตรวจแล้ว: ทั้งสามจุดได้รับการแก้ไขอยู่ก่อนแล้ว');
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(projectRoot, `.hotfix-v33-4-1-backup-${stamp}`);
for (const item of pending) {
  const backup = path.join(backupRoot, item.relative);
  fs.mkdirSync(path.dirname(backup), {recursive: true});
  fs.copyFileSync(item.full, backup);
  fs.writeFileSync(item.full, item.updated, 'utf8');
  console.log(`✓ แก้ไข: ${item.relative}`);
}
console.log(`เก็บสำเนาไฟล์เดิมไว้: ${path.basename(backupRoot)}`);
console.log('ขั้นต่อไป: npm run build');
