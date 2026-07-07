-- CreateTable
CREATE TABLE "ProfessionalLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consentPdn" BOOLEAN NOT NULL,
    "locale" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalLead_pkey" PRIMARY KEY ("id")
);
