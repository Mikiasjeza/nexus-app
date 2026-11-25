-- Saved jobs and application tracker, job alerts and their deliveries.
-- Additive only: three new tables.

-- CreateTable
CREATE TABLE "TrackedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobRef" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "appliedAt" TIMESTAMP(3),
    "nextStep" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salaryMin" INTEGER,
    "jobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedJob_userId_status_idx" ON "TrackedJob"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedJob_userId_jobRef_key" ON "TrackedJob"("userId", "jobRef");

-- CreateIndex
CREATE UNIQUE INDEX "JobAlert_unsubscribeToken_key" ON "JobAlert"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "JobAlert_enabled_idx" ON "JobAlert"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_alertId_externalJobId_key" ON "AlertDelivery"("alertId", "externalJobId");

-- AddForeignKey
ALTER TABLE "TrackedJob" ADD CONSTRAINT "TrackedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "JobAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

