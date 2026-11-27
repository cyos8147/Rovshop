import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type Wallet =
  | { state: "guest"; balanceCents: 0 }
  | { state: "member"; balanceCents: number; email: string }
  | { state: "admin"; balanceCents: 0; email: string };

// Read from the database (not the JWT) so a top-up approved a moment ago
// shows without logging out and back in.
export async function getWallet(): Promise<Wallet> {
  const session = await getSession();
  if (!session?.user?.id) return { state: "guest", balanceCents: 0 };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true, coinCents: true },
  });
  if (!user) return { state: "guest", balanceCents: 0 };
  if (user.role === "ADMIN") return { state: "admin", balanceCents: 0, email: user.email };
  return { state: "member", balanceCents: user.coinCents, email: user.email };
}
