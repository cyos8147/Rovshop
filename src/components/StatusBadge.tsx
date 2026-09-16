import {
  ACCOUNT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type AccountStatus,
  type DeliveryStatus,
  type PaymentStatus,
} from "@/lib/types";

const accountStyles: Record<AccountStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RESERVED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  SOLD: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const paymentStyles: Record<PaymentStatus, string> = {
  PENDING: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  AWAITING_VERIFICATION: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PAID: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const deliveryStyles: Record<DeliveryStatus, string> = {
  WAITING: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return <Badge className={accountStyles[status]}>{ACCOUNT_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={paymentStyles[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge className={deliveryStyles[status]}>{DELIVERY_STATUS_LABELS[status]}</Badge>;
}
