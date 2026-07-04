-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "isValid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "validityFlags" TEXT;
