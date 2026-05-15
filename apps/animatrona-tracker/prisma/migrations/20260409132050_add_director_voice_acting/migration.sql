-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "director" TEXT,
ADD COLUMN     "voiceActing" TEXT[];

-- CreateIndex
CREATE INDEX "Anime_studio_idx" ON "Anime"("studio");

-- CreateIndex
CREATE INDEX "Anime_director_idx" ON "Anime"("director");

-- CreateIndex
CREATE INDEX "Anime_year_idx" ON "Anime"("year");
