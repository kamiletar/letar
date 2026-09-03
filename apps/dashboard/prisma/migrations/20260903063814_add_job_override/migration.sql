-- CreateTable
CREATE TABLE "JobOverride" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "schedule" TEXT,
    "enabled" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobOverride_jobId_key" ON "JobOverride"("jobId");
