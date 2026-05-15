-- CreateTable
CREATE TABLE "TorrentDownload" (
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
    "error" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TorrentDownload_infoHash_key" ON "TorrentDownload"("infoHash");
