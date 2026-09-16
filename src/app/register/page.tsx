import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-ink">สมัครสมาชิก</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">สมัครสมาชิกเพื่อเริ่มเลือกซื้อไอดี RoV</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
