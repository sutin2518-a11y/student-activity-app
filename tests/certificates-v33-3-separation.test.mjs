import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dashboard=read('src/components/group-sports/CertificatesDashboard.tsx');
const nav=read('src/components/group-sports/GroupSportsDashboard.tsx');
const printRoute=read('src/app/group-sports/certificates/page.tsx');
const manageRoute=read('src/app/group-sports/certificates/manage/page.tsx');
const sql=read('supabase/migrations/202611230027_sports_certificates_v1.sql');

test('the school route shows only the print experience and management has its own URL',()=>{
  assert.match(printRoute,/CertificatesDashboard mode="print"/);
  assert.match(manageRoute,/CertificatesDashboard mode="manage"/);
  assert.match(nav,/href="\/group-sports\/certificates"/);
  assert.match(nav,/href="\/group-sports\/certificates\/manage"/);
  assert.match(nav,/setCanManageCertificates\(!certificateResponse\.error/);
  assert.match(nav,/\{canManageCertificates && <Link/);
});

test('management screen is blocked for school accounts and has no print panel',()=>{
  assert.match(dashboard,/mode==="manage"&&context\.role==="school"/);
  assert.match(dashboard,/mode==="manage"&&screen==="record"&&context\.role==="official"/);
  assert.match(dashboard,/mode==="manage"&&screen==="review"&&context\.role==="admin"/);
  assert.match(dashboard,/mode==="manage"&&screen==="settings"&&context\.role==="admin"/);
  assert.match(dashboard,/mode==="print"&&screen==="print"/);
  assert.match(dashboard,/mode==="print"&&<CertificatePrintSheets/);
});

test('server RPC already checks appointed recording officials and school-scoped printing',()=>{
  assert.match(sql,/create or replace function public\.sports_cert_can_record/);
  assert.match(sql,/o\.is_active and o\.email=lower\(btrim\(u\.email\)\)/);
  assert.match(sql,/if not public\.sports_cert_can_record\(p_event\) then raise exception 'ไม่มีสิทธิ์ส่งผลการแข่งขัน'/);
  assert.match(sql,/create or replace function public\.sports_cert_my_documents/);
  assert.match(sql,/and \(v_admin or i\.school_id=v_school\)/);
});
