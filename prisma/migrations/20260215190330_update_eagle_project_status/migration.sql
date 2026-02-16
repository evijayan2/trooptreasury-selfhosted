/*
  Warnings:

  - The values [DRAFT,APPROVED,IN_PROGRESS,COMPLETED] on the enum `EagleProjectStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EagleProjectStatus_new" AS ENUM ('OPEN', 'CLOSED');
ALTER TABLE "public"."EagleProject" ALTER COLUMN "status" DROP DEFAULT;

-- Map old values to new values
ALTER TABLE "EagleProject" 
  ALTER COLUMN "status" TYPE "EagleProjectStatus_new" 
  USING (
    CASE "status"::text
      WHEN 'DRAFT' THEN 'OPEN'::"EagleProjectStatus_new"
      WHEN 'APPROVED' THEN 'OPEN'::"EagleProjectStatus_new"
      WHEN 'IN_PROGRESS' THEN 'OPEN'::"EagleProjectStatus_new"
      WHEN 'COMPLETED' THEN 'CLOSED'::"EagleProjectStatus_new"
      ELSE 'OPEN'::"EagleProjectStatus_new"
    END
  );
ALTER TYPE "EagleProjectStatus" RENAME TO "EagleProjectStatus_old";
ALTER TYPE "EagleProjectStatus_new" RENAME TO "EagleProjectStatus";
DROP TYPE "public"."EagleProjectStatus_old";
ALTER TABLE "EagleProject" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "EagleProject" ALTER COLUMN "status" SET DEFAULT 'OPEN';
