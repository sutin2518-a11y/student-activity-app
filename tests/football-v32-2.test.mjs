// Run with: node --experimental-strip-types --test tests/football-v32-2.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { footballAgeOnStart, footballStaffSlots } from '../src/lib/group-sports/football-staff.ts';

test('age is whole years on the first competition day',()=>{
 assert.equal(footballAgeOnStart('2013-11-30','ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย'),13);
 assert.equal(footballAgeOnStart('2013-12-01','ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย'),12);
 assert.equal(footballAgeOnStart('2011-12-02','ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย'),15);
 assert.equal(footballAgeOnStart('2011-12-03','ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย'),14);
 assert.equal(footballAgeOnStart('2026-02-30','ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย'),null);
 assert.equal(footballAgeOnStart(null,'ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย'),null);
});

test('staff photos use distinct, private index range and four visible slots',()=>{
 const team=[
   {name:'Coach One',phone:'0000000000',manager_name:'Manager'},
   {name:'Assistant One',phone:'0000000000'},
   {name:'Assistant Two',phone:'0000000000'},
 ];
 const slots=footballStaffSlots(team);
 assert.equal(slots.length,4);
 assert.deepEqual(slots.map(s=>s.photoIndex),[100,110,111,112]);
 assert.deepEqual(slots.map(s=>s.title),['ผู้จัดการทีม','ผู้ฝึกสอน','ผู้ช่วยผู้ฝึกสอน','ผู้ช่วยผู้ฝึกสอน คนที่ 2']);
 assert.ok(slots.every(s=>s.photoIndex>=100 && s.photoIndex<200));
 assert.equal(new Set(slots.map(s=>s.photoIndex)).size,4);
 assert.ok(slots.every(s=>!s.identity.full_name.includes('0000000000')));
});

test('additional assistant coach is not dropped',()=>{
 const slots=footballStaffSlots(Array.from({length:6},(_,i)=>({name:`Coach ${i}`,phone:'0000000000'})));
 assert.equal(slots.length,7);
 assert.equal(slots[6].photoIndex,115);
});

test('print template includes age, staff portraits, and 22-row open boys form',()=>{
 const html=readFileSync(new URL('../src/app/group-sports/football/print/page.tsx',import.meta.url),'utf8');
 assert.match(html,/footballAgeOnStart/);
 assert.match(html,/printStaffPhoto/);
 assert.match(html,/isOpenBoys\?22:20/);
 assert.match(html,/extraStaffPages/);
 assert.match(html,/!readyToPrint/);
});
