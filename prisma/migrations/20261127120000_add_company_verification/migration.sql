-- Verified company badge.
-- Additive only: two new nullable columns on Company.

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedVia" TEXT;
