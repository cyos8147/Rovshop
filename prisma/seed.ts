import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const heroSeeds: { name: string; role: string; skins: [string, string][] }[] = [
  { name: "Airi", role: "ASSASSIN", skins: [["Shadowblade", "SS"], ["Kimono", "A"], ["Summer Breeze", "S"]] },
  { name: "Florentino", role: "FIGHTER", skins: [["Dimension Breaker", "SSS"], ["Lunar Night", "S_PLUS"], ["Default Plus", "NORMAL"]] },
  { name: "Liliana", role: "MAGE", skins: [["Pool Party", "S"], ["Star Guardian", "S_PLUS"], ["Moon Festival", "LIMITED"]] },
  { name: "Murad", role: "ASSASSIN", skins: [["Time Traveller", "SS"], ["Esports Edition", "S_PLUS"], ["Street Style", "A"]] },
  { name: "Nakroth", role: "ASSASSIN", skins: [["Lightning Lord", "SSS"], ["Ice Lancer", "S"], ["Academy", "A"]] },
  { name: "Thane", role: "TANK", skins: [["S-Class", "SS"], ["Iron Guard", "A"]] },
  { name: "Tulen", role: "MAGE", skins: [["Storm Emperor", "SS"], ["Chronicle", "S"], ["School Days", "NORMAL"]] },
  { name: "Valhein", role: "CARRY", skins: [["Vermillion Gloom", "SS"], ["Monster Hunter", "S"], ["Holiday", "A"]] },
  { name: "Violet", role: "CARRY", skins: [["Star Guardian", "S_PLUS"], ["Cyber Agent", "S"], ["New Year", "LIMITED"]] },
  { name: "Yena", role: "FIGHTER", skins: [["Star Guardian", "S_PLUS"], ["Dragon Princess", "SS"]] },
  { name: "Zephys", role: "FIGHTER", skins: [["S-Class", "SS"], ["Dark Knight", "S"], ["Lunar Year", "LIMITED"]] },
  { name: "Krizzix", role: "SUPPORT", skins: [["Galaxy Explorer", "S"], ["Snow Day", "A"]] },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@rovshop.dev";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "ผู้ดูแลระบบ",
      email: adminEmail,
      phone: "0810000000",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);

  await prisma.settings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      contactUrl: "https://www.facebook.com/your-facebook-profile",
    },
  });

  console.log("Seeded settings (แก้ไขลิงก์ Facebook จริงได้ที่หน้า /admin/settings)");

  for (const heroSeed of heroSeeds) {
    const hero = await prisma.hero.upsert({
      where: { name: heroSeed.name },
      update: {},
      create: { name: heroSeed.name, role: heroSeed.role },
    });
    await prisma.skin.createMany({
      data: heroSeed.skins.map(([name, tier]) => ({ name, tier, heroId: hero.id })),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded ${heroSeeds.length} heroes for the skin sorter`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
