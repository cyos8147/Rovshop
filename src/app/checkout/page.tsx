import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "ชำระเงิน" };

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=/checkout");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">ชำระเงิน</h1>
      <CheckoutForm />
    </div>
  );
}
