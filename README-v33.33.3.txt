CKW v33.33.3 — Football registration UI hotfix
ฐาน: v33.33.2 (ต้องติดตั้งก่อน)
แก้เฉพาะ 3 ไฟล์ใน src/components/group-sports
1. FootballDashboard.tsx — เปิดปุ่มแนบรูปก่อนกรอกชื่อ เก็บรูปที่เลือกในแถวเดิมระหว่างกรอกข้อมูล ยืนยันความถูกต้องก่อนส่ง และบังคับชื่อผู้จัดการทีมหากเลือกรูป
2. FootballPhotoPicker.tsx — ปุ่มภาษาไทย ภาพตัวอย่าง เปลี่ยน/ลบรูป ข้อความสถานะและข้อผิดพลาด
3. ThaiDatePicker.tsx — กำหนด grid 7 คอลัมน์และตำแหน่งไอคอนโดยตรง ไม่พึ่ง utility CSS สำหรับโครงสร้างหลัก

ติดตั้ง: หยุด dev server; สำรองไฟล์เดิม; แตก ZIP; รวมเฉพาะ src เข้ากับ root โปรเจกต์เดิม ไม่ลบโฟลเดอร์เดิม ไม่แตะ .env.local
npm run build
npm run dev (หากมีคำเตือน upgrade ให้แก้แยกก่อน production)
เปิด http://localhost:3000/group-sports/football?tab=registration
ทดสอบเลือกรูปก่อนกรอกชื่อ กรอกชื่อโดยรูปยังอยู่ เปลี่ยน/ลบรูป เลือกวันที่ พ.ศ. และวันที่ 29 ก.พ.
ไม่ต้องส่งใบสมัครจริงเพื่อทดสอบ UI; การทดสอบอัปโหลดจริงให้ใช้บัญชี/ข้อมูลทดลองที่ได้รับอนุญาต
ไม่มี SQL, ไม่มี dependency ใหม่, ไม่แก้ Excel/PDF/Storage policy หรือกีฬาอื่น
ผลตรวจ: TS transpile syntax และ component logic แบบจำลองผ่าน; ตรวจ layout จาก JSX จำลองใน Chromium ผ่าน; ยังไม่ได้ Full Next.js build หรือทดสอบ Storage จริง
