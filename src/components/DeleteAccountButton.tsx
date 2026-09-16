"use client";

import { deleteAccountAction } from "@/lib/actions/accounts";

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  return (
    <form action={deleteAccountAction.bind(null, accountId)}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("ยืนยันลบไอดีนี้ถาวร? การลบไม่สามารถกู้คืนได้")) {
            event.preventDefault();
          }
        }}
        className="btn-danger w-full"
      >
        ลบไอดีนี้
      </button>
    </form>
  );
}
