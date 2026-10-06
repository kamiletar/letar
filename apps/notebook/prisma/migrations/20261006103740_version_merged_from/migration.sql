-- AlterTable
ALTER TABLE "NoteVersion" ADD COLUMN     "mergedFromId" TEXT;

-- CreateIndex
CREATE INDEX "NoteVersion_mergedFromId_idx" ON "NoteVersion"("mergedFromId");

-- AddForeignKey
ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_mergedFromId_fkey" FOREIGN KEY ("mergedFromId") REFERENCES "NoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
