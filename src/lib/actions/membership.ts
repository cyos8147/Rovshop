"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings, SETTINGS_ID } from "@/lib/settings";
import { verifySlip } from "@/lib/slip";
import { savePrivateSlip, validateImageFile } from "@/lib/uploads";
import { parsePromptPayId } from "@/lib/promptpay";
import { after } from "next/server";
import { downloadCostCents, formatCoins, MAX_TOPUP } from "@/lib/coins";
import { maskEmail, notifyAdmins } from "@/lib/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sends after the response is on its way, so a slow chat API never delays
// the customer.
function notifyLater(lines: string[], linkPath?: string) {
  after(() => notifyAdmins(lines, linkPath));
}

// Marks a browser that already received the sign-up bonus, so creating a
// second account from the same device doesn't hand out more free coins.
const BONUS_COOKIE = "oscar_bonus_used";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// --- Register ------------------------------------------------------------------

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง").max(200),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "ยืนยันรหัสผ่านไม่ตรงกัน", path: ["confirm"] });

export type RegisterState = { error?: string; ok?: boolean };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const cookieStore = await cookies();
  const { signupBonusCents } = await getSettings();
  const bonus = cookieStore.get(BONUS_COOKIE) ? 0 : signupBonusCents;

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.email.split("@")[0],
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "MEMBER",
        coinCents: bonus,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "อีเมลนี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ" };
    }
    throw error;
  }

  if (bonus > 0) {
    cookieStore.set(BONUS_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
  }
  return { ok: true };
}

// --- Pay for a download -----------------------------------------------------------

export type ChargeResult =
  | { ok: true; balanceCents: number; costCents: number }
  | { ok: false; reason: "login" | "funds" | "invalid"; message: string; balanceCents?: number };

// Deducts the price of one banner download. The price is computed here
// from the skin ids (the server counts which ones exist), never taken from
// the client. The balance check and the deduction are a single conditional
// UPDATE, so two downloads at once can't overdraw the wallet.
// `expectPlan`: the page showed this download as free under the monthly
// plan. If the plan has since expired we refuse rather than silently charge
// a price the user never saw.
export async function chargeDownloadAction(
  skinIds: string[],
  noWatermark: boolean,
  expectPlan = false
): Promise<ChargeResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, reason: "login", message: "กรุณาเข้าสู่ระบบก่อนดาวน์โหลด" };

  if (!Array.isArray(skinIds) || skinIds.length > 1000 || skinIds.some((id) => typeof id !== "string")) {
    return { ok: false, reason: "invalid", message: "ข้อมูลไม่ถูกต้อง" };
  }
  const uniqueIds = [...new Set(skinIds)];
  const skinCount = await prisma.skin.count({ where: { id: { in: uniqueIds } } });
  if (skinCount === 0) return { ok: false, reason: "invalid", message: "ยังไม่ได้เลือกสกิน" };

  if (session.user.role === "ADMIN") return { ok: true, balanceCents: 0, costCents: 0 };
  const userId = session.user.id;

  // Monthly plan active → free, unlimited (still logged for the stats).
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { paidUntil: true, coinCents: true } });
  if (member?.paidUntil && member.paidUntil.getTime() > Date.now()) {
    await prisma.download.create({ data: { userId, skinCount, costCents: 0 } });
    return { ok: true, balanceCents: member.coinCents, costCents: 0 };
  }
  if (expectPlan) {
    return { ok: false, reason: "invalid", message: "รายเดือนหมดอายุแล้ว กรุณารีเฟรชหน้าเพื่อดูราคา" };
  }

  const settings = await getSettings();
  const cost = downloadCostCents(skinCount, Boolean(noWatermark), settings);

  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, coinCents: { gte: cost } },
      data: { coinCents: { decrement: cost } },
    });
    if (count === 0) return null;
    await tx.download.create({ data: { userId, skinCount, costCents: cost } });
    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: { coinCents: true } });
  });

  if (!result) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinCents: true } });
    return {
      ok: false,
      reason: "funds",
      message: `คอยน์ไม่พอ ต้องใช้ ${formatCoins(cost)} คอยน์`,
      balanceCents: user?.coinCents ?? 0,
    };
  }
  return { ok: true, balanceCents: result.coinCents, costCents: cost };
}

// --- Top up with a slip -------------------------------------------------------------

export type SlipState = { error?: string; success?: string; pending?: string };

export async function submitSlipAction(_prev: SlipState, formData: FormData): Promise<SlipState> {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "MEMBER") {
    return { error: "กรุณาเข้าสู่ระบบด้วยบัญชีสมาชิกก่อน" };
  }
  const userId = session.user.id;

  if (!rateLimit(`slip:${userId}`, 10, 60 * 60 * 1000)) {
    return { error: "ส่งสลิปบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  const settings = await getSettings();
  if (!parsePromptPayId(settings.promptpayId)) return { error: "ร้านยังไม่ได้ตั้งค่าการรับเงิน กรุณาติดต่อแอดมิน" };

  const amount = z.coerce.number().int().min(settings.minTopup).max(MAX_TOPUP).safeParse(formData.get("amount"));
  if (!amount.success) return { error: `เติมได้ตั้งแต่ ${settings.minTopup} ถึง ${MAX_TOPUP} บาท` };

  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกรูปสลิป" };
  try {
    validateImageFile(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง" };
  }

  const pending = await prisma.payment.findFirst({ where: { userId, status: "PENDING" } });
  if (pending) return { pending: "มีสลิปที่รอแอดมินตรวจสอบอยู่แล้ว ระบบจะเติมคอยน์ให้หลังตรวจเสร็จ" };

  const result = await verifySlip(file, amount.data);
  if (result.kind === "rejected") return { error: result.reason };

  if (result.kind === "verified") {
    // Credit what the slip actually shows (SlipOK already checked it isn't
    // below the requested amount).
    const credited = result.amount;
    try {
      const balance = await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            userId,
            amount: credited,
            status: "APPROVED",
            transRef: result.transRef,
            senderName: result.senderName,
            note: "ตรวจอัตโนมัติ",
            reviewedAt: new Date(),
          },
        });
        const user = await tx.user.update({
          where: { id: userId },
          data: { coinCents: { increment: credited * 100 } },
          select: { coinCents: true },
        });
        return user.coinCents;
      });
      revalidatePath("/account");
      notifyLater([`✅ เติมคอยน์อัตโนมัติ ฿${credited}`, `สมาชิก: ${maskEmail(session.user.email ?? "")}`]);
      return { success: `เติม ${credited} คอยน์สำเร็จ ยอดคงเหลือ ${formatCoins(balance)} คอยน์` };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { error: "สลิปนี้เคยถูกใช้งานแล้ว" };
      }
      throw error;
    }
  }

  // Manual review: keep the slip (privately) so the admin can check it.
  let slipPath: string | null = null;
  try {
    slipPath = await savePrivateSlip(file);
  } catch {
    // Storage not configured / down — still record the claim; the admin can
    // match it against the bank statement by amount and time.
  }

  await prisma.payment.create({
    data: {
      userId,
      amount: amount.data,
      status: "PENDING",
      slipPath,
      note: result.reason + (slipPath ? "" : " (ไม่ได้เก็บรูปสลิป)"),
    },
  });
  revalidatePath("/account");
  revalidatePath("/admin/payments");
  notifyLater(
    [`🧾 สลิปใหม่รอตรวจ ฿${amount.data}`, `สมาชิก: ${maskEmail(session.user.email ?? "")}`, `เหตุผล: ${result.reason}`],
    "/admin/payments"
  );
  return { pending: "ได้รับสลิปแล้ว รอแอดมินตรวจสอบ (ปกติไม่เกิน 1 ชั่วโมง)" };
}

// --- Monthly plan (paid with coins) -------------------------------------------------

export type PlanState = { error?: string; success?: string };

export async function buyPlanAction(_prev: PlanState, _formData: FormData): Promise<PlanState> {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "MEMBER") return { error: "กรุณาเข้าสู่ระบบก่อน" };
  const userId = session.user.id;

  const settings = await getSettings();
  if (settings.planPrice <= 0) return { error: "ร้านยังไม่เปิดแพ็กเกจรายเดือน" };
  const cost = settings.planPrice * 100;

  const until = await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, coinCents: { gte: cost } },
      data: { coinCents: { decrement: cost } },
    });
    if (count === 0) return null;
    // Days stack on top of an active plan, so renewing early loses nothing.
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { paidUntil: true } });
    const base = Math.max(Date.now(), user.paidUntil?.getTime() ?? 0);
    const paidUntil = new Date(base + settings.planDays * DAY_MS);
    await tx.user.update({ where: { id: userId }, data: { paidUntil } });
    return paidUntil;
  });

  if (!until) return { error: `คอยน์ไม่พอ ต้องใช้ ${settings.planPrice} คอยน์ — เติมคอยน์ด้านล่างก่อน` };
  revalidatePath("/account");
  notifyLater([`⭐ สมัครรายเดือน ${settings.planPrice} คอยน์`, `สมาชิก: ${maskEmail(session.user.email ?? "")}`]);
  return {
    success: `สมัครรายเดือนแล้ว ดาวน์โหลดได้ไม่จำกัดถึง ${until.toLocaleDateString("th-TH", { dateStyle: "long" })}`,
  };
}

// --- Admin -----------------------------------------------------------------------

export async function approvePaymentAction(paymentId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    // Only a still-PENDING payment can be approved, so a double click can't
    // credit the coins twice.
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    if (count === 1) {
      await tx.user.update({
        where: { id: payment.userId },
        data: { coinCents: { increment: payment.amount * 100 } },
      });
    }
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/members");
}

export async function rejectPaymentAction(paymentId: string) {
  await requireAdmin();
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });
  revalidatePath("/admin/payments");
}

export type AdminFormState = { error?: string; success?: string };

// Manually add (or with a negative number, remove) coins — e.g. a
// goodwill credit or a payment received another way.
export async function adjustCoinsAction(
  userId: string,
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const coins = z.coerce.number().min(-100_000).max(100_000).safeParse(formData.get("coins"));
  if (!coins.success || coins.data === 0) return { error: "จำนวนคอยน์ไม่ถูกต้อง" };
  const delta = Math.round(coins.data * 100);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinCents: true } });
  if (!user) return { error: "ไม่พบสมาชิก" };
  if (user.coinCents + delta < 0) return { error: "หักเกินยอดคงเหลือไม่ได้" };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { coinCents: { increment: delta } },
    select: { coinCents: true },
  });
  revalidatePath("/admin/members");
  return { success: `ยอดคงเหลือ ${formatCoins(updated.coinCents)} คอยน์` };
}

// Admin types prices in coins (e.g. "0.3"); stored as hundredths.
const coinField = (max: number) =>
  z.coerce
    .number()
    .min(0)
    .max(max)
    .transform((v) => Math.round(v * 100));

const pricingSchema = z.object({
  promptpayId: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || parsePromptPayId(v) !== null, {
      message: "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตร/เลขผู้เสียภาษี 13 หลัก หรือ e-Wallet 15 หลัก",
    }),
  promptpayName: z.string().trim().max(100),
  skinPrice: coinField(1000),
  noWatermark: coinField(10_000),
  signupBonus: coinField(10_000),
  minTopup: z.coerce.number().int().min(1).max(MAX_TOPUP),
  planPrice: z.coerce.number().int().min(0).max(100_000),
  planDays: z.coerce.number().int().min(1).max(3650),
});

export async function updatePricingAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = pricingSchema.safeParse({
    promptpayId: formData.get("promptpayId"),
    promptpayName: formData.get("promptpayName"),
    skinPrice: formData.get("skinPrice"),
    noWatermark: formData.get("noWatermark"),
    signupBonus: formData.get("signupBonus"),
    minTopup: formData.get("minTopup"),
    planPrice: formData.get("planPrice"),
    planDays: formData.get("planDays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const data = {
    promptpayId: parsed.data.promptpayId,
    promptpayName: parsed.data.promptpayName,
    skinPriceCents: parsed.data.skinPrice,
    noWatermarkCents: parsed.data.noWatermark,
    signupBonusCents: parsed.data.signupBonus,
    minTopup: parsed.data.minTopup,
    planPrice: parsed.data.planPrice,
    planDays: parsed.data.planDays,
  };
  await prisma.settings.upsert({ where: { id: SETTINGS_ID }, update: data, create: { id: SETTINGS_ID, ...data } });
  revalidatePath("/", "layout");
  return { success: "บันทึกแล้ว" };
}
