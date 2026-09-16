export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-muted">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-lg font-bold text-ink">RoVShop</div>
            <p className="mt-2 max-w-xs">
              ร้านขายไอดีเกม RoV แรงค์สูง สกินหายาก ตรวจสอบสเปกได้ทุกรายการก่อนตัดสินใจซื้อ
            </p>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink">ลิงก์ด่วน</div>
            <ul className="space-y-1">
              <li>
                <a href="/accounts" className="transition hover:text-gold">
                  ไอดีทั้งหมด
                </a>
              </li>
              <li>
                <a href="/faq" className="transition hover:text-gold">
                  คำถามที่พบบ่อย
                </a>
              </li>
              <li>
                <a href="/policy" className="transition hover:text-gold">
                  นโยบายการรับประกัน
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink">ติดต่อเรา</div>
            <p>LINE: @rovshop-demo</p>
            <p>เวลาทำการ 10:00–24:00 น. ทุกวัน</p>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-center text-xs">
          © {new Date().getFullYear()} RoVShop — เว็บไซต์ตัวอย่างสำหรับสาธิตระบบ ไม่มีการซื้อขายจริง
        </p>
      </div>
    </footer>
  );
}
