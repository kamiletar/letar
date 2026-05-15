-- CreateTable
CREATE TABLE "CidHistory" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "oldCid" TEXT NOT NULL,
    "newCid" TEXT NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleanedUp" BOOLEAN NOT NULL DEFAULT false,
    "cleanedUpAt" TIMESTAMP(3),

    CONSTRAINT "CidHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CidHistory_cleanedUp_replacedAt_idx" ON "CidHistory"("cleanedUp", "replacedAt");

-- CreateIndex
CREATE INDEX "CidHistory_animeId_idx" ON "CidHistory"("animeId");

-- AddForeignKey
ALTER TABLE "CidHistory" ADD CONSTRAINT "CidHistory_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
