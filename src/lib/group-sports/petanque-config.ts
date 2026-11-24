export const PETANQUE_CONFIG = {
  "GS3-PT-UM": {
    "title": "ไม่จำกัดอายุ ชาย",
    "teams": 14,
    "matches": 23,
    "slots": 25,
    "date": "2026-12-03"
  },
  "GS3-PT-UF": {
    "title": "ไม่จำกัดอายุ หญิง",
    "teams": 15,
    "matches": 25,
    "slots": 26,
    "date": "2026-12-03"
  },
  "GS3-PT-15M": {
    "title": "ไม่เกิน 15 ปี ชาย",
    "teams": 14,
    "matches": 23,
    "slots": 25,
    "date": "2026-12-04"
  },
  "GS3-PT-15F": {
    "title": "ไม่เกิน 15 ปี หญิง",
    "teams": 15,
    "matches": 25,
    "slots": 27,
    "date": "2026-12-04"
  }
} as const;
export type PetanqueCode=keyof typeof PETANQUE_CONFIG;
export const PETANQUE_CODES=Object.keys(PETANQUE_CONFIG) as PetanqueCode[];
