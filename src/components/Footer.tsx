import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Logo";

export async function Footer() {
  const settings = await getSettings();

  return (
    <footer className="mt-16 border-t border-border bg-bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-muted">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-2 max-w-xs">
              เว็บทำป้ายขายไอดีเกม เลือกสกิน เรียงอัตโนมัติ ได้ภาพเดียวพร้อมโพสต์
            </p>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink">ลิงก์ด่วน</div>
            <ul className="space-y-1">
              <li>
                <a href="/sort" className="transition hover:text-gold">
                  ทำป้ายขายไอดี
                </a>
              </li>
              <li>
                <a href="/faq" className="transition hover:text-gold">
                  คำถามที่พบบ่อย
                </a>
              </li>
              <li>
                <a href="/terms" className="transition hover:text-gold">
                  เงื่อนไขการใช้บริการ
                </a>
              </li>
              <li>
                <a href="/privacy" className="transition hover:text-gold">
                  นโยบายความเป็นส่วนตัว
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink">ติดต่อเรา</div>
            <p>
              <a href={settings.contactUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-gold">
                ติดต่อแอดมินทาง Facebook
              </a>
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} Oscar Gaming images</p>
          <Link href="/login" className="text-ink-muted/70 transition hover:text-gold">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </footer>
  );
}
