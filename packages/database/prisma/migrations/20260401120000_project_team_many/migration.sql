-- CreateTable
CREATE TABLE "ProjectTeam" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeam_projectId_teamId_key" ON "ProjectTeam"("projectId", "teamId");

-- CreateIndex
CREATE INDEX "ProjectTeam_teamId_idx" ON "ProjectTeam"("teamId");

-- CreateIndex
CREATE INDEX "ProjectTeam_projectId_idx" ON "ProjectTeam"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 단일 teamId 를 조인 행으로 복제
INSERT INTO "ProjectTeam" ("id", "projectId", "teamId", "createdAt")
SELECT
    substring(md5(random()::text || p."id" || p."teamId") from 1 for 16),
    p."id",
    p."teamId",
    CURRENT_TIMESTAMP
FROM "Project" p
WHERE p."teamId" IS NOT NULL;
