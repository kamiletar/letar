-- CreateEnum
CREATE TYPE "DepUpdateKind" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'NONE');

-- CreateEnum
CREATE TYPE "DepVulnSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DepRiskLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DepAnalysisStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'DONE', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'DEPS_VULNERABLE';
ALTER TYPE "AlertType" ADD VALUE 'DEPS_STALE';

-- CreateTable
CREATE TABLE "DepScan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'local',
    "gitCommit" TEXT NOT NULL,
    "gitBranch" TEXT NOT NULL,
    "lockfileUpdatedAt" TIMESTAMP(3),
    "lockfileCommit" TEXT,
    "bunVersion" TEXT NOT NULL,
    "scannerVersion" TEXT NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "outdatedCount" INTEGER NOT NULL,
    "majorCount" INTEGER NOT NULL,
    "minorCount" INTEGER NOT NULL,
    "patchCount" INTEGER NOT NULL,
    "vulnCount" INTEGER NOT NULL,
    "vulnCritical" INTEGER NOT NULL DEFAULT 0,
    "vulnHigh" INTEGER NOT NULL DEFAULT 0,
    "vulnModerate" INTEGER NOT NULL DEFAULT 0,
    "vulnLow" INTEGER NOT NULL DEFAULT 0,
    "pinnedOutdatedCount" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "analysisStatus" "DepAnalysisStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "analysisSummary" TEXT,
    "analysisAt" TIMESTAMP(3),
    "analysisModel" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rawAudit" JSONB,

    CONSTRAINT "DepScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepPackage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentVersion" TEXT,
    "wantedVersion" TEXT,
    "latestVersion" TEXT,
    "updateKind" "DepUpdateKind" NOT NULL DEFAULT 'NONE',
    "depType" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "vulnerable" BOOLEAN NOT NULL DEFAULT false,
    "maxSeverity" "DepVulnSeverity",
    "advisoryCount" INTEGER NOT NULL DEFAULT 0,
    "advisories" JSONB,
    "riskLevel" "DepRiskLevel" NOT NULL DEFAULT 'NONE',
    "analysisNote" TEXT,
    "analysisAt" TIMESTAMP(3),
    "analysisCarriedFrom" TEXT,
    "breakingChanges" BOOLEAN,

    CONSTRAINT "DepPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepScan_createdAt_idx" ON "DepScan"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "DepScan_analysisStatus_idx" ON "DepScan"("analysisStatus");

-- CreateIndex
CREATE INDEX "DepPackage_scanId_riskLevel_idx" ON "DepPackage"("scanId", "riskLevel");

-- CreateIndex
CREATE INDEX "DepPackage_name_createdAt_idx" ON "DepPackage"("name", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DepPackage_scanId_name_key" ON "DepPackage"("scanId", "name");

-- AddForeignKey
ALTER TABLE "DepPackage" ADD CONSTRAINT "DepPackage_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "DepScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
