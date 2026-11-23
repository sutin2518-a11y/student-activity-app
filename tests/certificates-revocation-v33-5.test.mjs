import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dashboard = read('src/components/group-sports/CertificatesDashboard.tsx');
const verify = read('src/app/group-sports/certificates/verify/[token]/verify-certificate-client.tsx');
const print = read('src/components/group-sports/CertificatePrintSheets.tsx');
const sql = read('supabase/migrations/202611230029_sports_certificate_revocation_reissue.sql');

test('admin dashboard exposes a separate certificate-management tab and RPC-backed actions', () => {
  assert.match(dashboard, /id:"issued",label:"จัดการเกียรติบัตร"/);
  assert.match(dashboard, /sports_cert_admin_documents/);
  assert.match(dashboard, /sports_cert_revoke/);
  assert.match(dashboard, /sports_cert_reissue/);
  assert.match(dashboard, /context\.role==="admin"/);
  assert.match(dashboard, /ยกเลิกเกียรติบัตร/);
  assert.match(dashboard, /ออกฉบับใหม่แทน/);
  assert.match(dashboard, /setScreen\(current=>/);
});

test('revoke and replacement RPCs are server-side admin-only and preserve the original row', () => {
  assert.match(sql, /create or replace function public\.sports_cert_revoke\(p_certificate_id bigint,p_reason text\)/);
  assert.match(sql, /create or replace function public\.sports_cert_reissue\(p_certificate_id bigint,p_reason text\)/);
  assert.match(sql, /public\.sports_stage3_admin\(v_comp\)/);
  assert.match(sql, /revoked_at=now\(\),revoked_by=auth\.uid\(\)/);
  assert.match(sql, /replaced_by=v_new_id/);
  assert.match(sql, /replaces_id\)/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.sports_certificates_issued/i);
});

test('QR verification distinguishes revoked certificates and identifies the latest replacement', () => {
  assert.match(sql, /'status','revoked'/);
  assert.match(sql, /'replacement_id',v_replacement/);
  assert.match(sql, /with recursive ancestors\(id\)/);
  assert.match(verify, /data\.status==="revoked"/);
  assert.match(verify, /ถูกยกเลิกแล้ว/);
  assert.match(verify, /certificateNumber\(data\.replacement_id\)/);
  assert.match(verify, /data\.status==="inactive"/);
});

test('participation release cannot reactivate explicitly revoked certificates', () => {
  assert.match(sql, /certificate_kind='participation' and revoked_at is null/);
});

test('replacement lineage is included in school print data and printed copy', () => {
  assert.match(sql, /'replaces_id',i\.replaces_id/);
  assert.match(print, /doc\.replaces_id/);
  assert.match(print, /ออกฉบับใหม่แทนเลขที่/);
});
