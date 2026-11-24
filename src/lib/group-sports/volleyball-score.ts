/** Local regulation: best of three except finals, best of five. FIVB-style 25/15 targets. */
export function calculateVolleyballScore(values:(string|number)[][], final:boolean){
 const need=final?3:2;
 if(values.length<need||values.length>need*2-1)throw new Error('จำนวนเซตไม่ถูกต้อง');
 let totalA=0,totalB=0;
 const sets=values.map((row,i)=>{
  if(row.length!==2||row.some(v=>!/^\d{1,3}$/.test(String(v))))throw new Error('กรอกคะแนนทั้งสองทีมให้ครบ');
  if(totalA===need||totalB===need)throw new Error('การแข่งขันจบแล้ว ห้ามเพิ่มเซต');
  const [a,b]=row.map(Number), target=i===need*2-2?15:25;
  if(Math.max(a,b)!==Math.max(target,Math.min(a,b)+2))throw new Error(`เซต ${i+1}: ต้องถึง ${target} แต้มและชนะห่าง 2 แต้ม`);
  if(a>b)totalA++;else totalB++;
  return [a,b];
 });
 if(totalA!==need&&totalB!==need)throw new Error('ยังไม่มีทีมชนะครบเซต');
 return {sets,totalA,totalB};
}
