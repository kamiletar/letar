-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AudioTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'und',
    "title" TEXT,
    "dubGroup" TEXT,
    "codec" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "bitrate" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "transcodedCid" TEXT,
    "ipfsSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AudioTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AudioTrack" ("bitrate", "channels", "codec", "createdAt", "dubGroup", "episodeId", "id", "ipfsSize", "isDefault", "language", "streamIndex", "title", "transcodedCid", "updatedAt") SELECT "bitrate", "channels", "codec", "createdAt", "dubGroup", "episodeId", "id", "ipfsSize", "isDefault", "language", "streamIndex", "title", "transcodedCid", "updatedAt" FROM "AudioTrack";
DROP TABLE "AudioTrack";
ALTER TABLE "new_AudioTrack" RENAME TO "AudioTrack";
CREATE INDEX "AudioTrack_episodeId_idx" ON "AudioTrack"("episodeId");
CREATE TABLE "new_SubtitleTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL DEFAULT -1,
    "language" TEXT NOT NULL DEFAULT 'und',
    "title" TEXT,
    "dubGroup" TEXT,
    "subtitleType" TEXT NOT NULL DEFAULT 'full',
    "format" TEXT NOT NULL,
    "fileCid" TEXT,
    "ipfsSize" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubtitleTrack" ("createdAt", "dubGroup", "episodeId", "fileCid", "format", "id", "ipfsSize", "isDefault", "language", "streamIndex", "subtitleType", "title") SELECT "createdAt", "dubGroup", "episodeId", "fileCid", "format", "id", "ipfsSize", "isDefault", "language", "streamIndex", "subtitleType", "title" FROM "SubtitleTrack";
DROP TABLE "SubtitleTrack";
ALTER TABLE "new_SubtitleTrack" RENAME TO "SubtitleTrack";
CREATE INDEX "SubtitleTrack_episodeId_idx" ON "SubtitleTrack"("episodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
