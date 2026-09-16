"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "@/lib/actions/accounts";

type DeleteState = { error?: string; success?: boolean };

const initialState: DeleteState = {};

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const router = useRouter();

  async function action(_prevState: DeleteState, _formData: FormData): Promise<DeleteState> {
    try {
      await deleteAccountAction(accountId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "ลบไม่สำเร็จ" };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/accounts");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      {state.error ? (
        <p className="mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-danger w-full">
        {pending ? "กำลังลบ..." : "ลบไอดีนี้"}
      </button>
    </form>
  );
}
