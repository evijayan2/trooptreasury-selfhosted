-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('RESERVED', 'WAITLISTED');

-- AlterTable
ALTER TABLE "Campout" ADD COLUMN     "adultLimit" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "scoutLimit" INTEGER;

-- AlterTable
ALTER TABLE "CampoutAdult" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'RESERVED';

-- AlterTable
ALTER TABLE "CampoutScout" ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'RESERVED';
