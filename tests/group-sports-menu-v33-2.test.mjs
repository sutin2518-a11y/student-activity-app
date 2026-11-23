import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src = readFileSync(new URL('../src/components/group-sports/GroupSportsDashboard.tsx', import.meta.url), 'utf8');

test('school info main menu label becomes General Information', () => {
  assert.match(src, /key:\s*"school_info",\s*label:\s*"ข้อมูลทั่วไป"/);
  assert.doesNotMatch(src, /key:\s*"school_info",\s*label:\s*"ข้อมูลสำหรับโรงเรียน"/);
});

test('certificates link is inside the General Information submenu', () => {
  const begin = src.indexOf('id="school-information-submenu"');
  const end = src.indexOf('</nav>', begin);
  assert.ok(begin > 0 && end > begin, 'school information submenu should exist inside the navigation');
  const menu = src.slice(begin, end);
  assert.match(menu, /href="\/group-sports\/certificates"/);
  assert.match(menu, /<span>พิมพ์เกียรติบัตร \(สำหรับโรงเรียน\)<\/span>/);
});

test('certificate is not duplicated as a standalone banner below navigation', () => {
  const navEnd = src.indexOf('</nav>');
  assert.ok(navEnd > 0);
  assert.doesNotMatch(src.slice(navEnd, navEnd + 1800), /href="\/group-sports\/certificates"/);
});
