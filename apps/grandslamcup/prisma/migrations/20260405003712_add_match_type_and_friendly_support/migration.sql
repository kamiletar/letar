-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('REGULAR', 'FRIENDLY');

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_tourId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "seasonId" TEXT,
ALTER COLUMN "tourId" DROP NOT NULL,
ALTER COLUMN "leagueId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "badges" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Match_seasonId_idx" ON "Match"("seasonId");

-- CreateIndex
CREATE INDEX "Match_matchType_idx" ON "Match"("matchType");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
