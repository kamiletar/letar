-- CreateTable
CREATE TABLE "UserEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_email_key" ON "UserEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_verificationToken_key" ON "UserEmail"("verificationToken");

-- CreateIndex
CREATE INDEX "UserEmail_userId_idx" ON "UserEmail"("userId");

-- AddForeignKey
ALTER TABLE "UserEmail" ADD CONSTRAINT "UserEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
