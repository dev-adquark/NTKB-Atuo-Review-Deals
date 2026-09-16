-- AlterTable
ALTER TABLE "ContentEngineConfig" ADD COLUMN     "defaultMaxWords" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN     "defaultTone" TEXT NOT NULL DEFAULT 'professional',
ADD COLUMN     "factualityMode" TEXT NOT NULL DEFAULT 'standard';
