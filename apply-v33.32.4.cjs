#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const operations = [
  {
    "kind": "replace",
    "file": "src/lib/group-sports/registration-hub.ts",
    "old": "export function registrationHref(s:typeof REGISTRATION_SPORTS[number]) {\n return s.special?`/group-sports/${s.key}?tab=registration`:`/group-sports?section=registration&sport=${s.key}`;\n}",
    "new": "export function registrationHref(s:typeof REGISTRATION_SPORTS[number]) {\n return `/group-sports/${s.key}?tab=registration`;\n}",
    "label": "registrationHref routes"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/VolleyballDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "VolleyballDashboard.tsx: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/VolleyballDashboard.tsx",
    "old": " useEffect(()=>{const c=new URLSearchParams(window.location.search).get('code') as VolleyballCode;if(VOLLEYBALL_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "new": " useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const c=params.get('code') as VolleyballCode;if(VOLLEYBALL_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "label": "VolleyballDashboard.tsx: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/VolleyballDashboard.tsx",
    "old": "{tab==='registration'&&<section className={panel}><h2 className=\"text-xl font-black\">ลงทะเบียนนักกีฬาและเจ้าหน้าที่</h2><p className=\"my-3\">ใช้ระบบลงทะเบียนกลางเดิม เลือกวอลเลย์บอลรุ่นที่ต้องการ · นักกีฬา 6–12 คน · ผู้ฝึกสอนและผู้ช่วยรวมไม่เกิน 3 คน · กรอกใบยืนยันตาม PDF สำหรับวันแข่งขัน</p><Link href=\"/group-sports?section=registration&sport=volleyball\" className={btn}>เปิดระบบลงทะเบียนกลาง →</Link></section>}",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"volleyball\" title=\"วอลเลย์บอล\" />}",
    "label": "VolleyballDashboard.tsx: embedded registration form"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/TakrawDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "TakrawDashboard.tsx: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/TakrawDashboard.tsx",
    "old": " useEffect(()=>{const c=new URLSearchParams(window.location.search).get('code') as TakrawCode;if(TAKRAW_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "new": " useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const c=params.get('code') as TakrawCode;if(TAKRAW_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "label": "TakrawDashboard.tsx: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/TakrawDashboard.tsx",
    "old": "{tab==='registration'&&<section className={panel}><h2 className=\"text-xl font-black\">ลงทะเบียนนักกีฬาและเจ้าหน้าที่</h2><p className=\"my-3\">ใช้ระบบลงทะเบียนกลางเดิม เลือกเซปักตะกร้อรุ่นที่ต้องการ · นักกีฬา 3–5 คน · เจ้าหน้าที่ 3 คน (ผู้จัดการทีม ผู้ฝึกสอน ผู้ช่วยผู้ฝึกสอน) · กรอกใบสมัครและใบส่งรายชื่อตาม PDF สำหรับวันแข่งขัน</p><Link href=\"/group-sports?section=registration&sport=takraw\" className={btn}>เปิดระบบลงทะเบียนกลาง →</Link></section>}",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"takraw\" title=\"เซปักตะกร้อ\" />}",
    "label": "TakrawDashboard.tsx: embedded registration form"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/PetanqueDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "PetanqueDashboard.tsx: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/PetanqueDashboard.tsx",
    "old": " useEffect(()=>{const c=new URLSearchParams(window.location.search).get('code') as PetanqueCode;if(PETANQUE_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "new": " useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const c=params.get('code') as PetanqueCode;if(PETANQUE_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "label": "PetanqueDashboard.tsx: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/PetanqueDashboard.tsx",
    "old": "{tab==='registration'&&<section className={panel}><h2 className=\"text-xl font-black\">ลงทะเบียนนักกีฬา</h2><p className=\"my-3\">นักกีฬาตัวจริง 3 คน สำรองได้ 1 คน · ใช้ระบบลงทะเบียนกลางเดิม · เปลี่ยนตัวได้ 1 ครั้งต่อเกมโดยแจ้งกรรมการ · ส่งรายชื่อก่อนแข่ง 30 นาที</p><Link href=\"/group-sports?section=registration&sport=petanque\" className={btn}>เปิดระบบลงทะเบียนกลาง →</Link></section>}",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"petanque\" title=\"เปตอง\" />}",
    "label": "PetanqueDashboard.tsx: embedded registration form"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/TableTennisDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "TableTennisDashboard.tsx: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/TableTennisDashboard.tsx",
    "old": " useEffect(()=>{const c=new URLSearchParams(window.location.search).get('code') as TTCode;if(TT_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "new": " useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const c=params.get('code') as TTCode;if(TT_CODES.includes(c))setCode(c);void refresh();},[refresh]);",
    "label": "TableTennisDashboard.tsx: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/TableTennisDashboard.tsx",
    "old": "{tab==='registration'&&<section className={panel}><h2 className=\"text-xl font-black\">ลงทะเบียนนักกีฬา · {cfg.title}</h2><p className=\"my-3\">ใบสมัคร {cfg.players} คนต่อรายการและโรงเรียนตามสายที่กำหนด · ลงซ้ำไม่เกิน 2 รายการในรุ่นอายุเดียวกัน · เจ้าหน้าที่ไม่เกิน 3 คน · ตรวจหลักฐานก่อนยืนยัน</p><Link href=\"/group-sports?section=registration&sport=table-tennis\" className={btn}>เปิดระบบลงทะเบียนกลาง →</Link></section>}",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"table-tennis\" title=\"เทเบิลเทนนิส\" />}",
    "label": "TableTennisDashboard.tsx: embedded registration form"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/BoxingDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "BoxingDashboard.tsx: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/BoxingDashboard.tsx",
    "old": " useEffect(()=>{const query=new URLSearchParams(window.location.search).get('code');if(query&&BOX_CODES.includes(query))setCode(query);void loadBase().catch(e=>setError(err(e)+' · ตรวจสอบ Migration 046')).finally(()=>setLoading(false));},[loadBase]);",
    "new": " useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const query=params.get('code');if(query&&BOX_CODES.includes(query))setCode(query);void loadBase().catch(e=>setError(err(e)+' · ตรวจสอบ Migration 046')).finally(()=>setLoading(false));},[loadBase]);",
    "label": "BoxingDashboard.tsx: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/BoxingDashboard.tsx",
    "old": "{tab==='registration'&&<section className={panel}><h2 className=\"text-xl font-black\">ลงทะเบียนนักกีฬา</h2><p className=\"my-3\">ใช้ใบสมัครรายบุคคล 1 คนต่อรายการในระบบกลาง · รุ่นน้ำหนัก {weightLabel(code)} · ต้องตรวจเอกสารและชั่งน้ำหนักจริงก่อนจับสาย</p><Link className={primary+' inline-block'} href=\"/group-sports?section=registration&sport=boxing\">เปิดระบบลงทะเบียนกลาง →</Link></section>}",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"boxing\" title=\"มวยสากลสมัครเล่น\" />}",
    "label": "BoxingDashboard.tsx: embedded registration form"
  },
  {
    "kind": "insertAfter",
    "file": "src/components/group-sports/AthleticsDashboard.tsx",
    "anchor": "import Link from 'next/link';",
    "addition": "\nimport SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';",
    "label": "Athletics: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/AthleticsDashboard.tsx",
    "old": "useEffect(()=>{void loadBase().catch(e=>setError(errorText(e)+' · ตรวจสอบ SQL 047')).finally(()=>setLoading(false));},[loadBase]);",
    "new": "useEffect(()=>{if(new URLSearchParams(window.location.search).get('tab')==='registration')setTab('registration');void loadBase().catch(e=>setError(errorText(e)+' · ตรวจสอบ SQL 047')).finally(()=>setLoading(false));},[loadBase]);",
    "label": "Athletics: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/AthleticsDashboard.tsx",
    "old": "const tabs=[['schedule','โปรแกรม / ผล'],['call','รายงานตัว'],['field','กรรมการสนาม'],['print','พิมพ์ใบรายงานตัว'],['board','จอเรียกรายงานตัว'],['duties','มอบหมายหน้าที่'],['rules','ระเบียบ / เอกสาร']];",
    "new": "const tabs=[['schedule','โปรแกรม / ผล'],['registration','ลงทะเบียนนักกีฬา'],['call','รายงานตัว'],['field','กรรมการสนาม'],['print','พิมพ์ใบรายงานตัว'],['board','จอเรียกรายงานตัว'],['duties','มอบหมายหน้าที่'],['rules','ระเบียบ / เอกสาร']];",
    "label": "Athletics: add registration tab"
  },
  {
    "kind": "remove",
    "file": "src/components/group-sports/AthleticsDashboard.tsx",
    "old": "<Link className={alt} href=\"/group-sports?section=registration&sport=athletics\">ลงทะเบียนนักกีฬา</Link>",
    "marker": "['registration','ลงทะเบียนนักกีฬา']",
    "label": "Athletics: remove duplicate registration link"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/AthleticsDashboard.tsx",
    "old": "{tab==='schedule'&&<section className={panel}>",
    "new": "{tab==='registration'&&<SportRegistrationEmbed sport=\"athletics\" title=\"กรีฑา\" />}\n  {tab==='schedule'&&<section className={panel}>",
    "label": "Athletics: render embedded registration"
  },
  {
    "kind": "insertAfter",
    "file": "src/app/group-sports/esports/page.tsx",
    "anchor": "import Image from \"next/image\";",
    "addition": "\nimport SportRegistrationEmbed from \"@/components/group-sports/SportRegistrationEmbed\";",
    "label": "E-Sport: shared registration import"
  },
  {
    "kind": "replace",
    "file": "src/app/group-sports/esports/page.tsx",
    "old": "type Tab = \"groups\" | \"matches\" | \"schedule\" | \"standings\" | \"knockout\" | \"history\" | \"prelaunch\" | \"admins\";",
    "new": "type Tab = \"groups\" | \"matches\" | \"schedule\" | \"standings\" | \"knockout\" | \"registration\" | \"history\" | \"prelaunch\" | \"admins\";",
    "label": "E-Sport: extend tab type"
  },
  {
    "kind": "replace",
    "file": "src/app/group-sports/esports/page.tsx",
    "old": "  history: {\n    active: \"border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200\",\n    idle: \"border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50\"\n  },",
    "new": "  registration: {\n    active: \"border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200\",\n    idle: \"border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50\"\n  },\n  history: {\n    active: \"border-red-900 bg-red-800 text-white shadow-md ring-2 ring-rose-200\",\n    idle: \"border-rose-200 bg-white text-red-900 hover:border-rose-400 hover:bg-rose-50\"\n  },",
    "label": "E-Sport: add registration tab palette"
  },
  {
    "kind": "insertAfter",
    "file": "src/app/group-sports/esports/page.tsx",
    "anchor": "  const [tab, setTab] = useState<Tab>(\"groups\");",
    "addition": "\n  useEffect(() => {\n    if (new URLSearchParams(window.location.search).get(\"tab\") === \"registration\") setTab(\"registration\");\n  }, []);",
    "label": "E-Sport: open registration tab from query"
  },
  {
    "kind": "replace",
    "file": "src/app/group-sports/esports/page.tsx",
    "old": "        <button type=\"button\" className={tabButtonClass(\"knockout\", tab)} aria-pressed={tab === \"knockout\"} onClick={() => setTab(\"knockout\")}>สาย Knockout</button>\n        {admin && <button",
    "new": "        <button type=\"button\" className={tabButtonClass(\"knockout\", tab)} aria-pressed={tab === \"knockout\"} onClick={() => setTab(\"knockout\")}>สาย Knockout</button>\n        <button type=\"button\" className={tabButtonClass(\"registration\", tab)} aria-pressed={tab === \"registration\"} onClick={() => setTab(\"registration\")}>ลงทะเบียนนักกีฬา</button>\n        {admin && <button",
    "label": "E-Sport: add registration button"
  },
  {
    "kind": "replace",
    "file": "src/app/group-sports/esports/page.tsx",
    "old": "      {!loading && !currentEvent && <div className={`${panel} text-center text-sm text-slate-600`}>ยังไม่มีรายการ E-Sport ที่เผยแพร่ หรือไม่พบข้อมูลรายการแข่งขันในฐานข้อมูล {admin ? \"โปรดตรวจสอบ event_code GS3-ES-SM / GS3-ES-SF\" : \"โปรดกลับมาตรวจสอบเมื่อผู้จัดเผยแพร่ข้อมูล\"}</div>}",
    "new": "      {tab === \"registration\" && <SportRegistrationEmbed sport=\"esports\" title=\"E-Sport (RoV)\" />}\n\n      {!loading && !currentEvent && tab !== \"registration\" && <div className={`${panel} text-center text-sm text-slate-600`}>ยังไม่มีรายการ E-Sport ที่เผยแพร่ หรือไม่พบข้อมูลรายการแข่งขันในฐานข้อมูล {admin ? \"โปรดตรวจสอบ event_code GS3-ES-SM / GS3-ES-SF\" : \"โปรดกลับมาตรวจสอบเมื่อผู้จัดเผยแพร่ข้อมูล\"}</div>}",
    "label": "E-Sport: render embedded registration"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/GroupSportsDashboard.tsx",
    "old": "  const [registrationScope, setRegistrationScope] = useState<RegistrationSport | null>(null);\n  const [listSport, setListSport] = useState<RegistrationSport | \"\">(\"\");",
    "new": "  const [registrationScope, setRegistrationScope] = useState<RegistrationSport | null>(null);\n  const [registrationEmbed, setRegistrationEmbed] = useState(false);\n  const [listSport, setListSport] = useState<RegistrationSport | \"\">(\"\");",
    "label": "GroupSportsDashboard: add embed state"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/GroupSportsDashboard.tsx",
    "old": "  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const section = params.get(\"section\");\n    if (section === \"results\") setTab(\"matches\");\n    if (section === \"registration\") {\n      setTab(\"entries\");\n      const sport = registrationSport(params.get(\"sport\"));\n      if (sport?.special) {\n        window.location.replace(registrationHref(sport));\n        return;\n      }\n      setRegistrationScope(sport?.key ?? null);\n      setEventFilter(\"\");\n      setFormOpen(Boolean(sport));\n    }\n  }, []);",
    "new": "  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    const section = params.get(\"section\");\n    const embed = params.get(\"embed\") === \"1\";\n    setRegistrationEmbed(embed);\n    if (section === \"results\") setTab(\"matches\");\n    if (section === \"registration\") {\n      setTab(\"entries\");\n      const sport = registrationSport(params.get(\"sport\"));\n      if (sport && !embed) {\n        window.location.replace(registrationHref(sport));\n        return;\n      }\n      setRegistrationScope(sport?.key ?? null);\n      setEventFilter(\"\");\n      setFormOpen(Boolean(sport));\n    }\n  }, []);",
    "label": "GroupSportsDashboard: route all sports to dedicated pages"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/GroupSportsDashboard.tsx",
    "old": "  const registrationRows = scopedSchoolEntries.filter(e=>listEventIds.has(e.event_id)&&(!schoolFilter||e.school_id===schoolFilter)&&(!eventFilter||e.event_id===eventFilter));\n  const receivedEntries = scopedSchoolEntries.filter((entry) => [\"submitted\", \"approved\", \"rejected\"].includes(entry.status)).length;",
    "new": "  const registrationRows = scopedSchoolEntries.filter(e=>listEventIds.has(e.event_id)&&(!schoolFilter||e.school_id===schoolFilter)&&(!eventFilter||e.event_id===eventFilter));\n  const receivedEntries = scopedSchoolEntries.filter((entry) => [\"submitted\", \"approved\", \"rejected\"].includes(entry.status)).length;\n\n  useEffect(() => {\n    if (!registrationEmbed) return;\n    const sendHeight = () => {\n      const height = Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight);\n      window.parent.postMessage({ type: \"ckw-sport-registration-height\", height }, window.location.origin);\n    };\n    sendHeight();\n    const resizeObserver = typeof ResizeObserver !== \"undefined\" ? new ResizeObserver(sendHeight) : null;\n    if (resizeObserver) {\n      resizeObserver.observe(document.documentElement);\n      if (document.body) resizeObserver.observe(document.body);\n    }\n    const mutationObserver = typeof MutationObserver !== \"undefined\" && document.body\n      ? new MutationObserver(sendHeight)\n      : null;\n    mutationObserver?.observe(document.body, { childList: true, subtree: true, attributes: true });\n    window.addEventListener(\"resize\", sendHeight);\n    return () => {\n      resizeObserver?.disconnect();\n      mutationObserver?.disconnect();\n      window.removeEventListener(\"resize\", sendHeight);\n    };\n  }, [registrationEmbed, loading, formOpen, registrationRows.length, detail, rosterError, notice, error]);",
    "label": "GroupSportsDashboard: iframe height reporting"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/GroupSportsDashboard.tsx",
    "old": "{activeRegistrationSport && <div className=\"mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-blue-800\"><Link href={`/group-sports/${activeRegistrationSport.key}`}>← กลับระบบ{activeRegistrationSport.name}</Link><a href=\"/group-sports?section=registration\" className=\"underline\">เลือกกีฬาอื่น</a></div>}",
    "new": "{activeRegistrationSport && <div className=\"mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-blue-800\"><Link href={`/group-sports/${activeRegistrationSport.key}`} target={registrationEmbed ? \"_top\" : undefined}>← กลับระบบ{activeRegistrationSport.name}</Link><a href=\"/group-sports?section=registration\" target={registrationEmbed ? \"_top\" : undefined} className=\"underline\">เลือกกีฬาอื่น</a></div>}",
    "label": "GroupSportsDashboard: escape iframe for form navigation"
  },
  {
    "kind": "replace",
    "file": "src/components/group-sports/GroupSportsDashboard.tsx",
    "old": "  return (\n    <main className=\"sports-games-shell min-h-screen text-slate-900\">",
    "new": "  if (registrationEmbed) {\n    return (\n      <main className=\"min-h-screen bg-[#eaf5ed] p-3 text-[#07123d] sm:p-4\">\n        <div className=\"mx-auto max-w-6xl space-y-4\">\n          <header className=\"flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm\">\n            <div>\n              <p className=\"text-[11px] font-black uppercase tracking-[0.16em] text-blue-700\">PHAYAO GAMES 2026 · REGISTRATION</p>\n              <h1 className=\"mt-1 text-xl font-black\">{activeRegistrationSport ? `ลงทะเบียนนักกีฬา · ${activeRegistrationSport.name}` : \"ศูนย์ลงทะเบียนนักกีฬา\"}</h1>\n              <p className=\"mt-1 text-xs text-slate-600\">บันทึกใบสมัครผ่านระบบกลางเดิม · ตรวจสอบรายชื่อและเอกสารที่สนามแข่งขันจริง</p>\n            </div>\n            <div className=\"flex flex-wrap items-center gap-2\">\n              {activeRegistrationSport && <Link href={`/group-sports/${activeRegistrationSport.key}`} className=\"rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50\">กลับหน้าจัดการกีฬา</Link>}\n              <span className=\"rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800\">รับข้อมูลแล้ว {receivedEntries} ใบสมัคร</span>\n            </div>\n          </header>\n\n          {loading ? (\n            <section className=\"rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500\">กำลังโหลดข้อมูลการแข่งขันและสิทธิ์โรงเรียน...</section>\n          ) : !canManageSchool ? (\n            <section className=\"rounded-2xl border border-amber-200 bg-white p-5 shadow-sm\">\n              <h2 className=\"text-lg font-black text-[#07123d]\">เข้าสู่ระบบโรงเรียนก่อนลงทะเบียน</h2>\n              <p className=\"mt-2 text-sm leading-6 text-amber-900\">หากต้องการลงทะเบียนนักกีฬา กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนที่ได้รับสิทธิ์ในการแข่งขันนี้</p>\n              <Link href=\"/group-sports/login\" className=\"mt-4 inline-flex rounded-xl bg-[#0755ce] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800\">เข้าสู่ระบบโรงเรียน →</Link>\n            </section>\n          ) : (\n            <>\n              {notice && <div role=\"status\" className=\"rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900\">{notice}</div>}\n              {error && <div role=\"alert\" className=\"rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900\">{error}</div>}\n              {!formOpen && <div className=\"flex justify-end\"><button type=\"button\" onClick={openNewRegistration} className=\"rounded-xl bg-[#0755ce] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800\">＋ ลงทะเบียนรายการใหม่</button></div>}\n              {renderForm()}\n\n              <section className=\"rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5\">\n                <div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\">\n                  <div>\n                    <h2 className=\"text-lg font-black\">ใบสมัครที่ส่งแล้ว · {activeRegistrationSport?.name || \"ทุกประเภทกีฬา\"}</h2>\n                    <p className=\"mt-1 text-xs text-slate-500\">แสดงเฉพาะใบสมัครที่บัญชีโรงเรียนนี้มีสิทธิ์เข้าถึง</p>\n                  </div>\n                  <span className=\"rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800\">{registrationRows.length} ใบสมัคร</span>\n                </div>\n                <div className=\"divide-y divide-slate-100\">\n                  {registrationRows.map(entry => (\n                    <article key={entry.id} className=\"flex flex-wrap items-center justify-between gap-3 py-3\">\n                      <div className=\"min-w-0\">\n                        <strong>{schoolById.get(entry.school_id)?.name || \"โรงเรียน\"} · {entry.entry_name}</strong>\n                        <p className=\"mt-1 text-sm text-slate-600\">{eventById.get(entry.event_id)?.sport_name || \"รายการแข่งขัน\"} · {entry.coach_name || \"ไม่ระบุครูผู้ควบคุม\"} · {entry.athlete_count} คน</p>\n                        <p className=\"mt-1 text-xs font-bold text-emerald-800\">{statusLabel(entry.status)}</p>\n                      </div>\n                      <div className=\"flex flex-wrap gap-2\">\n                        <button type=\"button\" disabled={busy} onClick={() => void openRoster(entry)} className=\"rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50 disabled:opacity-50\">ดูรายชื่อ</button>\n                        {!isDemo && <Link href={`/group-sports/print?entry=${encodeURIComponent(entry.id)}`} target=\"_blank\" rel=\"noopener noreferrer\" className=\"rounded-lg bg-[#0755ce] px-3 py-2 text-sm font-bold text-white hover:bg-blue-800\">พิมพ์ใบสมัคร</Link>}\n                      </div>\n                    </article>\n                  ))}\n                  {!registrationRows.length && <p className=\"rounded-xl bg-slate-50 p-5 text-sm text-slate-600\">ยังไม่มีใบสมัครของกีฬาประเภทนี้</p>}\n                </div>\n                {rosterError && <div role=\"alert\" className=\"mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900\">{rosterError}</div>}\n                {detail && <section className=\"mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4\">\n                  <div className=\"flex flex-wrap items-center justify-between gap-2\">\n                    <strong>รายชื่อนักกีฬา · {detail.entry.entry_name}</strong>\n                    <button type=\"button\" onClick={() => setDetail(null)} className=\"text-sm font-bold text-blue-800 underline\">ปิดรายชื่อ</button>\n                  </div>\n                  <p className=\"mt-1 text-sm text-slate-600\">{detail.entry.coach_name || \"ไม่ระบุครูผู้ควบคุม\"}</p>\n                  <ol className=\"mt-3 list-decimal space-y-1 pl-6 text-sm\">{detail.players.map((player, index) => <li key={`${player.student_code || player.full_name}-${index}`}>{[player.student_code, player.full_name].filter(Boolean).join(\" · \")}</li>)}</ol>\n                  {!isDemo && canManageSchool && <div className=\"mt-4\"><AthletePhotoManager entryId={detail.entry.id} athletes={detail.players} /></div>}\n                </section>}\n              </section>\n            </>\n          )}\n        </div>\n      </main>\n    );\n  }\n\n  return (\n    <main className=\"sports-games-shell min-h-screen text-slate-900\">",
    "label": "GroupSportsDashboard: embedded registration-only view"
  }
];

const sources = new Map();
const lineEndings = new Map();
const changed = new Set();

function load(rel) {
  if (!sources.has(rel)) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`STOP: ไม่พบไฟล์ ${rel} กรุณารันจากโฟลเดอร์ student-activity-app และใช้ชุดไฟล์ v33.32.3 ล่าสุด`);
    }
    const raw = fs.readFileSync(full, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    lineEndings.set(rel, eol);
    sources.set(rel, raw.replace(/\r\n/g, "\n"));
  }
  return sources.get(rel);
}

function save(rel, text) {
  sources.set(rel, text);
  changed.add(rel);
}

function apply(op) {
  let source = load(op.file);

  if (op.kind === "replace") {
    if (source.includes(op.new)) return;
    const count = source.split(op.old).length - 1;
    if (count !== 1) {
      throw new Error(`STOP: ${op.label} — พบจุดแก้ไข ${count} จุด (ต้องมี 1 จุด) จึงยังไม่แก้ไฟล์ใด ๆ`);
    }
    source = source.replace(op.old, op.new);
    save(op.file, source);
    return;
  }

  if (op.kind === "insertAfter") {
    if (source.includes(op.addition.trim())) return;
    const count = source.split(op.anchor).length - 1;
    if (count !== 1) {
      throw new Error(`STOP: ${op.label} — ไม่พบตำแหน่งอ้างอิงที่ตรงกันเพียง 1 จุด จึงยังไม่แก้ไฟล์ใด ๆ`);
    }
    source = source.replace(op.anchor, op.anchor + op.addition);
    save(op.file, source);
    return;
  }

  if (op.kind === "remove") {
    if (!source.includes(op.old) && source.includes(op.marker)) return;
    const count = source.split(op.old).length - 1;
    if (count !== 1) {
      throw new Error(`STOP: ${op.label} — พบรายการเดิม ${count} จุด จึงยังไม่แก้ไฟล์ใด ๆ`);
    }
    source = source.replace(op.old, "");
    save(op.file, source);
    return;
  }

  throw new Error(`Unknown patch operation: ${op.kind}`);
}

try {
  const embedComponent = path.join(root, "src/components/group-sports/SportRegistrationEmbed.tsx");
  if (!fs.existsSync(embedComponent)) {
    throw new Error("STOP: ไม่พบ src/components/group-sports/SportRegistrationEmbed.tsx กรุณาแตก ZIP v33.32.4 ลงในโฟลเดอร์โปรเจกต์ก่อน");
  }

  for (const op of operations) apply(op);

  for (const rel of changed) {
    const full = path.join(root, rel);
    const eol = lineEndings.get(rel) || "\n";
    fs.writeFileSync(full, sources.get(rel).replace(/\n/g, eol), "utf8");
  }

  console.log("OK: ปรับหน้าลงทะเบียนทั้ง 7 กีฬาเป็น v33.32.4 แล้ว");
  console.log(`แก้ไขไฟล์ ${changed.size} ไฟล์ (ไม่รวม SportRegistrationEmbed.tsx ที่เพิ่มใหม่)`);
  console.log("ไม่ได้แก้ไข SQL Migration, ข้อมูล Supabase, .env.local, Git commit หรือการ Push");
  if (changed.size === 0) console.log("ตรวจพบว่าชุดแก้ไขนี้ถูกใช้แล้ว ไม่มีไฟล์ที่ต้องเปลี่ยนเพิ่ม");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
