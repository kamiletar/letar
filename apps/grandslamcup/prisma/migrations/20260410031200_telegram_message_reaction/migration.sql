-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "tourId" TEXT,
    "messageId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramReaction" (
    "id" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramMessage_matchId_idx" ON "TelegramMessage"("matchId");

-- CreateIndex
CREATE INDEX "TelegramMessage_chatId_messageId_idx" ON "TelegramMessage"("chatId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramReaction_telegramMessageId_emoji_key" ON "TelegramReaction"("telegramMessageId", "emoji");

-- AddForeignKey
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramReaction" ADD CONSTRAINT "TelegramReaction_telegramMessageId_fkey" FOREIGN KEY ("telegramMessageId") REFERENCES "TelegramMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
