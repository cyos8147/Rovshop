import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// What the banner tool may do for the current visitor.
//  - guest:   not logged in — can build and preview (watermarked) only
//  - trial:   free trial running — full access
//  - paid:    paid plan running — full access
//  - expired: trial/plan over — preview only until they pay
//  - admin:   shop admin — always full access
export type AccessState = "guest" | "trial" | "paid" | "expired" | "admin";

export type Access = {
  state: AccessState;
  // ISO date the current trial/plan ends (trial / paid / expired states).
  until: string | null;
  email: string | null;
};

export function hasFullAccess(state: AccessState) {
  return state === "trial" || state === "paid" || state === "admin";
}

export function accessFor(user: {
  role: string;
  email: string;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
}): Access {
  if (user.role === "ADMIN") return { state: "admin", until: null, email: user.email };

  const now = Date.now();
  const paid = user.paidUntil?.getTime() ?? 0;
  const trial = user.trialEndsAt?.getTime() ?? 0;

  if (paid > now) return { state: "paid", until: user.paidUntil!.toISOString(), email: user.email };
  if (trial > now) return { state: "trial", until: user.trialEndsAt!.toISOString(), email: user.email };

  const lastEnd = Math.max(paid, trial);
  return { state: "expired", until: lastEnd ? new Date(lastEnd).toISOString() : null, email: user.email };
}

// Always read from the database (not the JWT) so a payment approved a
// moment ago takes effect without logging out and back in.
export async function getCurrentAccess(): Promise<Access> {
  const session = await getSession();
  if (!session?.user?.id) return { state: "guest", until: null, email: null };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true, trialEndsAt: true, paidUntil: true },
  });
  if (!user) return { state: "guest", until: null, email: null };
  return accessFor(user);
}

// Adds `days` of paid access. Days stack on top of whatever access is
// still left (unused trial included), so paying early never loses time.
export async function extendMembership(tx: Prisma.TransactionClient, userId: string, days: number) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { trialEndsAt: true, paidUntil: true },
  });
  const base = Math.max(Date.now(), user.paidUntil?.getTime() ?? 0, user.trialEndsAt?.getTime() ?? 0);
  const paidUntil = new Date(base + days * 24 * 60 * 60 * 1000);
  await tx.user.update({ where: { id: userId }, data: { paidUntil } });
  return paidUntil;
}

export function daysLeft(untilIso: string | null) {
  if (!untilIso) return 0;
  return Math.max(0, Math.ceil((new Date(untilIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
