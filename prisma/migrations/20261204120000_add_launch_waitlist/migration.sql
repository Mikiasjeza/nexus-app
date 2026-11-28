-- Coming Soon waitlist and daily launch-page numbers. Additive only: two new tables.

-- CreateTable
CREATE TABLE "LaunchWaitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmTokenHash" TEXT,
    "unsubscribeTokenHash" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "LaunchWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchStat" (
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "confirmations" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LaunchStat_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "LaunchWaitlist_email_key" ON "LaunchWaitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchWaitlist_confirmTokenHash_key" ON "LaunchWaitlist"("confirmTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchWaitlist_unsubscribeTokenHash_key" ON "LaunchWaitlist"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "LaunchWaitlist_status_createdAt_idx" ON "LaunchWaitlist"("status", "createdAt");

