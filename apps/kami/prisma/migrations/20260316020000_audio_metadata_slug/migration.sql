-- AlterTable
ALTER TABLE "AudioFile" ADD COLUMN "artist" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "album" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "coverPath" TEXT;
ALTER TABLE "AudioFile" ADD COLUMN "bitrate" INTEGER;

-- Генерируем slug из id для существующих записей
ALTER TABLE "AudioFile" ADD COLUMN "slug" TEXT;
UPDATE "AudioFile" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "AudioFile" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AudioFile_slug_key" ON "AudioFile"("slug");
