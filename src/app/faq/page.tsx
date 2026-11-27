import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatCoins } from "@/lib/coins";

export const metadata: Metadata = { title: "คำถามที่พบบ่อย" };

type Faq = { q: string; a: string };

function bannerFaqs(s: Awaited<ReturnType<typeof getSettings>>): Faq[] {
  return [
    {
      q: "ทำป้ายขายไอดีอย่างไร?",
      a: "เข้าเมนู \"ทำป้ายขายไอดี\" → มี 4 ขั้นตอน: 1) เลือกสกินที่มี 2) เลือกพื้นหลัง (อัปโหลดรูปเองหรือเลือกธีมสี) 3) ใส่ข้อมูลไอดี เช่น รหัสไอดี แรงค์ ราคา ช่องทางติดต่อ 4) ชำระเงินแล้วดาวน์โหลดหรือแชร์ ได้เป็นภาพเดียวพร้อมโพสต์",
    },
    {
      q: "ต้องจ่ายเงินไหม?",
      a: `เลือก จัดเรียง ตกแต่ง และดูตัวอย่างฟรี จ่ายเฉพาะตอนดาวน์โหลด: ${formatCoins(s.skinPriceCents)} คอยน์ต่อสกินในภาพ (แบบไม่มีลายน้ำ OSCAR +${formatCoins(s.noWatermarkCents)} คอยน์) ระบบแสดงราคาก่อนจ่ายทุกครั้ง ดาวน์โหลดป้ายเดิมซ้ำไม่เสียเพิ่ม${s.planPrice > 0 ? ` หรือสมัครรายเดือน ${s.planPrice} คอยน์ / ${s.planDays} วัน ดาวน์โหลดไม่จำกัด` : ""}`,
    },
    {
      q: "เติมคอยน์อย่างไร?",
      a: `สมัครสมาชิกด้วยอีเมล → เข้าหน้า \"บัญชีของฉัน\" → เลือกจำนวนเงิน (1 บาท = 1 คอยน์ ขั้นต่ำ ${s.minTopup} บาท) → สแกน QR พร้อมเพย์ → อัปโหลดสลิป ระบบเติมคอยน์ให้ทันทีหรือภายหลังแอดมินตรวจสลิป คอยน์ไม่มีวันหมดอายุ`,
    },
    {
      q: "ทำไมภาพตัวอย่างมีคำว่า \"ตัวอย่าง\"?",
      a: "ภาพบนหน้าจอเป็นภาพตัวอย่างก่อนชำระ เมื่อกดดาวน์โหลด ภาพที่ได้จะไม่มีลายน้ำ \"ตัวอย่าง\"",
    },
    {
      q: "ลืมรหัสผ่านทำอย่างไร?",
      a: "ติดต่อแอดมินพร้อมอีเมลที่ใช้สมัครและหลักฐานการเป็นเจ้าของบัญชี (เช่น สลิปที่เคยเติม) ถ้ายังเข้าระบบได้ เปลี่ยนรหัสผ่านเองได้ที่หน้า \"บัญชีของฉัน\"",
    },
  ];
}

function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="mt-4 space-y-4">
      {items.map((item) => (
        <div key={item.q} className="card p-5">
          <h3 className="font-semibold text-ink">{item.q}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

export default async function FaqPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">คำถามที่พบบ่อย</h1>
      <FaqList items={bannerFaqs(settings)} />
      <p className="mt-3 text-xs text-ink-muted">
        อ่านเพิ่มเติม:{" "}
        <Link href="/terms" className="text-gold hover:underline">
          เงื่อนไขการใช้บริการ
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="text-gold hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </div>
  );
}
