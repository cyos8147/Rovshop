import { prisma } from "@/lib/prisma";

// Health check for Render and for the keep-awake pinger (e.g. cron-job.org
// every 10 minutes). It runs a trivial query so the database connection is
// exercised too — which also keeps a free Supabase project from pausing
// for inactivity.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
