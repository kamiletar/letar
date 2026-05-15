-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "trackType" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "language" TEXT,
    "title" TEXT,
    "error" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "sourcePath" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportError_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ImportError_episodeId_idx" ON "ImportError"("episodeId");

-- CreateIndex
CREATE INDEX "ImportError_resolved_idx" ON "ImportError"("resolved");
