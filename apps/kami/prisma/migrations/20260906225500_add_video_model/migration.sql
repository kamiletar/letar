-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('URL', 'FILE');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "source" "VideoSource" NOT NULL,
    "url" TEXT,
    "provider" TEXT,
    "externalId" TEXT,
    "filename" TEXT,
    "storedName" TEXT,
    "path" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_path_key" ON "Video"("path");

-- CreateIndex
CREATE INDEX "Video_path_idx" ON "Video"("path");

-- CreateIndex
CREATE INDEX "Video_category_idx" ON "Video"("category");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
