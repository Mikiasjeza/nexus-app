-- Skill Passport views, for Career+ insights. Additive only: one new table.

-- CreateTable
CREATE TABLE "PassportView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassportView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassportView_userId_createdAt_idx" ON "PassportView"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PassportView" ADD CONSTRAINT "PassportView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
