/*
  Warnings:

  - You are about to drop the column `targetKind` on the `AnimeRelation` table. All the data in the column will be lost.
  - You are about to drop the column `targetName` on the `AnimeRelation` table. All the data in the column will be lost.
  - You are about to drop the column `targetPosterUrl` on the `AnimeRelation` table. All the data in the column will be lost.
  - You are about to drop the column `targetYear` on the `AnimeRelation` table. All the data in the column will be lost.
  - You are about to drop the column `graphJson` on the `Franchise` table. All the data in the column will be lost.
  - You are about to drop the column `shikimoriFranchiseId` on the `Franchise` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnimeRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceAnimeId" TEXT NOT NULL,
    "targetShikimoriId" INTEGER NOT NULL,
    "targetAnimeId" TEXT,
    "relationKind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnimeRelation_sourceAnimeId_fkey" FOREIGN KEY ("sourceAnimeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnimeRelation_targetAnimeId_fkey" FOREIGN KEY ("targetAnimeId") REFERENCES "Anime" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AnimeRelation" ("createdAt", "id", "relationKind", "sourceAnimeId", "targetAnimeId", "targetShikimoriId") SELECT "createdAt", "id", "relationKind", "sourceAnimeId", "targetAnimeId", "targetShikimoriId" FROM "AnimeRelation";
DROP TABLE "AnimeRelation";
ALTER TABLE "new_AnimeRelation" RENAME TO "AnimeRelation";
CREATE INDEX "AnimeRelation_sourceAnimeId_idx" ON "AnimeRelation"("sourceAnimeId");
CREATE INDEX "AnimeRelation_targetAnimeId_idx" ON "AnimeRelation"("targetAnimeId");
CREATE INDEX "AnimeRelation_targetShikimoriId_idx" ON "AnimeRelation"("targetShikimoriId");
CREATE UNIQUE INDEX "AnimeRelation_sourceAnimeId_targetShikimoriId_key" ON "AnimeRelation"("sourceAnimeId", "targetShikimoriId");
CREATE TABLE "new_Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rootShikimoriId" INTEGER,
    "graphCid" TEXT,
    "graphUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Franchise" ("createdAt", "graphUpdatedAt", "id", "name", "rootShikimoriId", "updatedAt") SELECT "createdAt", "graphUpdatedAt", "id", "name", "rootShikimoriId", "updatedAt" FROM "Franchise";
DROP TABLE "Franchise";
ALTER TABLE "new_Franchise" RENAME TO "Franchise";
CREATE UNIQUE INDEX "Franchise_rootShikimoriId_key" ON "Franchise"("rootShikimoriId");
CREATE INDEX "Franchise_rootShikimoriId_idx" ON "Franchise"("rootShikimoriId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
