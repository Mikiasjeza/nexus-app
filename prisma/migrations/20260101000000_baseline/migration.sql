-- Baseline: the tables the production database already had before migrations
-- were tracked (it was created with prisma db push), generated from the live
-- schema on 2026-10-30. Every statement only creates what is missing, so on
-- production this changes nothing, and on an empty database (CI, a new
-- environment) it builds the starting point the later migrations need.

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIAnalysis" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "model" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedLevel" TEXT,
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawResponse" JSONB,
    "tokensUsed" INTEGER,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "skillId" TEXT,
    "skillName" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompanyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Evidence" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "JobListing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "skills" TEXT[],
    "location" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "salary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OAuthConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SkillHistory" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "SkillHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TalentPool" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "candidateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "publicProfile" BOOLEAN NOT NULL DEFAULT false,
    "shareableId" TEXT NOT NULL,
    "customSlug" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailToken" TEXT,
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discoverableByEmployers" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIAnalysis_skillId_idx" ON "AIAnalysis"("skillId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIAnalysis_userId_idx" ON "AIAnalysis"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_timestamp_idx" ON "Activity"("timestamp" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_type_idx" ON "Activity"("type" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_userId_idx" ON "Activity"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Company_slug_idx" ON "Company"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompanyMember_companyId_idx" ON "CompanyMember"("companyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyMember_userId_companyId_key" ON "CompanyMember"("userId" ASC, "companyId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompanyMember_userId_idx" ON "CompanyMember"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Evidence_skillId_idx" ON "Evidence"("skillId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Evidence_type_idx" ON "Evidence"("type" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JobListing_companyId_idx" ON "JobListing"("companyId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JobListing_status_idx" ON "JobListing"("status" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthConnection_provider_providerId_idx" ON "OAuthConnection"("provider" ASC, "providerId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OAuthConnection_userId_idx" ON "OAuthConnection"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthConnection_userId_provider_key" ON "OAuthConnection"("userId" ASC, "provider" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Skill_category_idx" ON "Skill"("category" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Skill_status_idx" ON "Skill"("status" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Skill_userId_idx" ON "Skill"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Skill_visibility_idx" ON "Skill"("visibility" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SkillHistory_skillId_idx" ON "SkillHistory"("skillId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SkillHistory_timestamp_idx" ON "SkillHistory"("timestamp" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key" ON "Subscription"("userId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TalentPool_companyId_idx" ON "TalentPool"("companyId" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_customSlug_idx" ON "User"("customSlug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_customSlug_key" ON "User"("customSlug" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_shareableId_idx" ON "User"("shareableId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_shareableId_key" ON "User"("shareableId" ASC);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SkillHistory" ADD CONSTRAINT "SkillHistory_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TalentPool" ADD CONSTRAINT "TalentPool_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
