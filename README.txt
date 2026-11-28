UNIFIED NAVIGATION v1 — PHULANGKA GAMES 2026
สำหรับ student-activity-app ที่ติดตั้ง Unified Results v1 / SQL 064 แล้ว

1. หยุดเซิร์ฟเวอร์ที่กำลังรัน (Ctrl+C) และตรวจ git status ก่อน
2. คัดลอก install-unified-navigation.cjs ไปยังโฟลเดอร์ student-activity-app (ข้าง package.json)
3. node install-unified-navigation.cjs
   ต้องได้ CHECK READY - no files changed. ถ้าพบ ERROR ให้หยุดและส่งผลลัพธ์/ไฟล์ล่าสุด ห้ามบังคับติดตั้ง
4. node install-unified-navigation.cjs --apply
   ตัวติดตั้งสำรองไฟล์ที่แก้ไว้ในโฟลเดอร์ unified-navigation-backup-* ข้างโปรเจกต์
   ตรวจ TypeScript syntax ก่อนบันทึกทุกไฟล์; ไม่ติดตั้ง dependency เพิ่ม
5. npm run build
6. npm run start
7. ตรวจบน localhost ด้วยบัญชีแม่แอดมิน, กรรมการที่ได้รับมอบหมาย, โรงเรียน, ผู้ชมไม่ล็อกอิน
   - การแข่งขัน: โปรแกรม / รายการ / ผล เท่านั้น
   - เมนูระบบ: ศูนย์กรรมการ, จัดการโปรแกรม, จัดการโรงเรียน, ศูนย์เกียรติบัตร, ผู้ดูแลระบบ (แสดงตามสิทธิ์เดิม)
   - เลือกกีฬาและรุ่นในศูนย์กรรมการ เปิดหน้ากีฬาในแท็บใหม่ กลับมากดโหลดผลล่าสุด
   - ตรวจว่ารหัสรุ่นตรงกับรายการที่เลือก โดยเฉพาะฟุตบอลและ RoV
   - จำนวนประกาศแล้ว + ยังไม่ประกาศ = จำนวนรายการที่เข้าถึงได้; สิทธิ์ประกาศแยกต่างหาก
   - แม่แอดมินที่ไม่ได้รับมอบหมายโดยตรงยังประกาศไม่ได้ตาม SQL 038/064 เดิม
   - ตรวจปุ่มพิมพ์เกียรติบัตร, สถิติโรงเรียน, ตราโรงเรียน, ตารางคะแนน, ลงทะเบียนและระบบเผยแพร่เดิม
   - ห้ามสร้างคะแนน/ผลรางวัลสมมติบนฐานข้อมูลจริง ให้ทดสอบการเขียนบนฐานทดสอบ
8. เมื่อผ่านทุกข้อจึง commit เฉพาะ 4 ไฟล์ src ที่แก้; ไม่จำเป็นต้อง commit ตัวติดตั้งหรือ backup

เปลี่ยน 4 ไฟล์:
- src/components/group-sports/GroupSportsDashboard.tsx (ปรับเฉพาะเมนู)
- src/app/group-sports/officials/my/page.tsx (จัดกลุ่มกีฬา / รุ่น, สถิติ, ขั้นตอน; ใช้ RPC เดิม)
- src/components/group-sports/FootballDashboard.tsx (อ่าน query code)
- src/app/group-sports/esports/page.tsx (อ่าน query code/tab)
ไม่มี SQL ใหม่ / ไม่แก้ฐานข้อมูล / ไม่เปลี่ยน RLS หรือสิทธิ์ / ไม่ลบ route เดิม
ระบบอันดับเดิมและ TEST ซ่อนไว้ในเครื่องมือผู้ดูแล; หน้าเฉพาะกีฬาเดิมยังคงอยู่
ยังไม่แก้กติกา RoV อันดับ 3 หรือการล็อกผลทุกช่องทาง; ไม่ได้ทดสอบ Production Build หรือฐานจริง
