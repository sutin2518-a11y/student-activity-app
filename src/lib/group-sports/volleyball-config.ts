export const VOLLEYBALL_CONFIG = {
  "GS3-VB-15F": {
    "title": "ไม่เกิน 15 ปี หญิง",
    "matches": 25,
    "teams": 14,
    "groups": 4
  },
  "GS3-VB-OF": {
    "title": "เกิน 15 ปี หญิง",
    "matches": 22,
    "teams": 13,
    "groups": 4
  },
  "GS3-VB-15M": {
    "title": "ไม่เกิน 15 ปี ชาย",
    "matches": 15,
    "teams": 8,
    "groups": 2
  },
  "GS3-VB-OM": {
    "title": "เกิน 15 ปี ชาย",
    "matches": 31,
    "teams": 16,
    "groups": 4
  }
} as const;
export type VolleyballCode=keyof typeof VOLLEYBALL_CONFIG;
export const VOLLEYBALL_CODES=Object.keys(VOLLEYBALL_CONFIG) as VolleyballCode[];
