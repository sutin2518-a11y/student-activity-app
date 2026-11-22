# Student Activity — Group Sports v10: School Accounts + Compact Menu

## รายการปรับปรุง

- เมนู 10 รายการจัดเป็นการ์ดเตี้ย 88px ไอคอนเส้นสีน้ำเงินเข้มเหมือนกันทั้งหมด การ์ดที่เลือกพื้นน้ำเงินเข้ม ไอคอนและข้อความขาว; มือถือเลื่อนแนวนอนได้
- เมนู **บัญชีโรงเรียน** แสดงตลอด ถ้าไม่ใช่ Admin จะเห็นหน้าแนะนำให้ลงชื่อเข้าใช้และไม่ได้สิทธิ์เรียก API
- สุ่ม username `py001`, `py002`, ... และ password แบบสุ่มสำหรับโรงเรียนที่ยังไม่มีบัญชี (คงข้อมูลเดิม)
- เก็บสำเนารหัสผ่านแบบ **AES-256-GCM encrypted at rest** ในฐานข้อมูล แยก key จาก database; Supabase Auth ยังคงเก็บรหัสผ่านแบบ hash ตามปกติ
- Admin ที่มีบทบาท `super_admin` หรือ `competition_admin` ของรายการแข่งขัน เปิดดูรหัสของโรงเรียนเฉพาะเมื่อกด **ดูรหัสผ่าน** (ทุกครั้งมี audit log) และกดรีเซ็ตได้
- บัญชีที่สร้างก่อนติดตั้ง v10 **ไม่สามารถเปิดดูรหัสผ่านเดิมได้** ต้องรีเซ็ตรหัสผ่านและบันทึกใน vault ใหม่เท่านั้น

## ติดตั้ง

1. **สำรองโครงการและฐานข้อมูลก่อน**
2. อัปเดต Patch v10 ใน Root ของโปรเจกต์ (มี `src/` และ `supabase/`)
3. ใน Supabase SQL Editor ให้รัน `supabase/migrations/202611220013_school_credential_vault.sql` หลัง migration 0012
4. ใน Vercel > Project Settings > Environment Variables เพิ่ม:

   | ตัวแปร | รูปแบบและข้อควรระวัง |
   |---|---|
   | `SPORTS_ACCOUNT_EMAIL_DOMAIN` | ใช้โดเมนอีเมลที่องค์กรดูแลจริง เช่น `chiangkham.ac.th` เพื่อสร้างอีเมลระบบภายในแบบสุ่ม (ผู้ใช้ล็อกอินด้วย Username) |
   | `SPORTS_ACCOUNT_VAULT_KEY` | **Secret** ค่าสุ่ม Hex 64 ตัว (32 bytes); สร้างครั้งเดียว เก็บไว้ในที่ปลอดภัย **ห้ามส่งมาในแชทหรือ Commit** |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret ที่มีอยู่แล้ว เก็บฝั่ง Server เท่านั้น |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ค่าเดิม ไม่ต้องเปลี่ยน |

   สร้าง `SPORTS_ACCOUNT_VAULT_KEY` ใน PowerShell/Terminal ของเครื่องคุณ:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   ให้นำ output ไปวางใน Vercel ในประเภท **Secret**, ไม่พิมพ์หรือถ่ายภาพค่ามาในแชท

5. **สำคัญมาก:** ถ้า Production และ Preview ใช้ฐานข้อมูล Supabase เดียวกัน จะต้องใช้ค่า `SPORTS_ACCOUNT_VAULT_KEY` เดียวกันเพื่อถอดรหัสบัญชีที่สร้างข้ามสภาพแวดล้อมได้ แต่แนวทางที่ดีกว่าคือใช้ฐานข้อมูล Preview แยกจาก Production
6. Save แล้ว Redeploy; เพิ่มค่า Environment Variables ไม่มีผลย้อนหลังจนกว่าจะ Redeploy
7. ในเมนูบัญชีโรงเรียน ตรวจจำนวนโรงเรียนที่ยังไม่มีบัญชี จากนั้นทดลองสร้าง 1 บัญชีและทดสอบ Login, Reveal, Reset ก่อนกดสุ่มบัญชีทั้ง 21 โรงเรียน

## ความปลอดภัยและข้อจำกัด

- Database เก็บเพียง ciphertext, IV, tag (ไม่เก็บ plaintext); encryption key อยู่ใน Vercel environment เท่านั้น
- ช่องทางการเปิดดูรหัสผ่านผ่าน API ที่ตรวจ JWT และตรวจสิทธิ์ Admin กับการแข่งขันทุกครั้ง; การเปิดดูแต่ละครั้งบันทึก `sports_school_credential_audit`
- การเปิดดูรหัสผ่านเดิมมีความเสี่ยงมากกว่าการรีเซ็ต จึงควรใช้เฉพาะเมื่อโรงเรียนร้องขอ ส่งข้อมูลผ่านช่องทางส่วนตัว และปิดหน้าจอทันที
- ถ้า `SPORTS_ACCOUNT_VAULT_KEY` ถูกลบหรือเปลี่ยน คลังรหัสผ่านเก่าจะไม่สามารถถอดได้ ต้องใช้คีย์เดิมหรือรีเซ็ตแต่ละบัญชีใหม่; เก็บคีย์ใน Secret Manager ขององค์กร
- Supabase Auth ไม่อนุญาตอ่านรหัสผ่านเก่าจากตาราง Auth (hash) ระบบ v10 จึงเริ่มบันทึกเฉพาะรหัสที่ออกใหม่หลังติดตั้ง
- **ห้ามส่ง Excel รวมรหัสผ่านทั้งหมดในกลุ่ม LINE หรือส่งเป็นไฟล์สาธารณะ** ให้แจกเฉพาะโรงเรียนที่เกี่ยวข้อง
- ฟังก์ชันยังไม่ผ่าน Integration test กับ Supabase/Vercel จริง; ตรวจสอบด้วยข้อมูลทดสอบก่อน Production

## ไฟล์สำคัญ

- `src/components/group-sports/GroupSportsDashboard.tsx` — เมนูไอคอนสีเดียวและเตี้ยลง
- `src/components/group-sports/SchoolAccountsManager.tsx` — UI สุ่มบัญชี/ดูรหัส/รีเซ็ต
- `src/app/api/group-sports/school-accounts/route.ts` — สร้าง/อ่านบัญชี, สถานะ Vault
- `src/app/api/group-sports/school-accounts/bulk/route.ts` — สร้างเป็นชุดและเก็บ Vault
- `src/app/api/group-sports/school-accounts/[id]/route.ts` — Reset, Reveal (audit), Enable, Disable
- `src/lib/group-sports/school-credential-vault.ts` — AES-256-GCM server only
- `supabase/migrations/202611220013_school_credential_vault.sql` — ตาราง Vault + Audit
