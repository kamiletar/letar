-- AlterTable
ALTER TABLE "Anime" ADD COLUMN "contentHealth" TEXT;
ALTER TABLE "Anime" ADD COLUMN "lastHealthCheckAt" DATETIME;
ALTER TABLE "Anime" ADD COLUMN "missingCidsJson" TEXT;
ALTER TABLE "Anime" ADD COLUMN "missingFontsJson" TEXT;
