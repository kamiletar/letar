-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "pinnedOnId" TEXT;

-- AddForeignKey
ALTER TABLE "Anime" ADD CONSTRAINT "Anime_pinnedOnId_fkey" FOREIGN KEY ("pinnedOnId") REFERENCES "PinServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
