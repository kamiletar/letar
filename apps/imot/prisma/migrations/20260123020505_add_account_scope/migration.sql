-- Add scope column to Account table for Better Auth OAuth
ALTER TABLE "Account" ADD COLUMN "scope" TEXT;
