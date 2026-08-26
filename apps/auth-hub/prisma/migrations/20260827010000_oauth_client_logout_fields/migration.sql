-- AlterTable: RP-Initiated Logout (@better-auth/oauth-provider 1.7+, src/schema.ts::oauthClient) —
-- без enableEndSession=true плагин безусловно отдаёт 401 для ЛЮБОГО клиента.
ALTER TABLE "oauthApplication" ADD COLUMN     "enableEndSession" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "oauthApplication" ADD COLUMN     "postLogoutRedirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "oauthApplication" ADD COLUMN     "backchannelLogoutUri" TEXT;
ALTER TABLE "oauthApplication" ADD COLUMN     "backchannelLogoutSessionRequired" BOOLEAN;

-- Backfill: включить logout для всех уже зарегистрированных клиентов и заполнить белый список
-- post-logout redirect URI значениями из уже существующего redirectUris (не-callback записи —
-- это ровно те sign-in адреса, которые приложения передают как post_logout_redirect_uri).
UPDATE "oauthApplication"
SET "enableEndSession" = true,
    "postLogoutRedirectUris" = (
      SELECT array_agg(uri)
      FROM unnest("redirectUris") AS uri
      WHERE uri NOT LIKE '%/api/auth/callback/%'
    )
WHERE "disabled" = false;
