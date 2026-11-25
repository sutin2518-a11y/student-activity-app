import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

const sports = [
  ["volleyball", "src/components/group-sports/VolleyballDashboard.tsx"],
  ["takraw", "src/components/group-sports/TakrawDashboard.tsx"],
  ["petanque", "src/components/group-sports/PetanqueDashboard.tsx"],
  ["table-tennis", "src/components/group-sports/TableTennisDashboard.tsx"],
  ["boxing", "src/components/group-sports/BoxingDashboard.tsx"],
  ["athletics", "src/components/group-sports/AthleticsDashboard.tsx"],
  ["esports", "src/app/group-sports/esports/page.tsx"],
];

test("ทั้ง 7 กีฬาแสดงฟอร์มลงทะเบียนกลางภายในหน้ากีฬาของตนเอง", () => {
  for (const [sport, file] of sports) {
    const source = read(file);
    assert.ok(source.includes(`SportRegistrationEmbed sport="${sport}"`), `${sport} must embed its own registration form`);
  }
});

test("ทุกหน้ากีฬาเปิดแท็บลงทะเบียนจาก URL tab=registration ได้", () => {
  for (const [, file] of sports) {
    const source = read(file);
    assert.ok(source.includes('get("tab") === "registration"') || source.includes("get('tab')==='registration'"), `${file} must support the registration deep link`);
  }
});

test("ลิงก์จากศูนย์ลงทะเบียนส่งไปหน้ากีฬาที่ตรงประเภท", () => {
  const source = read("src/lib/group-sports/registration-hub.ts");
  assert.match(source, /return `\/group-sports\/\$\{s\.key\}\?tab=registration`;/);
});

test("หน้า embed ใช้ระบบกลางเดิมและส่งความสูงกลับไปยังหน้ากีฬา", () => {
  const source = read("src/components/group-sports/GroupSportsDashboard.tsx");
  assert.ok(source.includes('params.get("embed") === "1"'));
  assert.ok(source.includes("window.parent.postMessage({ type: \"ckw-sport-registration-height\", height }"));
  assert.ok(source.includes("if (registrationEmbed)"));
});

test("ส่วนประกอบ iframe ตรวจสอบ origin และ source ก่อนปรับความสูง", () => {
  const source = read("src/components/group-sports/SportRegistrationEmbed.tsx");
  assert.ok(source.includes("event.origin !== window.location.origin"));
  assert.ok(source.includes("event.source !== frameRef.current?.contentWindow"));
});
