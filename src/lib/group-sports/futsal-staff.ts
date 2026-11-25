import { footballStaffSlots, type FootballCoach, type FootballStaffSlot } from "./football-staff";
export type FutsalCoach = FootballCoach & { controller_name?: string; controller_phone?: string };
/** Preserve all legacy photo indices/identities; controller is an additional slot. */
export function futsalStaffSlots(coaches: FutsalCoach[]): FootballStaffSlot[] {
  const legacy = footballStaffSlots(coaches);
  const name = (coaches[0]?.controller_name || "").trim();
  const controller = { key:"controller", title:"ผู้ควบคุมทีม", name, photoIndex:105, identity:{full_name:`futsal-staff:controller:${name}`} };
  return [legacy[0], controller, legacy[1], legacy[2], ...legacy.slice(3).filter(s=>s.name)];
}
