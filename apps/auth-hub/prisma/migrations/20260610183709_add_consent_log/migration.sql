-- CreateTable
CREATE TABLE "consentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "acceptedAnalytics" BOOLEAN NOT NULL,
    "acceptedMarketing" BOOLEAN NOT NULL,
    "acceptedFunctional" BOOLEAN NOT NULL DEFAULT true,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consentLog_userId_idx" ON "consentLog"("userId");

-- CreateIndex
CREATE INDEX "consentLog_consentedAt_idx" ON "consentLog"("consentedAt");

-- AddForeignKey
ALTER TABLE "consentLog" ADD CONSTRAINT "consentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
