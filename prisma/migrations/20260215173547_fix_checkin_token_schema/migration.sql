/*
  Warnings:

  - The required column `checkInToken` was added to the `EagleProjectWorkDay` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "EagleProjectVolunteer" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "checkOutTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EagleProjectWorkDay" ADD COLUMN "checkInToken" TEXT;
UPDATE "EagleProjectWorkDay" SET "checkInToken" = gen_random_uuid()::text WHERE "checkInToken" IS NULL;
ALTER TABLE "EagleProjectWorkDay" ALTER COLUMN "checkInToken" SET NOT NULL;
