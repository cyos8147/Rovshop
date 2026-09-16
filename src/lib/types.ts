// SQLite (via Prisma) has no native enum support, so these string unions are
// the single source of truth for the allowed values of each "enum-like"
// column, shared between server actions, forms, and seed data.

export const ROLES = ["CUSTOMER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const LOGIN_TYPES = ["FACEBOOK", "GOOGLE", "GUEST", "LINE"] as const;
export type LoginType = (typeof LOGIN_TYPES)[number];

export const PAYMENT_METHODS = ["BANK_TRANSFER", "PROMPTPAY", "TRUEMONEY"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "PAID",
  "CANCELLED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = ["WAITING", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "โอนผ่านธนาคาร",
  PROMPTPAY: "พร้อมเพย์",
  TRUEMONEY: "TrueMoney Wallet",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "รอชำระเงิน",
  AWAITING_VERIFICATION: "รอตรวจสอบสลิป",
  PAID: "ชำระเงินแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  WAITING: "รอส่งมอบไอดี",
  DELIVERED: "ส่งมอบแล้ว",
};
