// Kept as plain strings rather than native Postgres enums so new values
// (e.g. an extra rank tier) never need a migration. These unions are the
// single source of truth for each "enum-like" column, shared between
// server actions, forms, and seed data.

export const ROLES = ["ADMIN"] as const;
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
