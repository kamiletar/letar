-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "skippedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuizSkippedQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSkippedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizSkippedQuestion_sessionId_idx" ON "QuizSkippedQuestion"("sessionId");

-- CreateIndex
CREATE INDEX "QuizSkippedQuestion_questionId_idx" ON "QuizSkippedQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSkippedQuestion_sessionId_questionId_key" ON "QuizSkippedQuestion"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "QuizSkippedQuestion" ADD CONSTRAINT "QuizSkippedQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSkippedQuestion" ADD CONSTRAINT "QuizSkippedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
