import "server-only";

// Automatic slip verification through SlipOK (https://slipok.com).
// Configure SLIPOK_BRANCH_ID and SLIPOK_API_KEY; without them every slip
// simply goes to the admin for manual approval.
//
// Failure policy: we only *reject* a slip for reasons SlipOK states
// explicitly (already used / wrong amount / wrong receiver). Anything else
// — quota exhausted, network error, unknown error code — falls back to
// manual review, so a paying customer is never turned away by an outage.

export type SlipResult =
  | { kind: "verified"; transRef: string; amount: number; senderName: string | null }
  | { kind: "rejected"; reason: string }
  | { kind: "manual"; reason: string };

const REJECT_CODES: Record<number, string> = {
  1012: "สลิปนี้เคยถูกใช้งานแล้ว",
  1013: "ยอดเงินในสลิปไม่ตรงกับราคาแพ็กเกจ",
  1014: "บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน",
};

type SlipOkResponse = {
  success?: boolean;
  code?: number;
  message?: string;
  data?: {
    success?: boolean;
    transRef?: string;
    amount?: number;
    sender?: { displayName?: string; name?: string };
  };
};

export function isSlipVerificationConfigured() {
  return Boolean(process.env.SLIPOK_BRANCH_ID && process.env.SLIPOK_API_KEY);
}

export async function verifySlip(file: File, expectedAmount: number): Promise<SlipResult> {
  const branchId = process.env.SLIPOK_BRANCH_ID;
  const apiKey = process.env.SLIPOK_API_KEY;
  if (!branchId || !apiKey) return { kind: "manual", reason: "ยังไม่ได้ตั้งค่าระบบตรวจสลิปอัตโนมัติ" };

  const form = new FormData();
  form.append("files", file);
  form.append("amount", String(expectedAmount));
  // Lets SlipOK remember the slip so the same one is reported as a
  // duplicate (code 1012) next time.
  form.append("log", "true");

  let body: SlipOkResponse;
  try {
    const response = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(branchId)}`, {
      method: "POST",
      headers: { "x-authorization": apiKey },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    body = (await response.json()) as SlipOkResponse;
  } catch {
    return { kind: "manual", reason: "ระบบตรวจสลิปไม่ตอบสนอง" };
  }

  if (body.code && REJECT_CODES[body.code]) {
    return { kind: "rejected", reason: REJECT_CODES[body.code] };
  }

  const data = body.data;
  if (body.success && data?.success && data.transRef && typeof data.amount === "number") {
    if (data.amount < expectedAmount) {
      return { kind: "rejected", reason: REJECT_CODES[1013] };
    }
    return {
      kind: "verified",
      transRef: data.transRef,
      amount: Math.round(data.amount),
      senderName: data.sender?.displayName || data.sender?.name || null,
    };
  }

  return { kind: "manual", reason: body.message ? `ตรวจอัตโนมัติไม่ผ่าน: ${body.message}` : "ตรวจอัตโนมัติไม่ผ่าน" };
}
