-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'PSYCHOLOGIST';

-- CreateTable
CREATE TABLE "ClientPsychologistLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ClientPsychologistLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychologistNote" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychologistNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPsychologistLink_psychologistId_idx" ON "ClientPsychologistLink"("psychologistId");

-- CreateIndex
CREATE INDEX "ClientPsychologistLink_clientId_idx" ON "ClientPsychologistLink"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPsychologistLink_clientId_psychologistId_key" ON "ClientPsychologistLink"("clientId", "psychologistId");

-- CreateIndex
CREATE INDEX "PsychologistNote_linkId_idx" ON "PsychologistNote"("linkId");

-- AddForeignKey
ALTER TABLE "ClientPsychologistLink" ADD CONSTRAINT "ClientPsychologistLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPsychologistLink" ADD CONSTRAINT "ClientPsychologistLink_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologistNote" ADD CONSTRAINT "PsychologistNote_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ClientPsychologistLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
