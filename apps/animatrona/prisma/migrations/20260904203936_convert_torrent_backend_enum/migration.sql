-- AlterTable
ALTER TABLE "Anime" ADD COLUMN "trackerAnimeId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "useGpu" BOOLEAN NOT NULL DEFAULT true,
    "videoCodec" TEXT NOT NULL DEFAULT 'AV1',
    "videoQuality" INTEGER NOT NULL DEFAULT 24,
    "videoPreset" TEXT NOT NULL DEFAULT 'p5',
    "audioBitrate" INTEGER NOT NULL DEFAULT 192,
    "libraryPath" TEXT,
    "outputPath" TEXT,
    "exportPath" TEXT,
    "ipfsStorageMaxGb" INTEGER NOT NULL DEFAULT 500,
    "minimizeToTray" BOOLEAN NOT NULL DEFAULT true,
    "closeToTray" BOOLEAN NOT NULL DEFAULT true,
    "showTrayNotification" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "skipOpening" BOOLEAN NOT NULL DEFAULT false,
    "skipEnding" BOOLEAN NOT NULL DEFAULT false,
    "autoplay" BOOLEAN NOT NULL DEFAULT true,
    "trackPreference" TEXT NOT NULL DEFAULT 'AUTO',
    "defaultProfileId" TEXT,
    "mobileAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mobileServerPort" INTEGER NOT NULL DEFAULT 4000,
    "torrentBackend" TEXT NOT NULL DEFAULT 'WEBTORRENT',
    "qbittorrentUrl" TEXT,
    "qbittorrentUsername" TEXT,
    "qbittorrentPassword" TEXT,
    "chaptersMigrated" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_defaultProfileId_fkey" FOREIGN KEY ("defaultProfileId") REFERENCES "EncodingProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("audioBitrate", "autoplay", "chaptersMigrated", "closeToTray", "darkMode", "defaultProfileId", "exportPath", "id", "ipfsStorageMaxGb", "language", "libraryPath", "minimizeToTray", "mobileAccessEnabled", "mobileServerPort", "outputPath", "qbittorrentPassword", "qbittorrentUrl", "qbittorrentUsername", "showTrayNotification", "skipEnding", "skipOpening", "torrentBackend", "trackPreference", "updatedAt", "useGpu", "videoCodec", "videoPreset", "videoQuality") SELECT "audioBitrate", "autoplay", "chaptersMigrated", "closeToTray", "darkMode", "defaultProfileId", "exportPath", "id", "ipfsStorageMaxGb", "language", "libraryPath", "minimizeToTray", "mobileAccessEnabled", "mobileServerPort", "outputPath", "qbittorrentPassword", "qbittorrentUrl", "qbittorrentUsername", "showTrayNotification", "skipEnding", "skipOpening", "torrentBackend", "trackPreference", "updatedAt", "useGpu", "videoCodec", "videoPreset", "videoQuality" FROM "Settings";

-- DataMigration: старые значения torrentBackend хранились в нижнем регистре ('webtorrent'/
-- 'qbittorrent'), новый enum-тип ожидает 'WEBTORRENT'/'QBITTORRENT'. Копия данных выше переносит
-- значение как есть, поэтому приводим его к верхнему регистру отдельным шагом — иначе у
-- существующих пользователей Prisma Client не сможет распарсить строку как enum-значение.
UPDATE "new_Settings" SET "torrentBackend" = UPPER("torrentBackend") WHERE "torrentBackend" IN ('webtorrent', 'qbittorrent');

DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
