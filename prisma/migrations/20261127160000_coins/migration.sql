-- AlterTable
ALTER TABLE "User" DROP COLUMN "paidUntil",
DROP COLUMN "trialEndsAt",
ADD COLUMN     "coinCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "days";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "planDays",
DROP COLUMN "planPrice",
DROP COLUMN "trialDays",
ADD COLUMN     "minTopup" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "noWatermarkCents" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "signupBonusCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skinPriceCents" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skinCount" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Download_userId_idx" ON "Download"("userId");

-- CreateIndex
CREATE INDEX "Download_createdAt_idx" ON "Download"("createdAt");

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

