HOTFIX v33.4.2 — แก้ Build TypeScript (ใช้แทนสคริปต์ v33.4.1)

เหตุผล: v33.4.1 หยุดเมื่อไม่พบไฟล์ src/app/group-sports-officials/page.tsx
โปรเจกต์อาจมีโครงสร้างเมนูเปลี่ยนไปแล้ว จึงต้องค้นไฟล์ page.tsx จริงแทน

วิธีใช้ (Windows / VS Code):
1. สำรองโปรเจกต์หรือ Commit ผ่าน GitHub Desktop ก่อน
2. คัดลอก apply-v33.4.2.cjs ไปไว้ข้าง package.json
3. เปิด Terminal ที่โฟลเดอร์โปรเจกต์
4. รัน node apply-v33.4.2.cjs
5. รัน npm run build
6. ถ้าผ่าน จึง Commit / Push ไป GitHub

สคริปต์แก้เฉพาะ:
- JSX CertificatesDashboard ที่ส่ง mode="manage" คู่กับ view= ที่ไม่รองรับ
- SportsOfficialsAccessManager.tsx ที่ใช้ Set.has(selectedEvent.event_code)
  เมื่อ event_code อาจเป็น null

สคริปต์จะค้นหา page.tsx จาก src/app โดยอัตโนมัติ ไม่หยุดเพราะไม่พบเส้นทางเดิม
สคริปต์สำรองไฟล์ที่แก้ไว้ใน .hotfix-v33-4-2-backup-.../
ไม่แก้ข้อมูลหรือโครงสร้าง Supabase และไม่แตะระบบสิทธิ์กรรมการ

หากยัง Build ไม่ผ่าน โปรดส่งข้อผิดพลาดล่าสุดพร้อมไฟล์โค้ดที่ระบุ
