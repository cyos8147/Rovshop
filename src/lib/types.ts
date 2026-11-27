// Kept as plain strings rather than native Postgres enums so new values
// (e.g. an extra rank tier) never need a migration. These unions are the
// single source of truth for each "enum-like" column, shared between
// server actions, forms, and seed data.

export const ROLES = ["ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const LOGIN_TYPES = ["FACEBOOK", "GOOGLE", "GUEST", "LINE"] as const;
export type LoginType = (typeof LOGIN_TYPES)[number];

export const RANK_TIERS = [
  "ทองแดง",
  "เงิน",
  "ทอง",
  "แพลทินัม",
  "เพชร",
  "มาสเตอร์",
  "เซียน",
] as const;

export const SERVERS = ["TH", "SEA", "TW", "EU"] as const;

export const LOGIN_TYPE_LABELS: Record<LoginType, string> = {
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  GUEST: "Guest",
  LINE: "LINE",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  AVAILABLE: "พร้อมขาย",
  RESERVED: "ถูกจองแล้ว",
  SOLD: "ขายแล้ว",
};

// --- Skin sorter -----------------------------------------------------------

// Ordered rarest → most common; the index is the default sort weight.
export const SKIN_TIERS = ["SSS", "SS", "S_PLUS", "S", "A", "LIMITED", "NORMAL"] as const;
export type SkinTier = (typeof SKIN_TIERS)[number];

export const SKIN_TIER_LABELS: Record<SkinTier, string> = {
  SSS: "SSS",
  SS: "SS",
  S_PLUS: "S+",
  S: "S",
  A: "A",
  LIMITED: "Limited",
  NORMAL: "ทั่วไป",
};

// Hex values (not Tailwind classes) because the same colours are drawn onto
// the banner <canvas>.
export const SKIN_TIER_COLORS: Record<SkinTier, string> = {
  SSS: "#ff4d6d",
  SS: "#e8b64a",
  S_PLUS: "#b07cff",
  S: "#5cb8ff",
  A: "#4ade80",
  LIMITED: "#f97316",
  NORMAL: "#9a9ab0",
};

export function skinTierRank(tier: string): number {
  const index = SKIN_TIERS.indexOf(tier as SkinTier);
  return index === -1 ? SKIN_TIERS.length : index;
}

export const HERO_ROLES = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "CARRY", "SUPPORT"] as const;
export type HeroRole = (typeof HERO_ROLES)[number];

export const HERO_ROLE_LABELS: Record<HeroRole, string> = {
  TANK: "แทงค์",
  FIGHTER: "ไฟเตอร์",
  ASSASSIN: "แอสซาซิน",
  MAGE: "เมจ",
  CARRY: "แครี่",
  SUPPORT: "ซัพพอร์ต",
};

// --- Banner-tool membership ---------------------------------------------------

export const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
};
