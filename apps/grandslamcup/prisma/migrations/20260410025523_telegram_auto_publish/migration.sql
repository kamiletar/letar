-- AlterTable
ALTER TABLE "TelegramConfig" ADD COLUMN     "autoAnnouncement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoHalfTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoResult" BOOLEAN NOT NULL DEFAULT false;
