export const FOOTBALL_CODES = ["GS3-FB-13M", "GS3-FB-15M", "GS3-FB-UM", "GS3-FB-UF"] as const;
export type FootballCode = typeof FOOTBALL_CODES[number];
export type FootballTab = "schedule" | "groups" | "registration" | "standings" | "knockout" | "rules" | "history";
export const FOOTBALL_CONFIG: Record<FootballCode, { title: string; compact: string; venue: string; dateRange: string; source: string; groupCount: number; matches: number; notes?: string }> = {
  "GS3-FB-13M": { title: "ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย", compact: "U13 ชาย", venue: "สนามโรงเรียนภูซางวิทยาคม", dateRange: "30 พฤศจิกายน – 4 ธันวาคม 2569", source: "/docs/football/football-u13-boys-and-women.pdf", groupCount: 2, matches: 9 },
  "GS3-FB-15M": { title: "ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย", compact: "U15 ชาย", venue: "สนามโรงเรียนฝายกวางวิทยาคม", dateRange: "2–7 ธันวาคม 2569", source: "/docs/football/football-u15-boys.pdf", groupCount: 4, matches: 17 },
  "GS3-FB-UM": { title: "ฟุตบอล รุ่นไม่จำกัดอายุ ชาย", compact: "ไม่จำกัดอายุ ชาย", venue: "สนามโรงเรียนเชียงคำวิทยาคม", dateRange: "30 พฤศจิกายน – 7 ธันวาคม 2569", source: "/docs/football/football-open-boys.pdf", groupCount: 3, matches: 16, notes: "เอกสารต้นฉบับมีชื่อสายบางคู่ไม่ตรงกับรายชื่อกลุ่ม และระบุวันสิ้นสุดต่างกันระหว่างหน้าตารางกับหน้าระเบียบ โปรดตรวจสอบกับคณะกรรมการก่อนเผยแพร่" },
  "GS3-FB-UF": { title: "ฟุตบอล รุ่นไม่จำกัดอายุ หญิง", compact: "ไม่จำกัดอายุ หญิง", venue: "สนามโรงเรียนภูซางวิทยาคม", dateRange: "30 พฤศจิกายน – 4 ธันวาคม 2569", source: "/docs/football/football-u13-boys-and-women.pdf", groupCount: 2, matches: 9 },
};
export const FOOTBALL_NAME_PREFIXES = ["เด็กชาย", "เด็กหญิง", "นาย", "นางสาว"] as const;
export function normalizeFootballSchool(name: string) {
  return name.normalize("NFKC").replace(/^โรงเรียน/, "").replace(/\s+/g, "").replace(/วิทยคม/g, "วิทยาคม")
    .replace(/เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์พะเยา|เฉลิมพระเกียรติฯพะเยา|เฉลิมพระเกียรติ/g, "เฉลิมพระเกียรติ")
    .replace(/ราชประชานุเคราะห์๒๔/g, "ราชประชานุเคราะห์24");
}
export function matchSchool(source: string, target: string) {
  const a = normalizeFootballSchool(source); const b = normalizeFootballSchool(target);
  return a === b || (a.length > 5 && b.includes(a)) || (b.length > 5 && a.includes(b));
}
export function formatThaiFootballDate(value: string | null) {
  if (!value) return "รอวันที่";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T12:00:00+07:00`));
}
