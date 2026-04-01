-- Drop surrogate id from TeamMember and use (teamId, userId) as primary key.
-- User mentioned existing rows will be deleted manually; this migration assumes it is safe to rewrite constraints.

ALTER TABLE "TeamMember" DROP CONSTRAINT IF EXISTS "TeamMember_pkey";

-- In older migrations this existed as a UNIQUE index; drop it if present.
DROP INDEX IF EXISTS "TeamMember_teamId_userId_key";

ALTER TABLE "TeamMember" DROP COLUMN IF EXISTS "id";

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId", "userId");

