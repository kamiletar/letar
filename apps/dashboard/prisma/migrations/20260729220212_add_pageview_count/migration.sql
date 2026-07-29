-- CreateTable
CREATE TABLE "PageViewCount" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageViewCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewLogOffset" (
    "domain" TEXT NOT NULL,
    "byteOffset" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageViewLogOffset_pkey" PRIMARY KEY ("domain")
);

-- CreateIndex
CREATE INDEX "PageViewCount_domain_date_idx" ON "PageViewCount"("domain", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PageViewCount_date_domain_key" ON "PageViewCount"("date", "domain");
