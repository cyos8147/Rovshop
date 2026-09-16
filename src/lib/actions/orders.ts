"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/format";
import { saveUploadedImage } from "@/lib/uploads";
import { PAYMENT_METHODS } from "@/lib/types";

const checkoutSchema = z.object({
  accountIds: z.array(z.string().min(1)).min(1, "ตะกร้าว่างเปล่า"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  buyerNote: z.string().max(500).optional(),
});

export type CheckoutInput = {
  accountIds: string[];
  paymentMethod: string;
  buyerNote?: string;
};

export type CheckoutState = {
  error?: string;
  batchId?: string;
};

export async function checkoutAction(input: CheckoutInput): Promise<CheckoutState> {
  const user = await requireUser();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { accountIds, paymentMethod, buyerNote } = parsed.data;
  const uniqueAccountIds = Array.from(new Set(accountIds));
  const batchId = randomUUID();

  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.gameAccount.findMany({
        where: { id: { in: uniqueAccountIds } },
      });

      if (accounts.length !== uniqueAccountIds.length) {
        throw new Error("มีสินค้าบางรายการไม่พบในระบบ กรุณารีเฟรชตะกร้า");
      }
      const unavailable = accounts.find((a) => a.status !== "AVAILABLE");
      if (unavailable) {
        throw new Error(`สินค้า "${unavailable.title}" ถูกจองหรือขายไปแล้ว กรุณาลบออกจากตะกร้า`);
      }

      for (const account of accounts) {
        const price = account.discountPrice ?? account.price;
        await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            batchId,
            userId: user.id,
            accountId: account.id,
            price,
            paymentMethod,
            paymentStatus: "PENDING",
            deliveryStatus: "WAITING",
            buyerNote: buyerNote || null,
          },
        });
        await tx.gameAccount.update({
          where: { id: account.id },
          data: { status: "RESERVED" },
        });
      }
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ไม่สามารถทำรายการได้" };
  }

  revalidatePath("/accounts");
  revalidatePath("/admin/orders");

  return { batchId };
}

export type SlipUploadState = {
  error?: string;
  success?: boolean;
};

export async function uploadSlipAction(
  _prevState: SlipUploadState,
  formData: FormData
): Promise<SlipUploadState> {
  const user = await requireUser();

  const batchId = formData.get("batchId");
  const file = formData.get("slip");

  if (typeof batchId !== "string" || !batchId) {
    return { error: "ไม่พบคำสั่งซื้อ" };
  }
  if (!(file instanceof File)) {
    return { error: "กรุณาแนบไฟล์สลิป" };
  }

  const orders = await prisma.order.findMany({ where: { batchId } });
  if (orders.length === 0) {
    return { error: "ไม่พบคำสั่งซื้อ" };
  }
  if (orders.some((order) => order.userId !== user.id)) {
    return { error: "ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้" };
  }

  let url: string;
  try {
    url = await saveUploadedImage(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ" };
  }

  await prisma.order.updateMany({
    where: { batchId },
    data: { slipUrl: url, paymentStatus: "AWAITING_VERIFICATION" },
  });

  revalidatePath(`/orders/${orders[0].orderNumber}`);
  revalidatePath("/admin/orders");

  return { success: true };
}

export async function markOrderPaidAction(orderId: string) {
  await requireAdmin();
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID" },
  });
  await prisma.gameAccount.update({
    where: { id: order.accountId },
    data: { status: "SOLD" },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${order.orderNumber}`);
}

export async function markOrderDeliveredAction(orderId: string) {
  await requireAdmin();
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus: "DELIVERED" },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${order.orderNumber}`);
}

export async function cancelOrderAction(orderId: string) {
  await requireAdmin();
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "CANCELLED" },
  });
  const account = await prisma.gameAccount.findUnique({ where: { id: order.accountId } });
  if (account?.status === "RESERVED") {
    await prisma.gameAccount.update({
      where: { id: order.accountId },
      data: { status: "AVAILABLE" },
    });
  }
  revalidatePath("/admin/orders");
  revalidatePath("/accounts");
  revalidatePath(`/orders/${order.orderNumber}`);
}
