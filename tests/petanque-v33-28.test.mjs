import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../setup/petanque_2569_draft.json',import.meta.url),'utf8'));
const matches=data.matches;
const expected={UM:[25,23],UF:[26,25],'15M':[25,23],'15F':[27,25]};
test('counts: 58 schools in 16 groups, 103 slots, 96 real games, seven BYEs',()=>{
 assert.equal(Object.values(data.groups).flat().flatMap(x=>x.split(' ')).filter(x=>x!=='X').length,58);
 assert.equal(Object.values(data.groups).flat().length,16);
 for(const [k,rs] of Object.entries(matches)){assert.equal(rs.length,expected[k][0]);assert.equal(rs.filter(r=>r[4]!=='X').length,expected[k][1]);assert.equal(new Set(rs.map(r=>r[0])).size,rs.length);}
});
for(const [k,rs] of Object.entries(matches))test(`${k}: all possible bracket outcomes, no cross-group matches or duplicate qualifiers`,()=>{
 // Independently enumerate every group outcome (up to 32 possibilities per group), then exercise knockout paths.
 const ordered=[...rs].sort((a,b)=>a[2]-b[2]||a[0]-b[0]);
 const resolve=(s,out)=>/^[WL]\d+$/.test(s)?out.get(Number(s.slice(1)))?.[s[0]==='W'?0:1]:s;
 function play(list,mask,out){let bit=0;for(const [n,g,phase,a,b] of list){const x=resolve(a,out),y=resolve(b,out);assert.ok(x&&y&&x!==y&&x!=='X',`${k}/${n}: ${x}/${y}`);if(g){const gs=data.groups[k][g.charCodeAt(0)-65].split(' ');assert.ok(gs.includes(x)&&gs.includes(y));}if(y==='X')out.set(n,[x,null]);else out.set(n,(mask>>bit++)&1?[y,x]:[x,y]);}return out;}
 for(const g of 'ABCD'){const list=ordered.filter(r=>r[1]===g),n=list.filter(r=>r[4]!=='X').length;for(let m=0;m<2**n;m++){const o=play(list,m,new Map());const first=list.find(r=>r[2]===2&&r[3].startsWith('W'));const second=list.find(r=>r[2]===3);assert.ok(first&&second);assert.notEqual(o.get(first[0])[0],o.get(second[0])[0]);}}
 for(let mask=0;mask<128;mask++){const o=play(ordered.filter(r=>r[2]<4),mask,new Map());const q=ordered.filter(r=>r[2]===4);assert.equal(new Set(q.flatMap(r=>[resolve(r[3],o),resolve(r[4],o)])).size,8);play(ordered.filter(r=>r[2]>=4),mask,o);const final=ordered.find(r=>r[2]===6),semis=ordered.filter(r=>r[2]===5);assert.equal(new Set([...o.get(final[0]),...semis.map(r=>o.get(r[0])[1])]).size,4);}
});
test('school aliases match existing roster names and all initial schools are known',()=>{for(const gs of Object.values(data.groups))for(const g of gs)for(const x of g.split(' '))assert.ok(x==='X'||data.schools[x]);});
