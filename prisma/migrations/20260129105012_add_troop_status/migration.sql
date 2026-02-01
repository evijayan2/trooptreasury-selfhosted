-- CreateEnum
CREATE TYPE "TroopStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'PENDING_DELETION');

-- AlterTable
ALTER TABLE "Troop" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "TroopStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "troopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_troopId_key" ON "Subscription"("troopId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
