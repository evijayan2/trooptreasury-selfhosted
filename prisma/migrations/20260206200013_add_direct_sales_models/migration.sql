-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'INTERNAL_TRANSFER';

-- CreateTable
CREATE TABLE "DirectSalesInventory" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectSalesInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectSalesGroup" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectSalesGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectSalesGroupVolunteer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "scoutId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectSalesGroupVolunteer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectSalesInventory_campaignId_idx" ON "DirectSalesInventory"("campaignId");

-- CreateIndex
CREATE INDEX "DirectSalesGroup_inventoryId_idx" ON "DirectSalesGroup"("inventoryId");

-- CreateIndex
CREATE INDEX "DirectSalesGroupVolunteer_groupId_idx" ON "DirectSalesGroupVolunteer"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectSalesGroupVolunteer_groupId_scoutId_key" ON "DirectSalesGroupVolunteer"("groupId", "scoutId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectSalesGroupVolunteer_groupId_userId_key" ON "DirectSalesGroupVolunteer"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "DirectSalesInventory" ADD CONSTRAINT "DirectSalesInventory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesInventory" ADD CONSTRAINT "DirectSalesInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CampaignProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroup" ADD CONSTRAINT "DirectSalesGroup_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "DirectSalesInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroupVolunteer" ADD CONSTRAINT "DirectSalesGroupVolunteer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DirectSalesGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroupVolunteer" ADD CONSTRAINT "DirectSalesGroupVolunteer_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSalesGroupVolunteer" ADD CONSTRAINT "DirectSalesGroupVolunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
