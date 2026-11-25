const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const file = path.join(root,'src/app/group-sports/sports-multicolor-theme.css');
const dashboard = path.join(root,'src/components/group-sports/GroupSportsDashboard.tsx');
const layout = path.join(root,'src/app/group-sports/layout.tsx');
const marker = '/* CKW v33.33.4 compact sport hubs */';
const css = `
${marker}
@media screen {
  .sports-multicolor-theme [aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"] {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 10px !important;
  }
  .sports-multicolor-theme [aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"] > a {
    display: flex !important;
    flex-direction: column !important;
    gap: 7px !important;
    padding: 10px !important;
    min-height: 0 !important;
  }
  .sports-multicolor-theme [aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"] > a > span:last-child {
    min-height: 34px !important;
    height: auto !important;
  }
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) !important;
    gap: 7px !important;
  }
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] > a {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 8px 12px !important;
    margin: 0 !important;
    min-height: 0 !important;
  }
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] > a > span:first-child {min-width:0 !important;}
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] > a > span:first-child > span:first-child {width:36px !important;height:36px !important;}
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] > a > span:last-child {
    width:100% !important; height:34px !important; min-height:34px !important;
    background:#0755ce !important; color:white !important;
  }
}
@media screen and (min-width:640px) {
  .sports-multicolor-theme [aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"] > a {grid-template-columns:minmax(0,1fr) 160px !important;}
}
@media screen and (min-width:900px) {
  .sports-multicolor-theme [aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"] {grid-template-columns:repeat(3,minmax(0,1fr)) !important;}
}
@media screen and (min-width:1200px) {
  .sports-multicolor-theme [aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"] {grid-template-columns:repeat(5,minmax(0,1fr)) !important;}
}
`;
try {
  const source=fs.readFileSync(dashboard,'utf8');
  const layoutSource=fs.readFileSync(layout,'utf8');
  if(!source.includes('aria-label="เลือกประเภทกีฬาที่ต้องการลงทะเบียน"')||!source.includes('aria-label="ระบบจัดการแข่งขันทั้ง 10 ชนิดกีฬา"')||!layoutSource.includes('sports-multicolor-theme.css')||!layoutSource.includes('sports-multicolor-theme')) throw new Error('Current source differs. No changes made. Send GroupSportsDashboard.tsx and group-sports/layout.tsx.');
  const old=fs.readFileSync(file,'utf8');
  if(old.includes(marker)){console.log('Already installed.');process.exit(0);}
  const backup=path.join(require('node:os').tmpdir(),`ckw-sports-theme-${Date.now()}.css`);
  fs.writeFileSync(backup,old,{flag:'wx'});
  fs.appendFileSync(file,css,'utf8');
  console.log('SUCCESS: v33.33.4 compact sport hubs installed.');
  console.log('CSS backup: '+backup);
} catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
