import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = readFileSync(new URL('../src/components/group-sports/GroupSportsDashboard.tsx',import.meta.url),'utf8');
const css = readFileSync(new URL('../src/app/group-sports/sports-games-theme.css',import.meta.url),'utf8');
const nav = src.slice(src.indexOf('<nav ref={schoolInfoNavRef}'),src.indexOf('</nav>',src.indexOf('<nav ref={schoolInfoNavRef}')));
test('original 8 tabs remain, public header does not substitute new 7 public tabs',()=>{
 const labels=['หน้าหลัก','ข้อมูลทั่วไป','จัดการแข่งขัน','โรงเรียน','ลงทะเบียน','ตารางคะแนน','เหรียญรางวัล','บัญชีโรงเรียน'];
 for(const label of labels) assert.ok(src.includes(`label: "${label}"`),label);
 assert.match(nav,/tabs\.filter\(/);
 assert.doesNotMatch(src, /sports-games-navlinks/);
});
test('original tab handlers and both dropdowns are preserved',()=>{
 for(const expr of ['setSchoolInfoMenuOpen','setSportsMenuOpen','openNewRegistration','setTab(item.key as TabKey)','id="school-information-submenu"','id="sports-management-submenu"','schoolInfoNavRef','sportsSubTabs.map','SCHOOL_INFORMATION_SECTIONS']) assert.ok(nav.includes(expr),expr);
});
test('top menu and dropdown items are text only',()=>{
 assert.match(nav,/className="sports-games-main-label"/);
 assert.doesNotMatch(nav,/<svg\b|<Icon\b|<MedalIcon\b|<SubIcon\b|<UserShieldIcon\b/);
});
test('one top menu, no second icon-card navigation',()=>{
 assert.equal((src.match(/data-sports-nav-items className=/g)||[]).length,1);
 assert.match(src,/data-menu-version="33\.12-text-only-existing-tabs"/);
 assert.doesNotMatch(src, /tab !== "overview" && <nav/);
 assert.match(css,/sports-games-unified-items/);
});
test('system menu visibility follows user roles; public gets sign-in only',()=>{
 assert.match(src,/const canAccessSystemMenu = !isDemo/);
 assert.match(src,/canManageAccounts \|\| canManageCertificates/);
 assert.match(src,/\{canAccessSystemMenu \? <>/);
 assert.match(src,/\/group-sports\/login/);
 assert.match(src,/item\.key !== "accounts" \|\| canManageAccounts/);
});
