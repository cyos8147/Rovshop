import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = { title: "ตั้งค่าร้าน" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">ตั้งค่าร้าน</h1>
      <p className="mt-1 text-sm text-ink-muted">
        ลูกค้าที่สนใจไอดีจะกดปุ่ม &quot;แชทกับแอดมินเพื่อสั่งซื้อ&quot; ในหน้ารายละเอียดไอดี แล้วเด้งไปที่ลิงก์นี้ทันที
      </p>
      <div className="mt-6 max-w-xl">
        <SettingsForm defaultContactUrl={settings.contactUrl} />
      </div>
    </div>
  );
}
