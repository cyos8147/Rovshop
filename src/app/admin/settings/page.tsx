import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { PricingForm } from "@/components/MembershipAdmin";
import { updatePricingAction } from "@/lib/actions/membership";
import { isSlipVerificationConfigured } from "@/lib/slip";

export const metadata: Metadata = { title: "ตั้งค่าร้าน" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">ตั้งค่าร้าน</h1>
      <p className="mt-1 text-sm text-ink-muted">
        ช่องทางติดต่อแอดมิน (แสดงท้ายเว็บ หน้าเงื่อนไขการใช้บริการ และนโยบายความเป็นส่วนตัว) พร้อมราคาคอยน์และการรับเงินด้านล่าง
      </p>
      <div className="mt-6 max-w-xl">
        <SettingsForm defaultContactUrl={settings.contactUrl} />
      </div>
      <div className="mt-6 max-w-xl">
        <PricingForm
          action={updatePricingAction}
          slipAutoVerify={isSlipVerificationConfigured()}
          defaults={{
            promptpayId: settings.promptpayId,
            promptpayName: settings.promptpayName,
            skinPriceCents: settings.skinPriceCents,
            noWatermarkCents: settings.noWatermarkCents,
            signupBonusCents: settings.signupBonusCents,
            minTopup: settings.minTopup,
            planPrice: settings.planPrice,
            planDays: settings.planDays,
          }}
        />
      </div>
    </div>
  );
}
