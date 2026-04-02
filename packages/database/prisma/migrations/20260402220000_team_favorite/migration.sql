-- CreateTable: 팀 즐겨찾기
CREATE TABLE "TeamFavorite" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "teamId"    TEXT         NOT NULL,
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamFavorite_userId_teamId_key" ON "TeamFavorite"("userId", "teamId");
CREATE INDEX "TeamFavorite_userId_order_idx"   ON "TeamFavorite"("userId", "order");

-- AddForeignKey
ALTER TABLE "TeamFavorite" ADD CONSTRAINT "TeamFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamFavorite" ADD CONSTRAINT "TeamFavorite_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
