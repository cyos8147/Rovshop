import type { Metadata } from "next";

export const metadata: Metadata = { title: "นโยบายการให้บริการ" };

const sections = [
  {
    title: "นโยบายการรับประกัน",
    items: [
      "รับประกันไอดีตรงตามสเปกที่ระบุไว้ในหน้ารายละเอียดสินค้า (แรงค์ ฮีโร่ สกิน ยอดเพชร/คอยน์)",
      "หากไอดีไม่ตรงตามที่แจ้งไว้ แจ้งทีมงานภายใน 24 ชั่วโมงหลังได้รับไอดี พร้อมแนบหลักฐาน",
      "ไม่รับประกันกรณีลูกค้าเปลี่ยนรหัสผ่าน/ผูกบัญชีแล้วถูกเรียกคืนโดยเจ้าของเดิม",
    ],
  },
  {
    title: "นโยบายการคืนเงิน",
    items: [
      "คืนเงินเต็มจำนวนหากไม่สามารถเข้าใช้งานไอดีได้ตั้งแต่แรกและตรวจสอบแล้วว่าไม่ได้เกิดจากฝั่งลูกค้า",
      "กรณีอื่นพิจารณาเป็นรายกรณีตามหลักฐานที่ได้รับ",
      "ระยะเวลาคืนเงิน 3–7 วันทำการ ผ่านช่องทางเดียวกับที่ชำระเงิน",
    ],
  },
  {
    title: "ข้อตกลงการใช้บริการ",
    items: [
      "ผู้ซื้อต้องมีอายุตามที่กำหนดในข้อตกลงการใช้งานของเกม RoV",
      "การซื้อขายไอดีอาจขัดต่อข้อตกลงการใช้งาน (Terms of Service) ของผู้ให้บริการเกมในบางกรณี ผู้ซื้อควรพิจารณาความเสี่ยงก่อนตัดสินใจ",
      "ร้านค้าขอสงวนสิทธิ์ยกเลิกคำสั่งซื้อหากตรวจพบการฉ้อโกงหรือใช้ข้อมูลการชำระเงินที่ไม่ถูกต้อง",
    ],
  },
];

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">นโยบายการให้บริการ</h1>
      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="card p-5">
            <h2 className="font-semibold text-ink">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
