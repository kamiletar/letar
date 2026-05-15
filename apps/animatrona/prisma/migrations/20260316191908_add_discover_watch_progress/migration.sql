-- CreateTable
CREATE TABLE "DiscoverWatchProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shikimoriId" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "currentTime" REAL NOT NULL DEFAULT 0,
    "duration" REAL NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "selectedAudioTrackId" TEXT,
    "selectedSubtitleTrackId" TEXT,
    "animeName" TEXT NOT NULL DEFAULT '',
    "posterCid" TEXT,
    "trackerAnimeId" TEXT,
    "directoryCid" TEXT,
    "lastWatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DiscoverWatchProgress_lastWatchedAt_idx" ON "DiscoverWatchProgress"("lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverWatchProgress_shikimoriId_episodeNumber_key" ON "DiscoverWatchProgress"("shikimoriId", "episodeNumber");
