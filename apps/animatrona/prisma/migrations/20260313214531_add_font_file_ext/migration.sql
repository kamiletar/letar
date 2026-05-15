-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubtitleFont" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtitleTrackId" TEXT NOT NULL,
    "fontName" TEXT NOT NULL,
    "fileExt" TEXT NOT NULL DEFAULT 'ttf',
    "fileCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleFont_subtitleTrackId_fkey" FOREIGN KEY ("subtitleTrackId") REFERENCES "SubtitleTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubtitleFont" ("createdAt", "fileCid", "fontName", "id", "subtitleTrackId") SELECT "createdAt", "fileCid", "fontName", "id", "subtitleTrackId" FROM "SubtitleFont";
DROP TABLE "SubtitleFont";
ALTER TABLE "new_SubtitleFont" RENAME TO "SubtitleFont";
CREATE INDEX "SubtitleFont_subtitleTrackId_idx" ON "SubtitleFont"("subtitleTrackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
