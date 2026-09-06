-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Link_category_idx" ON "Link"("category");

-- CreateIndex
CREATE INDEX "Link_read_idx" ON "Link"("read");
