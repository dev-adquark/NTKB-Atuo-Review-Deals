-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "uniquenessMinScore" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "maxRepeatedSectionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "batchSize" INTEGER NOT NULL DEFAULT 10,
    "maxConcurrency" INTEGER NOT NULL DEFAULT 2,
    "dailyGenerationLimit" INTEGER NOT NULL DEFAULT 50,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireAffiliateMapping" BOOLEAN NOT NULL DEFAULT true,
    "networkFallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gscHardGate" BOOLEAN NOT NULL DEFAULT false,
    "maxGscRetries" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
