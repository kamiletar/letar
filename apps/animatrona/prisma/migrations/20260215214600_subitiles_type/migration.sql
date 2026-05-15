-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubtitleTrack" ("createdAt", "dubGroup", "episodeId", "fileCid", "format", "id", "isDefault", "language", "streamIndex", "title") SELECT "createdAt", "dubGroup", "episodeId", "fileCid", "format", "id", "isDefault", "language", "streamIndex", "title" FROM "SubtitleTrack";
DROP TABLE "SubtitleTrack";
ALTER TABLE "new_SubtitleTrack" RENAME TO "SubtitleTrack";
CREATE INDEX "SubtitleTrack_episodeId_idx" ON "SubtitleTrack"("episodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
