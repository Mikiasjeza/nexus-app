-- Speed: indexes for the busiest lookups (dashboard, history, usage, alerts).
-- Additive only: creates indexes, changes no data.

-- CreateIndex
CREATE INDEX "SkillHistory_userId_idx" ON "SkillHistory"("userId");

-- CreateIndex
CREATE INDEX "AIAnalysis_userId_createdAt_idx" ON "AIAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAnalysis_evidenceId_idx" ON "AIAnalysis"("evidenceId");

-- CreateIndex
CREATE INDEX "Activity_userId_timestamp_idx" ON "Activity"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "UsageEvent_companyId_idx" ON "UsageEvent"("companyId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_userId_idx" ON "PromotionRedemption"("userId");

-- CreateIndex
CREATE INDEX "AssessmentAppeal_userId_idx" ON "AssessmentAppeal"("userId");

-- CreateIndex
CREATE INDEX "ExternalJob_active_firstSeenAt_idx" ON "ExternalJob"("active", "firstSeenAt");

-- CreateIndex
CREATE INDEX "JobAlert_userId_idx" ON "JobAlert"("userId");

