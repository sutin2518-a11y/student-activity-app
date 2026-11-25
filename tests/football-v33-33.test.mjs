import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeStoredZip} from '../src/lib/group-sports/football-photo-zip.ts';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('football form saves roster first and confirms identity before uploading',()=>{
 const s=read('src/components/group-sports/FootballDashboard.tsx');
 assert.match(s,/sports_football_register_v3333/);assert.ok(s.indexOf('sports_football_register_v3333')<s.indexOf('await uploadAthletePhoto(entryId'));
 assert.match(s,/actual\.full_name\.trim\(\)!==expected\.full_name\.trim\(\)/);assert.match(s,/actual\.name!==slot\.name/);
 assert.match(s,/file=players\[i\]\.photo/);assert.match(s,/setManagerPhoto\(undefined\)/);assert.match(s,/FootballSavedPhotos/);
});
test('migration is additive and restricts to the four football codes',()=>{
 const s=read('supabase/migrations/202611250048_sports_football_registration_v33_33.sql');
 for(const c of ['GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF'])assert.ok(s.includes(c));
 assert.match(s,/existing is distinct from p_entry/);assert.match(s,/sports_football_register\(p_event,p_school,p_players,p_coaches\)/);
 assert.match(s,/sports_roster_staff\(entry_id,coaches\)/);assert.doesNotMatch(s,/\b(?:truncate|drop table|delete from)\b/i);
 assert.match(s,/sports_photo_object_permitted\(p_path,true\)/);assert.match(s,/bucket_id='sports-athlete-photos'/);
});
test('backup ZIP has valid local and central headers and manifest entry',()=>{
 const data=new TextEncoder().encode('{"test":true}');const bytes=writeStoredZip([{name:'manifest.json',data,time:0,date:0x5c21}]);const v=new DataView(bytes.buffer);
 assert.equal(v.getUint32(0,true),0x04034B50);assert.equal(v.getUint32(bytes.length-22,true),0x06054B50);assert.equal(v.getUint16(bytes.length-12,true),1);
 const start=v.getUint32(bytes.length-6,true);assert.equal(v.getUint32(start,true),0x02014B50);assert.equal(new TextDecoder().decode(bytes.slice(30,43)),'manifest.json');
});
test('admin Excel covers all football categories and tracks expected storage path',()=>{
 const s=read('src/lib/group-sports/football-backup.ts');assert.match(s,/for\(const code of FOOTBALL_CODES\)/);assert.match(s,/athletePhotoPath/);assert.match(s,/manifest\.json/);assert.match(s,/ไม่ยืนยันว่ามีรูป/);
});
