"use client";

import { useActionState } from "react";
import { buyPlanAction, type PlanState } from "@/lib/actions/membership";

export function BuyPlanForm({ label, disabled }: { label: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(buyPlanAction, {});
  return (
    <form action={formAction} className="space-y-2">
      {state.error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.success}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || disabled}
        onClick={(e) => {
          if (!window.confirm(`${label}?`)) e.preventDefault();
        }}
        className="btn-primary w-full"
      >
        {pending ? "กำลังสมัคร..." : label}
      </button>
    </form>
  );
}
