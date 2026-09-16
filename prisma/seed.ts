import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function img(text: string, hue: number) {
  const q = new URLSearchParams({ text, hue: String(hue), w: "900", h: "560" });
  return `/api/placeholder?${q.toString()}`;
}

function shots(title: string, hue: number) {
  return [
    { url: img(`${title} · โปรไฟล์`, hue), position: 0 },
    { url: img(`${title} · คลังฮีโร่`, (hue + 40) % 360), position: 1 },
    { url: img(`${title} · คลังสกิน`, (hue + 80) % 360), position: 2 },
  ];
}

const accountSeeds = [
  {
    slug: "rov-master-rare-01",
    title: "ไอดีแรงค์มาสเตอร์ สกินหายาก 12 ตัว",
    description:
      "ไอดีแรงค์มาสเตอร์ซีซั่นล่าสุด สกินหายากครบชุด S-Class และ Vermillion เหมาะสำหรับสายเก็บสกิน บัญชีผูก Facebook ยืนยันตัวตนเรียบร้อย ไม่มีประวัติแบน",
    price: 3500,
    discountPrice: 3190,
    rank: "มาสเตอร์",
    maxRank: "เซียน",
    server: "TH",
    loginType: "FACEBOOK",
    heroCount: 95,
    skinCount: 140,
    rareSkins: "Valhein Vermillion Gloom, Airi Shadowblade, Zephys S-Class",
    diamondBalance: 2500,
    coinBalance: 15000,
    status: "AVAILABLE",
    hue: 265,
  },
  {
    slug: "rov-legend-full-hero",
    title: "ไอดีเซียน ครบฮีโร่ทั้งเซิร์ฟเวอร์",
    description:
      "ไอดีระดับเซียน (Grand Master) ปลดฮีโร่ครบทุกตัว สกินระดับ Epic/Legendary กว่า 200 ชิ้น เหมาะกับสายแข่งแรงค์และสตรีมเมอร์ บัญชีผูก Google พร้อมโอนย้าย",
    price: 6900,
    discountPrice: null,
    rank: "เซียน",
    maxRank: "เซียน",
    server: "TH",
    loginType: "GOOGLE",
    heroCount: 108,
    skinCount: 210,
    rareSkins: "Liliana Pool Party, Yena Star Guardian, Keera Dawnbreaker, Thane S-Class",
    diamondBalance: 8000,
    coinBalance: 42000,
    status: "AVAILABLE",
    hue: 300,
  },
  {
    slug: "rov-diamond-starter",
    title: "ไอดีเพชร เริ่มต้นสายฟาร์มแรงค์",
    description:
      "ไอดีแรงค์เพชร เหมาะสำหรับมือใหม่ที่อยากเริ่มไต่แรงค์จากจุดที่ดี ฮีโร่พื้นฐานครบสายหลัก ราคาคุ้มค่า บัญชีแบบ Guest ล็อกอินง่าย",
    price: 990,
    discountPrice: null,
    rank: "เพชร",
    maxRank: "แพลทินัม",
    server: "TH",
    loginType: "GUEST",
    heroCount: 40,
    skinCount: 25,
    rareSkins: "Violet Star Guardian",
    diamondBalance: 400,
    coinBalance: 6000,
    status: "AVAILABLE",
    hue: 190,
  },
  {
    slug: "rov-gold-budget",
    title: "ไอดีทอง งบประหยัด เล่นสนุกได้ทุกวัน",
    description:
      "ไอดีแรงค์ทอง เหมาะสำหรับผู้เริ่มเล่นหรือซื้อไว้เล่นกับเพื่อน ฮีโร่จำนวนหนึ่งพร้อมสกินพื้นฐาน ราคาย่อมเยา",
    price: 390,
    discountPrice: null,
    rank: "ทอง",
    maxRank: "ทอง",
    server: "TH",
    loginType: "GUEST",
    heroCount: 25,
    skinCount: 8,
    rareSkins: "-",
    diamondBalance: 100,
    coinBalance: 2500,
    status: "AVAILABLE",
    hue: 45,
  },
  {
    slug: "rov-platinum-collector",
    title: "ไอดีแพลทินัม คอลเลกชันสกินพิเศษ",
    description:
      "ไอดีแรงค์แพลทินัม เน้นสกินคอลเลกชันลิมิเต็ดจากอีเวนต์ต่างๆ ครบทุกซีซั่นที่ผ่านมา เหมาะกับสายสะสม บัญชีผูก LINE",
    price: 2200,
    discountPrice: 1990,
    rank: "แพลทินัม",
    maxRank: "เพชร",
    server: "TH",
    loginType: "LINE",
    heroCount: 60,
    skinCount: 70,
    rareSkins: "Airi Nightfall Doll, Valhein Undying Phoenix",
    diamondBalance: 1200,
    coinBalance: 9000,
    status: "RESERVED",
    hue: 210,
  },
  {
    slug: "rov-master-rookie",
    title: "ไอดีมาสเตอร์ มือใหม่หัดไต่แรงค์",
    description:
      "ไอดีแรงค์มาสเตอร์ราคาเข้าถึงง่าย เหมาะกับผู้ที่อยากลองไต่แรงค์สูงโดยไม่ต้องเริ่มจากศูนย์ ฮีโร่สายหลักครบ",
    price: 1500,
    discountPrice: null,
    rank: "มาสเตอร์",
    maxRank: "มาสเตอร์",
    server: "TH",
    loginType: "FACEBOOK",
    heroCount: 50,
    skinCount: 30,
    rareSkins: "Zephys Guardian of Light",
    diamondBalance: 600,
    coinBalance: 5000,
    status: "AVAILABLE",
    hue: 15,
  },
  {
    slug: "rov-sea-top-rank",
    title: "ไอดีเซียน ท็อปแรงค์เซิร์ฟเวอร์ SEA",
    description:
      "ไอดีระดับเซียนบนเซิร์ฟเวอร์ SEA ฮีโร่และสกินครบเกือบทั้งหมด เหมาะสำหรับผู้เล่นที่ต้องการแข่งขันในเซิร์ฟเวอร์ต่างประเทศ",
    price: 8900,
    discountPrice: 7990,
    rank: "เซียน",
    maxRank: "เซียน",
    server: "SEA",
    loginType: "GOOGLE",
    heroCount: 100,
    skinCount: 180,
    rareSkins: "Keera S-Class, Liliana Star Guardian, Thane Vermillion",
    diamondBalance: 5000,
    coinBalance: 30000,
    status: "AVAILABLE",
    hue: 330,
  },
  {
    slug: "rov-silver-trial",
    title: "ไอดีเงิน ราคาเบาๆ ลองมือ",
    description:
      "ไอดีแรงค์เงิน ราคาย่อมเยาสำหรับทดลองเล่น เหมาะกับผู้เริ่มต้นที่อยากมีไอดีสำรอง",
    price: 190,
    discountPrice: null,
    rank: "เงิน",
    maxRank: "เงิน",
    server: "TH",
    loginType: "GUEST",
    heroCount: 15,
    skinCount: 3,
    rareSkins: "-",
    diamondBalance: 0,
    coinBalance: 800,
    status: "SOLD",
    hue: 120,
  },
  {
    slug: "rov-diamond-limited",
    title: "ไอดีเพชร สกิน Limited ครบซีซั่น",
    description:
      "ไอดีแรงค์เพชร รวมสกิน Limited จากอีเวนต์เกือบครบทุกซีซั่นย้อนหลัง เหมาะกับสายสะสมงบกลางๆ",
    price: 3200,
    discountPrice: null,
    rank: "เพชร",
    maxRank: "เพชร",
    server: "TH",
    loginType: "FACEBOOK",
    heroCount: 70,
    skinCount: 95,
    rareSkins: "Yena Dawnbreaker, Violet Winter Sonata",
    diamondBalance: 1800,
    coinBalance: 11000,
    status: "AVAILABLE",
    hue: 250,
  },
] as const;

const testimonialSeeds = [
  { name: "โบ๊ท", rating: 5, comment: "ได้ไอดีตรงตามที่แจ้งทุกอย่าง แอดมินส่งไวมาก ประทับใจครับ" },
  { name: "มายด์", rating: 5, comment: "ซื้อไอดีมาสเตอร์มา สกินครบตามรูปเป๊ะ ร้านนี้ไว้ใจได้" },
  { name: "ปลื้ม", rating: 4, comment: "บริการดี ตอบแชทไว แต่รอตรวจสลิปนานนิดนึงช่วงดึก" },
  { name: "ต้นหอม", rating: 5, comment: "ซื้อไอดีราคาประหยัดไปลองเล่น คุ้มค่ามากครับ แนะนำเลย" },
  { name: "แนน", rating: 5, comment: "แอดมินใจดี ให้คำแนะนำการเปลี่ยนรหัสผ่านหลังรับไอดีอย่างละเอียด" },
] as const;

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

  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@example.com" },
    update: {},
    create: {
      name: "สมชาย ใจดี",
      email: "customer1@example.com",
      phone: "0891234567",
      passwordHash: await bcrypt.hash("Customer1234!", 10),
      role: "CUSTOMER",
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "customer2@example.com" },
    update: {},
    create: {
      name: "สมหญิง รักเกม",
      email: "customer2@example.com",
      phone: "0899876543",
      passwordHash: await bcrypt.hash("Customer1234!", 10),
      role: "CUSTOMER",
    },
  });

  console.log(`Seeded users: admin=${admin.email}, customers=${customer1.email}, ${customer2.email}`);

  const createdAccounts: Record<string, string> = {};

  for (const seed of accountSeeds) {
    const { hue, ...data } = seed;
    const account = await prisma.gameAccount.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        ...data,
        credentialUsername: `rovshop_${seed.slug}@example.com`,
        credentialPassword: "DemoPass!2026",
        credentialNote:
          "กรุณาเปลี่ยนรหัสผ่านและผูกบัญชี Facebook/Google ของคุณเองทันทีหลังได้รับไอดี",
        images: { create: shots(seed.title, hue) },
      },
    });
    createdAccounts[seed.slug] = account.id;
  }

  console.log(`Seeded ${accountSeeds.length} game accounts`);

  const soldAccountId = createdAccounts["rov-silver-trial"];
  const reservedAccountId = createdAccounts["rov-platinum-collector"];

  await prisma.order.upsert({
    where: { orderNumber: "RS20260201-DEMO01" },
    update: {},
    create: {
      orderNumber: "RS20260201-DEMO01",
      batchId: "RS20260201-DEMO01",
      userId: customer1.id,
      accountId: soldAccountId,
      price: 190,
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      deliveryStatus: "DELIVERED",
      buyerNote: "รบกวนส่งไอดีทางอีเมลครับ",
    },
  });

  await prisma.order.upsert({
    where: { orderNumber: "RS20260305-DEMO02" },
    update: {},
    create: {
      orderNumber: "RS20260305-DEMO02",
      batchId: "RS20260305-DEMO02",
      userId: customer2.id,
      accountId: reservedAccountId,
      price: 1990,
      paymentMethod: "PROMPTPAY",
      paymentStatus: "AWAITING_VERIFICATION",
      deliveryStatus: "WAITING",
      buyerNote: "โอนแล้วแนบสลิปในระบบเรียบร้อยครับ รบกวนตรวจสอบด้วยครับ",
    },
  });

  console.log("Seeded 2 demo orders");

  for (const testimonial of testimonialSeeds) {
    const existing = await prisma.testimonial.findFirst({
      where: { name: testimonial.name, comment: testimonial.comment },
    });
    if (!existing) {
      await prisma.testimonial.create({ data: testimonial });
    }
  }

  console.log(`Seeded ${testimonialSeeds.length} testimonials`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
