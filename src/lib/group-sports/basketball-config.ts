import { FOOTBALL_NAME_PREFIXES, matchSchool, formatThaiFootballDate, type FootballTab } from "./football-config";
export { FOOTBALL_NAME_PREFIXES, matchSchool, formatThaiFootballDate, type FootballTab };
export const BASKETBALL_CODES = ["GS3-BB-15M","GS3-BB-15F","GS3-BB-UM","GS3-BB-UF"] as const;
export type BasketballCode = typeof BASKETBALL_CODES[number];
export const BASKETBALL_CONFIG: Record<BasketballCode,{title:string;compact:string;venue:string;dateRange:string;source:string;groupCount:number;matches:number;notes:string}> = {
 "GS3-BB-15M": {title:"บาสเกตบอล รุ่นอายุไม่เกิน 15 ปี ชาย",compact:"U15 ชาย",venue:"โดมแดง–ขาว โรงเรียนเชียงคำวิทยาคม",dateRange:"29 พฤศจิกายน – 7 ธันวาคม 2569",source:"/docs/basketball/basketball-2569.pdf",groupCount:1,matches:7,notes:"แข่งขันพบกันหมด; ต้องยืนยันรอบชิงและเกณฑ์อันดับตาม PDF ก่อนเผยแพร่"},
 "GS3-BB-15F": {title:"บาสเกตบอล รุ่นอายุไม่เกิน 15 ปี หญิง",compact:"U15 หญิง",venue:"โดมแดง–ขาว โรงเรียนเชียงคำวิทยาคม",dateRange:"29 พฤศจิกายน – 7 ธันวาคม 2569",source:"/docs/basketball/basketball-2569.pdf",groupCount:1,matches:11,notes:"แข่งขันพบกันหมด; ต้องยืนยันรอบชิงและเกณฑ์อันดับตาม PDF ก่อนเผยแพร่"},
 "GS3-BB-UM": {title:"บาสเกตบอล รุ่นไม่จำกัดอายุ ชาย",compact:"ไม่จำกัดอายุ ชาย",venue:"โดมแดง–ขาว โรงเรียนเชียงคำวิทยาคม",dateRange:"29 พฤศจิกายน – 7 ธันวาคม 2569",source:"/docs/basketball/basketball-2569.pdf",groupCount:4,matches:25,notes:"รวม 2 คู่ที่ขาดจาก PDF; ต้องยืนยันคู่ 35, 48, 53, 54 ก่อนเผยแพร่"},
 "GS3-BB-UF": {title:"บาสเกตบอล รุ่นไม่จำกัดอายุ หญิง",compact:"ไม่จำกัดอายุ หญิง",venue:"โดมแดง–ขาว โรงเรียนเชียงคำวิทยาคม",dateRange:"29 พฤศจิกายน – 7 ธันวาคม 2569",source:"/docs/basketball/basketball-2569.pdf",groupCount:1,matches:11,notes:"แข่งขันพบกันหมด; ต้องยืนยันรอบชิงและเกณฑ์อันดับตาม PDF ก่อนเผยแพร่"},
};
