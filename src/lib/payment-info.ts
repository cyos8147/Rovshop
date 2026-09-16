import type { PaymentMethod } from "@/lib/types";

// Demo payment details only — wire up a real payment gateway (Omise, 2C2P)
// or your shop's real bank/PromptPay details before taking real orders.
export const PAYMENT_INFO: Record<PaymentMethod, { label: string; lines: string[] }> = {
  BANK_TRANSFER: {
    label: "โอนผ่านธนาคาร",
    lines: [
      "ธนาคารกสิกรไทย (บัญชีตัวอย่าง)",
      "เลขที่บัญชี 123-4-56789-0",
      "ชื่อบัญชี ร้าน RoVShop (Demo)",
    ],
  },
  PROMPTPAY: {
    label: "พร้อมเพย์",
    lines: ["หมายเลขพร้อมเพย์ 081-234-5678 (ตัวอย่าง)", "สแกน QR ด้านล่างเพื่อชำระเงิน"],
  },
  TRUEMONEY: {
    label: "TrueMoney Wallet",
    lines: ["เบอร์ทรูมันนี่ 089-999-8888 (ตัวอย่าง)", "โอนแล้วแนบสลิป/แคปหน้าจอยืนยัน"],
  },
};
