import type { Metadata } from "next";
import { AccountForm } from "@/components/AccountForm";
import { createAccountAction } from "@/lib/actions/accounts";

export const metadata: Metadata = { title: "เพิ่มไอดีใหม่" };

export default function NewAccountPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">เพิ่มไอดีใหม่</h1>
      <div className="mt-6">
        <AccountForm action={createAccountAction} submitLabel="สร้างไอดี" />
      </div>
    </div>
  );
}
