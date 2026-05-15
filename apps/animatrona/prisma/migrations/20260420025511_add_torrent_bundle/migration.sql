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
    "torrentBackend" TEXT NOT NULL DEFAULT 'webtorrent',
    "qbittorrentUrl" TEXT,
    "qbittorrentUsername" TEXT,
    "qbittorrentPassword" TEXT,
    "chaptersMigrated" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_defaultProfileId_fkey" FOREIGN KEY ("defaultProfileId") REFERENCES "EncodingProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("audioBitrate", "autoplay", "chaptersMigrated", "closeToTray", "darkMode", "defaultProfileId", "exportPath", "id", "language", "libraryPath", "minimizeToTray", "mobileAccessEnabled", "mobileServerPort", "outputPath", "qbittorrentPassword", "qbittorrentUrl", "qbittorrentUsername", "showTrayNotification", "skipEnding", "skipOpening", "torrentBackend", "trackPreference", "updatedAt", "useGpu", "videoCodec", "videoPreset", "videoQuality") SELECT "audioBitrate", "autoplay", "chaptersMigrated", "closeToTray", "darkMode", "defaultProfileId", "exportPath", "id", "language", "libraryPath", "minimizeToTray", "mobileAccessEnabled", "mobileServerPort", "outputPath", "qbittorrentPassword", "qbittorrentUrl", "qbittorrentUsername", "showTrayNotification", "skipEnding", "skipOpening", "torrentBackend", "trackPreference", "updatedAt", "useGpu", "videoCodec", "videoPreset", "videoQuality" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE TABLE "new_TorrentDownload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "infoHash" TEXT NOT NULL,
    "magnetURI" TEXT NOT NULL,
    "name" TEXT,
    "downloadPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'adding',
    "importStatus" TEXT NOT NULL DEFAULT 'none',
    "targetRatio" REAL NOT NULL DEFAULT 2.0,
    "shikimoriId" INTEGER,
    "animeName" TEXT,
    "rutrackerUrl" TEXT,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "bundleAnimesJson" TEXT,
    "error" TEXT,
    "bitfield" TEXT,
    "fileModtimes" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TorrentDownload" ("addedAt", "animeName", "bitfield", "downloadPath", "error", "fileModtimes", "id", "importStatus", "infoHash", "magnetURI", "name", "rutrackerUrl", "shikimoriId", "status", "targetRatio", "updatedAt") SELECT "addedAt", "animeName", "bitfield", "downloadPath", "error", "fileModtimes", "id", "importStatus", "infoHash", "magnetURI", "name", "rutrackerUrl", "shikimoriId", "status", "targetRatio", "updatedAt" FROM "TorrentDownload";
DROP TABLE "TorrentDownload";
ALTER TABLE "new_TorrentDownload" RENAME TO "TorrentDownload";
CREATE UNIQUE INDEX "TorrentDownload_infoHash_key" ON "TorrentDownload"("infoHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
