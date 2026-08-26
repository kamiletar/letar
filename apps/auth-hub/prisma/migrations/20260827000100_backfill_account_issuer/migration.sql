-- Backfill: better-auth 1.7 требует непустой issuer для существующих Account-записей,
-- созданных до появления колонки. Формат совпадает с internal-adapter better-auth 1.7
-- (createLocalAccountIssuer/createOAuthAccountIssuer, @better-auth/core/db/schema/account.ts).
UPDATE "Account" SET issuer = 'local:credential' WHERE "providerId" = 'credential' AND issuer IS NULL;
UPDATE "Account" SET issuer = 'local:oauth:' || "providerId" WHERE "providerId" IN ('google', 'github', 'facebook', 'vk', 'yandex') AND issuer IS NULL;
