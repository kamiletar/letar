-- Better Auth migration
-- Миграция с NextAuth на Better Auth схему

-- DropIndex (старые индексы NextAuth)
DROP INDEX IF EXISTS "Account_provider_providerAccountId_key";
DROP INDEX IF EXISTS "Session_sessionToken_key";

-- Очистить сессии (они несовместимы между NextAuth и Better Auth)
DELETE FROM "Session";

-- Account: добавить новые колонки как nullable сначала
ALTER TABLE "Account"
ADD COLUMN IF NOT EXISTS "accountId" TEXT,
ADD COLUMN IF NOT EXISTS "providerId" TEXT,
ADD COLUMN IF NOT EXISTS "accessToken" TEXT,
ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "idToken" TEXT,
ADD COLUMN IF NOT EXISTS "password" TEXT,
ADD COLUMN IF NOT EXISTS "refreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Копируем данные из старых колонок в новые
UPDATE "Account" SET
  "accountId" = COALESCE("providerAccountId", "id"),
  "providerId" = COALESCE("provider", 'credential'),
  "accessToken" = "access_token",
  "idToken" = "id_token",
  "refreshToken" = "refresh_token"
WHERE "accountId" IS NULL;

-- Делаем обязательные колонки NOT NULL
ALTER TABLE "Account" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "providerId" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Удаляем старые колонки NextAuth
ALTER TABLE "Account"
DROP COLUMN IF EXISTS "access_token",
DROP COLUMN IF EXISTS "expires_at",
DROP COLUMN IF EXISTS "id_token",
DROP COLUMN IF EXISTS "provider",
DROP COLUMN IF EXISTS "providerAccountId",
DROP COLUMN IF EXISTS "refresh_token",
DROP COLUMN IF EXISTS "session_state",
DROP COLUMN IF EXISTS "token_type",
DROP COLUMN IF EXISTS "type";

-- Session: добавить новые колонки
ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "token" TEXT,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Генерируем token для существующих сессий (если есть)
UPDATE "Session" SET
  "token" = COALESCE("sessionToken", gen_random_uuid()::text),
  "expiresAt" = COALESCE("expires", NOW() + INTERVAL '30 days')
WHERE "token" IS NULL;

-- Делаем обязательные колонки NOT NULL
ALTER TABLE "Session" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "expiresAt" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Удаляем старые колонки
ALTER TABLE "Session"
DROP COLUMN IF EXISTS "expires",
DROP COLUMN IF EXISTS "sessionToken";

-- User: миграция emailVerified и удаление password
-- Сначала сохраняем пароли в Account для credential auth
UPDATE "Account" SET "password" = "User"."password"
FROM "User"
WHERE "Account"."userId" = "User"."id"
  AND "Account"."providerId" = 'credential'
  AND "User"."password" IS NOT NULL;

-- Теперь модифицируем User
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";

-- emailVerified: конвертируем из timestamp в boolean
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified_new" BOOLEAN DEFAULT false;
UPDATE "User" SET "emailVerified_new" = ("emailVerified" IS NOT NULL);
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "User" RENAME COLUMN "emailVerified_new" TO "emailVerified";
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

-- DropTable VerificationToken (заменяется на Verification)
DROP TABLE IF EXISTS "VerificationToken";

-- CreateTable Verification
CREATE TABLE IF NOT EXISTS "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pin" TEXT,
    "pinExpires" TIMESTAMP(3),
    "pinAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Verification_value_key" ON "Verification"("value");
CREATE INDEX IF NOT EXISTS "Verification_identifier_idx" ON "Verification"("identifier");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");
