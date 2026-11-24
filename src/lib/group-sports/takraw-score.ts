/** Local regulation: best of three for every round; referee confirms set points. */
export function calculateTakrawScore(values:(string|number)[][]){
 const need=2;
 if(values.length<need||values.length>need*2-1)throw new Error('จำนวนเซตไม่ถูกต้อง');
 let totalA=0,totalB=0;
 const sets=values.map((row,i)=>{
  if(row.length!==2||row.some(v=>!/^\d{1,3}$/.test(String(v))))throw new Error('กรอกคะแนนทั้งสองทีมให้ครบ');
  if(totalA===need||totalB===need)throw new Error('การแข่งขันจบแล้ว ห้ามเพิ่มเซต');
  const [a,b]=row.map(Number);
  if(a===b)throw new Error(`เซต ${i+1}: คะแนนต้องไม่เสมอ`);
  if(a>b)totalA++;else totalB++;
  return [a,b];
 });
 if(totalA!==need&&totalB!==need)throw new Error('ยังไม่มีทีมชนะครบเซต');
 return {sets,totalA,totalB};
}
