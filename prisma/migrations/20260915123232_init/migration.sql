-- CreateEnum
CREATE TYPE "RegionCode" AS ENUM ('US', 'EU', 'AU', 'IN');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('KEYWORD_REVIEW', 'BRAND_REVIEW', 'TOP_PICKS');

-- CreateEnum
CREATE TYPE "KeywordStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AffiliateSource" AS ENUM ('ADMIN', 'NETWORK');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'GENERATING', 'GENERATED', 'VALIDATING', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'GENERATED', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "GscStatus" AS ENUM ('QUEUED', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "code" "RegionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "urlPrefix" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "regionId" TEXT NOT NULL,
    "pageType" "PageType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "KeywordStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetBrandIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandRanking" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateMapping" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" "AffiliateSource" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredPlacement" (
    "id" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "sponsorLabel" TEXT NOT NULL DEFAULT 'Sponsored — Brand Spotlight',
    "disclosure" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "providerName" TEXT NOT NULL DEFAULT 'Content Generation Engine',
    "apiBaseUrl" TEXT NOT NULL DEFAULT '',
    "generationEndpoint" TEXT NOT NULL DEFAULT '/v1/generate',
    "apiKeyEncrypted" TEXT,
    "authMethod" TEXT NOT NULL DEFAULT 'bearer',
    "apiVersion" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "retryCount" INTEGER NOT NULL DEFAULT 2,
    "customHeaders" JSONB,
    "webhookUrl" TEXT,
    "mockMode" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT,
    "brandId" TEXT,
    "regionId" TEXT NOT NULL,
    "pageType" "PageType" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "configVersion" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "requestId" TEXT,
    "apiVersion" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPage" (
    "id" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "keywordId" TEXT,
    "brandId" TEXT,
    "regionId" TEXT NOT NULL,
    "pageType" "PageType" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "canonicalPath" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "internalLinks" JSONB,
    "contentHash" TEXT NOT NULL,
    "uniquenessScore" DOUBLE PRECISION,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "validationReport" JSONB,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSCSubmission" (
    "id" TEXT NOT NULL,
    "generatedPageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "GscStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "response" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GSCSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Region_urlPrefix_key" ON "Region"("urlPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_regionId_slug_key" ON "Keyword"("regionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BrandRanking_brandId_regionId_key" ON "BrandRanking"("brandId", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateMapping_brandId_regionId_key" ON "AffiliateMapping"("brandId", "regionId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE INDEX "GenerationJob_regionId_pageType_idx" ON "GenerationJob"("regionId", "pageType");

-- CreateIndex
CREATE INDEX "GeneratedPage_regionId_pageType_keywordId_brandId_idx" ON "GeneratedPage"("regionId", "pageType", "keywordId", "brandId");

-- CreateIndex
CREATE INDEX "GeneratedPage_regionId_slug_idx" ON "GeneratedPage"("regionId", "slug");

-- CreateIndex
CREATE INDEX "GeneratedPage_status_idx" ON "GeneratedPage"("status");

-- CreateIndex
CREATE INDEX "GSCSubmission_status_idx" ON "GSCSubmission"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandRanking" ADD CONSTRAINT "BrandRanking_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandRanking" ADD CONSTRAINT "BrandRanking_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMapping" ADD CONSTRAINT "AffiliateMapping_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMapping" ADD CONSTRAINT "AffiliateMapping_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredPlacement" ADD CONSTRAINT "SponsoredPlacement_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredPlacement" ADD CONSTRAINT "SponsoredPlacement_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPage" ADD CONSTRAINT "GeneratedPage_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPage" ADD CONSTRAINT "GeneratedPage_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPage" ADD CONSTRAINT "GeneratedPage_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPage" ADD CONSTRAINT "GeneratedPage_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSCSubmission" ADD CONSTRAINT "GSCSubmission_generatedPageId_fkey" FOREIGN KEY ("generatedPageId") REFERENCES "GeneratedPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
