# Better Auth 1.7: модель `Account` требует поле `issuer`

## Симптом

Затронуты не только пути, которые СОЗДАЮТ/ОБНОВЛЯЮТ `Account` (`POST /api/auth/sign-up/email`,
`POST /api/auth/reset-password` падают 500 ZodError `"Unrecognized key: issuer"` при валидации
ZenStack v3 ORM). **Обычный `POST /api/auth/sign-in/email` для уже существующего пользователя
затронут тоже** — и это не даёт вообще никакой ошибки: строгое совпадение
`providerId+issuer+accountId` в памяти better-auth просто не находит запись, `credentialAccount`
получается `undefined`, better-auth хеширует пароль впустую (защита от timing-атак) и отвечает
`401 INVALID_EMAIL_OR_PASSWORD` — с точки зрения пользователя и логов это неотличимо от обычного
«неверный пароль». Ни исключения, ни строки в логе, ни расхождения в typecheck.

Затронуто **14 приложений монорепо** (полный список и статус деплоя по каждому — `PLAN.md` §71),
не 4, как считалось на первом проходе (`PLAN.md` §59, 2026-08-25).

## Причина

`node_modules/better-auth/dist/api/routes/sign-in.mjs`:

```js
const credentialIssuer = createLocalAccountIssuer('credential')
const credentialAccount = userRecord?.accounts.find(
  (account) =>
    account.providerId === 'credential'
    && account.issuer === credentialIssuer
    && account.accountId === userRecord.user.id,
)
if (!userRecord || !credentialAccount) {
  await ctx.context.password.hash(password) // timing-защита, не реальная проверка
  throw APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD)
}
```

`account.issuer` сравнивается **в памяти рантайма**, не в SQL — если колонки нет вовсе (Zod-схема
запроса к модели `Account` в ZenStack её не знает) или она `NULL`, сравнение просто не совпадает,
без единого исключения. Тот же паттерн — в `internal-adapter.mjs` (`findAccountOwnerByKey`,
`findAccountByKey`) и `oauth2/account-key.mjs`, часть security-хардненинга better-auth 1.7 против
provider impersonation (тот же релиз, что убрал `oidcProvider`/`genericOAuthClient`, см.
[[better-auth-1.7-oidc-provider-removed]]).

Общий ZenStack-фрагмент `type AccountFields` в `libs/zenstack-fragments/src/better-auth.zmodel` не
объявлял поле `issuer` вовсе — минорный апгрейд `better-auth` (`^1.6.x`→1.7 через caret) тихо
расширил обязательный набор полей модели и обязательный рантайм-инвариант данных, ни typecheck, ни
lint этого не ловят (Prisma-клиент просто не знает о новом инварианте — см. класс бага в
[[runtime-invariant-missing-from-select]]).

## Решение — два раздельных шага, не один

Добавлено поле в `libs/zenstack-fragments/src/better-auth.zmodel`:

```zmodel
type AccountFields {
  ...
  /// Better Auth 1.7+ — провайдер, выдавший accountId (защита от provider impersonation)
  issuer                String?
  ...
}
```

Дальше в каждом приложении — **обязательно два раздельных шага**, не один:

**Шаг 1 — add-column миграция.** `nx zenstack:generate <app>` → миграция, добавляющая колонку
`issuer TEXT` (nullable, без дефолта). Сама по себе ничего не чинит — у всех существующих строк
`issuer` остаётся `NULL`, а строгое сравнение в `sign-in.mjs` выше `NULL !== 'local:credential'`
не проходит точно так же, как отсутствующая колонка. **Один этот шаг оставляет весь существующий
вход сломанным** — новые регистрации после миграции работают (свежий код пишет `issuer` при
создании), старые аккаунты — нет.

**Шаг 2 — отдельная backfill-миграция.** `UPDATE "Account" SET issuer = 'local:credential' WHERE
"providerId" = 'credential' AND issuer IS NULL` (значение — буквально то, что возвращает
`createLocalAccountIssuer('credential')` из `@better-auth/core/db`, хардкодится тем же литералом
без новой рантайм-зависимости; для social-провайдеров issuer формируется иначе, backfill их не
трогает). Без этого шага миграция «есть в истории» и `prisma migrate status` говорит «up to
date», но реальный вход всё ещё не работает ни для одного существующего пользователя.

⚠️ **Все приложения ведут миграции через `prisma/migrations` — `db:push` их не создаёт.** Если
`db:push` уже выполнен вручную (быстро проверить живьём) и колонка физически в БД, миграцию нужно
формализовать без потери данных:

```bash
mkdir -p apps/<app>/prisma/migrations/<timestamp>_<name>
printf -- '-- AlterTable\nALTER TABLE "Account" ADD COLUMN     "issuer" TEXT;\n' \
  > apps/<app>/prisma/migrations/<timestamp>_<name>/migration.sql
cd apps/<app> && npx prisma migrate resolve --applied <timestamp>_<name>
npx prisma migrate status   # убедиться: "Database schema is up to date!"
```

`migrate resolve --applied` помечает миграцию выполненной в `_prisma_migrations` **без** повторного
накатывания SQL — нужно именно там, где `db:push` уже внёс изменение. Приложению, где `db:push` не
выполнялся (dev-БД не поднята), `resolve` не нужен — миграция применится обычным путём при
следующем `migrate dev`/`migrate deploy`.

**Только автогенерируемый `nx db:migrate <app>` (`prisma migrate dev`) для add-column-шага не
годится** — детектирует drift между историей миграций и фактической БД и в интерактивном режиме
предложит сбросить dev-БД (потеря данных), без TTY просто упадёт. Ручной SQL-файл для
одноколоночного `ALTER TABLE` быстрее и безопаснее, чем поднимать shadow-БД
(`SHADOW_DATABASE_URL`, которая на 2026-08-28 сконфигурирована не у всех приложений) ради
`migrate diff --from-migrations`.

## ⚠️ Коммит миграции ≠ применение миграции на проде

Обнаружено на трёх приложениях (`archetest`, `aprel8008`, `dashboard`) в рамках аудита §71: обе
миграции (add-column + backfill) были написаны и закоммичены 2026-08-25, `prisma migrate status`
локально подтверждал «up to date» — но на проде `issuer` оставался `NULL` до отдельного повторного
деплоя, потому что после коммита миграции приложение **не передеплоивалось** (`prisma migrate
deploy` накатывается только во время деплоя, не сам по себе). Внешне это неотличимо от «фикс не
сработал» — на деле фикс просто не доехал до прода. Не полагаться на факт коммита миграции как на
доказательство того, что она применена — проверять либо через deploy-agent-dev (лог самого
деплоя), либо прямым SQL-запросом к прод-БД:

```sql
SELECT count(*) FROM "Account" WHERE "providerId" = 'credential' AND issuer IS NULL;
```

Ноль — миграция и backfill применены. Ненулевое значение на приложении, где фикс якобы уже
задеплоен, — верный признак разрыва между коммитом и деплоем, а не нового бага.

## Живая проверка (2026-08-25, domwellbes)

`POST /api/auth/sign-up/email` — было 500 `Unrecognized key: issuer`, стало 200 с созданным
пользователем. `POST /api/auth/request-password-reset` — 200. Полный охват всех 14 приложений,
живая проверка входа/logout по каждому — `PLAN.md` §71.
