// Creates the admin account (and the settings row) if they don't exist yet.
// Safe to run on every deploy: an existing admin is left untouched, so a
// password changed later at /password is never overwritten.
//
// Runs in Render's build step (see README), so no local computer or server
// shell is needed to get the first admin login. Unlike prisma/seed.ts it
// adds no sample data.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  await prisma.settings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });

  if (!email || !password) {
    console.warn("ensure-admin: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin creation.");
    return;
  }
  // The README's sample password is public; refuse it on a real deploy.
  if (password === "Admin1234!" || password.length < 10) {
    console.warn("ensure-admin: SEED_ADMIN_PASSWORD is the public sample or shorter than 10 characters — skipping.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ensure-admin: ${email} already exists — left unchanged.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: "ผู้ดูแลระบบ",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });
  console.log(`ensure-admin: created admin ${email}`);
}

main()
  .catch((error) => {
    // Never fail the deploy over this; log and carry on.
    console.error("ensure-admin failed:", error);
  })
  .finally(() => prisma.$disconnect());
