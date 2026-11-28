// School emblem installer. Run from project root. No database access.
'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const root=process.cwd();
const dashboard='src/components/group-sports/GroupSportsDashboard.tsx';
const component='src/components/group-sports/SchoolEmblem.tsx';
const manifest='src/lib/group-sports/school-emblems.json';
const review=path.join(root,'..','school-logo-review');
const output=path.join(root,'public/images/schools');
const mode=process.argv[2]||'--check';
const schools = [
  {
    "id": "ppk",
    "name": "โรงเรียนพะเยาพิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนพะเยาพิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "fkw",
    "name": "โรงเรียนฟากกว๊านวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนฟากกว๊านวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "pypw",
    "name": "โรงเรียนพะเยาประสาธน์วิทย์",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนพะเยาประสาธน์วิทย์.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "dkt",
    "name": "โรงเรียนดอกคำใต้วิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนดอกคำใต้วิทยาคม.png"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "tpw",
    "name": "โรงเรียนถ้ำปินวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนถ้ำปินวิทยาคม.png"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "ngw",
    "name": "โรงเรียนงำเมืองวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนงำเมืองวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "mcw",
    "name": "โรงเรียนแม่ใจวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนแม่ใจวิทยาคม.png"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "djw",
    "name": "โรงเรียนดงเจนวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนดงเจนวิทยาคม-1024x1024.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "swp",
    "name": "โรงเรียนเฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนเฉลิมพระเกียรติสมเด็จพระศรีนครินทร์-พะเยา.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/",
    "aliases": [
      "เฉลิมพระเกียรติฯ พะเยา",
      "เฉลิมพระเกียรติฯพะเยา"
    ]
  },
  {
    "id": "cwk",
    "name": "โรงเรียนจุนวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนจุนวิทยาคม.png"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "plw",
    "name": "โรงเรียนพญาลอวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนพญาลอวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "ckw",
    "name": "โรงเรียนเชียงคำวิทยาคม",
    "urls": [
      "https://mis.chiangkham.ac.th/schoolmin/gallery/logo/school_logo.png?v=0001",
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนเชียงคำวิทยาคม-722x1024.gif"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "faw",
    "name": "โรงเรียนฝายกวางวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตรา-โรงเรียนฝายกวางวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "cmw",
    "name": "โรงเรียนเชียงม่วนวิทยาคม",
    "urls": [
      "https://www.cmw.ac.th/cmwweb/CMW/ita2568/LogoCMW.png",
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนเชียงม่วนวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "prp",
    "name": "โรงเรียนปงรัชดาภิเษก",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนปงรัชดาภิเษก-1011x1024.png"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "ppw",
    "name": "โรงเรียนปงพัฒนาวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนปงพัฒนาวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "kwk",
    "name": "โรงเรียนขุนควรวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนขุนควรวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "psw",
    "name": "โรงเรียนภูซางวิทยาคม",
    "urls": [
      "https://www.sesapy.go.th/wp-content/uploads/2022/10/ตราโรงเรียนภูซางวิทยาคม.jpg"
    ],
    "source": "https://www.sesapy.go.th/ข้อมูลโรงเรียนในสังกัด/"
  },
  {
    "id": "rpk24",
    "name": "โรงเรียนราชประชานุเคราะห์ 24 จังหวัดพะเยา",
    "urls": [
      "https://static.wixstatic.com/media/4c67de_db4a0bb3a0ca4424a05d6f3033e65620~mv2.jpg"
    ],
    "source": "https://plan138.wixsite.com/rpk24/home",
    "aliases": [
      "ราชประชานุเคราะห์ 24",
      "ราชประชานุเคราะห์ 24 จ.พะเยา",
      "ราชประชานุเคราะห์ 24 พะเยา"
    ]
  },
  {
    "id": "pinit",
    "name": "โรงเรียนพินิตประสาธน์",
    "urls": [],
    "source": "https://www.educationofthailand.com/โรงเรียนสามัญ/โรงเรียนพินิตประสาธน์.html",
    "note": "ภาพบนเว็บเป็นภาพ placeholder ไม่ใช่ตราจริง ต้องขอไฟล์จากโรงเรียน"
  },
  {
    "id": "satit",
    "name": "โรงเรียนสาธิตมหาวิทยาลัยพะเยา",
    "urls": [],
    "source": "https://www.satit.up.ac.th/",
    "note": "ขอไฟล์ตราจากโรงเรียนและยืนยันการอนุญาตใช้ก่อนเผยแพร่ (terms.php)"
  }
];
const norm=s=>s.normalize('NFKC').trim().replace(/^โรงเรียน\s*/u,'').replace(/\s+/gu,'').replace(/[๐-๙]/g,x=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(x)));
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const old='<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xl">🏫</span>';
const replacement='<SchoolEmblem schoolName={school.name} />';
const imp='import SchoolEmblem from "@/components/group-sports/SchoolEmblem";';
const cmp=`"use client";
import { useState } from "react";
import logos from "@/lib/group-sports/school-emblems.json";
const normalize = (s: string) => s.normalize("NFKC").trim().replace(/^โรงเรียน\\s*/u, "").replace(/\\s+/gu, "").replace(/[๐-๙]/g, x => String("๐๑๒๓๔๕๖๗๘๙".indexOf(x)));
export function schoolEmblemPath(name: string): string | undefined { return Object.prototype.hasOwnProperty.call(logos, normalize(name)) ? (logos as Record<string,string>)[normalize(name)] : undefined; }
function EmblemImage({src,name}:{src?:string;name:string}) {
  const [failed,setFailed]=useState(false);
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1 sm:h-[72px] sm:w-[72px]">
    {src&&!failed?<img src={src} alt={\`ตรา\${name}\`} width={64} height={64} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={()=>setFailed(true)}/>:<span aria-hidden="true" className="text-2xl">🏫</span>}
  </span>;
}
export default function SchoolEmblem({schoolName}:{schoolName:string}) { const src=schoolEmblemPath(schoolName); return <EmblemImage key={src||schoolName} src={src} name={schoolName}/>; }
`;
function plan(){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 if(pkg.name!=='student-activity-app')throw Error('Open student-activity-app project root first.');
 let src=fs.readFileSync(path.join(root,dashboard),'utf8');
 if(!src.includes('SchoolStatsCard'))throw Error('School Stats v1 not detected. Stop; send latest dashboard.');
 const count=src.split(old).length-1, installed=src.includes(replacement)&&src.includes(imp);
 if(installed&&count===0)return src;
 if(count!==1||src.includes(replacement)||src.includes(imp))throw Error('School icon differs from expected. No changes. Send latest dashboard.');
 const anchor='import Link from "next/link";';
 if(src.split(anchor).length!==2)throw Error('Import anchor changed. No changes.');
 return src.replace(anchor,anchor+(src.includes('\r\n')?'\r\n':'\n')+imp).replace(old,replacement);
}
function getSharp(){try{return require(require.resolve('sharp',{paths:[root]}));}catch{throw Error('sharp not found. Next.js normally installs it. Send this message; do not install packages yet.');}}
function candidates(){
 const files=fs.existsSync(review)?fs.readdirSync(review):[];
 const list=[];
 for(const school of schools){const matches=files.filter(f=>f.replace(/\.(png|jpe?g|webp|gif)$/i,'')===school.id&&/\.(png|jpe?g|webp|gif)$/i.test(f)); if(matches.length>1)throw Error('Multiple candidate images: '+school.id); if(matches.length)list.push({school,file:matches[0]});}
 for(const f of files){if(/^โรงเรียน.+\.(png|jpe?g|webp|gif)$/iu.test(f)) {const name=f.replace(/\.(png|jpe?g|webp|gif)$/i,''); if(schools.some(s=>[s.name,...(s.aliases||[])].some(n=>norm(n)===norm(name))))throw Error('Use the assigned filename for '+name); const id='manual-'+crypto.createHash('sha256').update(norm(name)).digest('hex').slice(0,16);list.push({school:{id,name,urls:[]},file:f});}}
 return list;
}
function report(){
 const list=candidates();const byId=new Map(list.map(x=>[x.school.id,x.file]));
 const rows=[...schools,...list.map(x=>x.school).filter(x=>!schools.some(y=>y.id===x.id))];
 const html='<!doctype html><meta charset="utf-8"><title>ตรวจสอบตราโรงเรียน</title><style>body{font:16px Tahoma,Arial,sans-serif;background:#e8f3eb;padding:24px;color:#102e70}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:12px}article{background:white;border:1px solid #cbd5e1;border-radius:14px;padding:16px;text-align:center}img{width:140px;height:140px;object-fit:contain}small{color:#475569}a{color:#0755ce}</style><h1>ตรวจสอบตราโรงเรียนก่อนติดตั้ง</h1><p>ตรวจสอบว่าตราตรงโรงเรียนและเป็นฉบับปัจจุบัน หากผิดหรือไม่ได้รับอนุญาต ให้ลบไฟล์ภาพนั้นจากโฟลเดอร์ตรวจสอบก่อนรัน --apply หากไฟล์ยังไม่มี ให้เพิ่มภาพที่ได้รับอนุญาตโดยใช้ชื่อไฟล์ที่ระบุ แล้วรัน --review อีกครั้ง</p><main>'+rows.map(s=>{const f=byId.get(s.id);return '<article>'+(f?'<img src="'+esc(encodeURIComponent(f))+'" alt="">':'<div style="height:140px;display:grid;place-items:center;font-size:42px">🏫</div>')+'<h3>'+esc(s.name)+'</h3><small>'+esc(f||s.id+'.png')+'</small><p>'+(s.source?'<a target="_blank" rel="noopener noreferrer" href="'+esc(s.source)+'">แหล่งข้อมูล</a>':'')+'</p><p>'+esc(s.note||(!f?'ยังไม่มีไฟล์ภาพ':'ตรวจสอบก่อนใช้'))+'</p></article>';}).join('')+'</main>';
 fs.mkdirSync(review,{recursive:true});fs.writeFileSync(path.join(review,'review.html'),html);
 console.log('REVIEW: '+path.join(review,'review.html')+' | candidate images '+list.length);
}
async function resize(sharp,input){
 const i=sharp(input,{limitInputPixels:25_000_000,failOn:'error'});const m=await i.metadata();
 if(!['jpeg','png','webp','gif'].includes(m.format)||!m.width||!m.height||Math.min(m.width,m.height)<32)throw Error('Invalid/too small raster image');
 return i.rotate().resize(256,256,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).webp({quality:86}).toBuffer();
}
async function download(){const sharp=getSharp();fs.mkdirSync(review,{recursive:true});const queue=schools.filter(s=>s.urls.length);let ok=0;
 async function worker(){while(queue.length){const s=queue.shift();if(candidates().some(x=>x.school.id===s.id)){console.log('EXISTS '+s.id);ok++;continue;}let done=false;for(const u of s.urls){try{const r=await fetch(u,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0','Accept':'image/*'}});if(!r.ok)throw Error('HTTP '+r.status);if(!/^image\/(jpeg|png|webp|gif)\b/i.test(r.headers.get('content-type')||''))throw Error('Not a supported image');const chunks=[];let size=0;for await(const c of r.body){size+=c.length;if(size>8_000_000)throw Error('Image too large');chunks.push(Buffer.from(c));}const b=await resize(sharp,Buffer.concat(chunks));fs.writeFileSync(path.join(review,s.id+'.webp'),b,{flag:'wx'});console.log('DOWNLOADED '+s.id);ok++;done=true;break;}catch(e){console.log('SOURCE FAILED '+s.id+' '+e.message);}}if(!done)console.log('MISSING '+s.id);}}
 await Promise.all(Array.from({length:4},worker));console.log('Available from known sources: '+ok+' / '+schools.filter(s=>s.urls.length).length);report();}
async function apply(){const src=plan(),sharp=getSharp(),list=candidates();if(!list.length)throw Error('No candidate images. Run --download first.');const entries=Object.create(null),buffers=[];
 for(const {school:s,file} of list){const b=await resize(sharp,path.join(review,file));const url='/images/schools/'+s.id+'.webp';for(const name of [s.name,...(s.aliases||[])]){const k=norm(name);if(entries[k]&&entries[k]!==url)throw Error('Duplicate school '+name);entries[k]=url;}buffers.push({id:s.id,b});}
 // No writes until all images and source anchors have been validated.
 const backup=path.join(review,'backup-'+Date.now());
 for(const rel of [dashboard,component,manifest,...buffers.map(x=>'public/images/schools/'+x.id+'.webp')]){const f=path.join(root,rel);if(fs.existsSync(f)){const dest=path.join(backup,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}}
 for(const [rel,text] of [[component,cmp],[manifest,JSON.stringify(entries,null,2)+'\n'],[dashboard,src]]){const f=path.join(root,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text);}
 fs.mkdirSync(output,{recursive:true});for(const x of buffers)fs.writeFileSync(path.join(output,x.id+'.webp'),x.b);
 console.log('APPLIED '+buffers.length+' school emblem(s). Backup: '+backup);}
async function main(){plan();if(mode==='--check'){console.log('CHECK READY - no files changed.');return;}if(mode==='--download')return download();if(mode==='--review')return report();if(mode==='--apply')return apply();throw Error('Use --check, --download, --review or --apply');}
main().catch(e=>{console.error('ERROR: '+e.message);process.exitCode=1;});
