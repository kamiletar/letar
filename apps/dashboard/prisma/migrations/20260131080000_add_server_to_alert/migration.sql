-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "serverId" TEXT;

-- CreateIndex
CREATE INDEX "Alert_serverId_idx" ON "Alert"("serverId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
