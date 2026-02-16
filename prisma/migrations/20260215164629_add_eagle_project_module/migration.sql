-- CreateEnum
CREATE TYPE "EagleProjectStatus" AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EagleFinancialType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "EagleVolunteerRole" AS ENUM ('EAGLE_CANDIDATE', 'REGISTERED_SCOUT', 'REGISTERED_ADULT', 'OTHER');

-- CreateTable
CREATE TABLE "EagleProject" (
    "id" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "beneficiary" TEXT,
    "status" "EagleProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EagleProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EagleProjectFinancial" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "EagleFinancialType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EagleProjectFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EagleProjectWorkDay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "EagleProjectWorkDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EagleProjectVolunteer" (
    "id" TEXT NOT NULL,
    "workDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "hours" DECIMAL(5,2) NOT NULL,
    "role" "EagleVolunteerRole" NOT NULL DEFAULT 'OTHER',

    CONSTRAINT "EagleProjectVolunteer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EagleProject" ADD CONSTRAINT "EagleProject_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EagleProjectFinancial" ADD CONSTRAINT "EagleProjectFinancial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EagleProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EagleProjectWorkDay" ADD CONSTRAINT "EagleProjectWorkDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EagleProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EagleProjectVolunteer" ADD CONSTRAINT "EagleProjectVolunteer_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "EagleProjectWorkDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
