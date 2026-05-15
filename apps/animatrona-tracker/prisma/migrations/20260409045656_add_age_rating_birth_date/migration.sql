-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "ageRating" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AnimeRelation" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "targetShikimoriId" INTEGER NOT NULL,
    "targetAnimeId" TEXT,
    "relationKind" TEXT NOT NULL,

    CONSTRAINT "AnimeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnimeRelation_animeId_idx" ON "AnimeRelation"("animeId");

-- CreateIndex
CREATE INDEX "AnimeRelation_targetShikimoriId_idx" ON "AnimeRelation"("targetShikimoriId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeRelation_animeId_targetShikimoriId_relationKind_key" ON "AnimeRelation"("animeId", "targetShikimoriId", "relationKind");

-- AddForeignKey
ALTER TABLE "AnimeRelation" ADD CONSTRAINT "AnimeRelation_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeRelation" ADD CONSTRAINT "AnimeRelation_targetAnimeId_fkey" FOREIGN KEY ("targetAnimeId") REFERENCES "Anime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
