-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "victoryPoemPlayerId" TEXT;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_victoryPoemPlayerId_fkey" FOREIGN KEY ("victoryPoemPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
