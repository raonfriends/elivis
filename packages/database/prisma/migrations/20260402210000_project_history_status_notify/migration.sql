-- CreateEnum
CREATE TYPE "ProjectHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProjectHistoryResourceType" AS ENUM ('TASK', 'TASK_STATUS', 'TASK_PRIORITY', 'TASK_ASSIGNEE', 'TASK_DATE', 'TASK_DESCRIPTION', 'TASK_COMMENT', 'TASK_ATTACHMENT', 'WORKSPACE_STATUS', 'WORKSPACE_PRIORITY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "WorkspaceStatus" ADD COLUMN "notifyOnChange" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ProjectHistoryAction" NOT NULL,
    "resourceType" "ProjectHistoryResourceType" NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectHistory_projectId_idx" ON "ProjectHistory"("projectId");

-- CreateIndex
CREATE INDEX "ProjectHistory_projectId_createdAt_idx" ON "ProjectHistory"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectHistory_userId_idx" ON "ProjectHistory"("userId");

-- AddForeignKey
ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
