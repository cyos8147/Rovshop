// Builds a Thai PromptPay QR payload (EMVCo merchant-presented QR, the
// format every Thai banking app scans). Pure function, no network.

function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo.
function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type PromptPayTarget =
  | { kind: "phone"; value: string }
  | { kind: "nationalId"; value: string }
  | { kind: "ewallet"; value: string };

// Accepts what an admin would type: "081-234-5678", "0812345678",
// a 13-digit citizen/tax ID, or a 15-digit e-wallet ID.
export function parsePromptPayId(raw: string): PromptPayTarget | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return { kind: "phone", value: digits };
  if (digits.length === 13) return { kind: "nationalId", value: digits };
  if (digits.length === 15) return { kind: "ewallet", value: digits };
  return null;
}

export function promptPayPayload(target: PromptPayTarget, amount: number) {
  let account: string;
  if (target.kind === "phone") {
    // 0812345678 → 0066812345678
    account = tlv("01", "0066" + target.value.slice(1));
  } else if (target.kind === "nationalId") {
    account = tlv("02", target.value);
  } else {
    account = tlv("03", target.value);
  }

  const body =
    tlv("00", "01") +
    tlv("01", "12") + // dynamic QR: one-time amount
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("58", "TH") +
    tlv("53", "764") + // THB
    tlv("54", amount.toFixed(2)) +
    "6304";

  return body + crc16(body);
}

export function maskPromptPayId(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 6) return digits;
  return digits.slice(0, 3) + "x".repeat(digits.length - 6) + digits.slice(-3);
}
