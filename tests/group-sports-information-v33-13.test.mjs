import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const information=read('src/components/group-sports/SchoolInformationHub.tsx');
const reference=read('src/components/group-sports/SchoolParadeReference.tsx');
const nav=read('src/components/group-sports/GroupSportsDashboard.tsx');
const sql=read('supabase/migrations/202611230035_sports_information_primary_media_v33_13.sql');
assert.match(information,/is_primary/,'primary record stored');
assert.match(sql,/create unique index if not exists sports_school_information_primary_unique/,'primary section unique');
assert.match(information,/isPrimary: true/,'Admin edits fixed primary content');
assert.match(information,/changes\.is_published = true/,'primary saved as published');
assert.match(information,/disabled=\{busy\} title=\{item\.is_published/,'editing published notices is enabled');
assert.match(information,/sports_school_information/,'uses existing announcements table');
assert.match(information,/setInterval\(/,'background refresh for public viewers');
assert.match(nav,/จัดการภาพและข้อความ \(Admin\)/,'Admin menu link available');
assert.match(reference,/getSchoolParadeReference/,'stable key lookup for default images');
for(const file of [
  'opening-ceremony-and-cheer-stands-2569-v33-13.png',
  'parade-order-2569-v33-13.png',
  'parade-assembly-location-2569-v33-13.png',
]){
 assert.ok(existsSync(path.join(root,'public/images/group-sports',file)),file+' exists');
 assert.ok(reference.includes(file),'reference points to '+file);
}
assert.match(read('src/app/group-sports/information/manage/page.tsx'),/sports_user_roles/,'Admin role checked');
console.log('v33.13 content management checks: 13 assertions passed');
