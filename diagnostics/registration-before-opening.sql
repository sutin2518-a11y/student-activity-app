-- Read-only. Run in Supabase SQL Editor before opening registration.
-- 1. Each row should report ติดตั้งแล้ว.
with required(label,signature) as (values
 ('ฟุตบอล','sports_football_register_v3333(uuid,uuid,uuid,jsonb,jsonb)'),
 ('ฟุตซอล','sports_futsal_register(uuid,uuid,jsonb,jsonb)'),
 ('บาสเกตบอล','sports_basketball_register(uuid,uuid,jsonb,jsonb)'),
 ('วอลเลย์บอล','sports_volleyball_save_form(uuid,uuid,uuid,text,text,text,jsonb,jsonb)'),
 ('เซปักตะกร้อ','sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'),
 ('เทเบิลเทนนิส','sports_tt_save_form(uuid,uuid,uuid,jsonb,jsonb,text)'),
 ('มวย / เปตอง / กรีฑา / RoV','sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb)'),
 ('สมัครรายบุคคลหลายคน','sports_register_individual_batch(uuid,uuid,text,jsonb,jsonb)'),
 ('ดาวน์โหลด Excel','sports_registration_excel(uuid)'))
select label as "งาน", case when to_regprocedure('public.'||signature) is null then 'ขาดฟังก์ชัน'
 when not has_function_privilege('authenticated',to_regprocedure('public.'||signature),'EXECUTE') then 'บัญชีผู้ใช้เรียกไม่ได้'
 else 'ติดตั้งแล้ว' end as "ผลตรวจ" from required;

-- 2. One row per category. For seeded sports, show unresolved school names and schools with no team.
select ev.event_code as "รหัส", ev.sport_name as "รายการ", ev.status as "สถานะ",
 case when ev.event_code ~ '^GS3-(FS|BB|VB|ST|TT)-' then
   case when count(t.school_name)=0 then 'ยังไม่มีโรงเรียนในสาย'
        when count(*) filter(where t.school_name is not null and sc.id is null)>0 then 'มีชื่อโรงเรียนในสายไม่ตรงทะเบียน'
        else 'พบโรงเรียนในสาย' end end as "ตรวจสาย"
from public.sports_events ev join public.sports_competitions c on c.id=ev.competition_id
left join public.sports_football_group_teams t on t.event_id=ev.id
left join public.sports_schools sc on sc.name=t.school_name and sc.status is distinct from 'inactive'
where c.slug='phayao-secondary-group-sports-2569'
group by ev.id,ev.event_code,ev.sport_name,ev.status order by ev.event_code;

-- 3. Active schools without an active manager for this competition.
select s.name as "โรงเรียนที่ยังไม่พบบัญชีผู้ดูแลที่ใช้งานได้"
from public.sports_schools s cross join public.sports_competitions c
where c.slug='phayao-secondary-group-sports-2569' and s.status is distinct from 'inactive'
and not exists(select 1 from public.sports_user_roles r where r.school_id=s.id and r.user_id is not null
and r.role='school_manager' and r.is_active and (r.competition_id is null or r.competition_id=c.id))
order by s.name;

-- 4. A missing sport must be visible even when the events table has no rows for it.
with sports(code,name) as (values ('FB','ฟุตบอล'),('FS','ฟุตซอล'),('BB','บาสเกตบอล'),
 ('VB','วอลเลย์บอล'),('ST','เซปักตะกร้อ'),('PT','เปตอง'),('TT','เทเบิลเทนนิส'),
 ('ES','RoV'),('BX','มวยสากล'),('AT','กรีฑา'))
select s.name as "กีฬา", count(e.id) as "รุ่นทั้งหมด",
 count(e.id) filter(where e.status='registration') as "รุ่นที่เปิดรับสมัคร",
 case when count(e.id)=0 then 'ไม่พบรายการ' end as "ตรวจสอบ"
from sports s left join public.sports_events e on e.event_code like 'GS3-'||s.code||'-%'
 and e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569')
group by s.code,s.name order by s.name;

-- 5. Migration 049 updates validation without changing the basketball RPC signature.
select case when strpos(coalesce(pg_get_functiondef(to_regprocedure('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)')),''),'กรุณากรอกชื่อและเบอร์เสื้อทุกคน') > 0
 then 'รองรับฟอร์มปัจจุบัน' else 'ตรวจ Migration 049 ก่อนเปิดบาสเกตบอล' end as "ตรวจบาสเกตบอล";
