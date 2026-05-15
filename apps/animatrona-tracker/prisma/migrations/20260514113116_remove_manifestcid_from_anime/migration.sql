/*
  Warnings:

  - You are about to drop the column `manifestCid` on the `Anime` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Anime_manifestCid_key";

-- AlterTable
ALTER TABLE "Anime" DROP COLUMN "manifestCid";
