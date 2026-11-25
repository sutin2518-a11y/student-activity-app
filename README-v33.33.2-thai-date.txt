PHAYAO GAMES 2569 — v33.33.2 Thai date / Football only

ใช้แทน Patch v33.33.1 สำหรับระบบฟุตบอล v33.33 ที่มี FootballPhotoPicker, FootballSavedPhotos, football-backup และ RPC v3333 แล้ว
อ้างอิง FootballDashboard.tsx และ xlsx-dropdowns.ts ที่ส่งจากเครื่องบ้านล่าสุด และโค้ด football-roster-excel.ts จาก Patch ก่อนหน้า
ไฟล์ futsal-roster-excel.ts ที่แนบมาไม่ได้แก้ไข

ติดตั้ง:
1. หยุด npm run dev ด้วย Ctrl+C (ถ้ามีคำถาม Terminate batch job ตอบ Y)
2. สำรองไฟล์ที่จะแก้ 4 ไฟล์ หรือ commit ลง branch ทดสอบก่อน
3. แตก ZIP แล้วคัดลอกเฉพาะโฟลเดอร์ src ไปที่ root ของ student-activity-app (Merge/Replace matching files เท่านั้น)
4. ห้ามลบโฟลเดอร์โปรเจกต์เดิมหรือ .env.local ไม่ต้องรัน SQL เพิ่ม
5. npm run build; ถ้าผ่าน npm run dev
6. หากมีคำเตือนอัปเกรด Next.js ให้แยกทดสอบการอัปเกรดต่างหาก อย่านำเวอร์ชันที่มีช่องโหว่ขึ้น Production ก่อนแก้ไข

การเปลี่ยนแปลง:
- ปฏิทินเว็บเป็นเดือนภาษาไทยและปี พ.ศ. เลือกเดือน/ปีได้ ป้องกันวันเกิดอนาคต ค่าในฐานข้อมูลยังเป็น ค.ศ. YYYY-MM-DD
- Excel รุ่นใหม่ CKW-FOOTBALL-2569-3 มีดรอปดาวน์ 3 ช่อง วัน (1–31), เดือนภาษาไทย, ปี พ.ศ. (2443 ถึงปีปัจจุบัน)
- ไม่ใช้ Macro, ไม่ต้องมี Add-in และไม่รับรอง Popup calendar ใน Excel ทุกเวอร์ชัน
- นำเข้าไฟล์เดิมรุ่น 1 และ 2 ได้ด้วย (รูปแบบเดิมและ metadata ต้องตรงรุ่นกีฬา)
- ตัวช่วย xlsx-dropdowns เพิ่ม sourceRange แบบ optional ไม่เปลี่ยนการเรียกเดิมของกีฬาอื่น
- ไม่แก้ PDF, RPC, ฐานข้อมูล, รูปถ่าย หรือไฟล์ .env.local

ตรวจบนเครื่องจริง:
เปิด /group-sports/football?tab=registration แล้วเลือกวันเกิด 2 ธันวาคม 2554
ดาวน์โหลด Excel ใหม่ เลือกคำนำหน้า ชื่อ วัน 2 เดือน ธันวาคม ปี 2554 และเบอร์เสื้อ จากนั้นนำกลับเข้าเว็บ ตรวจว่าตรงกับวันที่เลือกในปฏิทิน (ไม่ต้องส่งใบสมัครทดลองเข้าฐานจริง)
ตรวจว่า 29 กุมภาพันธ์ 2555 ผ่าน แต่ 29 กุมภาพันธ์ 2554 และ 31 เมษายน ไม่ผ่าน
ตรวจเทมเพลตเก่าของฟุตบอลที่มีอยู่และทดสอบดาวน์โหลด Excel ของกีฬาอื่นอย่างน้อยหนึ่งกีฬา
ตรวจ Build, ทดสอบใน Preview ก่อน Push main และแก้คำเตือนความปลอดภัย Next.js ก่อน Production

ผลทดสอบในสภาพแวดล้อมจัดทำ Patch: TypeScript/TSX transpile syntax 4 ไฟล์ผ่าน, ตรวจวันที่ 11 กรณีผ่าน, ตรวจ XML validation แบบ fixture ผ่าน (รวมรูปแบบเดิม)
ยังไม่ใช่ Production Build, ยังไม่ได้ทดสอบ SheetJS round-trip หรือเปิด Excel จริงในเครื่องนี้
