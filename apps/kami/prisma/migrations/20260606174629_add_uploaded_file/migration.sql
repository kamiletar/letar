/*
  Warnings:

  - You are about to drop the `QuizAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizLeaderboardEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizSkippedQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserQuizAchievement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "QuizLeaderboardEntry" DROP CONSTRAINT "QuizLeaderboardEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizSession" DROP CONSTRAINT "QuizSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizSkippedQuestion" DROP CONSTRAINT "QuizSkippedQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuizSkippedQuestion" DROP CONSTRAINT "QuizSkippedQuestion_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuizAchievement" DROP CONSTRAINT "UserQuizAchievement_userId_fkey";

-- DropTable
DROP TABLE "QuizAnswer";

-- DropTable
DROP TABLE "QuizLeaderboardEntry";

-- DropTable
DROP TABLE "QuizQuestion";

-- DropTable
DROP TABLE "QuizSession";

-- DropTable
DROP TABLE "QuizSkippedQuestion";

-- DropTable
DROP TABLE "UserQuizAchievement";

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_path_key" ON "UploadedFile"("path");

-- CreateIndex
CREATE INDEX "UploadedFile_path_idx" ON "UploadedFile"("path");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
