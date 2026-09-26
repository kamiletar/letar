-- CreateTable
CREATE TABLE "PsychologistMessage" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "PsychologistMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PsychologistMessage_linkId_idx" ON "PsychologistMessage"("linkId");

-- AddForeignKey
ALTER TABLE "PsychologistMessage" ADD CONSTRAINT "PsychologistMessage_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ClientPsychologistLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
