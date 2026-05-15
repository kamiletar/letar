-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('NOT_STARTED', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLANNED');

-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "anilistId" INTEGER,
ADD COLUMN     "malId" INTEGER;

-- CreateTable
CREATE TABLE "UserLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "watchStatus" "WatchStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "userRating" INTEGER,
    "pinnedLocally" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWatchProgress" (
    "id" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "currentTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "audioTrackIndex" INTEGER NOT NULL DEFAULT 0,
    "subtitleTrackIndex" INTEGER NOT NULL DEFAULT -1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLibraryItem_userId_idx" ON "UserLibraryItem"("userId");

-- CreateIndex
CREATE INDEX "UserLibraryItem_animeId_idx" ON "UserLibraryItem"("animeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLibraryItem_userId_animeId_key" ON "UserLibraryItem"("userId", "animeId");

-- CreateIndex
CREATE INDEX "UserWatchProgress_libraryItemId_idx" ON "UserWatchProgress"("libraryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWatchProgress_libraryItemId_episodeNumber_key" ON "UserWatchProgress"("libraryItemId", "episodeNumber");

-- AddForeignKey
ALTER TABLE "UserLibraryItem" ADD CONSTRAINT "UserLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLibraryItem" ADD CONSTRAINT "UserLibraryItem_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWatchProgress" ADD CONSTRAINT "UserWatchProgress_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "UserLibraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
