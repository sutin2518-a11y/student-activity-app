export const TAKRAW_CONFIG = {
  "GS3-ST-15M": {
    "title": "ไม่เกิน 15 ปี ชาย",
    "matches": 19,
    "teams": 9,
    "groups": 2
  },
  "GS3-ST-UM": {
    "title": "ไม่จำกัดอายุ ชาย",
    "matches": 19,
    "teams": 9,
    "groups": 2
  },
  "GS3-ST-15F": {
    "title": "ไม่เกิน 15 ปี หญิง",
    "matches": 9,
    "teams": 6,
    "groups": 2
  },
  "GS3-ST-UF": {
    "title": "ไม่จำกัดอายุ หญิง",
    "matches": 15,
    "teams": 8,
    "groups": 2
  }
} as const;
export type TakrawCode=keyof typeof TAKRAW_CONFIG;
export const TAKRAW_CODES=Object.keys(TAKRAW_CONFIG) as TakrawCode[];
