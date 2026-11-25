-- Feedback on job recommendations. Additive only: one new table.

-- CreateTable
CREATE TABLE "JobFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobRef" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobFeedback_userId_jobRef_key" ON "JobFeedback"("userId", "jobRef");

-- AddForeignKey
ALTER TABLE "JobFeedback" ADD CONSTRAINT "JobFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

