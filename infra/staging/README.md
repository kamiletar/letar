# Staging — синхронизация БД

`sync-db-staging.sh` — разовый ручной скрипт синхронизации production БД на staging
(изначально под `grandslamcup`, структура допускает переиспользование под другие приложения при
правке констант в начале файла).

## Что делает

1. Снимает `pg_dump` (custom format, `-Fc`) с прод-контейнера на s2 через SSH
   (`ssh deploy@s2.letar.best docker exec <prod-db> pg_dump ...`)
2. Проверяет, что staging-БД запущена локально/на s1 (`docker ps`)
3. Копирует дамп внутрь staging-контейнера, `dropdb`/`createdb`/`pg_restore`
   (`--no-owner --no-privileges`)
4. По умолчанию — **sanitization PII**: `email`/`name` пользователей вне `@letar.best`
   заменяются на синтетические (`<id>@staging.local`, `Тест <id>`)
5. Чистит временный дамп-файл

## Использование

```bash
./sync-db-staging.sh                  # полная синхронизация с sanitization (по умолчанию)
./sync-db-staging.sh --no-sanitize    # без очистки PII — для отладки реальными данными
./sync-db-staging.sh --dump-only      # только снять дамп, не грузить в staging
```

Запускать на s1 (staging-сервер) или локально — скрипт сам не различает окружение для SSH-шага
(всегда идёт по SSH на `s2.letar.best`), различие в комментарии кода зафиксировано, но веток
исполнения сейчас две идентичные (см. `CURRENT_HOST` в скрипте — можно упростить при следующей
правке).

## Константы для переиспользования на другое приложение

В начале файла:

```bash
PROD_SERVER="s2.letar.best"
PROD_DB_CONTAINER="grandslamcup-db"
PROD_DB_NAME="grandslamcup"
STAGING_DB_CONTAINER="grandslamcup-staging-db"
STAGING_DB_NAME="grandslamcup"
```

Sanitization-запрос (`UPDATE "user" SET email = ...`) писан под конкретную схему
`grandslamcup` (таблица `"user"`, поля `email`/`name`) — при переносе на другое приложение с
другой схемой проверить/переписать этот блок, иначе просто тихо не сработает (перехвачено
`|| echo "⚠️ Sanitization не выполнена"`, не падает).

## ⚠️ Требования

- SSH-доступ к `deploy@s2.letar.best`
- Staging-БД должна быть уже поднята (`docker compose -f docker-compose.staging.yml up -d db`
  в каталоге приложения) — скрипт не поднимает её сам
- Достаточно места в `/tmp` для дампа прод-БД
