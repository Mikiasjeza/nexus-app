-- Real job listings synced from public sources. Additive only: one new table.

-- CreateTable
CREATE TABLE "ExternalJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryText" TEXT,
    "employmentType" TEXT,
    "experienceLevel" TEXT,
    "description" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" JSONB,
    "applyUrl" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExternalJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalJob_active_postedAt_idx" ON "ExternalJob"("active", "postedAt");

-- CreateIndex
CREATE INDEX "ExternalJob_dedupeKey_idx" ON "ExternalJob"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJob_source_sourceId_key" ON "ExternalJob"("source", "sourceId");

