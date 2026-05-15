-- AlterTable
ALTER TABLE "Anime" ADD COLUMN "directoryBlocks" INTEGER;
ALTER TABLE "Anime" ADD COLUMN "directorySize" INTEGER;

-- AlterTable
ALTER TABLE "AudioTrack" ADD COLUMN "ipfsSize" INTEGER;

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "ipfsSize" INTEGER;

-- AlterTable
ALTER TABLE "SubtitleFont" ADD COLUMN "ipfsSize" INTEGER;

-- AlterTable
ALTER TABLE "SubtitleTrack" ADD COLUMN "ipfsSize" INTEGER;
