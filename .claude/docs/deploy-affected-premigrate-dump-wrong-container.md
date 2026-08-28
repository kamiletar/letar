# Pre-migrate dump в `deploy-affected.sh` резолвил не тот контейнер

⚠️ Класс бага: awk-паттерн матчился не только на нужный YAML-ключ, но и на одноимённый вложенный.

## Симптом

Перед миграцией `deploy-affected.sh` дампит прод-БД в `pg_dump`. На `svoichuzhie` дамп упал —
команда попала в `svoichuzhie-redis` вместо `svoichuzhie-db`, `pg_dump` закономерно не нашёл
Postgres. Деплой корректно прервался штатной защитой «миграция без бэкапа запрещена» — сами
данные не пострадали, но деплой встал.

## Причина

```bash
DB_CONTAINER=$(awk '/^[[:space:]]*db:[[:space:]]*$/{f=1} f && /container_name:/{print $2; exit}' "$COMPOSE_FILE")
```

Паттерн `/^[[:space:]]*db:[[:space:]]*$/` матчится на **любой** отступ — включая вложенный ключ
`depends_on: \n  db: \n    condition: ...`, который в файле нередко стоит раньше настоящего
`services.db:`. awk триггерит `f=1` на первом совпадении и берёт `container_name` из следующего
блока по файлу, не обязательно из нужного сервиса.

В `apps/svoichuzhie/docker-compose.production.yml` `depends_on.db:` (6 пробелов отступа, строка 94)
стоит раньше `services.db:` (2 пробела, строка 127) — awk взял `container_name` из `redis`,
описанного между ними.

## Фикс (2026-08-28)

Якорь на ровно 2 пробела отступа — это отступ top-level ключа сервиса под `services:` во всех
compose-файлах репозитория (проверено). Дополнительно `f` сбрасывается при переходе на любой
другой top-level сервис, чтобы не читать `container_name` следующего сервиса, если у `db:`
почему-то его нет:

```bash
DB_CONTAINER=$(awk '/^  [A-Za-z0-9_-]+:[[:space:]]*$/{f=($0 ~ /^  db:[[:space:]]*$/)?1:0} f && /container_name:/{print $2; exit}' "$COMPOSE_FILE")
```

Проверено на `svoichuzhie`, `dsperevod`, `domwellbes`, `aboi`, `driving-school` — все резолвятся
в правильный `<app>-db`.

## Ловушка на будущее

Любой compose-файл, где `depends_on:` перечисляет сервис `db:` **раньше** блока `services.db:`
по тексту файла, ловил ту же подмену — паттерн частый (`app: depends_on: db: condition:
service_healthy`). Если ставишь ещё один awk-парсер compose-файла где-то ещё в скриптах —
якорься на отступ ключа, не только на его имя.
