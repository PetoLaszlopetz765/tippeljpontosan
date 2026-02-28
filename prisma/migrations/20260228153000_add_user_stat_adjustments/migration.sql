-- Non-destructive migration: only extends existing User table.
-- Does not touch other tables (including external app tables in same database).

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "tipsCountAdjustment" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "perfectCountAdjustment" INTEGER NOT NULL DEFAULT 0;
