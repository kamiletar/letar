-- CreateTable
CREATE TABLE "AnimeComment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnimeComment_animeId_createdAt_idx" ON "AnimeComment"("animeId", "createdAt");

-- CreateIndex
CREATE INDEX "AnimeComment_parentId_idx" ON "AnimeComment"("parentId");

-- AddForeignKey
ALTER TABLE "AnimeComment" ADD CONSTRAINT "AnimeComment_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeComment" ADD CONSTRAINT "AnimeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeComment" ADD CONSTRAINT "AnimeComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AnimeComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
