"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-muted transition hover:border-gold hover:text-gold"
    >
      ออกจากระบบ
    </button>
  );
}
