-- Backfill: колонка issuer была добавлена миграцией 20260825225819_account_issuer, но
-- существующие строки Account остались с issuer=NULL — better-auth 1.7 ищет аккаунт по
-- точному совпадению issuer, NULL не совпадает ни с чем. Формат —
-- createLocalAccountIssuer/createOAuthAccountIssuer (@better-auth/core/db/schema/account.ts);
-- для SSO — issuer из discovery Ключницы.
UPDATE "Account" SET issuer = 'local:credential'
  WHERE "providerId" = 'credential' AND issuer IS NULL;
UPDATE "Account" SET issuer = 'https://auth.letar.best/api/auth'
  WHERE "providerId" = 'letar-auth' AND issuer IS NULL;
UPDATE "Account" SET issuer = 'local:oauth:' || "providerId"
  WHERE "providerId" NOT IN ('credential', 'letar-auth') AND issuer IS NULL;
