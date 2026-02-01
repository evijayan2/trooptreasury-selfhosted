/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `troopId` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `troopId` to the `Campout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `troopId` to the `FundraisingCampaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `troopId` to the `Scout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `troopId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'SCOUT_CASH_TURN_IN';

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "troopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Campout" ADD COLUMN     "troopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FundraisingCampaign" ADD COLUMN     "troopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Scout" ADD COLUMN     "troopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "troopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- CreateTable
CREATE TABLE "Troop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "council" TEXT,
    "district" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Troop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroopMember" (
    "id" TEXT NOT NULL,
    "troopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SCOUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TroopMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Troop_slug_key" ON "Troop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TroopMember_troopId_userId_key" ON "TroopMember"("troopId", "userId");

-- AddForeignKey
ALTER TABLE "TroopMember" ADD CONSTRAINT "TroopMember_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroopMember" ADD CONSTRAINT "TroopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scout" ADD CONSTRAINT "Scout_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campout" ADD CONSTRAINT "Campout_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingCampaign" ADD CONSTRAINT "FundraisingCampaign_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
