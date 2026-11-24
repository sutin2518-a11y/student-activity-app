import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calculateBasketballScore} from "../src/lib/group-sports/basketball-score.ts";
const d=JSON.parse(readFileSync(new URL("../setup/basketball_2569_draft.json",import.meta.url),"utf8"));
const sql=readFileSync(new URL("../supabase/migrations/202611240041_sports_basketball_v33_25.sql",import.meta.url),"utf8");
test("52 original fixtures and 2 unscheduled missing fixtures",()=>{
 assert.equal(d.matches.length,54);assert.equal(d.matches.filter(m=>m.source).length,52);
 assert.deepEqual(Object.fromEntries(Object.keys(d.groups).map(k=>[k,d.matches.filter(m=>m.code===k).length])),{"15M":7,"15F":11,UM:25,UF:11});
 assert.equal(d.matches.find(m=>m.no===35).time,null);assert.equal(d.matches.find(m=>m.no===48).source.b,"W44");assert.equal(d.matches.find(m=>m.no===48).b,"W40");
 assert.ok(d.matches.filter(m=>!m.source).every(m=>!m.date&&!m.time&&m.review));
});
test("every group pairing is complete, unique and in the correct group",()=>{
 for(const [code,groups] of Object.entries(d.groups))groups.forEach((g,i)=>{
  const teams=g.split(" "),pairs=[];for(let a=0;a<teams.length;a++)for(let b=a+1;b<teams.length;b++)pairs.push([teams[a],teams[b]].sort().join("/"));
  const matches=d.matches.filter(m=>m.code===code&&m.group===String.fromCharCode(65+i)).map(m=>[m.a,m.b].sort().join("/"));assert.deepEqual(matches.sort(),pairs.sort());
 });
});
test("all scheduled slots are nonoverlapping; missing time remains unassigned",()=>{
 const scheduled=d.matches.filter(m=>m.date&&m.time&&m.end);
 for(const a of scheduled)for(const b of scheduled)if(a.no<b.no&&a.date===b.date)assert.ok(a.end<=b.time||b.end<=a.time,`${a.no}/${b.no}`);
});
test("four quarters and scores greater than 99",()=>{const x=calculateBasketballScore([[32,25],[26,22],[30,21],[22,19]]);assert.equal(x.totalA,110);assert.equal(x.totalB,87);});
test("multiple overtimes allowed only when tied",()=>{const x=calculateBasketballScore([[20,20],[20,20],[20,20],[20,20],[5,5],[9,7]]);assert.equal(x.totalA,94);assert.equal(x.totalB,92);assert.throws(()=>calculateBasketballScore([[20,19],[20,20],[20,20],[20,20],[5,6]]));});
test("invalid scores, missing quarters, or unresolved ties rejected",()=>{assert.throws(()=>calculateBasketballScore([[1,2]]));assert.throws(()=>calculateBasketballScore([[20,20],[20,20],[20,20],[20,20]]));assert.throws(()=>calculateBasketballScore([[20,20],[20,20],[20,20],[-1,2]]));});
test("migration contains permission, review, chronological and atomic award guards",()=>{for(const token of ["sports_basketball_can_score","basketball matches RPC only","sports_basketball_order_ok","basketball_reviewed","p_expected","sports_award_is_published","sports_cert_submit","sports_admin_correct_published_result","sports_award_suggestions"])assert.ok(sql.includes(token),token);assert.match(sql,/begin;[\s\S]+commit;/);});
