-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FINANCIER', 'LEADER', 'SCOUT', 'PARENT');

-- CreateEnum
CREATE TYPE "ScoutStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CampoutStatus" AS ENUM ('OPEN', 'READY_FOR_PAYMENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "CampoutAdultRole" AS ENUM ('ORGANIZER', 'ATTENDEE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REGISTRATION_INCOME', 'FUNDRAISING_INCOME', 'DONATION_IN', 'EXPENSE', 'CAMP_TRANSFER', 'REIMBURSEMENT', 'DUES', 'IBA_RECLAIM', 'EVENT_PAYMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SCOUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "invitationToken" TEXT,
    "invitationExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "ibaBalance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" "ScoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Scout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentScout" (
    "parentId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,

    CONSTRAINT "ParentScout_pkey" PRIMARY KEY ("parentId","scoutId")
);

-- CreateTable
CREATE TABLE "CampoutScout" (
    "campoutId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampoutScout_pkey" PRIMARY KEY ("campoutId","scoutId")
);

-- CreateTable
CREATE TABLE "Campout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "status" "CampoutStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampoutAdult" (
    "campoutId" TEXT NOT NULL,
    "adultId" TEXT NOT NULL,
    "role" "CampoutAdultRole" NOT NULL DEFAULT 'ORGANIZER',

    CONSTRAINT "CampoutAdult_pkey" PRIMARY KEY ("campoutId","adultId","role")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "fromAccount" TEXT,
    "toAccount" TEXT,
    "scoutId" TEXT,
    "userId" TEXT,
    "campoutId" TEXT,
    "approvedBy" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdultExpense" (
    "id" TEXT NOT NULL,
    "campoutId" TEXT NOT NULL,
    "adultId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReimbursed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AdultExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroopSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'TroopTreasury',
    "council" TEXT,
    "district" TEXT,
    "logoBase64" TEXT,
    "rolePermissions" JSONB,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TroopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationToken_key" ON "User"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Scout_userId_key" ON "Scout"("userId");

-- AddForeignKey
ALTER TABLE "Scout" ADD CONSTRAINT "Scout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentScout" ADD CONSTRAINT "ParentScout_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentScout" ADD CONSTRAINT "ParentScout_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoutScout" ADD CONSTRAINT "CampoutScout_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES "Campout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoutScout" ADD CONSTRAINT "CampoutScout_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoutAdult" ADD CONSTRAINT "CampoutAdult_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES "Campout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoutAdult" ADD CONSTRAINT "CampoutAdult_adultId_fkey" FOREIGN KEY ("adultId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES "Campout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdultExpense" ADD CONSTRAINT "AdultExpense_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES "Campout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdultExpense" ADD CONSTRAINT "AdultExpense_adultId_fkey" FOREIGN KEY ("adultId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
