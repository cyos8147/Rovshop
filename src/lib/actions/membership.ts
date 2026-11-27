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
import { extendMembership } from "@/lib/membership";
import { verifySlip } from "@/lib/slip";
import { savePrivateSlip, validateImageFile } from "@/lib/uploads";
import { parsePromptPayId } from "@/lib/promptpay";

const DAY_MS = 24 * 60 * 60 * 1000;
// Marks a browser that already started a free trial, so creating a second
// account from the same device doesn't hand out another one. Easy to clear,
// but it stops the casual "just sign up again" loop.
const TRIAL_COOKIE = "oscar_trial_used";

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

export type RegisterState = { error?: string; ok?: boolean; trialGranted?: boolean };

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
  const trialGranted = !cookieStore.get(TRIAL_COOKIE);
  const { trialDays } = await getSettings();

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.email.split("@")[0],
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "MEMBER",
        trialEndsAt: trialGranted ? new Date(Date.now() + trialDays * DAY_MS) : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "อีเมลนี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ" };
    }
    throw error;
  }

  cookieStore.set(TRIAL_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });

  return { ok: true, trialGranted };
}

// --- Pay with a slip -------------------------------------------------------------

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

  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกรูปสลิป" };
  try {
    validateImageFile(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง" };
  }

  const pending = await prisma.payment.findFirst({ where: { userId, status: "PENDING" } });
  if (pending) return { pending: "มีสลิปที่รอแอดมินตรวจสอบอยู่แล้ว ระบบจะเปิดใช้งานให้หลังตรวจเสร็จ" };

  const settings = await getSettings();
  if (!parsePromptPayId(settings.promptpayId)) return { error: "ร้านยังไม่ได้ตั้งค่าการรับเงิน กรุณาติดต่อแอดมิน" };

  const result = await verifySlip(file, settings.planPrice);

  if (result.kind === "rejected") return { error: result.reason };

  if (result.kind === "verified") {
    try {
      const paidUntil = await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            userId,
            amount: result.amount,
            days: settings.planDays,
            status: "APPROVED",
            transRef: result.transRef,
            senderName: result.senderName,
            note: "ตรวจอัตโนมัติ",
            reviewedAt: new Date(),
          },
        });
        return extendMembership(tx, userId, settings.planDays);
      });
      revalidatePath("/account");
      return {
        success: `ชำระเงินสำเร็จ ใช้งานได้ถึง ${paidUntil.toLocaleDateString("th-TH", { dateStyle: "long" })}`,
      };
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
      amount: settings.planPrice,
      days: settings.planDays,
      status: "PENDING",
      slipPath,
      note: result.reason + (slipPath ? "" : " (ไม่ได้เก็บรูปสลิป)"),
    },
  });
  revalidatePath("/account");
  revalidatePath("/admin/payments");
  return { pending: "ได้รับสลิปแล้ว รอแอดมินตรวจสอบ (ปกติไม่เกิน 1 ชั่วโมง)" };
}

// --- Admin -----------------------------------------------------------------------

export async function approvePaymentAction(paymentId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    // Only a still-PENDING payment can be approved, so a double click can't
    // extend the membership twice.
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    if (count === 1) await extendMembership(tx, payment.userId, payment.days);
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

export async function extendMemberAction(
  userId: string,
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const days = z.coerce.number().int().min(1).max(3650).safeParse(formData.get("days"));
  if (!days.success) return { error: "จำนวนวันไม่ถูกต้อง" };

  const until = await prisma.$transaction((tx) => extendMembership(tx, userId, days.data));
  revalidatePath("/admin/members");
  return { success: `ใช้งานได้ถึง ${until.toLocaleDateString("th-TH", { dateStyle: "medium" })}` };
}

const planSchema = z.object({
  promptpayId: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || parsePromptPayId(v) !== null, {
      message: "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตร/เลขผู้เสียภาษี 13 หลัก หรือ e-Wallet 15 หลัก",
    }),
  promptpayName: z.string().trim().max(100),
  planPrice: z.coerce.number().int().min(1).max(100_000),
  planDays: z.coerce.number().int().min(1).max(3650),
  trialDays: z.coerce.number().int().min(0).max(365),
});

export async function updatePlanSettingsAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = planSchema.safeParse({
    promptpayId: formData.get("promptpayId"),
    promptpayName: formData.get("promptpayName"),
    planPrice: formData.get("planPrice"),
    planDays: formData.get("planDays"),
    trialDays: formData.get("trialDays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: parsed.data,
    create: { id: SETTINGS_ID, ...parsed.data },
  });
  revalidatePath("/", "layout");
  return { success: "บันทึกแล้ว" };
}
