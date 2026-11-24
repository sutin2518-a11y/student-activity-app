import { FOOTBALL_NAME_PREFIXES, matchSchool, formatThaiFootballDate, type FootballTab } from "./football-config";
export { FOOTBALL_NAME_PREFIXES, matchSchool, formatThaiFootballDate, type FootballTab };
export const FUTSAL_CODES = ["GS3-FS-15M","GS3-FS-UM","GS3-FS-UF"] as const;
export type FutsalCode = typeof FUTSAL_CODES[number];
export const FUTSAL_CONFIG: Record<FutsalCode,{title:string;compact:string;venue:string;dateRange:string;source:string;groupCount:number;matches:number;notes:string}> = {
 "GS3-FS-15M": {title:"ฟุตซอล รุ่นอายุไม่เกิน 15 ปี ชาย",compact:"U15 ชาย",venue:"โรงเรียนฝายกวางวิทยาคม",dateRange:"30 พฤศจิกายน – 8 ธันวาคม 2569",source:"/docs/futsal/futsal-2569.pdf",groupCount:4,matches:17,notes:"ยึดตารางหน้า 8–10 กรณีคะแนนสะสมเท่ากันให้กรรมการยืนยันอันดับตามระเบียบที่ตกลง"},
 "GS3-FS-UM": {title:"ฟุตซอล รุ่นไม่จำกัดอายุ ชาย",compact:"ไม่จำกัดอายุ ชาย",venue:"โรงเรียนฝายกวางวิทยาคม",dateRange:"30 พฤศจิกายน – 7 ธันวาคม 2569",source:"/docs/futsal/futsal-2569.pdf",groupCount:4,matches:22,notes:"ยึดตารางหน้า 8–10 กรณีคะแนนสะสมเท่ากันให้กรรมการยืนยันอันดับตามระเบียบที่ตกลง"},
 "GS3-FS-UF": {title:"ฟุตซอลหญิงรวม",compact:"หญิงรวม",venue:"โรงเรียนฝายกวางวิทยาคม",dateRange:"2–8 ธันวาคม 2569",source:"/docs/futsal/futsal-2569.pdf",groupCount:2,matches:12,notes:"ยึดตารางหน้า 8–10 กรณีคะแนนสะสมเท่ากันให้กรรมการยืนยันอันดับตามระเบียบที่ตกลง"},
};
