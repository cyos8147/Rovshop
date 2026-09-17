# RoVShop

เว็บไซต์แสดงรายการไอดีเกม RoV (Arena of Valor) แบบเรียบง่าย สร้างด้วย Next.js (App Router) — ลูกค้าเข้ามาดูสเปกไอดี ถูกใจก็กดปุ่มแชทไปคุยกับแอดมินทาง Facebook เพื่อตกลงราคา ชำระเงิน และรับไอดีกันเองโดยตรง ไม่ต้องสมัครสมาชิกหรือกรอกข้อมูลใดๆ บนเว็บ

ฝั่งแอดมินมีแผงควบคุมสำหรับเพิ่ม/แก้ไข/ลบไอดี และแก้ลิงก์ Facebook ที่ใช้รับแชทได้เอง โดยไม่ต้องแตะโค้ดเลย

## ฟีเจอร์หลัก

**ฝั่งลูกค้า** (ไม่ต้องล็อกอิน)
- หน้าแรกพร้อมไอดีแนะนำและรีวิวลูกค้า
- หน้ารวมไอดีพร้อมค้นหา/กรอง (แรงค์ เซิร์ฟเวอร์ ประเภทล็อกอิน ช่วงราคา) และเรียงลำดับ
- หน้ารายละเอียดไอดี พร้อมแกลเลอรีรูปภาพและสเปกครบ
- ปุ่ม "แชทกับแอดมินเพื่อสั่งซื้อ" เด้งไปเปิดแชท Facebook กับแอดมินทันที

**ฝั่งแอดมิน** (`/admin`, ต้องเข้าสู่ระบบ)
- แดชบอร์ดสรุปจำนวนไอดีและมูลค่าไอดีที่ขายแล้ว
- จัดการไอดี: เพิ่ม/แก้ไข/ลบ อัปโหลดรูปหลายรูป ตั้งราคา/ส่วนลด/สถานะ (พร้อมขาย/ถูกจอง/ขายแล้ว) และข้อมูลบัญชีสำหรับจดไว้ใช้เอง (ไม่แสดงบนเว็บ)
- ตั้งค่าร้าน: แก้ลิงก์ Facebook ที่ใช้เป็นปุ่มแชทได้เองจากหน้าเว็บ ไม่ต้องแก้โค้ด

## เทคโนโลยีที่ใช้

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions, TypeScript)
- [TailwindCSS](https://tailwindcss.com/) สำหรับธีมเกมมิ่งโทนเข้ม
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL (แนะนำ [Supabase](https://supabase.com/)) สำหรับฐานข้อมูล
- [Supabase Storage](https://supabase.com/storage) สำหรับเก็บรูปไอดีที่อัปโหลด
- [NextAuth.js](https://next-auth.js.org/) (Credentials provider, JWT session) สำหรับล็อกอินแอดมิน
- [Zod](https://zod.dev/) สำหรับ validate ข้อมูลทุกฟอร์ม

## เริ่มต้นใช้งาน (พัฒนาในเครื่อง)

### สิ่งที่ต้องมี

- Node.js 20.9 ขึ้นไป (แนะนำ 22)
- ฐานข้อมูล PostgreSQL สักตัว — ใช้โปรเจกต์ Supabase (ดูหัวข้อ Deploy ด้านล่าง) หรือรัน Postgres ในเครื่องผ่าน Docker ก็ได้:
  ```bash
  docker run --name rovshop-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
  ```

### ติดตั้ง

```bash
npm install
cp .env.example .env   # ใส่ DATABASE_URL/DIRECT_URL และค่าอื่นๆ ให้ครบ
```

สร้างตารางในฐานข้อมูลและใส่ข้อมูลตัวอย่าง:

```bash
npx prisma migrate deploy   # หรือ npm run prisma:migrate ถ้ากำลังแก้ schema ระหว่างพัฒนา
npm run prisma:seed
```

รันเซิร์ฟเวอร์สำหรับพัฒนา:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

> การอัปโหลดรูปภาพต้องตั้งค่า Supabase Storage ไว้ด้วย (ดูหัวข้อ Deploy) ไม่งั้นการอัปโหลดรูปจะ error แม้ในเครื่อง

### เริ่มใช้งานจริง (สำหรับแอดมิน)

1. เข้าสู่ระบบที่ `/login` ด้วยบัญชีแอดมิน (ดูด้านล่าง)
2. ไปที่เมนู **ตั้งค่าร้าน** แล้ววางลิงก์โปรไฟล์/เพจ Facebook ของคุณ — ปุ่ม "แชทกับแอดมินเพื่อสั่งซื้อ" ทุกหน้าจะใช้ลิงก์นี้ทันที
3. ไปที่เมนู **จัดการไอดี** เพื่อเพิ่มไอดีที่จะขายจริง พร้อมอัปโหลดรูปภาพ

### บัญชีแอดมินทดสอบ (จากข้อมูลตัวอย่าง)

| อีเมล | รหัสผ่าน |
| --- | --- |
| `admin@rovshop.dev` | `Admin1234!` |

ตั้งค่าอีเมล/รหัสผ่านแอดมินเองได้ผ่าน `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ใน `.env` ก่อนรัน seed — **ควรเปลี่ยนรหัสผ่านก่อนใช้งานจริง**

## Deploy ขึ้น Vercel + Supabase

โค้ดพร้อม deploy ได้ทันที ทำตามขั้นตอนนี้ครั้งเดียว:

### 1. ตั้งค่า Supabase (ฐานข้อมูล + ที่เก็บรูป)

1. ไปที่โปรเจกต์ Supabase ของคุณ → **Settings → Database → Connection string**
   - คัดลอกแบบ **Transaction** (มี `pgbouncer=true`, พอร์ต 6543) ไว้ใช้เป็น `DATABASE_URL`
   - คัดลอกแบบ **Session/Direct** (พอร์ต 5432) ไว้ใช้เป็น `DIRECT_URL`
2. ไปที่ **Settings → API** → คัดลอก **Project URL** (ใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`) และ **service_role key** (ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY` — คีย์นี้ลับ ห้ามเผยแพร่)
3. ไปที่ **Storage** → สร้าง bucket ใหม่ชื่อ `product-images` → เปิด **Public bucket** (เพื่อให้รูปแสดงบนเว็บได้โดยตรง)

### 2. Deploy บน Vercel

1. ที่ Vercel: **Add New… → Project** → เลือก repo `cyos8147/rovshop`
2. ในหน้า **Environment Variables** ใส่ค่าตามนี้ (เอาค่าจริงจาก Supabase ในข้อ 1):

   | ชื่อตัวแปร | ค่า |
   | --- | --- |
   | `DATABASE_URL` | connection string แบบ Transaction จาก Supabase |
   | `DIRECT_URL` | connection string แบบ Direct จาก Supabase |
   | `NEXTAUTH_SECRET` | สุ่มค่าใหม่ด้วย `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | โดเมนจริงหลัง deploy เช่น `https://rovshop.vercel.app` |
   | `SEED_ADMIN_EMAIL` | อีเมลแอดมินที่ต้องการ |
   | `SEED_ADMIN_PASSWORD` | รหัสผ่านแอดมินที่ต้องการ (ตั้งให้รัดกุม) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL จาก Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key จาก Supabase |
   | `SUPABASE_STORAGE_BUCKET` | `product-images` |

3. กด **Deploy** — ขั้นตอน build จะรัน `prisma migrate deploy` ให้อัตโนมัติทุกครั้งที่ deploy (สร้างตารางในฐานข้อมูลให้เอง ไม่ต้องรันเองที่เครื่อง)

### 3. ใส่ข้อมูลเริ่มต้น (ทำครั้งเดียว)

หลัง deploy รอบแรก ให้รัน seed หนึ่งครั้งเพื่อสร้างบัญชีแอดมิน (และข้อมูลตัวอย่างถ้าต้องการ) จากเครื่องตัวเอง โดยตั้ง `DATABASE_URL`/`DIRECT_URL` ในไฟล์ `.env` ในเครื่องให้ชี้ไปที่ Supabase ตัวเดียวกับที่ deploy แล้วรัน:

```bash
npm run prisma:seed
```

เสร็จแล้วเข้า `https://<โดเมนของคุณ>/login` ด้วยบัญชีแอดมินที่ตั้งไว้ ไปเปลี่ยนลิงก์ Facebook ที่หน้า **ตั้งค่าร้าน** และเริ่มเพิ่มไอดีจริงได้เลย

## คำสั่งที่ใช้บ่อย

| คำสั่ง | อธิบาย |
| --- | --- |
| `npm run dev` | รันเซิร์ฟเวอร์สำหรับพัฒนา |
| `npm run build` | รัน migration ที่ค้างอยู่แล้ว build โปรดักชัน (ใช้ตอน deploy) |
| `npm run start` | รันเซิร์ฟเวอร์โปรดักชัน (ต้อง build ก่อน) |
| `npm run prisma:migrate` | สร้าง/อัปเดต migration ระหว่างพัฒนา |
| `npm run prisma:seed` | ใส่ข้อมูลตัวอย่าง (ไอดี, แอดมิน, รีวิว) |
| `npm run db:reset` | ล้างฐานข้อมูลและ seed ใหม่ทั้งหมด |

## โครงสร้างโปรเจกต์

```
prisma/
  schema.prisma        # โมเดลฐานข้อมูล (User, GameAccount, AccountImage, Testimonial, Settings)
  seed.ts               # ข้อมูลตัวอย่าง
src/
  app/                  # หน้าเว็บและ API routes (Next.js App Router)
    admin/              # แผงควบคุมแอดมิน (แดชบอร์ด, จัดการไอดี, ตั้งค่าร้าน)
    accounts/            # หน้ารวม/รายละเอียดไอดี
    api/                 # NextAuth route + placeholder image generator
    ...
  components/           # React components ที่ใช้ร่วมกัน
  lib/
    actions/             # Server Actions (accounts, settings)
    auth.ts              # ตั้งค่า NextAuth + helper ตรวจสอบสิทธิ์แอดมิน
    settings.ts           # อ่านค่าตั้งค่าร้าน (ลิงก์ Facebook)
    uploads.ts             # อัปโหลดรูปขึ้น Supabase Storage
    prisma.ts             # Prisma client singleton
    types.ts              # ค่าคงที่/union type แทน enum (เพิ่มค่าใหม่ได้โดยไม่ต้อง migrate DB)
  proxy.ts               # ป้องกันเส้นทาง /admin ทั้งหมด (ต้องล็อกอินเป็นแอดมิน)
```

## หมายเหตุด้านความปลอดภัย

- รหัสผ่านแอดมินเข้ารหัสด้วย bcrypt ก่อนบันทึกเสมอ
- ข้อมูลบัญชีเกม (ยูสเซอร์/รหัสผ่านไอดี) ที่กรอกในฟอร์มแอดมินเป็นที่จดบันทึกสำหรับแอดมินเท่านั้น **ไม่เคยแสดงบนหน้าเว็บสาธารณะ** ส่วนใดเลย
- มี rate limiting เบื้องต้นป้องกันการยิงฟอร์มเข้าสู่ระบบถี่เกินไป (ใช้ได้ดีบน server เดียว หากภายหลังขยายเป็นหลาย instance ควรย้ายไป Redis)
- ไฟล์รูปภาพที่อัปโหลดถูกตรวจสอบชนิดไฟล์และขนาดก่อนเสมอ แล้วบันทึกด้วยชื่อไฟล์สุ่มใหม่ (ไม่ใช้ชื่อไฟล์จากผู้ใช้โดยตรง)
- `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะฝั่งเซิร์ฟเวอร์เท่านั้น (ไม่มี prefix `NEXT_PUBLIC_`) จึงไม่ถูกส่งไปยังเบราว์เซอร์ของผู้ใช้
- เส้นทาง `/admin/*` ทั้งหมดถูกป้องกันทั้งที่ระดับ proxy (middleware) และระดับหน้า
