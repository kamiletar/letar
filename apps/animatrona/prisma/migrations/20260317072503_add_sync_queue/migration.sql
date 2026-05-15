-- CreateTable
CREATE TABLE "SyncQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT
);

-- CreateIndex
CREATE INDEX "SyncQueueItem_createdAt_idx" ON "SyncQueueItem"("createdAt");
