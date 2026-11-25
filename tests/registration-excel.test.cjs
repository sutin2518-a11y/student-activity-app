const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const XLSX = require("xlsx");
const source = fs.readFileSync("src/lib/group-sports/registration-excel.ts","utf8");
const mod = {};
new Function("require","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,mod);
function roundTrip(entries) {
  const book = mod.registrationWorkbook({scope:"โรงเรียนทดสอบ",exported_at:"2026-11-25T12:00:00Z",entries});
  return XLSX.read(XLSX.write(book,{type:"buffer",bookType:"xlsx"}),{type:"buffer"});
}
test("สมุดงานว่างแสดงยอดศูนย์และมีหัวตารางครบ",()=>{
  const b=roundTrip([]);
  assert.deepEqual(b.SheetNames,["สรุป","ใบสมัคร","นักกีฬา","ผู้ควบคุมทีม"]);
  assert.equal(b.Sheets["สรุป"].B2.v,0);
});
test("รหัสนักเรียนและเบอร์โทรคงเลขศูนย์ ชื่อเป็นข้อความ และนับใบถอนตามสถานะ",()=>{
  const e={id:"entry-a",school:"โรงเรียน ก",code:"GS3-ES-SM",event:"RoV",team:"ทีม",status:"approved",players:[{name:"=ชื่อทดสอบ",student:"00102",ign:"GAME"}],staff:[{name:"ครู",phone:"0812345678"}]};
  const b=roundTrip([e,{...e,id:"entry-b",status:"withdrawn",players:[],staff:[]}]);
  assert.equal(b.Sheets["สรุป"].B2.v,2);assert.equal(b.Sheets["สรุป"].C2.v,1);
  assert.equal(b.Sheets["นักกีฬา"].G2.v,"00102");assert.equal(b.Sheets["นักกีฬา"].F2.f,undefined);
  assert.equal(b.Sheets["ผู้ควบคุมทีม"].G2.v,"0812345678");
});
