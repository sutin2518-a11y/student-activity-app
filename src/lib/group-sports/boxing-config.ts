export const BOX_WEIGHTS = [36,39,42,45,48,51,54,57,60,64,67,71,75] as const;
export const BOX_CODES = BOX_WEIGHTS.flatMap(w=>[`GS3-BX-${w}M`,`GS3-BX-${w}F`]);
export function weightLabel(code:string){const match=code.match(/^GS3-BX-(\d+)([MF])$/);if(!match)return code;const lo=Number(match[1]);const index=BOX_WEIGHTS.findIndex(w=>w===lo);if(index<0)return code;const hi=BOX_WEIGHTS[index+1];return `เกิน ${lo}${hi?` – ไม่เกิน ${hi}`:''} กก. ${match[2]==='M'?'ชาย':'หญิง'}`;}
export function weightFits(code:string,weight:number){const m=code.match(/^GS3-BX-(\d+)[MF]$/);if(!m||!Number.isFinite(weight))return false;const lo=Number(m[1]);const i=BOX_WEIGHTS.findIndex(w=>w===lo);return i>=0&&weight>lo&&(i===BOX_WEIGHTS.length-1||weight<=BOX_WEIGHTS[i+1]);}
export const BOX_VENUE='โรงเรียนราชประชานุเคราะห์ 24';
