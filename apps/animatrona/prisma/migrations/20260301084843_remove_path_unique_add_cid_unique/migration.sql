-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "path" TEXT,
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
INSERT INTO "new_File" ("blurDataURL", "category", "cid", "filename", "height", "id", "mimeType", "path", "size", "source", "uploadedAt", "width") SELECT "blurDataURL", "category", "cid", "filename", "height", "id", "mimeType", "path", "size", "source", "uploadedAt", "width" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
CREATE UNIQUE INDEX "File_cid_key" ON "File"("cid");
CREATE INDEX "File_category_idx" ON "File"("category");
CREATE INDEX "File_uploadedAt_idx" ON "File"("uploadedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
