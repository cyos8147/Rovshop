-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paidUntil" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "planDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "planPrice" INTEGER NOT NULL DEFAULT 199,
ADD COLUMN     "promptpayId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "promptpayName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transRef" TEXT,
    "slipPath" TEXT,
    "senderName" TEXT,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transRef_key" ON "Payment"("transRef");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

