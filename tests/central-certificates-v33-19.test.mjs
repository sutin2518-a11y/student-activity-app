import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611240037_sports_central_certificate_print_v33_19.sql');
const central=read('src/components/group-sports/CentralCertificatePrint.tsx');
test('central print is independent and active documents only',()=>{
  assert.match(sql,/alter table public\.sports_central_certificate_officials enable row level security/);
  assert.match(sql,/revoke all on public\.sports_central_certificate_officials from public,anon,authenticated/);
  assert.match(sql,/u\.email_confirmed_at is not null/);
  assert.match(sql,/i\.provider='google'/);
  assert.match(sql,/where i\.event_id=p_event and i\.is_active and i\.revoked_at is null/);
  assert.doesNotMatch(sql,/create or replace function public\.sports_cert_my_documents/);
  assert.doesNotMatch(central,/sports_cert_submit|sports_cert_review|sports_cert_save_settings/);
  assert.match(central,/valid\.length!==chosen\.length/);
});
test('both old and new assignment URLs render one manager; central has dedicated route',()=>{
  for(const p of ['src/app/group-sports/officials/page.tsx','src/app/group-sports/certificates/officials/page.tsx'])assert.match(read(p),/<SportsOfficialsAccessManager\s*\/>/);
  assert.match(read('src/app/group-sports/certificates/central/page.tsx'),/<CentralCertificatePrint\s*\/>/);
  assert.match(read('src/app/auth/complete/page.tsx'),/router\.replace\("\/group-sports\/certificates\/central"\)/);
});
