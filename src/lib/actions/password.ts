"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type PasswordState = { error?: string; success?: string };

const schema = z
  .object({
    current: z.string().min(1, "กรุณาใส่รหัสผ่านปัจจุบัน"),
    next: z.string().min(8, "รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม", path: ["next"] });

// Works for admins and members alike. Requires the current password, so a
// session left open on someone else's device can't be used to take over
// the account.
export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  if (!rateLimit(`password:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return { error: "ลองบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" };
  }

  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });
  return { success: "เปลี่ยนรหัสผ่านเรียบร้อย ครั้งหน้าใช้รหัสใหม่เข้าสู่ระบบ" };
}
