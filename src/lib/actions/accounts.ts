"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { randomSlugSuffix, slugify } from "@/lib/format";
import { saveUploadedImage } from "@/lib/uploads";
import { ACCOUNT_STATUSES, LOGIN_TYPES } from "@/lib/types";

const emptyToNull = (value: unknown) => (value === "" ? null : value);

const accountSchema = z.object({
  title: z.string().trim().min(4, "ชื่อสินค้าอย่างน้อย 4 ตัวอักษร").max(150),
  description: z.string().trim().min(10, "คำอธิบายอย่างน้อย 10 ตัวอักษร").max(3000),
  price: z.coerce.number().int().positive().max(10_000_000),
  // Explicitly nullable (not optional): an empty field must clear an
  // existing discount on update, not leave the previous value untouched.
  discountPrice: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().max(10_000_000).nullable()
  ),
  rank: z.string().trim().min(1).max(50),
  maxRank: z.string().trim().min(1).max(50),
  server: z.string().trim().min(1).max(20),
  loginType: z.enum(LOGIN_TYPES),
  heroCount: z.coerce.number().int().min(0).max(300),
  skinCount: z.coerce.number().int().min(0).max(1000),
  rareSkins: z.string().trim().max(1000).optional(),
  diamondBalance: z.coerce.number().int().min(0).max(1_000_000),
  coinBalance: z.coerce.number().int().min(0).max(10_000_000),
  status: z.enum(ACCOUNT_STATUSES),
  credentialUsername: z.string().trim().max(200).optional(),
  credentialPassword: z.string().trim().max(200).optional(),
  credentialNote: z.string().trim().max(1000).optional(),
});

export type AccountFormState = {
  error?: string;
  success?: boolean;
};

function parseAccountForm(formData: FormData) {
  return accountSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    discountPrice: formData.get("discountPrice"),
    rank: formData.get("rank"),
    maxRank: formData.get("maxRank"),
    server: formData.get("server"),
    loginType: formData.get("loginType"),
    heroCount: formData.get("heroCount"),
    skinCount: formData.get("skinCount"),
    rareSkins: formData.get("rareSkins"),
    diamondBalance: formData.get("diamondBalance"),
    coinBalance: formData.get("coinBalance"),
    status: formData.get("status"),
    credentialUsername: formData.get("credentialUsername"),
    credentialPassword: formData.get("credentialPassword"),
    credentialNote: formData.get("credentialNote"),
  });
}

export async function createAccountAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  await requireAdmin();

  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let imageUrls: string[] = [];
  try {
    imageUrls = await Promise.all(imageFiles.map((file) => saveUploadedImage(file)));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  const slug = `${slugify(parsed.data.title) || "id-rov"}-${randomSlugSuffix()}`;

  const account = await prisma.gameAccount.create({
    data: {
      ...parsed.data,
      slug,
      rareSkins: parsed.data.rareSkins || "-",
      images: { create: imageUrls.map((url, position) => ({ url, position })) },
    },
  });

  revalidatePath("/admin/accounts");
  revalidatePath("/accounts");
  redirect(`/admin/accounts/${account.id}/edit`);
}

export async function updateAccountAction(
  accountId: string,
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  await requireAdmin();

  const parsed = parseAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let imageUrls: string[] = [];
  try {
    imageUrls = await Promise.all(imageFiles.map((file) => saveUploadedImage(file)));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" };
  }

  const removeImageIds = formData
    .getAll("removeImageIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  await prisma.$transaction(async (tx) => {
    await tx.gameAccount.update({
      where: { id: accountId },
      data: {
        ...parsed.data,
        rareSkins: parsed.data.rareSkins || "-",
      },
    });

    if (removeImageIds.length > 0) {
      await tx.accountImage.deleteMany({
        where: { id: { in: removeImageIds }, accountId },
      });
    }

    if (imageUrls.length > 0) {
      const existingCount = await tx.accountImage.count({ where: { accountId } });
      await tx.accountImage.createMany({
        data: imageUrls.map((url, index) => ({
          url,
          accountId,
          position: existingCount + index,
        })),
      });
    }
  });

  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${accountId}/edit`);
  revalidatePath("/accounts");

  return { success: true };
}

export async function deleteAccountAction(accountId: string) {
  await requireAdmin();

  const orderCount = await prisma.order.count({ where: { accountId } });
  if (orderCount > 0) {
    throw new Error("ไม่สามารถลบไอดีที่มีประวัติคำสั่งซื้อแล้วได้ กรุณาเปลี่ยนสถานะเป็นขายแล้วแทน");
  }

  await prisma.gameAccount.delete({ where: { id: accountId } });

  revalidatePath("/admin/accounts");
  revalidatePath("/accounts");
}
