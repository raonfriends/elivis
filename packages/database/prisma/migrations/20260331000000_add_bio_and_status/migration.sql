-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('WORKING', 'VACATION', 'OFF_WORK', 'DEEP_FOCUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT,
                   ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'WORKING';
