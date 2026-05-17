-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPoem" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "poemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AlbumPoem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Album_playerId_idx" ON "Album"("playerId");

-- CreateIndex
CREATE INDEX "Album_playerId_publishedAt_idx" ON "Album"("playerId", "publishedAt");

-- CreateIndex
CREATE INDEX "AlbumPoem_albumId_sortOrder_idx" ON "AlbumPoem"("albumId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumPoem_albumId_poemId_key" ON "AlbumPoem"("albumId", "poemId");

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPoem" ADD CONSTRAINT "AlbumPoem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPoem" ADD CONSTRAINT "AlbumPoem_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "Poem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
