-- Two-step login (authenticator app codes and recovery codes).
-- Additive only: four new nullable/defaulted columns on User.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabledAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorLastStep" INTEGER,
ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT;
