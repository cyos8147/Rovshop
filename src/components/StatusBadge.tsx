import { ACCOUNT_STATUS_LABELS, type AccountStatus } from "@/lib/types";

const accountStyles: Record<AccountStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RESERVED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  SOLD: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${accountStyles[status]}`}
    >
      {ACCOUNT_STATUS_LABELS[status]}
    </span>
  );
}
