# Выполненные задачи — form-example

## Сессия 2026-07-15 — rollout-профиль включён, деплой закрыт

- `letar.rollout: 'true'` раскомментирован в `docker-compose.production.yml` — приложение
  структурно готово к rollout ещё с 2026-07-12 (commit `098eb75`), ждало подтверждения
  NPM-роутинга обычным деплоем (условие выполнено).
- Rollout-пилот прошёл с четвёртой попытки — вскрылись и устранены три независимых бага
  инфраструктуры (все правки в compose/env, не в коде приложения):
  1. `db:` секция никогда не публиковала host-порт — `deploy-affected.sh` мигрирует с хоста
     через `localhost:$DB_PORT`, слушать было нечего (`P1001`). Фикс: `ports: '5443:5432'`
     (commit `d0c5cfc`).
  2. `.env.docker` содержал `POSTGRES_PASSWORD`, но не `DB_PASSWORD` — единственное такое
     приложение в монорепо, скрипт строит `DATABASE_URL` для миграций именно из `DB_PASSWORD`
     (`P1000` Authentication failed). Фикс: добавлена переменная, `.env.docker.enc` пересобран
     через `sops` (commit `fd67766`).
  3. `prisma/migrations/` никогда не существовала в репо — схема на проде была накатана через
     `prisma db push`, а не `migrate`, что несовместимо с `migrate deploy` против непустой БД
     (`P3005`). Фикс: сгенерирована и провалидирована baseline-миграция `20260715163011_init`
     (commit `b63b132`), на проде помечена применённой через `prisma migrate resolve --applied`
     (без DDL, схема совпадала).
- Итог: `form-example-app-2` healthy, zero-downtime, старый контейнер убран. Деплой-агент —
  BlackCove, координация через Agent Mail (thread `deploy-form-example-mandala-rollout-J`).

## Сессия 2026-07-12 — security-фикс + баг /products 500

### Ротация захардкоженного пароля Postgres

- В `docker-compose.production.yml` был захардкожен пароль Postgres в открытом виде (публичный репозиторий) — `POSTGRES_PASSWORD` и внутри `DATABASE_URL`
- Сгенерирован новый пароль через `openssl rand -base64 32`, вынесен в `.env.docker`/`.env.docker.enc` (SOPS), compose переведён на `${POSTGRES_PASSWORD}` (образец `apps/time`)
- Деплой через BlackCove: `ALTER USER forms` на живом `form-example-db` синхронно с пересозданием контейнеров

### Баг `/products` 500 (ECONNREFUSED) — найдена и устранена реальная причина

- Предыдущая попытка фикса через `outputFileTracingIncludes` (`.prisma/client`) была мимо цели — файлы трассировки были ни при чём
- Реальная причина: в bun-хостинге монорепо параллельно установлено несколько версий `pg` (hoisting: 8.20/8.21/8.22). `db.ts` создавал `new Pool()` через одну версию, `@prisma/adapter-pg` внутри резолвил свою — `instanceof Pool`-проверка между разными классами не проходила, адаптер тихо создавал свой Pool без connectionString → падал на `localhost:5432`. Ошибка маскировалась generic `ECONNREFUSED` внутри `performIO` (известный баг Prisma, [prisma/prisma#28055](https://github.com/prisma/prisma/issues/28055))
- Фикс: `src/lib/db.ts` — `PrismaPg({ connectionString })` напрямую вместо готового `Pool`-инстанса
- Диагностика и проверка фикса проведены вживую на s2 через `docker exec` в работающем контейнере (не через локальную пересборку — Windows-сборка даёт другой класс проблем с абсолютными symlink, не относящийся к прод-багу)

## v0.1.0 (2026-04-04)

### Реализовано

- 38 example-страниц (basic, validation, multi-step, offline, i18n, и др.)
- ArticleLink компонент — ссылки на статьи цикла
- 5 новых DX-страниц: analytics, server-errors, undo-redo, readonly, skeleton
- Интеграция с @letar/forms через tsconfig path alias

---

**Последнее обновление:** 2026-04-04
