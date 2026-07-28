-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "nameEn" TEXT,
    "synonyms" TEXT,
    "year" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "posterId" TEXT,
    "posterCid" TEXT,
    "rating" REAL,
    "folderPath" TEXT,
    "isBdRemux" BOOLEAN NOT NULL DEFAULT false,
    "animeInfoCid" TEXT,
    "directoryCid" TEXT,
    "directoryBlocks" INTEGER,
    "directorySize" INTEGER,
    "contentHealth" TEXT,
    "missingCidsJson" TEXT,
    "missingFontsJson" TEXT,
    "lastHealthCheckAt" DATETIME,
    "ageRating" TEXT,
    "pinnedLocally" BOOLEAN NOT NULL DEFAULT true,
    "needsReupload" BOOLEAN NOT NULL DEFAULT false,
    "trackerPublishedAt" DATETIME,
    "trackerPublishedCid" TEXT,
    "shikimoriId" INTEGER,
    "rutrackerUrl" TEXT,
    "franchiseId" TEXT,
    "lastSelectedAudioDubGroup" TEXT,
    "lastSelectedAudioLanguage" TEXT,
    "lastSelectedSubtitleDubGroup" TEXT,
    "lastSelectedSubtitleLanguage" TEXT,
    "relationsCheckedAt" DATETIME,
    "watchStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "watchedAt" DATETIME,
    "userRating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Anime_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Anime_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Anime" ("ageRating", "animeInfoCid", "contentHealth", "createdAt", "directoryBlocks", "directoryCid", "directorySize", "episodeCount", "folderPath", "franchiseId", "id", "isBdRemux", "lastHealthCheckAt", "lastSelectedAudioDubGroup", "lastSelectedAudioLanguage", "lastSelectedSubtitleDubGroup", "lastSelectedSubtitleLanguage", "missingCidsJson", "missingFontsJson", "name", "nameEn", "originalName", "pinnedLocally", "posterCid", "posterId", "rating", "relationsCheckedAt", "rutrackerUrl", "shikimoriId", "status", "synonyms", "trackerPublishedAt", "trackerPublishedCid", "updatedAt", "userRating", "watchStatus", "watchedAt", "year") SELECT "ageRating", "animeInfoCid", "contentHealth", "createdAt", "directoryBlocks", "directoryCid", "directorySize", "episodeCount", "folderPath", "franchiseId", "id", "isBdRemux", "lastHealthCheckAt", "lastSelectedAudioDubGroup", "lastSelectedAudioLanguage", "lastSelectedSubtitleDubGroup", "lastSelectedSubtitleLanguage", "missingCidsJson", "missingFontsJson", "name", "nameEn", "originalName", "pinnedLocally", "posterCid", "posterId", "rating", "relationsCheckedAt", "rutrackerUrl", "shikimoriId", "status", "synonyms", "trackerPublishedAt", "trackerPublishedCid", "updatedAt", "userRating", "watchStatus", "watchedAt", "year" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_shikimoriId_key" ON "Anime"("shikimoriId");
CREATE INDEX "Anime_name_idx" ON "Anime"("name");
CREATE INDEX "Anime_year_idx" ON "Anime"("year");
CREATE INDEX "Anime_status_idx" ON "Anime"("status");
CREATE INDEX "Anime_shikimoriId_idx" ON "Anime"("shikimoriId");
CREATE INDEX "Anime_franchiseId_idx" ON "Anime"("franchiseId");
CREATE INDEX "Anime_watchStatus_idx" ON "Anime"("watchStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DataMigration: вся библиотека на момент миграции раздавалась через утраченный
-- pinner-сервер — помечаем всё существующее как требующее перезаливки.
-- Новые записи (INSERT после этой миграции) получают needsReupload=false по умолчанию.
UPDATE "Anime" SET "needsReupload" = true;
