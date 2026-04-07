-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN "notifyEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN "notifyEnabled" BOOLEAN NOT NULL DEFAULT true;
