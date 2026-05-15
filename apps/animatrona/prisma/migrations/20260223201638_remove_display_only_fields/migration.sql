/*
  Warnings:

  - You are about to drop the column `ageRating` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `licensor` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `nextEpisodeAt` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `encodingSettingsJson` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `sourceMetadataJson` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `sourceSize` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `transcodedSize` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `videoBitrate` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `videoCodec` on the `Episode` table. All the data in the column will be lost.

*/
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
    "manifestCid" TEXT,
    "shikimoriId" INTEGER,
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
INSERT INTO "new_Anime" ("createdAt", "episodeCount", "folderPath", "franchiseId", "id", "isBdRemux", "lastSelectedAudioDubGroup", "lastSelectedAudioLanguage", "lastSelectedSubtitleDubGroup", "lastSelectedSubtitleLanguage", "manifestCid", "name", "nameEn", "originalName", "posterCid", "posterId", "rating", "relationsCheckedAt", "shikimoriId", "status", "synonyms", "updatedAt", "userRating", "watchStatus", "watchedAt", "year") SELECT "createdAt", "episodeCount", "folderPath", "franchiseId", "id", "isBdRemux", "lastSelectedAudioDubGroup", "lastSelectedAudioLanguage", "lastSelectedSubtitleDubGroup", "lastSelectedSubtitleLanguage", "manifestCid", "name", "nameEn", "originalName", "posterCid", "posterId", "rating", "relationsCheckedAt", "shikimoriId", "status", "synonyms", "updatedAt", "userRating", "watchStatus", "watchedAt", "year" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_shikimoriId_key" ON "Anime"("shikimoriId");
CREATE INDEX "Anime_name_idx" ON "Anime"("name");
CREATE INDEX "Anime_year_idx" ON "Anime"("year");
CREATE INDEX "Anime_status_idx" ON "Anime"("status");
CREATE INDEX "Anime_shikimoriId_idx" ON "Anime"("shikimoriId");
CREATE INDEX "Anime_franchiseId_idx" ON "Anime"("franchiseId");
CREATE INDEX "Anime_watchStatus_idx" ON "Anime"("watchStatus");
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeId" TEXT NOT NULL,
    "seasonId" TEXT,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "durationMs" INTEGER,
    "folderPath" TEXT,
    "videoWidth" INTEGER,
    "videoHeight" INTEGER,
    "videoBitDepth" INTEGER,
    "encodingProfileId" TEXT,
    "transcodedCid" TEXT,
    "manifestCid" TEXT,
    "thumbnailCids" TEXT,
    "screenshotCids" TEXT,
    "metadataCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Episode_encodingProfileId_fkey" FOREIGN KEY ("encodingProfileId") REFERENCES "EncodingProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("animeId", "createdAt", "durationMs", "encodingProfileId", "folderPath", "id", "manifestCid", "metadataCid", "name", "number", "screenshotCids", "seasonId", "thumbnailCids", "transcodedCid", "updatedAt", "videoBitDepth", "videoHeight", "videoWidth") SELECT "animeId", "createdAt", "durationMs", "encodingProfileId", "folderPath", "id", "manifestCid", "metadataCid", "name", "number", "screenshotCids", "seasonId", "thumbnailCids", "transcodedCid", "updatedAt", "videoBitDepth", "videoHeight", "videoWidth" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE INDEX "Episode_animeId_idx" ON "Episode"("animeId");
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");
CREATE UNIQUE INDEX "Episode_animeId_number_key" ON "Episode"("animeId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
