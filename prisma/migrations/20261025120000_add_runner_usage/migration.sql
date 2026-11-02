-- Daily counter of code-runner calls, for the spending cap (lib/assessments/budget.ts).
-- Additive only: creates one new table.

-- CreateTable
CREATE TABLE "RunnerUsage" (
    "day" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerUsage_pkey" PRIMARY KEY ("day")
);

