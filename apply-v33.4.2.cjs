#!/usr/bin/env node
'use strict';
// Football / group sports certificates: minimal TypeScript build repair.
// Finds real TSX routes rather than requiring routes that may not exist in this version.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const appDir = path.join(root, 'src', 'app');
const manager = 'src/components/group-sports/SportsOfficialsAccessManager.tsx';

if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(appDir)) {
  console.error('กรุณาเปิด Terminal ที่โฟลเดอร์โปรเจกต์ Next.js ซึ่งมี package.json และ src/app');
  process.exit(1);
}
function collectPages(dir) {
  let found = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const location = path.join(dir, ent.name);
    if (ent.isDirectory()) found.push(...collectPages(location));
    else if (ent.isFile() && ent.name === 'page.tsx') found.push(location);
  }
  return found;
}
const updates = [];
const messages = [];
const problems = [];
let removed = 0;
for (const file of collectPages(appDir)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/<CertificatesDashboard\b[\s\S]*?\/>/g, (tag) => {
    if (!/\bmode\s*=\s*["']manage["']/.test(tag) || !/\bview\s*=/.test(tag)) return tag;
    // Change only the unsupported view attribute of CertificatesDashboard. Preserve mode.
    const cleaned = tag.replace(/\s+view\s*=\s*(?:"[^"]*"|'[^']*'|\{\s*(?:"[^"]*"|'[^']*'|[A-Za-z_$][\w.$]*)\s*\})/, '');
    if (cleaned !== tag) removed++;
    else problems.push(`${path.relative(root, file)}: พบ view ที่รูปแบบไม่รองรับ กรุณาส่งไฟล์นี้มาตรวจ`);
    return cleaned;
  });
  if (before !== after) updates.push({ file, before, after });
}
messages.push(`ค้นพบและแก้พร็อพ view ใน CertificatesDashboard: ${removed} จุด`);
const managerFull = path.join(root, manager);
if (fs.existsSync(managerFull)) {
  const before = fs.readFileSync(managerFull, 'utf8');
  const knownBad = /const\s+isEsports\s*=\s*!!selectedEvent\s*&&\s*eSportCodes\.has\(selectedEvent\.event_code\)\s*;/;
  const after = before.replace(knownBad, 'const isEsports = typeof selectedEvent?.event_code === "string" && eSportCodes.has(selectedEvent.event_code);');
  if (before !== after) {
    updates.push({ file: managerFull, before, after });
    messages.push('แก้ event_code: string | null → ตรวจว่าเป็น string ก่อนใช้ Set.has()');
  } else {
    messages.push('SportsOfficialsAccessManager: ไม่พบรูปแบบข้อผิดพลาดเดิม (ข้าม)');
  }
} else messages.push('ไม่พบ SportsOfficialsAccessManager ในโปรเจกต์นี้ (ข้าม)');

if (problems.length) {
  console.error('หยุดเพื่อความปลอดภัย เนื่องจากพบพร็อพที่ต้องตรวจด้วยมือ:');
  problems.forEach(x => console.error(' - ' + x));
  console.error('ยังไม่มีไฟล์ใดถูกเปลี่ยน');
  process.exit(1);
}
messages.forEach(x => console.log('• ' + x));
if (!updates.length) {
  console.log('ไม่มีโค้ดที่ต้องแก้ในรูปแบบเดิมแล้ว ให้รัน npm run build และส่ง Error ล่าสุดหากยังไม่ผ่าน');
  process.exit(0);
}
const backupDir = path.join(root, `.hotfix-v33-4-2-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
try {
  // Back up all files before changing any source files.
  for (const item of updates) {
    const dest = path.join(backupDir, path.relative(root, item.file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(item.file, dest);
  }
  for (const item of updates) {
    fs.writeFileSync(item.file, item.after, 'utf8');
    console.log('✓ แก้ไข ' + path.relative(root, item.file).replace(/\\/g, '/'));
  }
} catch (err) {
  console.error('ไม่สามารถเขียนไฟล์ได้; โปรดตรวจสิทธิ์ไฟล์และสำรองใน ' + backupDir);
  console.error(err);
  process.exit(1);
}
console.log('สำรองไฟล์เดิมไว้ใน ' + path.basename(backupDir));
console.log('ขั้นตอนต่อไป: npm run build');
