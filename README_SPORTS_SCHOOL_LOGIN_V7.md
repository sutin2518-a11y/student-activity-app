# ระบบกีฬากลุ่ม v7 — เข้าสู่ระบบด้วย Username / Password

## ใช้งานอะไรได้บ้าง

- `/group-sports` เป็นลิงก์ตรงสำหรับโรงเรียนและบุคคลทั่วไป (หน้าหลักและโปรแกรมที่เปิดเผยต่อสาธารณะ)
- `/group-sports/login` เป็นหน้าเข้าสู่ระบบสำหรับโรงเรียน โดยไม่ต้องใช้อีเมลหรือ Google Workspace
- เมื่อผู้มีบทบาท `super_admin` หรือ `competition_admin` ของการแข่งขันนี้ล็อกอิน Google ผ่าน `/login` จะเห็นเมนู **บัญชีโรงเรียน** เพิ่มจากเมนูเดิมภายในหน้า `/group-sports`
- Admin สร้างบัญชีให้โรงเรียนที่เข้าร่วมแล้ว ระบุ Username (4–32 ตัวอักษร) และรหัสผ่านเริ่มต้น (12 ตัวขึ้นไป) หรือสุ่มให้ได้
- Admin รีเซ็ตรหัสผ่าน ปิดบัญชี และเปิดบัญชีได้ การปิดบัญชีจะปิดบทบาท `school_manager` ของโรงเรียนนั้นด้วย
- ชื่อผู้ใช้จะไม่ถูกเปิดเผยเป็นอีเมลจริง ข้อมูลอีเมลสังเคราะห์ภายในใช้เฉพาะ Supabase Auth
- ไม่เปลี่ยนวิธี Google Workspace Login ของระบบกิจกรรมพัฒนาผู้เรียน

## ขั้นตอนติดตั้ง

1. สำรองฐานข้อมูล Supabase และโครงการเดิมก่อนทุกครั้ง
2. ตรวจว่ารัน Migration 0003–0011 ของระบบกีฬากลุ่มเรียบร้อยแล้ว โดยเฉพาะ 0011
3. เปิด Supabase SQL Editor แล้วรัน `supabase/migrations/202611220012_sports_school_accounts.sql` **ครั้งเดียว**
4. เพิ่ม Environment Variables ใน **Vercel > Project > Settings > Environment Variables**:

   - `NEXT_PUBLIC_SUPABASE_URL` : URL Supabase ของโครงการเดิม (ต้องตั้งให้ตรงกับ Browser Client)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Anon / Publishable Key ของโครงการเดิม
   - `SUPABASE_SERVICE_ROLE_KEY` : Service Role Key **ฝั่งเซิร์ฟเวอร์เท่านั้น** ห้ามมี `NEXT_PUBLIC_` นำหน้า และห้าม commit ลง GitHub
   - `SPORTS_ACCOUNT_EMAIL_DOMAIN` : โดเมนองค์กรที่ควบคุมเอง เช่น `sports-login.example.ac.th` (แทนชื่อด้วยโดเมนองค์กรของคุณ; ไม่จำเป็นต้องสร้างกล่องจดหมายสำหรับบัญชีเหล่านี้)

5. เลือก Environment ให้ถูกต้อง (Production และ Preview หากต้องทดสอบบน Preview) แล้ว Redeploy
6. Admin ล็อกอิน Google Workspace ที่ `/login` และตรวจว่าในตาราง `sports_user_roles` มีบทบาท `competition_admin` (พร้อม `competition_id` ของการแข่งขัน) หรือ `super_admin` และ `is_active=true` อยู่แล้ว
7. เปิด `/group-sports` > **บัญชีโรงเรียน** สร้าง Username/Password ให้โรงเรียนที่อยู่ในทะเบียนการแข่งขัน
8. ส่ง URL `/group-sports/login` พร้อม Username/Password **ผ่านช่องทางส่วนตัว** แยกโรงเรียน และให้โรงเรียนทดลองส่งข้อมูลและลงทะเบียนด้วยบัญชีของตน
9. เมื่อทดสอบ Preview ผ่านแล้ว จึง Merge เข้าสู่ `main` / Promote Production ตาม workflow เดิม

หากเมนูบัญชีโรงเรียนไม่ปรากฏ ให้ตรวจบทบาทกีฬากลุ่ม ไม่ควรเพิ่มสิทธิ์ผู้ดูแลจาก `profiles.role` หรือจาก metadata ที่ผู้ใช้แก้เองได้

### SQL ตรวจสอบสิทธิ์ Admin (อ่านอย่างเดียว)

```sql
select u.email, r.role, r.is_active, r.competition_id, c.name
from public.sports_user_roles r
join auth.users u on u.id=r.user_id
left join public.sports_competitions c on c.id=r.competition_id
where r.role in ('competition_admin','super_admin')
order by u.email;
```

### SQL ตรวจสอบโรงเรียนที่อยู่ในการแข่งขัน (อ่านอย่างเดียว)

```sql
select s.name, s.school_code, cs.status
from public.sports_competition_schools cs
join public.sports_schools s on s.id=cs.school_id
join public.sports_competitions c on c.id=cs.competition_id
where c.slug='phayao-secondary-group-sports-2569'
order by s.name;
```

## การแยกสิทธิ์

- GET/POST/PATCH `/api/group-sports/school-accounts` ต้องมี Bearer Token จาก Supabase Auth พร้อมบทบาท `super_admin` หรือ `competition_admin` ที่ผูกการแข่งขันนี้
- API ใช้ Service Role Key บน Server เท่านั้น และไม่ส่ง `auth_email`, service key หรือรหัสผ่านที่เก็บไว้ไปยัง Browser
- ตาราง `sports_school_accounts` ไม่มีการให้สิทธิ์ `anon` หรือ `authenticated` และเปิด RLS โดยไม่มี policy บราวเซอร์
- การเข้าใช้งานโรงเรียนต้องตรวจ Username / Password ผ่าน Supabase Auth และยืนยัน `sports_user_roles` ที่ active และผูก `school_id`/`competition_id` ตรงกัน
- ฟังก์ชันเดิม `sports_register_roster`, `sports_register_individual_batch`, `sports_submission_school_list` และ `sports_submit_school_info` ตรวจโรงเรียนจาก `auth.uid()` เป็นข้อกำหนดฝั่งฐานข้อมูล
- ป้องกันเดารหัสผ่านเบื้องต้น 5 ครั้งต่อ 15 นาทีตามบัญชี+IP (hashed fingerprint) และ Supabase Auth ยังมีข้อจำกัดอัตราใช้ของตัวเอง
- การรีเซ็ตรหัสผ่านทำโดย Admin เท่านั้น; ไม่มีการส่งรหัสผ่านทางอีเมล
- การปิดบัญชีเปลี่ยน role เป็น inactive และแบนการเข้าสู่ระบบเพิ่มเติม หากเซสชันเก่ายังไม่หมดอายุ RLS ที่ใช้ role active ต้องคงอยู่เพื่อป้องกันการบันทึกข้อมูล

## ตรวจสอบก่อนเปิดใช้งานจริง

- [ ] Build Next.js (`npm ci` และ `npm run build`) ผ่าน
- [ ] ลงชื่อเข้าใช้ Google Workspace ของ Admin เดิมยังได้
- [ ] ลงชื่อเข้าใช้โรงเรียนด้วย Username/Password ที่ Admin สร้างแล้วได้
- [ ] โรงเรียน A **ไม่เห็น/แก้ไข/ดาวน์โหลดไฟล์ส่วนตัว** ของโรงเรียน B
- [ ] โรงเรียน A ไม่สามารถลงทะเบียนนักกีฬาแทน B ได้แม้แก้ request ด้วยตนเอง
- [ ] Admin รีเซ็ตรหัสผ่านและใช้รหัสใหม่ได้ (รหัสเก่าเข้าใหม่ไม่ได้)
- [ ] Admin ปิดบัญชีแล้วรหัสผ่านเข้าไม่ได้ และเซสชันเก่าบันทึกข้อมูลไม่ได้
- [ ] ผู้ที่ไม่มีบทบาท Admin เรียก `/api/group-sports/school-accounts` ไม่ได้
- [ ] ตรวจนโยบาย RLS ของตารางข้อมูลนักเรียนและไฟล์ Storage ที่เกี่ยวข้องกับระบบกีฬากลุ่มบน Supabase จริง
- [ ] ทดสอบ Preview และตรวจ Vercel Logs ก่อนนำขึ้น Production

> ข้อจำกัด: ชุดอัปเดตนี้ยังไม่ผ่านการ Build บน Vercel และยังไม่เชื่อมต่อฐานข้อมูล Supabase จริงในสภาพแวดล้อมจัดทำไฟล์ จึงควรทดสอบก่อนใช้งานจริง
