# `deploy_infra`/`deploy-infra.sh` не делает `git pull` — ложный успех на устаревшем checkout

⚠️ Класс проблемы: `deploy_infra({ service, server })` возвращает `exitCode: 0`, контейнеры
после деплоя "Healthy" — и тем не менее запрошенный код-фикс не применился вообще. Найдено
2026-09-17 на `media-server`/s3: два независимых фикса (8-битный H.264/тонмаппинг HDR,
проброс `MEDIA_KEY_DOMWELLBES`) были отчитаны как задеплоенные, но в реальности отсутствовали
в работающем контейнере.

## Механизм

`scripts/deploy-infra.sh` (в отличие от `scripts/deploy-affected.sh`, который используется
`deploy_app` и явно делает `git pull`/`git fetch` + submodule update перед сборкой) **не
трогает git вообще** — он только:

1. читает `infra/<service>/secrets/deploy.conf` или `.env.docker.enc`, расшифровывает;
2. запускает `docker compose up -d --build` с этим env-файлом.

Если checkout сервера отстал от `origin/main` (а `deploy_git_status`/git-операции на s3
исторически flaky — см. [agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md)
про похожую сетевую нестабильность), Docker собирает образ **из старого исходника**. При
включённом layer-кэшировании итоговый image hash оказывается идентичен предыдущему —
`docker compose up -d` даже не пересоздаёт контейнеры (`docker ps` показывает то же "Up N
days", что и до деплоя), а скрипт всё равно печатает `✅ Deploy completed successfully`.

## Как проверять по-настоящему, не доверяя exitCode

Симптомы недостаточны: `exitCode: 0` + "Healthy" — это ложноположительный сигнал ровно того
класса, что описан в [verification-pitfalls](/.claude/docs/verification-pitfalls.md).
Обязательный чек-лист после `deploy_infra`:

1. **Git checkout сервера актуален** — `git merge-base --is-ancestor <нужный-коммит> HEAD` на
   сервере (или сверить `git log -1` с `origin/main`) **до** запуска деплоя, не после.
2. **Image hash изменился** — `docker images <service>` до/после, сравнить `IMAGE ID`.
3. **Контейнер реально пересоздан** — `docker ps` показывает свежий "Up N seconds/minutes", а
   не прежний "Up N days".
4. **Содержимое фикса физически внутри** — `docker exec` на конкретный файл/переменную/бинарник,
   не полагаться на факт, что она когда-то была в env-файле или в коде (тот же принцип, что для
   БД-настроек в [deploy-coordination.md](/.claude/rules/deploy-coordination.md)).

## Обход, если checkout отстал

`deploy_infra` сам git не подтягивает — обновить checkout вручную (`git pull origin main` на
сервере, либо дождаться, пока это сделает попутный `deploy_app` для другого приложения на том
же сервере — `deploy-affected.sh` тянет весь монорепо целиком, не только своё приложение), и
только потом повторно вызвать `deploy_infra`.
