/*
  Data migration from NextAuth to Better Auth
  Сохраняет существующие OAuth аккаунты
*/

-- Шаг 1: Добавить новые колонки как nullable
ALTER TABLE "Account"
ADD COLUMN "id" TEXT,
ADD COLUMN "accountId" TEXT,
ADD COLUMN "providerId" TEXT,
ADD COLUMN "accessToken" TEXT,
ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "idToken" TEXT,
ADD COLUMN "password" TEXT,
ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);

-- Шаг 2: Мигрировать данные из старых колонок в новые
UPDATE "Account" SET
  "id" = 'acc_' || substr(md5(random()::text), 1, 24),  -- Генерация уникального ID
  "accountId" = "providerAccountId",                     -- provider account ID
  "providerId" = "provider",                             -- provider (google, yandex, etc)
  "accessToken" = "access_token",                        -- access token
  "accessTokenExpiresAt" = CASE
    WHEN "expires_at" IS NOT NULL
    THEN to_timestamp("expires_at")
    ELSE NULL
  END,
  "idToken" = "id_token",                                -- ID token
  "refreshToken" = "refresh_token";                      -- refresh token

-- Шаг 3: Удалить старый PRIMARY KEY
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey";

-- Шаг 4: Сделать новые колонки NOT NULL
ALTER TABLE "Account"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "accountId" SET NOT NULL,
ALTER COLUMN "providerId" SET NOT NULL;

-- Шаг 5: Добавить новый PRIMARY KEY
ALTER TABLE "Account" ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

-- Шаг 6: Удалить старые колонки
ALTER TABLE "Account"
DROP COLUMN "access_token",
DROP COLUMN "expires_at",
DROP COLUMN "id_token",
DROP COLUMN "provider",
DROP COLUMN "providerAccountId",
DROP COLUMN "refresh_token",
DROP COLUMN "session_state",
DROP COLUMN "token_type",
DROP COLUMN "type",
DROP COLUMN "scope";

-- Шаг 7: Обновить Session таблицу
-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- AlterTable Session
ALTER TABLE "Session"
ADD COLUMN "id" TEXT,
ADD COLUMN "token" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT;

-- Мигрировать данные Session
UPDATE "Session" SET
  "id" = 'sess_' || substr(md5(random()::text), 1, 24),
  "token" = "sessionToken",
  "expiresAt" = "expires";

-- Сделать обязательными
ALTER TABLE "Session"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "token" SET NOT NULL,
ALTER COLUMN "expiresAt" SET NOT NULL;

-- Добавить PRIMARY KEY для Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- Удалить старые колонки Session
ALTER TABLE "Session"
DROP COLUMN "expires",
DROP COLUMN "sessionToken";

-- Шаг 8: Обновить User таблицу
ALTER TABLE "User"
DROP COLUMN IF EXISTS "hashedPassword",
ADD COLUMN "emailVerifiedNew" BOOLEAN;

-- Конвертировать emailVerified из DateTime? в Boolean
UPDATE "User" SET "emailVerifiedNew" = ("emailVerified" IS NOT NULL);

ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" RENAME COLUMN "emailVerifiedNew" TO "emailVerified";
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

-- Шаг 9: Удалить старые таблицы
DROP TABLE IF EXISTS "LoginAttempt";
DROP TABLE IF EXISTS "VerificationToken";

-- Шаг 10: Создать новую таблицу Verification
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- Шаг 11: Создать индексы
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification"("identifier", "value");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_token_idx" ON "Session"("token");
