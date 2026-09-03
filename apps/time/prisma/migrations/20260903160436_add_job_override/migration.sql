-- CreateTable
CREATE TABLE "JobOverride" (
    "jobId" TEXT NOT NULL,
    "schedule" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOverride_pkey" PRIMARY KEY ("jobId")
);
