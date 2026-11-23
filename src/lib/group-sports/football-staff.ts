/** Football-only staff fields are stored in the existing JSONB coaches array.
 * The first coach remains the lead coach for backward compatibility with the
 * registration RPC; manager_name/manager_phone are optional metadata on it.
 * Staff pictures use the EXISTING private athlete-photo bucket and its RLS.
 * Reserve indices 100 and 110+ so staff photos never overlap 0..19 players.
 */
import type { PhotoAthlete } from "@/lib/group-sports/rov-photos";

export type FootballCoach = {
  name: string;
  phone: string;
  manager_name?: string;
  manager_phone?: string;
};
export type FootballStaffSlot = {
  key: string;
  title: string;
  name: string;
  photoIndex: number;
  identity: PhotoAthlete;
};

export function footballStaffSlots(coaches: FootballCoach[]): FootballStaffSlot[] {
  const managerName = (coaches[0]?.manager_name || "").trim();
  const people: { key:string; title:string; name:string; photoIndex:number }[] = [
    { key:"manager", title:"ผู้จัดการทีม", name:managerName, photoIndex:100 },
    ...coaches.map((coach, i) => ({
      key:`coach-${i}`,
      title:i===0 ? "ผู้ฝึกสอน" : `ผู้ช่วยผู้ฝึกสอน${i>1?` คนที่ ${i}`:""}`,
      name:(coach.name||"").trim(),
      photoIndex:110+i,
    })),
  ];
  // Keep four boxes on the second portrait page, even when there are fewer staff.
  while (people.length < 4) {
    const index = people.length - 1;
    people.push({ key:`empty-${index}`, title:`ผู้ช่วยผู้ฝึกสอน${index>1?` คนที่ ${index}`:""}`, name:"", photoIndex:110+index });
  }
  return people.map(staff => ({
    ...staff,
    // Never put a name or telephone number into a Storage object key.
    // Role/position are part of the hashed identity to prevent swapping photos.
    identity:{full_name:`football-staff:${staff.key}:${staff.name}`},
  }));
}

/** Completed years on the event's first scheduled date, not an eligibility check. */
export function footballAgeOnStart(birthDate: string | null, sportName: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month-1, day));
  if (date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return null;
  const start = sportName.includes("ไม่เกิน 15 ปี") ? [2026,12,2] : [2026,11,30];
  const age = start[0]-year-(month>start[1] || (month===start[1] && day>start[2]) ? 1 : 0);
  return age < 0 || age > 100 ? null : age;
}
