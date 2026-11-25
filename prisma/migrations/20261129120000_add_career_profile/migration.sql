-- Career Profile: preferences, education, work experience, certifications.
-- Additive only: four new tables.

-- CreateTable
CREATE TABLE "CareerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employmentStatus" TEXT,
    "currentlyStudent" BOOLEAN,
    "yearsExperience" INTEGER,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exploring" BOOLEAN NOT NULL DEFAULT false,
    "desiredTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "longTermGoal" TEXT,
    "targetCareer" TEXT,
    "targetSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progression" TEXT,
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workArrangements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "jobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "willingToRelocate" BOOLEAN,
    "preferredIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT,
    "level" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "graduationDate" TIMESTAMP(3),
    "verification" TEXT NOT NULL DEFAULT 'self_reported',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "industry" TEXT,
    "employmentType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "verification" TEXT NOT NULL DEFAULT 'self_reported',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'certification',
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "verification" TEXT NOT NULL DEFAULT 'self_reported',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");

-- CreateIndex
CREATE INDEX "EducationRecord_userId_idx" ON "EducationRecord"("userId");

-- CreateIndex
CREATE INDEX "WorkExperience_userId_idx" ON "WorkExperience"("userId");

-- CreateIndex
CREATE INDEX "CertificationRecord_userId_idx" ON "CertificationRecord"("userId");

-- AddForeignKey
ALTER TABLE "CareerProfile" ADD CONSTRAINT "CareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationRecord" ADD CONSTRAINT "EducationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationRecord" ADD CONSTRAINT "CertificationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

