-- AlterTable: добавить directoryBlocks и directorySize в Anime
ALTER TABLE "Anime" ADD COLUMN "directoryBlocks" INTEGER;
ALTER TABLE "Anime" ADD COLUMN "directorySize" BIGINT;
