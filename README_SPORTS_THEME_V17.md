# Sports Red–White Theme (v17)

## ขอบเขต
อัปเดตจาก **โครงการ v16** (หัวแบนเนอร์สีแดง–ขาวที่มีภาพนักกีฬาและสัญลักษณ์ RoV) โดยปรับธีมเฉพาะระบบ `/group-sports` เท่านั้น **ระบบกิจกรรมหลักไม่เปลี่ยน**

- เมนูหลัก 8 รายการ: การ์ดพื้นขาวอมชมพู ไอคอนแดงเข้ม และเมนูที่เลือกเป็นแดงเข้มพร้อมตัวหนังสือสีขาว
- เมนูย่อย “จัดการแข่งขัน”: คงเอฟเฟกต์กาง–ยุบ, ใช้สีแดงเข้มเมื่อเลือก
- ฟอร์มและปุ่ม: ปุ่มดำเนินการหลักและ Focus เป็นสีแดง / กรอบแดงอ่อน
- ตารางข้อมูล: หัวตารางพื้นชมพูอ่อน ตัวหนังสือแดงเข้ม, Hover สีแดงจาง ๆ
- หน้า Login โรงเรียน, ส่งข้อมูลโรงเรียน, จัดการโปรแกรม, บัญชีโรงเรียน และ E-Sport: สไตล์ชุดเดียวกัน
- คงโทนเขียวสำหรับอนุมัติ/สำเร็จ, เหลือง/ส้มสำหรับเตือน, สีเหรียญรางวัล และแดงสำหรับยกเลิก/ข้อผิดพลาด

## ไฟล์ใหม่
- `src/app/group-sports/layout.tsx` — ครอบหน้าในระบบกีฬากลุ่มด้วย `sports-red-theme`
- `src/app/group-sports/sports-red-theme.css` — สไตล์ที่จำกัดเฉพาะเส้นทาง `/group-sports`

## ไฟล์ปรับปรุง
- `src/components/group-sports/GroupSportsDashboard.tsx`
- `src/components/group-sports/SchoolAccountsManager.tsx`
- `src/components/group-sports/SchoolSubmissionsContent.tsx`
- `src/components/group-sports/SportsScheduleContent.tsx`
- `src/app/group-sports/login/page.tsx`
- `src/app/group-sports/esports/page.tsx`
- `src/app/group-sports/esports/sessions/page.tsx`

## วิธีติดตั้ง
1. สำรองหรือ Commit โครงการ v16 ที่ใช้งานอยู่ก่อน
2. แตก Patch v17 โดยคงโครงสร้างโฟลเดอร์เดิมและนำไฟล์ไปทับใน **รากโปรเจกต์** ที่มี `package.json`
3. ไม่ต้องแก้ `src/app/globals.css` และไม่ต้องแก้ `next.config.ts`
4. `npm run build` และทดสอบบน Vercel Preview ก่อนใช้งานจริง
5. เมื่อตรวจเรียบร้อย Commit/Push และ Merge เข้า `main` สำหรับ Production

**ไม่ต้องรัน SQL Migration หรือเพิ่ม Environment Variables** การเปลี่ยนแปลงนี้เป็นเฉพาะ UI และ CSS ไม่เปลี่ยนสิทธิ์/API/ฐานข้อมูล

## รายการตรวจหลัง Deploy
- หน้า `/group-sports` แสดงแบนเนอร์สีแดงและเมนูพื้นอ่อน/แดงเข้ม
- คลิก **จัดการแข่งขัน** → ปุ่มหลักแดงเข้มทันที เมนูย่อยกางและแสดงเนื้อหาถูกต้อง
- คลิก **ลงทะเบียน** → แสดงฟอร์มทันที, เลือกกีฬา, เพิ่มครู/นักกีฬา, ดาวน์โหลดเทมเพลต Excel ได้
- `/group-sports/login` → สีแดง–ขาว และยังเข้าสู่ระบบโรงเรียนได้
- Admin → **บัญชีโรงเรียน** และเครื่องมือสุ่ม/รีเซ็ตรหัสผ่านยังแสดง
- สถานะสำเร็จ/อนุมัติคงสีเขียว และการแจ้งเตือนคงสีเหลือง/ส้ม

## ผลตรวจในชุดนี้
- ตรวจไวยากรณ์ TypeScript/TSX ทั้งโครงการด้วย TypeScript parser
- ตรวจการเปลี่ยนไฟล์ว่าอยู่เฉพาะโฟลเดอร์ `src/app/group-sports`, `src/components/group-sports` และ README ใหม่
- ยัง **ไม่ได้รัน Production Build เต็มรูปแบบ** เนื่องจากสภาพแวดล้อมไม่มี `node_modules` ของโครงการ
