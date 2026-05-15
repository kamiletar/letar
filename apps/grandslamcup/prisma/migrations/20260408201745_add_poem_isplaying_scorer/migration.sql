/*
  Warnings:

  - The values [PLAYING_COACH,PRODUCER] on the enum `PlayerRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "PlayerRole_new" AS ENUM ('PLAYER', 'COACH', 'ASSISTANT_COACH');
ALTER TABLE "public"."PlayerTeamSeason" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."RosterApplication" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "PlayerTeamSeason" ALTER COLUMN "role" TYPE "PlayerRole_new" USING ("role"::text::"PlayerRole_new");
ALTER TABLE "RosterApplication" ALTER COLUMN "role" TYPE "PlayerRole_new" USING ("role"::text::"PlayerRole_new");
ALTER TYPE "PlayerRole" RENAME TO "PlayerRole_old";
ALTER TYPE "PlayerRole_new" RENAME TO "PlayerRole";
DROP TYPE "public"."PlayerRole_old";
ALTER TABLE "PlayerTeamSeason" ALTER COLUMN "role" SET DEFAULT 'PLAYER';
ALTER TABLE "RosterApplication" ALTER COLUMN "role" SET DEFAULT 'PLAYER';
COMMIT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "presenterUserId" TEXT,
ADD COLUMN     "scorerUserId" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "pendingUserId" TEXT;

-- AlterTable
ALTER TABLE "PlayerTeamSeason" ADD COLUMN     "isPlaying" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Poem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poem_slug_key" ON "Poem"("slug");

-- CreateIndex
CREATE INDEX "Poem_playerId_idx" ON "Poem"("playerId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_scorerUserId_fkey" FOREIGN KEY ("scorerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_presenterUserId_fkey" FOREIGN KEY ("presenterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poem" ADD CONSTRAINT "Poem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
