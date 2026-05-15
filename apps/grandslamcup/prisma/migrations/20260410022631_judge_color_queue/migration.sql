-- CreateEnum
CREATE TYPE "JudgeColor" AS ENUM ('RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE');

-- CreateEnum
CREATE TYPE "JudgeStatus" AS ENUM ('ACTIVE', 'RECUSED', 'QUEUED');

-- AlterTable
ALTER TABLE "JudgeSession" ADD COLUMN     "color" "JudgeColor",
ADD COLUMN     "queuePosition" INTEGER,
ADD COLUMN     "status" "JudgeStatus" NOT NULL DEFAULT 'ACTIVE';
