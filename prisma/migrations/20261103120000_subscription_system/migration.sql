-- Subscription system: plans for people and organizations, monthly usage
-- allowances, the founding-member promotion and plan waitlists.
-- Additive: new nullable columns on "Subscription" (whose "userId" becomes
-- optional so an organization can own a subscription instead), and new tables.
-- Safe to apply while the current code is live; it never reads the new columns.

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "discountEndsAt" TIMESTAMP(3),
ADD COLUMN     "firstPaidAt" TIMESTAMP(3),
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UsagePeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "plan" TEXT NOT NULL,
    "formalLimit" INTEGER NOT NULL,
    "formalStarted" INTEGER NOT NULL DEFAULT 0,
    "formalUsed" INTEGER NOT NULL DEFAULT 0,
    "practiceRounds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsagePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "usagePeriodId" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "kind" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'consumed',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "stripeCouponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "checkoutSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsagePeriod_periodStart_idx" ON "UsagePeriod"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsagePeriod_userId_periodStart_key" ON "UsagePeriod"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsagePeriod_companyId_periodStart_key" ON "UsagePeriod"("companyId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_attemptId_key" ON "UsageEvent"("attemptId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_checkoutSessionId_key" ON "PromotionRedemption"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_promotionId_status_idx" ON "PromotionRedemption"("promotionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_promotionId_userId_key" ON "PromotionRedemption"("promotionId", "userId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_plan_idx" ON "WaitlistEntry"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_plan_userId_key" ON "WaitlistEntry"("plan", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_usagePeriodId_fkey" FOREIGN KEY ("usagePeriodId") REFERENCES "UsagePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A subscription belongs to exactly one person or one organization.
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_one_owner_check" CHECK (("userId" IS NULL) <> ("companyId" IS NULL));

-- The old 'enterprise' plan is now Career+.
UPDATE "Subscription" SET "plan" = 'career_plus' WHERE "plan" = 'enterprise';

-- The founding-member offer starts switched off; an admin turns it on (lib/billing/promotions.ts).
INSERT INTO "Promotion" ("id", "code", "name", "planId", "priceCents", "durationMonths", "maxRedemptions", "active", "createdAt", "updatedAt")
VALUES ('promo_founding_pro', 'founding-pro', 'Founding member', 'pro', 699, 12, 100, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
