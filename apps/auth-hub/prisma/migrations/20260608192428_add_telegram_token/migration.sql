-- CreateTable
CREATE TABLE "telegramToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telegramId" TEXT,
    "name" TEXT,
    "username" TEXT,
    "photoUrl" TEXT,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegramToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegramToken_token_key" ON "telegramToken"("token");

-- CreateIndex
CREATE INDEX "telegramToken_token_idx" ON "telegramToken"("token");

-- CreateIndex
CREATE INDEX "telegramToken_telegramId_idx" ON "telegramToken"("telegramId");

-- AddForeignKey
ALTER TABLE "telegramToken" ADD CONSTRAINT "telegramToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
