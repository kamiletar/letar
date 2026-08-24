# Новый `/api/cron/*`-эндпоинт: три места, а не одно

Написать `verifyCronSecret()` + маршрут — недостаточно, чтобы задача реально выполнялась по
расписанию. Без всех трёх пунктов ниже эндпоинт либо никогда не вызывается, либо вызывается и
всегда отвечает 401 — тихо, без алерта, до первой ручной проверки.

## Три обязательных места

1. **`CRON_SECRET` в `.env.docker`/`.env.docker.enc` приложения.** `verifyCronSecret()`
   (`@letar/api-server`) fail-closed: без секрета в окружении всегда `false`. Генерировать —
   `openssl rand -base64 32` ([security.md](/.claude/rules/security.md)), не переиспользовать
   секрет другого приложения.
2. **Запись в `apps/dashboard-agent/src/lib/cron.ts` (`DEFAULT_CRON_JOBS`).** Список задач —
   код, не конфиг из БД. Пока приложение не в этом submodule/scope — планировщик не знает о
   существовании эндпоинта и не вызывает его никогда, сколько бы cron-выражения ни было
   закомментировано в коде самого приложения.
3. **Порт/host приложения в реестре, если раньше вызовов от dashboard-agent к нему не было.**
   Канон — `libs/infra-config/src/index.ts` (`APP_PORTS`/`APP_HOSTS`), локальная копия —
   `apps/dashboard-agent/src/lib/server-config.ts` (`APP_REGISTRY`). Приложение может быть в
   `SERVER_APPS`/канонном маппинге сервера и при этом не иметь порта — тогда `getAppUrl()`
   бросает `Неизвестное приложение: <app>` при первом же вызове. Guard-тесты
   (`server-config.guard.spec.ts`, `app-registry.guard.spec.ts`) требуют, чтобы локальная копия
   dashboard-agent и канон `@letar/infra-config` совпадали — редактировать оба сразу.

## Почему это легко забыть

Пункты 2 и 3 — правки в **другом submodule/scope** (`apps/dashboard-agent`, `libs/infra-config`),
не в том, где пишется сам эндпоинт. Обычный воркфлоу `/​<app>` резервирует только
`apps/<app>/**` ([app-workflow.md](/.claude/rules/app-workflow.md)) — типовой путь
«написал маршрут → задокументировал в `PLAN_COMPLETED.md` → закрыл задачу» не заходит в
dashboard-agent вовсе, и находка остаётся открытым вопросом на неопределённый срок (в domwellbes
— с 2026-08-19 до 2026-08-22, пять эндпоинтов сразу, не только последний написанный).

## Чек-лист при добавлении нового `/api/cron/*`

- [ ] `verifyCronSecret(request)` в начале `POST`
- [ ] `CRON_SECRET` сгенерирован и лежит в `.env.docker.enc` приложения
- [ ] Приложение примонтировано в `dashboard-agent/docker-compose.production.yml`
      (`volumes: … .env.docker:/secrets/<app>.env:ro`) — иначе `getAppCronSecret()` тоже вернёт
      `null` даже при наличии секрета в `.env.docker` самого приложения
- [ ] Запись в `DEFAULT_CRON_JOBS` (`apps/dashboard-agent/src/lib/cron.ts`)
- [ ] Порт/host приложения есть в `APP_PORTS`/`APP_HOSTS` (канон + локальная копия), если
      dashboard-agent раньше к нему не обращался
- [ ] `nx test dashboard-agent` зелёный (guard-тесты канона)
- [ ] После деплоя — ручная проверка `curl -X POST -H "X-Cron-Secret: $CRON_SECRET"
      https://<домен>/api/cron/<endpoint>` возвращает `{success: true, ...}`, не 401/404

Найдено и закрыто для domwellbes — `apps/domwellbes/PLAN_COMPLETED.md`, задача №68 (2026-08-22).

## ⚠️ Отдельный класс: заголовок авторизации не совпадает с тем, что реально шлёт агент

Чек-лист выше не ловит эту ошибку — все три места настроены верно, `verifyCronSecret()` даже не
написан. Эндпоинт сверяет собственноручно написанную проверку `Authorization: Bearer $CRON_SECRET`
(и иногда метод `GET`), а `dashboard-agent` (`executeJob` в `cron.ts`) реально шлёт `POST` с
заголовком `X-Cron-Secret`. Итог тот же — тихий 401 на каждом прогоне, без алерта до первой
ручной проверки, потому что `CRON_FAILED`-алерт создаётся, но в потоке уведомлений легко
потеряться среди других.

Найдено в `apps/time/src/app/api/cron/notifications/route.ts` (2026-08-24, валилось с 22.08 —
задача `* * * * *`, за 2 суток тысячи 401) — фикс: заменить bespoke-проверку на
`verifyCronSecret()` из `@letar/api-server`. При аудите по тому же паттерну (`authHeader ===
Bearer ${cronSecret}`) найдены ещё два вероятных случая, не проверенных живьём на момент записи:
`apps/driving-school/src/app/api/cron/reminders/route.ts` и
`apps/svoichuzhie/src/app/api/cron/cleanup/route.ts` (второй ещё и на `GET` вместо `POST`).

**Профилактика:** писать новый `/api/cron/*`-эндпоинт всегда через `verifyCronSecret()` из
`@letar/api-server`, никогда через собственную проверку заголовка — общий хелпер уже
захардкожен на реальный контракт `executeJob` (`X-Cron-Secret`, не `Authorization`).
