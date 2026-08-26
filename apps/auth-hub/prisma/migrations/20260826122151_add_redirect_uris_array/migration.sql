-- AlterTable
ALTER TABLE "oauthApplication" ADD COLUMN     "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DataMigration: бэкфилл redirectUris из уже существующего CSV-поля redirectUrls —
-- @better-auth/oauth-provider читает только redirectUris (required, string[]), без бэкфилла
-- все существующие OIDC-клиенты потеряют redirect URI.
UPDATE "oauthApplication" SET "redirectUris" = string_to_array("redirectUrls", ',');
