GROUP SPORTS — MODERN CONFIRMATION v1
ภูลังกาเกมส์ ครั้งที่ 30 / Performance v2 compatible

1. แตก ZIP ไว้ข้างโฟลเดอร์ student-activity-app (ไม่ต้องวางทับ src)
   ตัวอย่าง D:\ระบบ\group-sports-dialog-v1\
2. เปิด CMD ใน D:\ระบบ\student-activity-app
3. ตรวจสอบก่อน (ไม่แก้ไฟล์):
   node "..\group-sports-dialog-v1\install-sports-dialogs.cjs"
   หากมี ERROR หรือ SKIP ให้หยุดและตรวจสอบก่อน
4. ติดตั้ง:
   node "..\group-sports-dialog-v1\install-sports-dialogs.cjs" --apply
5. หยุด npm run dev/start (Ctrl+C) แล้ว npm run build
   เมื่อผ่าน npm run start แล้วทดสอบหน้าลงทะเบียนและยืนยัน/ยกเลิก
6. ตรวจ Changes ใน GitHub Desktop แล้ว commit เฉพาะไฟล์ src ที่แก้ไข
   ตัวติดตั้งและสำเนาสำรองอยู่นอกโปรเจกต์ ไม่ต้อง commit

ขอบเขต:
- เปลี่ยน window.confirm ใน client TSX ของ src/app/group-sports และ src/components/group-sports เฉพาะบริบท async หรือ JSX handler ที่รองรับ
- ข้ามไฟล์สำรอง -updated, merged, backup, .bak
- ใช้ SweetAlert2 ที่มีอยู่แล้วใน dependencies; dynamic import เฉพาะเมื่อเรียกใช้
- ไม่แก้ข้อความยืนยันเดิม ไม่แก้ SQL, สถานะรับสมัคร, RPC หรือเงื่อนไขสิทธิ์
- ไม่แก้ข้อความ error/success แบบ inline, alert/prompt ที่อาจมีในไฟล์นอกขอบเขต
- fallback ไปยัง window.confirm เฉพาะเมื่อโหลด UI ใหม่ล้มเหลว
- สำรองไฟล์ก่อนเขียนไว้ที่โฟลเดอร์ student-activity-app-dialog-backups ข้างโปรเจกต์
- หากติดตั้งแล้ว รันซ้ำจะไม่เปลี่ยน call ที่แปลงแล้ว

ผลทดสอบกับ snapshot ที่ประกอบจากไฟล์โครงการและ ZIP ล่าสุด: 79 จุด 27 ไฟล์, 0 skipped / 0 errors, TypeScript transpile ผ่าน, ทดสอบการตอบรับ/ยกเลิก/ซ้ำด้วย mock ผ่าน
ยังไม่ได้ full build หรือทดสอบเบราว์เซอร์จริงของเครื่องผู้ใช้
