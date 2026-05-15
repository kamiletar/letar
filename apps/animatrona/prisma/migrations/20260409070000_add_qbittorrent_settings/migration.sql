-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "torrentBackend" TEXT NOT NULL DEFAULT 'webtorrent';
ALTER TABLE "Settings" ADD COLUMN "qbittorrentUrl" TEXT;
ALTER TABLE "Settings" ADD COLUMN "qbittorrentUsername" TEXT;
ALTER TABLE "Settings" ADD COLUMN "qbittorrentPassword" TEXT;
