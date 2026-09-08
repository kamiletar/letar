-- CreateTable
CREATE TABLE "Tracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'anime',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecentRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "directoryCid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "posterCid" TEXT,
    "episodesCount" INTEGER NOT NULL DEFAULT 0,
    "shikimoriId" INTEGER,
    "trackerId" TEXT,
    "firstOpenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecentRelease_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseKey" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "currentTime" REAL NOT NULL DEFAULT 0,
    "duration" REAL NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "selectedAudioTrackId" TEXT,
    "selectedSubtitleTrackId" TEXT,
    "lastWatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "ipfsRepoPath" TEXT,
    "ipfsStorageMaxGb" INTEGER NOT NULL DEFAULT 100,
    "minimizeToTray" BOOLEAN NOT NULL DEFAULT true,
    "closeToTray" BOOLEAN NOT NULL DEFAULT true,
    "showTrayNotification" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "skipOpening" BOOLEAN NOT NULL DEFAULT false,
    "skipEnding" BOOLEAN NOT NULL DEFAULT false,
    "autoplay" BOOLEAN NOT NULL DEFAULT true,
    "trackPreference" TEXT NOT NULL DEFAULT 'AUTO',
    "volume" REAL NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_url_key" ON "Tracker"("url");

-- CreateIndex
CREATE INDEX "Tracker_lastCheckedAt_idx" ON "Tracker"("lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecentRelease_directoryCid_key" ON "RecentRelease"("directoryCid");

-- CreateIndex
CREATE INDEX "RecentRelease_lastOpenedAt_idx" ON "RecentRelease"("lastOpenedAt");

-- CreateIndex
CREATE INDEX "RecentRelease_shikimoriId_idx" ON "RecentRelease"("shikimoriId");

-- CreateIndex
CREATE INDEX "WatchProgress_lastWatchedAt_idx" ON "WatchProgress"("lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchProgress_releaseKey_episodeNumber_key" ON "WatchProgress"("releaseKey", "episodeNumber");
