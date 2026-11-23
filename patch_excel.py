from pathlib import Path
p=Path('/mnt/data/build-v32/src/components/group-sports/FootballDashboard.tsx')
s=p.read_text()
s=s.replace('import AthletePhotoManager from "@/components/group-sports/AthletePhotoManager";','import AthletePhotoManager from "@/components/group-sports/AthletePhotoManager";\nimport { downloadFootballRosterTemplate, importFootballRosterExcel, type ImportedFootballPlayer } from "@/lib/group-sports/football-roster-excel";')
s=s.replace(' const [selectedEntry,setSelectedEntry]=useState<RosterDetails|null>(null);',' const [selectedEntry,setSelectedEntry]=useState<RosterDetails|null>(null);\n const [importPreview,setImportPreview]=useState<ImportedFootballPlayer[]|null>(null);')
s=s.replace('setPlayers([newPlayer()]);setCoaches([newCoach()]);setEditMatch(null);','setPlayers([newPlayer()]);setCoaches([newCoach()]);setImportPreview(null);setEditMatch(null);')
s=s.replace('if(!selectedEvent||!schoolId||!canRegister)return;','if(!selectedEvent||!schoolId||!canRegister)return;\n  if(importPreview){setError("กรุณากด ใช้รายชื่อในฟอร์ม หลังตรวจ Excel ก่อนส่งใบสมัคร");return;}')
needle='''       <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 flex flex-wrap justify-between gap-2"><div><h3 className="font-extrabold">รายชื่อนักกีฬา ({players.length}/20)</h3>'''
replacement='''       <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">นำเข้ารายชื่อจาก Excel</h3><p className="text-xs text-slate-600">ดาวน์โหลดแม่แบบเฉพาะรุ่น กรอกนักกีฬาไม่เกิน 20 คน แล้วอัปโหลดตรวจรายชื่อก่อนใช้</p></div><button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white" onClick={()=>void downloadFootballRosterTemplate(code).catch(e=>setError(errorText(e)))}>↓ ดาวน์โหลด Excel</button></div>
         <input type="file" aria-label="นำเข้า Excel ฟุตบอล" accept=".xlsx" className="mt-3 block w-full text-xs" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(!file)return;
          void importFootballRosterExcel(file,code).then(rows=>{setImportPreview(rows);setError("");}).catch(err=>{setError(errorText(err));setImportPreview(null);});}}/>
         {importPreview&&<div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3"><p className="text-sm font-bold">ตรวจพบ {importPreview.length} คน จาก Excel กรุณาตรวจชื่อ วันเกิด และหมายเลขเสื้อก่อนนำมาใช้</p><div className="mt-2 max-h-40 overflow-y-auto text-xs">{importPreview.map((p,i)=><p key={i}>{i+1}. {p.prefix}{p.name} · {p.birth_date} · เสื้อ {p.jersey_number}</p>)}</div><div className="mt-3 flex gap-2"><button type="button" className={redButton} onClick={()=>{setPlayers(importPreview.map(p=>({...p})));setImportPreview(null);setSelectedEntry(null);}}>ใช้รายชื่อในฟอร์ม</button><button type="button" className={ghostButton} onClick={()=>setImportPreview(null)}>ยกเลิก</button></div></div>}
        </div>
'''
assert needle in s
s=s.replace(needle,replacement+needle)
p.write_text(s)
