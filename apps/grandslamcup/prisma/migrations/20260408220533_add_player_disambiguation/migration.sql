-- AlterTable
ALTER TABLE "DonateLink" ADD COLUMN     "cityId" TEXT;

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "cityId" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "disambiguation" TEXT;

-- CreateTable
CREATE TABLE "FriendlyMatchRequest" (
    "id" TEXT NOT NULL,
    "fromTeamSeasonId" TEXT NOT NULL,
    "toTeamSeasonId" TEXT NOT NULL,
    "venueId" TEXT,
    "preferredDate" TIMESTAMP(3),
    "note" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendlyMatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FriendlyMatchRequest_fromTeamSeasonId_idx" ON "FriendlyMatchRequest"("fromTeamSeasonId");

-- CreateIndex
CREATE INDEX "FriendlyMatchRequest_toTeamSeasonId_idx" ON "FriendlyMatchRequest"("toTeamSeasonId");

-- CreateIndex
CREATE INDEX "FriendlyMatchRequest_status_idx" ON "FriendlyMatchRequest"("status");

-- CreateIndex
CREATE INDEX "DonateLink_cityId_idx" ON "DonateLink"("cityId");

-- CreateIndex
CREATE INDEX "NewsPost_cityId_idx" ON "NewsPost"("cityId");

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonateLink" ADD CONSTRAINT "DonateLink_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_fromTeamSeasonId_fkey" FOREIGN KEY ("fromTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_toTeamSeasonId_fkey" FOREIGN KEY ("toTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
