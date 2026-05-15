/*
  Warnings:

  - The `status` column on the `FriendlyMatchRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "FriendlyRequestStatus" AS ENUM ('CHALLENGE_SENT', 'ACCEPTED', 'DECLINED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "FriendlyMatchRequest" ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "respondedById" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "FriendlyRequestStatus" NOT NULL DEFAULT 'CHALLENGE_SENT';

-- CreateIndex
CREATE INDEX "FriendlyMatchRequest_status_idx" ON "FriendlyMatchRequest"("status");

-- AddForeignKey
ALTER TABLE "FriendlyMatchRequest" ADD CONSTRAINT "FriendlyMatchRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
