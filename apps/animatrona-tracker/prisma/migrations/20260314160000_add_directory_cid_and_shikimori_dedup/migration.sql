-- directoryCid уже добавлен в миграции 20260314120000_add_directory_cid
-- Добавляем shikimoriId и replacesAnimeId
ALTER TABLE "Anime" ADD COLUMN "shikimoriId" INTEGER;
ALTER TABLE "Anime" ADD COLUMN "replacesAnimeId" TEXT;

-- CreateIndex: уникальность directoryCid (nullable unique — уникальны только non-null значения)
CREATE UNIQUE INDEX "Anime_directoryCid_key" ON "Anime"("directoryCid");

-- CreateIndex: индекс для быстрого поиска дубликатов по shikimoriId
CREATE INDEX "Anime_shikimoriId_idx" ON "Anime"("shikimoriId");

-- AddForeignKey: self-relation для кандидатов на замену
ALTER TABLE "Anime" ADD CONSTRAINT "Anime_replacesAnimeId_fkey" FOREIGN KEY ("replacesAnimeId") REFERENCES "Anime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
