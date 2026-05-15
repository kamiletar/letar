-- Migration: Better Auth + Color
-- Миграция с Auth.js v5 (NextAuth) на Better Auth с сохранением данных

-- ============================================
-- 1. CREATE Color table
-- ============================================
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");
CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");

-- ============================================
-- 2. ALTER ProductVariant - add colorId
-- ============================================
ALTER TABLE "ProductVariant" ADD COLUMN "colorId" TEXT;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_colorId_fkey"
    FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- 3. ALTER User table (Better Auth changes)
-- ============================================
-- Удаляем старые колонки (данные перенесены в другие места или не нужны)
ALTER TABLE "User" DROP COLUMN IF EXISTS "gender";
ALTER TABLE "User" DROP COLUMN IF EXISTS "birthdate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phoneNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "hashedPassword";

-- Конвертируем emailVerified из DateTime? в Boolean
-- Сначала добавляем временную колонку
ALTER TABLE "User" ADD COLUMN "emailVerified_new" BOOLEAN NOT NULL DEFAULT false;

-- Копируем данные: если emailVerified не NULL, значит email верифицирован
UPDATE "User" SET "emailVerified_new" = CASE
    WHEN "emailVerified" IS NOT NULL THEN true
    ELSE false
END;

-- Удаляем старую колонку и переименовываем новую
ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" RENAME COLUMN "emailVerified_new" TO "emailVerified";

-- ============================================
-- 4. ALTER Account table (NextAuth -> Better Auth)
-- ============================================
-- Удаляем старый primary key
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey";

-- Добавляем id колонку
ALTER TABLE "Account" ADD COLUMN "id" TEXT;

-- Генерируем id для существующих записей (используем concat как простой способ)
UPDATE "Account" SET "id" = 'acc_' || md5(random()::text || clock_timestamp()::text)::text;

-- Делаем id NOT NULL
ALTER TABLE "Account" ALTER COLUMN "id" SET NOT NULL;

-- Переименовываем колонки
ALTER TABLE "Account" RENAME COLUMN "provider" TO "providerId";
ALTER TABLE "Account" RENAME COLUMN "providerAccountId" TO "accountId";
ALTER TABLE "Account" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE "Account" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE "Account" RENAME COLUMN "id_token" TO "idToken";

-- Конвертируем expires_at (Int секунды) в DateTime
ALTER TABLE "Account" ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);
UPDATE "Account" SET "accessTokenExpiresAt" = to_timestamp("expires_at") WHERE "expires_at" IS NOT NULL;
ALTER TABLE "Account" DROP COLUMN "expires_at";

-- Добавляем новые колонки
ALTER TABLE "Account" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN "password" TEXT;

-- Удаляем неиспользуемые колонки
ALTER TABLE "Account" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "token_type";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "session_state";

-- Добавляем новый primary key
ALTER TABLE "Account" ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

-- Добавляем unique constraint и index
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- ============================================
-- 5. ALTER Session table (NextAuth -> Better Auth)
-- ============================================
-- Добавляем id колонку
ALTER TABLE "Session" ADD COLUMN "id" TEXT;

-- Генерируем id для существующих сессий
UPDATE "Session" SET "id" = 'ses_' || md5(random()::text || clock_timestamp()::text)::text;

-- Делаем id NOT NULL
ALTER TABLE "Session" ALTER COLUMN "id" SET NOT NULL;

-- Переименовываем колонки
ALTER TABLE "Session" RENAME COLUMN "sessionToken" TO "token";
ALTER TABLE "Session" RENAME COLUMN "expires" TO "expiresAt";

-- Добавляем новые колонки для Better Auth
ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;

-- Удаляем старый unique index и добавляем новый
DROP INDEX IF EXISTS "Session_sessionToken_key";
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- Добавляем primary key
ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- Добавляем index
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- ============================================
-- 6. DROP VerificationToken, CREATE Verification
-- ============================================
-- Удаляем старую таблицу (токены верификации временные, можно удалить)
DROP TABLE IF EXISTS "VerificationToken";

-- Создаём новую таблицу Verification
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
