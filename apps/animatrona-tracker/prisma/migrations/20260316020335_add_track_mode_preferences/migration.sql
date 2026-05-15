-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredTrackMode" TEXT DEFAULT 'RUSSIAN_DUB';

-- AlterTable
ALTER TABLE "UserLibraryItem" ADD COLUMN     "trackMode" TEXT;

-- CreateTable
CREATE TABLE "DistributionStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalBytesUploaded" BIGINT NOT NULL DEFAULT 0,
    "totalBytesDownloaded" BIGINT NOT NULL DEFAULT 0,
    "totalSeedingTimeMs" BIGINT NOT NULL DEFAULT 0,
    "totalPeersHelped" INTEGER NOT NULL DEFAULT 0,
    "totalUptimeMs" BIGINT NOT NULL DEFAULT 0,
    "activeDistributions" INTEGER NOT NULL DEFAULT 0,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistributionStats_userId_key" ON "DistributionStats"("userId");

-- CreateIndex
CREATE INDEX "DistributionStats_userId_idx" ON "DistributionStats"("userId");

-- AddForeignKey
ALTER TABLE "DistributionStats" ADD CONSTRAINT "DistributionStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
