# Hotfix v33.4.1 — แก้ Build TypeScript 3 จุด

สำหรับโปรเจกต์กีฬากลุ่ม Next.js v33.4 ที่ติดตั้งบนเครื่องแล้ว โดยเฉพาะเวอร์ชัน Certificates V1.2 ที่อาจมีการแก้ไขมากกว่า ZIP เก่า

## สาเหตุ

1. `src/app/group-sports-officials/page.tsx`: JSX ส่ง prop `view` ให้คอมโพเนนต์ที่ประกาศเฉพาะ `mode?: "print" | "manage"`
2. `src/app/group-sports/results/page.tsx`: เหมือนข้อ 1
3. `src/components/group-sports/SportsOfficialsAccessManager.tsx`: `event_code` มีชนิด `string | null` แต่ `Set.has` รับเฉพาะ `string`

## ติดตั้งแบบรักษาไฟล์ปัจจุบัน

1. เปิด VS Code ที่โฟลเดอร์โปรเจกต์ปัจจุบัน (ที่มี `package.json`)
2. สำรองงาน/Commit ผ่าน GitHub Desktop ก่อน
3. คัดลอก `apply-v33.4.1.cjs` ไว้ในโฟลเดอร์โปรเจกต์ (ระดับเดียวกับ `package.json`)
4. เปิด Terminal รัน: `node apply-v33.4.1.cjs`
5. ตรวจรายการไฟล์ที่เปลี่ยนจาก GitHub Desktop แล้วรัน `npm run build`
6. หาก Build ผ่าน ให้ Commit และ Push

สคริปต์สร้างสำเนาไฟล์เดิมใน `.hotfix-v33-4-1-backup-.../` ก่อนแก้; หลังยืนยันผลแล้วลบโฟลเดอร์สำรองนั้นได้ก่อน Commit

## หากต้องแก้ด้วยมือ

- สองไฟล์ page.tsx: ลบเฉพาะ attribute `view={...}` หรือ `view="..."` จาก JSX ที่ส่ง `mode="manage"` ให้คอมโพเนนต์ซึ่งไม่รองรับ `view` (อย่าลบ `mode`)
- ใน `SportsOfficialsAccessManager.tsx` เปลี่ยน:

```tsx
const isEsports = !!selectedEvent && eSportCodes.has(selectedEvent.event_code);
```

เป็น:

```tsx
const isEsports = selectedEvent?.event_code != null && eSportCodes.has(selectedEvent.event_code);
```

## หมายเหตุ

- ไม่ต้องรัน SQL, ไม่แตะข้อมูล Supabase, ไม่เปลี่ยนสิทธิ์กรรมการ
- การเอา `view` ออกแก้การตรวจชนิดข้อมูลได้ แต่หากผู้พัฒนาตั้งใจให้แต่ละ URL เปิดแท็บคนละหน้ากัน ต้องเพิ่มระบบเลือกแท็บแยกต่างหากด้วย; สคริปต์นี้ไม่เปลี่ยนเส้นทางหรือสร้างฟีเจอร์ดังกล่าว
- ยังไม่ได้ยืนยัน Production Build บนเครื่องผู้ใช้/บน Vercel
