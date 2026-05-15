-- AlterTable
ALTER TABLE "Player" ADD COLUMN "badges" TEXT[] DEFAULT ARRAY[]::TEXT[];
