/*
  Warnings:

  - You are about to drop the column `path` on the `File` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ShikimoriStudio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shikimoriId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShikimoriPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shikimoriId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "imageUrl" TEXT,
    "imageCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShikimoriCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shikimoriId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "imageUrl" TEXT,
    "imageCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "blurDataURL" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT,
    "cid" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_File" ("blurDataURL", "category", "cid", "filename", "height", "id", "mimeType", "size", "source", "uploadedAt", "width") SELECT "blurDataURL", "category", "cid", "filename", "height", "id", "mimeType", "size", "source", "uploadedAt", "width" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
CREATE UNIQUE INDEX "File_cid_key" ON "File"("cid");
CREATE INDEX "File_category_idx" ON "File"("category");
CREATE INDEX "File_uploadedAt_idx" ON "File"("uploadedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShikimoriStudio_shikimoriId_key" ON "ShikimoriStudio"("shikimoriId");

-- CreateIndex
CREATE INDEX "ShikimoriStudio_name_idx" ON "ShikimoriStudio"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShikimoriPerson_shikimoriId_key" ON "ShikimoriPerson"("shikimoriId");

-- CreateIndex
CREATE INDEX "ShikimoriPerson_name_idx" ON "ShikimoriPerson"("name");

-- CreateIndex
CREATE INDEX "ShikimoriPerson_nameRu_idx" ON "ShikimoriPerson"("nameRu");

-- CreateIndex
CREATE UNIQUE INDEX "ShikimoriCharacter_shikimoriId_key" ON "ShikimoriCharacter"("shikimoriId");

-- CreateIndex
CREATE INDEX "ShikimoriCharacter_name_idx" ON "ShikimoriCharacter"("name");

-- CreateIndex
CREATE INDEX "ShikimoriCharacter_nameRu_idx" ON "ShikimoriCharacter"("nameRu");
