export type CertificateRole = "admin" | "official" | "school";
export type CertificateStatus = "not_submitted" | "submitted" | "rejected" | "approved" | "published";
export type CertificateEvent = {
  id: string;
  sport_name: string;
  event_code: string | null;
  event_type: "team" | "individual" | "athletics";
  result_status: CertificateStatus;
  rejection_reason: string;
  participation_released: boolean;
  can_record: boolean;
};
export type CertificateSettings = {
  title: string;
  signer_name: string;
  signer_position: string;
};
export type CertificateContext = {
  competition_id: string;
  role: CertificateRole;
  school_id: string | null;
  events: CertificateEvent[];
  settings: CertificateSettings;
};
export type CertificateEntry = { id: string; school_name: string; entry_name: string; athlete_count: number };
export type CertificatePlacement = { rank: 1 | 2 | 3; slot: 1 | 2; entry_id: string };
export type CertificateResult = { status: Exclude<CertificateStatus,"not_submitted">; reason: string; placements: CertificatePlacement[] } | null;
export type CertificateDocument = {
  id: number;
  token: string;
  recipient_name: string;
  recipient_type: "athlete" | "coach";
  school_name: string;
  event_name: string;
  competition_name: string;
  certificate_title: string;
  kind: "award" | "participation";
  rank: number | null;
  signer_name: string;
  signer_position: string;
  issued_at: string;
  replaces_id?: number | null;
};
export function certificateNumber(id: number): string {
  return `PG69-${String(id).padStart(8,"0")}`;
}
export function certificateAward(rank: number | null, kind: string): string {
  if (kind === "participation") return "เข้าร่วมการแข่งขัน";
  if (rank === 1) return "ชนะเลิศ";
  if (rank === 2) return "รองชนะเลิศอันดับที่ 1";
  if (rank === 3) return "รองชนะเลิศอันดับที่ 2";
  return "";
}
export function resultStatusLabel(status: CertificateStatus): string {
  return ({not_submitted:"ยังไม่ส่งผล", submitted:"ผลเดิมรอประกาศ", rejected:"ผลเดิมต้องส่งใหม่", approved:"ผลเดิมพร้อมประกาศ", published:"ประกาศผลแล้ว"})[status];
}
export function emptyPlacements(isAthletics:boolean): CertificatePlacement[] {
  const base:CertificatePlacement[] = [{rank:1,slot:1,entry_id:""},{rank:2,slot:1,entry_id:""},{rank:3,slot:1,entry_id:""}];
  if (!isAthletics) base.push({rank:3,slot:2,entry_id:""});
  return base;
}
