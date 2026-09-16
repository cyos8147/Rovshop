import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <p className="bg-gradient-to-r from-gold to-violet bg-clip-text text-6xl font-black text-transparent">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold text-ink">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-2 text-ink-muted">อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-gold px-6 py-2.5 font-semibold text-bg transition hover:bg-gold-soft"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
