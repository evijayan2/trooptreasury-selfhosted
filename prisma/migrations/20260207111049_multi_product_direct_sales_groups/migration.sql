/*
  Warnings:

  - You are about to drop the column `amountCollected` on the `DirectSalesGroup` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryId` on the `DirectSalesGroup` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `DirectSalesGroup` table. All the data in the column will be lost.
  - You are about to drop the column `soldCount` on the `DirectSalesGroup` table. All the data in the column will be lost.
  - Added the required column `campaignId` to the `DirectSalesGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DirectSalesGroup" DROP CONSTRAINT "DirectSalesGroup_inventoryId_fkey";

-- DropIndex
DROP INDEX "DirectSalesGroup_inventoryId_idx";

-- AlterTable
ALTER TABLE "DirectSalesGroup" DROP COLUMN "amountCollected",
DROP COLUMN "inventoryId",
DROP COLUMN "quantity",
DROP COLUMN "soldCount",
ADD COLUMN     "campaignId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "DirectSalesGroupItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "amountCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectSalesGroupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectSalesGroupItem_groupId_idx" ON "DirectSalesGroupItem"("groupId");

-- CreateIndex
CREATE INDEX "DirectSalesGroupItem_inventoryId_idx" ON "DirectSalesGroupItem"("inventoryId");

-- CreateIndex
CREATE INDEX "DirectSalesGroup_campaignId_idx" ON "DirectSalesGroup"("campaignId");

-- AddForeignKey
ALTER TABLE "DirectSalesGroup" ADD CONSTRAINT "DirectSalesGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroupItem" ADD CONSTRAINT "DirectSalesGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DirectSalesGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroupItem" ADD CONSTRAINT "DirectSalesGroupItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "DirectSalesInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
