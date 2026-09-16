-- AlterTable
ALTER TABLE "GeneratedPage" ADD COLUMN     "lastRefreshAttemptAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "refreshEligibleDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "refreshEnabled" BOOLEAN NOT NULL DEFAULT false;
