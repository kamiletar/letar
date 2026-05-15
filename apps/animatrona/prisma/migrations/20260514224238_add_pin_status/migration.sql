-- CreateTable
CREATE TABLE "PinStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    "queuedAt" DATETIME,
    "pinnedAt" DATETIME,
    "errorMsg" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PinStatus_cid_key" ON "PinStatus"("cid");

-- CreateIndex
CREATE INDEX "PinStatus_status_idx" ON "PinStatus"("status");

-- CreateIndex
CREATE INDEX "PinStatus_createdAt_idx" ON "PinStatus"("createdAt");
