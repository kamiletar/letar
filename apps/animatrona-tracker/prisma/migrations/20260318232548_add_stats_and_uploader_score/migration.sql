-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "avgRating" DOUBLE PRECISION,
ADD COLUMN     "libraryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uploaderRank" TEXT DEFAULT 'Новичок',
ADD COLUMN     "uploaderScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Anime_viewCount_idx" ON "Anime"("viewCount");

-- CreateIndex
CREATE INDEX "Anime_avgRating_idx" ON "Anime"("avgRating");
