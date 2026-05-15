-- AlterTable: добавить progressBlocks в PinJob
ALTER TABLE "PinJob" ADD COLUMN "progressBlocks" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: добавить pinQueueUrl и pinQueueSecret в PinServer
ALTER TABLE "PinServer" ADD COLUMN "pinQueueUrl" TEXT;
ALTER TABLE "PinServer" ADD COLUMN "pinQueueSecret" TEXT;
