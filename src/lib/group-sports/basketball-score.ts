/** Points validation; matches the dedicated Supabase RPC. */
export function calculateBasketballScore(values: (string|number)[][]) {
  if(values.length<4||values.length>24||values.some(row=>row.length!==2||row.some(v=>!/^\d{1,3}$/.test(String(v))))) throw new Error("กรอกคะแนนทั้ง 4 ควอเตอร์และ OT (ถ้ามี) ให้ครบเป็นจำนวนเต็ม");
  const periods=values.map(row=>row.map(Number));
  let totalA=0,totalB=0;
  for(const [i,row] of periods.entries()){
    if(i>=4&&totalA!==totalB)throw new Error("ต่อเวลาได้เฉพาะเมื่อคะแนนรวมยังเสมอ");
    totalA+=row[0];totalB+=row[1];
  }
  if(totalA===totalB||totalA>999||totalB>999)throw new Error("คะแนนรวมต้องไม่เสมอและไม่เกิน 999");
  return {periods,totalA,totalB};
}
